import { NextRequest, NextResponse } from "next/server";
import { database as supabase } from "@/lib/server-database";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pageId = searchParams.get("pageId") || "default";

    // 1. Fetch keywords map from vst_keywords
    let pageKeywords = "";
    try {
      const { data: kwData } = await supabase
        .from("bot_settings")
        .select("dm_template")
        .eq("id", "vst_keywords")
        .maybeSingle();

      if (kwData?.dm_template) {
        const keywordsMap = JSON.parse(kwData.dm_template);
        if (typeof keywordsMap[pageId] === "string") {
          pageKeywords = keywordsMap[pageId];
        }
      }
    } catch (e) {
      console.error("Error loading keywords map:", e);
    }

    // 2. Fetch AI reply enabled setting from vst_ai_settings
    let aiReplyEnabled = false;
    try {
      const { data: aiData } = await supabase
        .from("bot_settings")
        .select("dm_template")
        .eq("id", "vst_ai_settings")
        .maybeSingle();

      if (aiData?.dm_template) {
        const aiMap = JSON.parse(aiData.dm_template);
        if (typeof aiMap[pageId] === "boolean") {
          aiReplyEnabled = aiMap[pageId];
        }
      }
    } catch (e) {
      console.error("Error loading ai settings map:", e);
    }

    // 3. Fetch page settings
    const { data } = await supabase
      .from("bot_settings")
      .select("*")
      .eq("id", pageId)
      .maybeSingle();

    if (data) {
      return NextResponse.json({
        ...data,
        keywords: pageKeywords,
        ai_reply_enabled: aiReplyEnabled,
      });
    }

    // Fallback: If no custom setting for this page, load default settings or generate intelligent fallback
    const { data: defaultData } = await supabase
      .from("bot_settings")
      .select("*")
      .eq("id", "default")
      .maybeSingle();

    const fallbackReply =
      pageId !== "default"
        ? `សួស្ដី {name}! 😊 អរគុណសម្រាប់ការចាប់អារម្មណ៍លើទំព័រយើងខ្ញុំ។ ខ្ញុំបានផ្ញើព័ត៌មានលម្អិត និងតម្លៃពិសេសជូនបងហើយណា 💬👉 https://m.me/${pageId}`
        : `សួស្ដី {name}! 😊 អរគុណសម្រាប់ការចាប់អារម្មណ៍។ ខ្ញុំបានផ្ញើព័ត៌មានលម្អិត និងតម្លៃពិសេសជូនបងហើយណា 💬👉 https://m.me/${process.env.FB_DEFAULT_PAGE_ID || "page"}`;

    const fallbackDm =
      defaultData?.dm_template ||
      "សួស្ដីបង {name}! 🌸 អរគុណដែលបាន comment លើទំព័រយើងខ្ញុំ។ តើបងចង់ដឹងព័ត៌មានលម្អិត ឬតម្លៃផលិតផលដែរទេ? ខ្ញុំអាចជួយផ្ដល់ការប្រឹក្សាជូនបងបានភ្លាមៗណា! 💬✨";

    return NextResponse.json({
      id: pageId,
      is_active: true,
      reply_templates: defaultData?.reply_templates && defaultData.reply_templates.length > 0
        ? defaultData.reply_templates
        : [fallbackReply],
      auto_dm_enabled: defaultData ? defaultData.auto_dm_enabled !== false : true,
      dm_template: fallbackDm,
      keywords: pageKeywords,
      ai_reply_enabled: aiReplyEnabled,
    });
  } catch (error) {
    console.error("Error fetching bot settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      pageId = "default",
      is_active,
      reply_templates,
      auto_dm_enabled,
      dm_template,
      keywords,
      ai_reply_enabled,
    } = body;

    // 1. Save keywords into vst_keywords map
    if (typeof keywords === "string") {
      try {
        const { data: kwData } = await supabase
          .from("bot_settings")
          .select("dm_template")
          .eq("id", "vst_keywords")
          .maybeSingle();

        let keywordsMap: Record<string, string> = {};
        if (kwData?.dm_template) {
          try {
            keywordsMap = JSON.parse(kwData.dm_template);
          } catch {}
        }

        keywordsMap[pageId] = keywords.trim();

        await supabase.from("bot_settings").upsert({
          id: "vst_keywords",
          is_active: true,
          dm_template: JSON.stringify(keywordsMap),
          updated_at: new Date().toISOString(),
        });
      } catch (kwErr) {
        console.error("Error saving keywords to vst_keywords:", kwErr);
      }
    }

    // 2. Save AI reply toggle into vst_ai_settings map
    if (typeof ai_reply_enabled === "boolean") {
      try {
        const { data: aiData } = await supabase
          .from("bot_settings")
          .select("dm_template")
          .eq("id", "vst_ai_settings")
          .maybeSingle();

        let aiMap: Record<string, boolean> = {};
        if (aiData?.dm_template) {
          try {
            aiMap = JSON.parse(aiData.dm_template);
          } catch {}
        }

        aiMap[pageId] = ai_reply_enabled;

        await supabase.from("bot_settings").upsert({
          id: "vst_ai_settings",
          is_active: true,
          dm_template: JSON.stringify(aiMap),
          updated_at: new Date().toISOString(),
        });
      } catch (aiErr) {
        console.error("Error saving ai setting to vst_ai_settings:", aiErr);
      }
    }

    // 3. Save page settings
    const pageSettingPayload = {
      id: pageId,
      is_active: is_active ?? true,
      reply_templates: Array.isArray(reply_templates) ? reply_templates : (reply_templates ? [reply_templates] : []),
      auto_dm_enabled: auto_dm_enabled ?? true,
      dm_template: dm_template || "",
      updated_at: new Date().toISOString(),
    };

    await supabase.from("bot_settings").upsert(pageSettingPayload, { onConflict: "id" });

    return NextResponse.json({
      success: true,
      settings: {
        ...pageSettingPayload,
        keywords: typeof keywords === "string" ? keywords.trim() : "",
        ai_reply_enabled: typeof ai_reply_enabled === "boolean" ? ai_reply_enabled : false,
      },
    });
  } catch (error) {
    console.error("Error saving bot settings:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
