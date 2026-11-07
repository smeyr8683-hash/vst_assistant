import { NextRequest, NextResponse } from "next/server";
import { replyToComment, sendPrivateReply } from "@/lib/facebook";
import { database as supabase } from "@/lib/server-database";
import { generateSmartCommentReply } from "@/lib/gemini";

const DEFAULT_PAGE_ID = process.env.FB_DEFAULT_PAGE_ID || "";
const DEFAULT_PAGE_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN || "";

export interface CommentActivity {
  commentId: string;
  postId: string;
  pageId: string;
  pageName: string;
  senderName: string;
  senderId?: string;
  message: string;
  createdTime: string;
  hasReplied: boolean;
  replyText?: string;
  permalink?: string;
}

const repliedCommentIds = new Set<string>();

export async function GET(req: NextRequest) {
  if (process.env.ENABLE_BOT_AUTOMATION !== "true") {
    return NextResponse.json({ status: "DISABLED", message: "Bot automation is disabled for publishing tests", totalComments: 0, activities: [] });
  }
  try {
    // 1. Fetch all page settings and active statuses from Supabase
    const { data: allSettings } = await supabase.from("bot_settings").select("*");

    const settingsMap = new Map<string, any>();
    let memberPages: Array<{ id: string; name: string; accessToken?: string }> = [];

    if (Array.isArray(allSettings)) {
      allSettings.forEach((row) => {
        if (row.id === "vst_members") {
          try {
            const members = JSON.parse(row.dm_template);
            if (Array.isArray(members)) {
              members.forEach((m: any) => {
                if (Array.isArray(m.pages)) {
                  m.pages.forEach((p: any) => {
                    if (p.accessToken) {
                      memberPages.push({
                        id: p.id,
                        name: p.name,
                        accessToken: p.accessToken,
                      });
                    }
                  });
                }
              });
            }
          } catch {}
        } else {
          settingsMap.set(row.id, row);
        }
      });
    }

    // Check Global Member Lock: If Super Admin has disabled Members Bot Access, don't scan member pages!
    const memberLockRow = settingsMap.get("vst_members_lock");
    const membersGlobalEnabled = memberLockRow ? memberLockRow.is_active !== false : true;
    if (!membersGlobalEnabled) {
      console.log("[Auto-Scanner] Members bot access is globally locked by Super Admin. Excluding member pages.");
      memberPages = [];
    }

    // Master kill switch check: "default" row
    const defaultSetting = settingsMap.get("default");
    const masterActive = defaultSetting ? defaultSetting.is_active !== false : true;

    if (!masterActive) {
      return NextResponse.json({
        status: "BOT_PAUSED",
        message: "Bot is globally paused by Master Switch",
        activities: [],
        repliesSent: 0,
        totalComments: 0,
      });
    }

    // Check AI smart comment reply settings
    const aiSettingsRow = settingsMap.get("vst_ai_settings");
    let aiReplyMap: Record<string, boolean> = {};
    if (aiSettingsRow?.dm_template) {
      try {
        aiReplyMap = JSON.parse(aiSettingsRow.dm_template);
      } catch {}
    }

    // 2. Build list of pages to scan
    const pagesToScan: Array<{
      id: string;
      name: string;
      accessToken: string;
      isActive: boolean;
      replyTemplate?: string;
      dmTemplate?: string;
      autoDm?: boolean;
      aiReplyEnabled?: boolean;
    }> = [];

    if (DEFAULT_PAGE_ID && DEFAULT_PAGE_TOKEN) {
      pagesToScan.push({
        id: DEFAULT_PAGE_ID,
        name: "Default Page",
        accessToken: DEFAULT_PAGE_TOKEN,
        isActive: settingsMap.has(DEFAULT_PAGE_ID)
          ? settingsMap.get(DEFAULT_PAGE_ID).is_active !== false
          : true,
        replyTemplate:
          settingsMap.get(DEFAULT_PAGE_ID)?.reply_templates?.[0] ||
          settingsMap.get("default")?.reply_templates?.[0],
        dmTemplate:
          settingsMap.get(DEFAULT_PAGE_ID)?.dm_template ||
          settingsMap.get("default")?.dm_template,
        autoDm: settingsMap.get(DEFAULT_PAGE_ID)?.auto_dm_enabled !== false,
        aiReplyEnabled:
          typeof aiReplyMap[DEFAULT_PAGE_ID] === "boolean"
            ? aiReplyMap[DEFAULT_PAGE_ID]
            : typeof aiReplyMap["default"] === "boolean"
            ? aiReplyMap["default"]
            : false,
      });
    }

    // Add member pages with their individual tokens and toggle states
    for (const mp of memberPages) {
      if (mp.id === DEFAULT_PAGE_ID) continue; // avoid duplicate
      const pageSetting = settingsMap.get(mp.id);
      const isPageActive = pageSetting ? pageSetting.is_active !== false : true;
      if (mp.accessToken) {
        pagesToScan.push({
          id: mp.id,
          name: mp.name,
          accessToken: mp.accessToken,
          isActive: isPageActive,
          replyTemplate:
            pageSetting?.reply_templates?.[0] ||
            `សួស្ដី {name}! 😊 អរគុណសម្រាប់ការចាប់អារម្មណ៍លើទំព័រ ${mp.name}។ ខ្ញុំបានផ្ញើព័ត៌មានលម្អិតជូនបងហើយណា 💬👉 https://m.me/${mp.id}`,
          dmTemplate:
            pageSetting?.dm_template ||
            `សួស្ដីបង {name}! 🌸 អរគុណដែលបាន comment លើទំព័រ ${mp.name}។ តើបងចង់ដឹងព័ត៌មានលម្អិត ឬតម្លៃផលិតផលដែរទេ? ខ្ញុំអាចជួយផ្ដល់ការប្រឹក្សាជូនបងបានភ្លាមៗណា! 💬✨`,
          autoDm: pageSetting?.auto_dm_enabled !== false,
          aiReplyEnabled:
            typeof aiReplyMap[mp.id] === "boolean"
              ? aiReplyMap[mp.id]
              : typeof aiReplyMap["default"] === "boolean"
              ? aiReplyMap["default"]
              : false,
        });
      }
    }

    const allActivities: CommentActivity[] = [];
    let repliesSent = 0;
    let totalComments = 0;

    // 3. Scan each active page
    for (const page of pagesToScan) {
      // Respect per-page ON/OFF switch
      if (!page.isActive) {
        console.log(`[Auto-Scanner] Skipping page ${page.name} (${page.id}) - Bot is toggled OFF.`);
        continue;
      }

      try {
        const postsList: any[] = [];

        try {
          const feedRes = await fetch(
            `https://graph.facebook.com/v21.0/${page.id}/feed?fields=id,permalink_url,comments{id,message,from,created_time,comments{id,message,from,created_time}}&limit=10&access_token=${page.accessToken}`,
            { cache: "no-store" }
          );
          const feedData = await feedRes.json();
          if (feedData.error) {
            const errCode = feedData.error.code;
            if (errCode === 4 || errCode === 17 || errCode === 32 || errCode === 613) {
              console.warn(`[Auto-Scanner] Meta rate limit detected (${feedData.error.message}). Halting scanner to let rate limit cool down.`);
              break;
            }
          }
          if (feedData.data && Array.isArray(feedData.data)) {
            postsList.push(...feedData.data);
          }
        } catch {}

        if (postsList.length === 0) {
          try {
            const fallbackRes = await fetch(
              `https://graph.facebook.com/v21.0/${page.id}/posts?fields=id,permalink_url,comments{id,message,from,created_time,comments{id,message,from,created_time}}&limit=10&access_token=${page.accessToken}`,
              { cache: "no-store" }
            );
            const fallbackData = await fallbackRes.json();
            if (fallbackData.error) {
              const errCode = fallbackData.error.code;
              if (errCode === 4 || errCode === 17 || errCode === 32 || errCode === 613) {
                console.warn(`[Auto-Scanner] Meta rate limit detected on fallback (${fallbackData.error.message}). Halting scanner.`);
                break;
              }
            }
            if (fallbackData.data && Array.isArray(fallbackData.data)) {
              postsList.push(...fallbackData.data);
            }
          } catch {}
        }

        if (postsList.length === 0) {
          continue;
        }

        for (const post of postsList) {
          if (post.comments && Array.isArray(post.comments.data)) {
            for (const c of post.comments.data) {
              totalComments++;
              const commentId = c.id;
              const senderId = c.from?.id;
              const senderName = c.from?.name || "អតិថិជន Facebook";
              const messageText = c.message || "";

              // Skip if comment is from page itself
              if (senderId === page.id) continue;

              // Check if page already replied
              const pageReplyObj = c.comments?.data?.find(
                (subC: { from?: { id?: string } }) => subC.from?.id === page.id
              );
              const hasAnyReply = Boolean(c.comments?.data && c.comments.data.length > 0);
              const hasPageReply = Boolean(pageReplyObj) || hasAnyReply || repliedCommentIds.has(commentId);
              const commentAgeSec = (Date.now() - new Date(c.created_time).getTime()) / 1000;

              // Sync lead into Supabase customers
              if (senderName && senderName !== "Customer" && senderName !== "អតិថិជន" && senderName !== "អតិថិជន Facebook") {
                try {
                  if (senderId) {
                    await supabase.from("customers").upsert(
                      {
                        fb_user_id: senderId,
                        name: senderName,
                        source_page_id: page.id,
                        last_activity_at: c.created_time || new Date().toISOString(),
                      },
                      { onConflict: "fb_user_id" }
                    );
                  }
                } catch {}
              }

              // Reply if no reply yet and older than 35s
              if (!hasPageReply && commentAgeSec > 35) {
                const userTag = senderId
                  ? `@[${senderId}]`
                  : senderName && senderName !== "Customer" && senderName !== "អតិថិជន" && senderName !== "អតិថិជន Facebook"
                  ? `@${senderName}`
                  : "បង";

                let replyMessage = "";
                if (page.aiReplyEnabled) {
                  try {
                    const aiReply = await generateSmartCommentReply({
                      pageName: page.name,
                      pageId: page.id,
                      senderName: senderName,
                      senderId: senderId,
                      userComment: messageText,
                    });
                    if (aiReply) {
                      replyMessage = aiReply;
                      console.log(`[Auto-Scanner] Gemini AI generated smart reply for comment ${commentId}: "${replyMessage}"`);
                    }
                  } catch (aiErr) {
                    console.error("[Auto-Scanner] Gemini AI error, falling back to static template:", aiErr);
                  }
                }

                if (!replyMessage) {
                  const replyTextTemplate =
                    page.replyTemplate ||
                    `សួស្ដី {name}! 😊 អរគុណសម្រាប់ការចាប់អារម្មណ៍លើទំព័រ ${page.name}។ ខ្ញុំបានផ្ញើព័ត៌មានលម្អិតជូនបងហើយណា 💬👉 https://m.me/${page.id}`;
                  replyMessage = replyTextTemplate.replace(/{name}/g, userTag);
                }

                const replyRes = await replyToComment({
                  pageAccessToken: page.accessToken,
                  commentId: commentId,
                  message: replyMessage,
                });

                if (replyRes.id) {
                  repliedCommentIds.add(commentId);
                  repliesSent++;

                  // Send Private Reply (DM into Customer Messenger)
                  if (page.autoDm) {
                    try {
                      const dmTextTemplate =
                        page.dmTemplate ||
                        `សួស្ដីបង {name}! 🌸 អរគុណដែលបាន comment លើទំព័រ ${page.name}។ តើបងចង់ដឹងព័ត៌មានលម្អិត ឬតម្លៃផលិតផលដែរទេ? ខ្ញុំអាចជួយផ្ដល់ការប្រឹក្សាជូនបងបានភ្លាមៗណា! 💬✨`;
                      const dmMessage = dmTextTemplate.replace(/{name}/g, userTag);
                      await sendPrivateReply({
                        pageAccessToken: page.accessToken,
                        commentId: commentId,
                        message: dmMessage,
                      });
                    } catch (dmErr) {
                      console.error(`Scanner Private Reply error on ${page.name}:`, dmErr);
                    }
                  }

                  // Save to Supabase comments
                  try {
                    await supabase.from("comments").upsert({
                      id: commentId,
                      post_id: post.id,
                      fb_user_id: senderId || null,
                      sender_name: senderName,
                      message: messageText,
                      reply_message: replyMessage,
                      created_time: c.created_time,
                      permalink: post.permalink_url,
                    });
                  } catch {}
                }
              }

              allActivities.push({
                commentId,
                postId: post.id,
                pageId: page.id,
                pageName: page.name,
                senderName,
                senderId,
                message: messageText,
                createdTime: c.created_time,
                hasReplied: hasPageReply || repliedCommentIds.has(commentId),
                replyText: pageReplyObj?.message || (repliedCommentIds.has(commentId) ? "បានឆ្លើយតបដោយ Bot" : undefined),
                permalink: post.permalink_url,
              });
            }
          }
        }
      } catch (pageErr) {
        console.error(`Error scanning page ${page.name} (${page.id}):`, pageErr);
      }
    }

    return NextResponse.json({
      status: "SUCCESS",
      scannedPages: pagesToScan.length,
      activePages: pagesToScan.filter((p) => p.isActive).length,
      totalComments,
      repliesSent,
      activities: allActivities.slice(0, 30),
      lastScanned: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Auto-scanner error:", error);
    return NextResponse.json({ status: "ERROR", error: "Auto scanner failed" }, { status: 500 });
  }
}
