import { NextRequest, NextResponse } from "next/server";
import { replyToComment, sendPrivateReply } from "@/lib/facebook";
import { database as supabase } from "@/lib/server-database";
import { generateSmartCommentReply } from "@/lib/gemini";
import { readFile } from "fs/promises";
import path from "path";
import os from "os";

const VERIFY_TOKEN = process.env.FB_WEBHOOK_VERIFY_TOKEN || "smart_assistant_webhook_verify_token";

const DEFAULT_PAGE_ID = process.env.FB_DEFAULT_PAGE_ID || "";
const DEFAULT_PAGE_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN || "";

const STATUS_FILE = path.join(os.tmpdir(), "vst_bot_status.json");

// In-memory cache for fast deduplication
const processedWebhookComments = new Set<string>();

interface PageConfig {
  isActive: boolean;
  token: string;
  pageName: string;
  templates: string[];
  autoDm: boolean;
  dmTemplate: string;
  keywords?: string;
  aiReplyEnabled?: boolean;
}

async function getPageConfig(pageId: string): Promise<PageConfig> {
  let masterActive = true;
  let isPageActive = true;
  let token = DEFAULT_PAGE_TOKEN;
  let pageName = "";
  let templates: string[] = [];
  let autoDm = true;
  let dmTemplate = "";

  try {
    const { data: rows } = await supabase
      .from("bot_settings")
      .select("*")
      .in("id", [pageId, "default", "vst_members", "vst_keywords", "vst_ai_settings", "vst_ai_knowledge", "vst_members_lock"]);

    if (Array.isArray(rows)) {
      const defaultRow = rows.find((r) => r.id === "default");
      if (defaultRow) {
        masterActive = defaultRow.is_active !== false;
        if (Array.isArray(defaultRow.reply_templates) && defaultRow.reply_templates.length > 0) {
          templates = defaultRow.reply_templates;
        }
        if (typeof defaultRow.auto_dm_enabled === "boolean") {
          autoDm = defaultRow.auto_dm_enabled;
        }
        if (defaultRow.dm_template) {
          dmTemplate = defaultRow.dm_template;
        }
      }

      // Check Master Bot Switch from Super Admin AI Knowledge
      const knowledgeRow = rows.find((r) => r.id === "vst_ai_knowledge");
      if (knowledgeRow && knowledgeRow.is_active === false) {
        masterActive = false;
      }

      // Check Global Member Lock from vst_members_lock
      const lockRow = rows.find((r) => r.id === "vst_members_lock");
      const membersGlobalEnabled = lockRow ? lockRow.is_active !== false : true;

      const pageRow = rows.find((r) => r.id === pageId);
      if (pageRow) {
        isPageActive = pageRow.is_active !== false;
        if (Array.isArray(pageRow.reply_templates) && pageRow.reply_templates.length > 0) {
          templates = pageRow.reply_templates;
        }
        if (typeof pageRow.auto_dm_enabled === "boolean") {
          autoDm = pageRow.auto_dm_enabled;
        }
        if (pageRow.dm_template) {
          dmTemplate = pageRow.dm_template;
        }
      }

      const membersRow = rows.find((r) => r.id === "vst_members");
      if (membersRow?.dm_template) {
        try {
          const members = JSON.parse(membersRow.dm_template);
          if (Array.isArray(members)) {
            for (const m of members) {
              if (Array.isArray(m.pages)) {
                const matched = m.pages.find((p: any) => p.id === pageId);
                if (matched) {
                  if (matched.accessToken) token = matched.accessToken;
                  if (matched.name) pageName = matched.name;
                  if (!membersGlobalEnabled || m.botEnabled === false || m.status === "Disabled") {
                    console.log(`[Webhook] Member ${m.name} bot is disabled by Admin (Global Lock: ${!membersGlobalEnabled}). Muting page ${pageId}`);
                    isPageActive = false;
                  }
                  break;
                }
              }
            }
          }
        } catch {}
      }

      let keywords = "";
      const kwRow = rows.find((r) => r.id === "vst_keywords");
      if (kwRow?.dm_template) {
        try {
          const map = JSON.parse(kwRow.dm_template);
          keywords = map[pageId] || map["default"] || "";
        } catch {}
      }

      let aiReplyEnabled = false;
      const aiRow = rows.find((r) => r.id === "vst_ai_settings");
      if (aiRow?.dm_template) {
        try {
          const map = JSON.parse(aiRow.dm_template);
          if (typeof map[pageId] === "boolean") {
            aiReplyEnabled = map[pageId];
          } else if (typeof map["default"] === "boolean") {
            aiReplyEnabled = map["default"];
          }
        } catch {}
      }

      return {
        isActive: masterActive && isPageActive,
        token,
        pageName: pageName || `Page ${pageId}`,
        templates,
        autoDm,
        dmTemplate,
        keywords,
        aiReplyEnabled,
      };
    }
  } catch (e) {
    console.error(`[Webhook] Error getting config for page ${pageId}:`, e);
  }

  // Fallback to default page token if not found and matches default page
  if (!token && pageId === DEFAULT_PAGE_ID) {
    token = DEFAULT_PAGE_TOKEN;
  }

  return {
    isActive: masterActive && isPageActive,
    token,
    pageName: pageName || `Page ${pageId}`,
    templates,
    autoDm,
    dmTemplate,
    keywords: "",
    aiReplyEnabled: false,
  };
}

