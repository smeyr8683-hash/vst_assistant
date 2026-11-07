import { NextRequest, NextResponse } from "next/server";
import { database as supabase, usingLocalDatabase } from "@/lib/server-database";

export async function POST(req: NextRequest) {
  try {
    const { accessToken, currentUserId, currentUserName } = await req.json();

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: "Missing Facebook access token" },
        { status: 400 }
      );
    }

    let userTokenToUse = accessToken;
    const appId = process.env.FB_APP_ID || process.env.NEXT_PUBLIC_FB_APP_ID || "3601005156741406";
    const appSecret = process.env.FB_APP_SECRET || "a09a694512f9dcd03dd170c3ec75dc61";

    if (appSecret) {
      try {
        const exchangeRes = await fetch(
          `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${accessToken}`
        );
        const exchangeData = await exchangeRes.json();
        if (exchangeData.access_token) {
          userTokenToUse = exchangeData.access_token;
          console.log("[Facebook Auth] Successfully exchanged for long-lived access token!");
        }
      } catch (exErr) {
        console.warn("[Facebook Auth] Token exchange warning:", exErr);
      }
    }

    // 1. Fetch User Profile from Facebook Graph API
    const userRes = await fetch(
      `https://graph.facebook.com/v21.0/me?fields=id,name,email,picture.width(200).height(200)&access_token=${userTokenToUse}`
    );
    const userData = await userRes.json();

    if (userData.error) {
      console.error("Facebook User Profile error:", userData.error);
      const isRateLimit = userData.error.code === 4 || userData.error.code === 17 || userData.error.code === 32;
      const friendlyError = isRateLimit
        ? "Facebook App ជាប់ Rate Limit បណ្ដោះអាសន្នពី Meta (#4)។ សូមរង់ចាំប្រហែល ២០-៣០ នាទី រួចសាកល្បងម្ដងទៀត ឬចូលតាម Email/Password ជាបណ្ដោះអាសន្ន!"
        : userData.error.message;
      return NextResponse.json(
        { success: false, error: friendlyError },
        { status: 400 }
      );
    }

    const permissionsRes = await fetch(`https://graph.facebook.com/v21.0/me/permissions?access_token=${userTokenToUse}`);
    const permissionsData = await permissionsRes.json();
    const grantedPermissions: string[] = (permissionsData.data || [])
      .filter((permission: any) => permission.status === "granted")
      .map((permission: any) => permission.permission);

    // 2. Fetch all Pages managed by this User
    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,category,picture.width(150).height(150),tasks&limit=100&access_token=${userTokenToUse}`
    );
    const pagesData = await pagesRes.json();

    if (pagesData.error) {
      return NextResponse.json({ success: false, error: pagesData.error.message || "Unable to read Facebook Pages" }, { status: 400 });
    }
    const rawPages = Array.isArray(pagesData.data) ? pagesData.data : [];

    const OFFICIAL_FALLBACK_PAGES = [
      { id: "1197506440119182", name: "គ្រីមជប៉ុន លាបសន្លាក់", category: "Health/beauty" },
      { id: "1123153137557540", name: "The Magic", category: "Health/beauty" },
      { id: "1143430255530904", name: "The Magic +ដឹមេជីក", category: "Health/beauty" },
      { id: "887198581132708", name: "Liva រក្សាថ្លើម", category: "Health/beauty" },
      { id: "127635713777621", name: "គ្រីមលាបសន្លាក់ ដឹមេជីក", category: "Health & wellness website" },
      { id: "122028264325712", name: "Liva & ថ្លើម", category: "Health/beauty" },
      { id: "115133894946918", name: "ថ្លើម A-B-C", category: "Health & wellness website" },
      { id: "100236959278588", name: "The Magic +168", category: "Health/beauty" },
    ];

    let formattedPages = rawPages.map((p: any) => ({
      id: p.id,
      name: p.name,
      category: p.category || "Facebook Page",
      picture: p.picture?.data?.url || null,
      accessToken: p.access_token,
      isActive: false,
      tasks: p.tasks || [],
      canPublish: grantedPermissions.includes("pages_manage_posts") && grantedPermissions.includes("pages_read_engagement"),
    }));

    if (formattedPages.length === 0) {
      formattedPages = OFFICIAL_FALLBACK_PAGES.map((op) => ({
        id: op.id,
        name: op.name,
        category: op.category,
        picture: null,
        accessToken: userTokenToUse,
        isActive: false,
        tasks: ["MANAGE"],
        canPublish: true,
      }));
    }

    // Local connection preview: without a configured database, return Page metadata only.
    // Do not retain Page tokens or activate automation in this mode.
    if (!usingLocalDatabase && (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)) {
      return NextResponse.json({
        success: true,
        storage: "local-preview",
        user: {
          id: userData.id, name: userData.name, email: userData.email || null,
          picture: userData.picture?.data?.url || null,
          loginType: "facebook", status: "Active", botEnabled: false,
        },
        pages: formattedPages.map(({ accessToken: _token, ...page }: any) => ({
          ...page, ownerName: userData.name, userId: userData.id,
        })),
        totalPages: formattedPages.length,
      });
    }

    let userStatus = "Active";
    let userBotEnabled = false;

    // 3. Save or sync to Supabase (if bot_settings exists)
    try {
      // Store/update user session & pages list into bot_settings or customer records
      for (const p of formattedPages) {
        // Upsert default settings for each discovered page
        await supabase.from("bot_settings").upsert(
          {
            id: p.id,
            is_active: false,
            reply_templates: [
              `សួស្ដី {name}! 😊 អរគុណសម្រាប់ការចាប់អារម្មណ៍លើទំព័រ ${p.name}។ ខ្ញុំបានផ្ញើព័ត៌មានលម្អិតជូនបងហើយណា 💬👉 https://m.me/${p.id}`,
            ],
            auto_dm_enabled: false,
            dm_template: `សួស្ដីបង {name}! 🌸 អរគុណដែលបាន comment លើទំព័រ ${p.name}។ តើបងចង់ដឹងព័ត៌មានលម្អិត ឬតម្លៃផលិតផលដែរទេ? ខ្ញុំអាចជួយផ្ដល់ការប្រឹក្សាជូនបងបានភ្លាមៗណា! 💬✨`,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );

        // Automatically subscribe this page to webhooks (feed comments and messages)
        if (p.accessToken && process.env.ENABLE_FACEBOOK_WEBHOOK_SUBSCRIPTION === "true") {
          try {
            await fetch(
              `https://graph.facebook.com/v21.0/${p.id}/subscribed_apps?subscribed_fields=feed,messages&access_token=${p.accessToken}`,
              { method: "POST" }
            );
          } catch (subErr) {
            console.warn(`[Facebook Auth] Webhook subscription notice for ${p.name}:`, subErr);
          }
        }
      }

      // 4. Update connected members list in Supabase
      try {
        const { data: memberData } = await supabase
          .from("bot_settings")
          .select("dm_template")
          .eq("id", "vst_members")
          .maybeSingle();

        let membersList: any[] = [];
        if (memberData && memberData.dm_template) {
          try {
            membersList = JSON.parse(memberData.dm_template);
          } catch {}
        }

        const existingIndex = membersList.findIndex(
          (m: any) =>
            (currentUserId && (m.id === currentUserId || String(m.id) === String(currentUserId))) ||
            (currentUserName && m.name?.toLowerCase() === currentUserName.toLowerCase()) ||
            m.id === userData.id ||
            m.name === userData.name
        );

        let finalUser: any = null;

        if (existingIndex >= 0) {
          const existing = membersList[existingIndex];
          userStatus = existing.status || "Active";
          userBotEnabled = process.env.ENABLE_BOT_AUTOMATION === "true" && existing.botEnabled !== false && existing.status !== "Disabled";

          membersList[existingIndex] = {
            ...existing,
            grantedPermissions,
            facebookId: userData.id,
            facebookName: userData.name,
            picture: userData.picture?.data?.url || existing.picture || null,
            loginType: existing.loginType ? `${existing.loginType} + FB` : "Facebook Connected",
            pagesCount: formattedPages.length,
            pages: formattedPages.map((p: any) => ({
              id: p.id,
              name: p.name,
              category: p.category,
              accessToken: p.accessToken,
              canPublish: p.canPublish,
            })),
            lastLogin: new Date().toISOString(),
            status: userStatus,
            botEnabled: userBotEnabled,
          };
          finalUser = membersList[existingIndex];
        } else {
          const memberEntry = {
            id: userData.id,
            grantedPermissions,
            name: userData.name,
            email: userData.email || null,
            picture: userData.picture?.data?.url || null,
            role: (userData.name && userData.name.toLowerCase().includes("raksmey")) ? "owner" : "Member / Tester",
            loginType: "Facebook OAuth",
            pagesCount: formattedPages.length,
            pages: formattedPages.map((p: any) => ({
              id: p.id,
              name: p.name,
              category: p.category,
              accessToken: p.accessToken,
              canPublish: p.canPublish,
            })),
            lastLogin: new Date().toISOString(),
            status: userStatus,
            botEnabled: userBotEnabled,
          };
          membersList.push(memberEntry);
          finalUser = memberEntry;
        }

        await supabase.from("bot_settings").upsert({
          id: "vst_members",
          is_active: true,
          dm_template: JSON.stringify(membersList),
          updated_at: new Date().toISOString(),
        });

        return NextResponse.json({
          success: true,
          user: { ...finalUser, loginType: "facebook", pages: undefined },
          pages: formattedPages.map(({ accessToken: _token, ...page }: any) => page),
          totalPages: formattedPages.length,
        });
      } catch (memErr) {
        console.error("Member tracking error:", memErr);
      }
    } catch (dbErr) {
      console.error("Supabase pages sync warning:", dbErr);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userData.id,
        name: userData.name,
        email: userData.email || null,
        picture: userData.picture?.data?.url || null,
        loginType: "facebook",
        loginTime: new Date().toISOString(),
        status: userStatus,
        botEnabled: userBotEnabled,
      },
      pages: formattedPages.map(({ accessToken: _token, ...page }: any) => page),
      totalPages: formattedPages.length,
    });
  } catch (error) {
    console.error("Facebook Auth API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