function getCommentReply(pageId: string, pageName: string, senderName?: string, customTemplates?: string[], senderId?: string) {
  const mentionTag = senderId
    ? `@[${senderId}]`
    : senderName && senderName !== "Customer" && senderName !== "អតិថិជន" && senderName !== "អតិថិជន Facebook"
    ? `@${senderName}`
    : "បង";

  const defaultTemplates = [
    `សួស្ដី ${mentionTag}! 😊 អរគុណសម្រាប់ការចាប់អារម្មណ៍លើទំព័រ ${pageName}។ ខ្ញុំបានផ្ញើព័ត៌មានលម្អិត និងតម្លៃពិសេសជូនបងហើយណា 💬👉 https://m.me/${pageId}`,
    `ជម្រាបសួរ ${mentionTag}! 🌸 ព័ត៌មាន និងប្រូម៉ូសិនពិសេសពី ${pageName} ត្រូវបានរៀបចំជូនបងរួចរាល់ហើយ សូមចុចត្រង់នេះដើម្បីឆាតមកកាន់ Inbox 🥰👉 https://m.me/${pageId}`,
    `សួស្ដី ${mentionTag}! ✨ ផលិតផលគុណភាពខ្ពស់ ផ្ដល់ទំនុកចិត្ត១០០%។ សូមចុចត្រង់នេះដើម្បីទទួលការប្រឹក្សាភ្លាមៗណា៎បង 💌👉 https://m.me/${pageId}`,
  ];

  const pool = customTemplates && customTemplates.length > 0 ? customTemplates : defaultTemplates;
  const picked = pool[Math.floor(Math.random() * pool.length)];
  return picked.replace(/{name}/g, mentionTag);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✓ Facebook Webhook verified successfully!");
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden: Invalid verification token", { status: 403 });
}

export async function POST(req: NextRequest) {
  if (process.env.ENABLE_BOT_AUTOMATION !== "true") {
    return NextResponse.json({ status: "DISABLED", message: "Bot automation is disabled for publishing tests", totalComments: 0, activities: [] });
  }
  try {
    const body = await req.json();

    if (body.object === "page") {
      for (const entry of body.entry) {
        const pageId = entry.id;

        // Fetch page-specific configuration (token, active toggle, templates)
        const pageConfig = await getPageConfig(pageId);

        if (!pageConfig.isActive) {
          console.log(`[Webhook] Bot is toggled OFF for page ${pageConfig.pageName} (${pageId}). Skipping.`);
          continue;
        }

        if (!pageConfig.token) {
          console.warn(`[Webhook] No access token found for page ${pageConfig.pageName} (${pageId}). Skipping.`);
          continue;
        }

        // Messenger incoming message:
        // Do NOT auto-reply to incoming Messenger chat messages!
        // Bot only triggers 1 Private DM per Comment on Posts/Reels.
        // Once the customer is in Messenger, human admins/agents take over the chat.
        if (entry.messaging) {
          for (const event of entry.messaging) {
            const senderId = event.sender?.id;
            const messageText = event.message?.text;

            if (senderId && messageText && !event.message?.is_echo && senderId !== pageId && senderId !== DEFAULT_PAGE_ID) {
              console.log(`[Messenger Chat Received] Page: ${pageId}, Sender: ${senderId}, Text: "${messageText}". (No bot auto-reply; manual chat only).`);

              // Update customer's last contact timestamp in Supabase CRM
              try {
                await supabase
                  .from("customers")
                  .update({ last_contact: new Date().toISOString() })
                  .eq("fb_user_id", senderId);
              } catch {}
            }
          }
        }

        // Feed updates (Comments on Posts)
        if (entry.changes) {
          for (const change of entry.changes) {
            if (change.field === "feed") {
              const value = change.value;

              if (value.item === "comment" && value.verb === "add") {
                const commentId = value.comment_id;
                const senderId = value.from?.id;
                const senderName = value.from?.name;
                const userComment = value.message || "";
                const postId = value.post_id;

                // 🛑 CRITICAL CHECK 1: Never reply to our own comments/replies
                if (senderId === pageId || senderId === DEFAULT_PAGE_ID) {
                  console.log(`[Webhook] Skipping own comment from page ${senderId}`);
                  continue;
                }

                // 🛑 CRITICAL CHECK 2: Do not reply to nested replies
                if (value.parent_id && value.parent_id !== value.post_id) {
                  console.log(`[Webhook] Skipping nested reply ${commentId} on parent ${value.parent_id}`);
                  continue;
                }

                // 🛑 CRITICAL CHECK 3: In-memory Deduplication
                if (processedWebhookComments.has(commentId)) {
                  console.log(`[Webhook] Already processed in-memory: ${commentId}`);
                  continue;
                }
                processedWebhookComments.add(commentId);

                // 🛑 CRITICAL CHECK 4: Database Deduplication
                try {
                  const { data: existingComment } = await supabase
                    .from("comments")
                    .select("id")
                    .eq("id", commentId)
                    .maybeSingle();

                  if (existingComment) {
                    console.log(`[Webhook] Comment already in Supabase DB: ${commentId}`);
                    continue;
                  }
                } catch (dbErr) {
                  console.error("Supabase dedup check error:", dbErr);
                }

                // 🛑 CRITICAL CHECK 5: Keywords Filter
                // If keywords are configured, only reply if comment matches at least one keyword.
                // If keywords are empty (""), reply to ALL comments automatically!
                const rawKeywords = pageConfig.keywords?.trim() || "";
                if (rawKeywords.length > 0) {
                  const keywordList = rawKeywords
                    .split(",")
                    .map((k: string) => k.trim().toLowerCase())
                    .filter((k: string) => k.length > 0);

                  if (keywordList.length > 0) {
                    const commentLower = userComment.toLowerCase();
                    const matches = keywordList.some((kw: string) => commentLower.includes(kw));
                    if (!matches) {
                      console.log(`[Webhook] Comment "${userComment}" on ${pageConfig.pageName} does not match keywords [${rawKeywords}]. Skipping.`);
                      continue;
                    }
                  }
                }

                console.log(`[New Comment on ${pageConfig.pageName}] From: ${senderName || "Unknown"} (${senderId}), Comment: "${userComment}"`);

                // A. Auto Reply on Comment using page-specific token
                let commentText = "";
                if (pageConfig.aiReplyEnabled) {
                  try {
                    const aiReply = await generateSmartCommentReply({
                      pageName: pageConfig.pageName,
                      pageId: pageId,
                      senderName: senderName,
                      senderId: senderId,
                      userComment: userComment,
                    });
                    if (aiReply) {
                      commentText = aiReply;
                      console.log(`[Webhook] Gemini AI generated smart reply for comment ${commentId}: "${commentText}"`);
                    }
                  } catch (aiErr) {
                    console.error("[Webhook] Gemini AI error, falling back to static template:", aiErr);
                  }
                }

                if (!commentText) {
                  commentText = getCommentReply(pageId, pageConfig.pageName, senderName, pageConfig.templates, senderId);
                }

                const replyRes = await replyToComment({
                  pageAccessToken: pageConfig.token,
                  commentId: commentId,
                  message: commentText,
                });
                console.log(`[Webhook] Reply sent for comment ${commentId} on ${pageConfig.pageName}:`, replyRes);

                // B. Auto Private Reply (DM into Customer Messenger) using page-specific token
                if (pageConfig.autoDm) {
                  try {
                    const displayName =
                      senderName && senderName !== "Customer" && senderName !== "អតិថិជន" && senderName !== "អតិថិជន Facebook"
                        ? senderName
                        : "បង";
                    const dmTextTemplate =
                      pageConfig.dmTemplate ||
                      `សួស្ដីបង {name}! 🌸 អរគុណដែលបាន comment លើទំព័រ ${pageConfig.pageName}។ តើបងចង់ដឹងព័ត៌មានលម្អិត ឬតម្លៃផលិតផលដែរទេ? ខ្ញុំអាចជួយផ្ដល់ការប្រឹក្សាជូនបងបានភ្លាមៗណា! 💬✨`;
                    const dmMessage = dmTextTemplate.replace(/{name}/g, displayName);

                    const dmRes = await sendPrivateReply({
                      pageAccessToken: pageConfig.token,
                      commentId: commentId,
                      message: dmMessage,
                    });
                    console.log(`[Webhook] Private Reply (DM) sent for comment ${commentId} on ${pageConfig.pageName}:`, dmRes);
                  } catch (dmErr) {
                    console.error(`[Webhook] Private Reply failed for comment ${commentId}:`, dmErr);
                  }
                }

                // C. Save Comment to Supabase
                try {
                  await supabase.from("comments").upsert({
                    id: commentId,
                    post_id: postId,
                    fb_user_id: senderId || null,
                    sender_name: senderName || "អតិថិជន Facebook",
                    message: userComment,
                    reply_message: commentText,
                    created_time: new Date().toISOString(),
                    replied_at: new Date().toISOString(),
                    permalink: value.permalink_url || null,
                  });
                } catch (e) {
                  console.error("Failed to save comment to Supabase:", e);
                }

                // D. Save / Update Customer in Supabase
                if (senderName || senderId) {
                  try {
                    const custName = senderName || "អតិថិជន Facebook";
                    if (senderId) {
                      const { data: existingCust } = await supabase
                        .from("customers")
                        .select("id, total_comments")
                        .eq("fb_user_id", senderId)
                        .maybeSingle();

                      if (existingCust) {
                        await supabase
                          .from("customers")
                          .update({
                            name: custName,
                            total_comments: (existingCust.total_comments || 1) + 1,
                            last_activity_at: new Date().toISOString(),
                          })
                          .eq("id", existingCust.id);
                      } else {
                        await supabase.from("customers").insert({
                          fb_user_id: senderId,
                          name: custName,
                          status: "new",
                          total_comments: 1,
                          source_page_id: pageId,
                          first_contact_at: new Date().toISOString(),
                          last_activity_at: new Date().toISOString(),
                        });
                      }
                    } else {
                      await supabase.from("customers").insert({
                        name: custName,
                        status: "new",
                        total_comments: 1,
                        source_page_id: pageId,
                      });
                    }
                  } catch (custErr) {
                    console.error("Failed to record customer in Supabase:", custErr);
                  }
                }
              }
            }
          }
        }
      }

      return NextResponse.json({ status: "EVENT_RECEIVED" }, { status: 200 });
    }

    return new Response("Not Found", { status: 404 });
  } catch (error) {
    console.error("Webhook event error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
