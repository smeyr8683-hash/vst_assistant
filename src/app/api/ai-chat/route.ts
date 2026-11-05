import { NextRequest, NextResponse } from "next/server";
import { database as supabase } from "@/lib/server-database";

const BASE_SYSTEM_PROMPT = `
អ្នកគឺជាខួរក្បាលបញ្ជាស្នូល និងជា "AI Executive Assistant & VST Support Bot" ប្រចាំប្រព័ន្ធ VST Assistant Automation Platform។

⚡ [សមត្ថភាពពិតប្រាកដ និងមុខងារស្វ័យប្រវត្តិនៃប្រព័ន្ធ VST Assistant ដែលអ្នកតំណាង]៖
1. **ស្វ័យប្រវត្តិតប Comment លើ Facebook Page (100% Real-time Auto-Reply Comment):**
   - ប្រព័ន្ធ VST Assistant នេះត្រូវបានភ្ជាប់ជាមួយ Facebook Graph API + Real-time Webhook + Background Auto-Scanner រួចជាស្រេច។
   - ប្រព័ន្ធមានសមត្ថភាពស្កេន និងឆ្លើយតប Comment លើ Facebook Page របស់ Super Admin និង Member ដោយស្វ័យប្រវត្តិ ១០០% ភ្លាមៗ ២៤ម៉ោង/២៤ម៉ោង ដោយមិនបាច់មានមនុស្សចាំចុចឡើយ!
   - ប្រព័ន្ធអាចប្រើទាំងគំរូសារឆ្លើយតប (Smart Templates) និងប្រើខួរក្បាល Gemini AI ដើម្បីឆ្លើយតប Comment យ៉ាងវៃឆ្លាតតាមសំណួរជាក់ស្តែងរបស់អតិថិជន។

2. **ស្វ័យប្រវត្តិផ្ញើសារចូល Messenger ភ្ញៀវ (Auto Private Reply / DM):**
   - នៅពេលមានអតិថិជន Comment ប្រព័ន្ធអាចផ្ញើសារចូលប្រអប់សារ Messenger (Inbox) របស់អតិថិជនម្នាក់ៗដោយស្វ័យប្រវត្តិភ្លាមៗ ព្រមទាំងភ្ជាប់ Link ចូលទំព័រភ្លាមៗ។

3. **គ្រប់គ្រង CRM Leads & សមាជិក (Members):**
   - ស្វ័យប្រវត្តិកត់ត្រាឈ្មោះ និង Facebook User ID របស់ភ្ញៀវចូលក្នុង CRM Database និងរៀបចំស្ថិតិទិន្នន័យជូន Super Admin។

⛔ [បម្រាមដាច់ខាតសម្រាប់ AI Bot ក្នុងការឆ្លើយតប]៖
- **ហាមដាច់ខាត (STRICTLY FORBIDDEN)** មិនឱ្យឆ្លើយថា "ខ្លួនគ្រាន់តែជា AI ជួយព្រាងសារ", "មិនទាន់អាចដើរតួនាទីជាអ្នកចុចតប Comment ឬ Chat ជំនួស Bot ផ្ទាល់លើ Facebook Page បាន", ឬ "មិនអាចតប Comment លើ Facebook បាន" ឡើយ! ព្រោះនេះជាការយល់ច្រឡំខុសពីការពិតទាំងស្រុង!
- អ្នកគឺជាខួរក្បាលបញ្ជា និងជាតំណាងនៃប្រព័ន្ធ VST Assistant ទាំងមូល។ ប្រសិនបើ Super Admin (មេ) ឬសមាជិកណាម្នាក់សួរថា "តើ Bot អាចតប Comment ឬ Chat លើ Facebook បានអត់?" ឬ "តើឯងអាចតបខមិនបានអត់?"
  👉 អ្នកត្រូវបញ្ជាក់យ៉ាងច្បាស់លាស់ ជឿជាក់ និងស្វាហាប់ថា៖
  "ចាស៎/បាទមេ! ប្រព័ន្ធ VST Assistant របស់យើង គឺអាចស្កេន និងឆ្លើយតប Comment លើ Facebook Page ព្រមទាំងផ្ញើសារ Private Reply ចូល Messenger ភ្ញៀវដោយស្វ័យប្រវត្តិ ១០០% ២៤ម៉ោង/២៤ម៉ោង មិនបាច់មានមនុស្សចុចឡើយ! ហើយពេលនេះប្រព័ន្ធកំពុងដំណើរការយ៉ាងរលូនក្រោមការបញ្ជាផ្តាច់មុខពីមេ!"
`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const message = (body.message || "").trim();
    const isAdmin = Boolean(body.isAdmin);
    const userName = body.userName || (isAdmin ? "Super Admin" : "Member");

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        reply: "សូមអភ័យទោស មិនទាន់មាន GEMINI_API_KEY នៅក្នុងប្រព័ន្ធឡើយ។",
      });
    }

    // 1. Check Master Bot Status (If Super Admin turns off, Bot cannot reply at all!)
    try {
      const { data: defaultRow } = await supabase
        .from("bot_settings")
        .select("is_active")
        .eq("id", "default")
        .maybeSingle();

      const masterActive = defaultRow ? defaultRow.is_active !== false : true;
      if (!masterActive) {
        return NextResponse.json({
          reply: "⚠️ Bot ត្រូវបានបិទដំណើរការទាំងស្រុងដោយ Super Admin (Bot System Paused)។ មិនអាចឆ្លើយតបបានទេនៅពេលនេះ!",
        });
      }
    } catch {}

    // 2. Check Member Bot Access Lock (Super Admin can disable Members from using Bot)
    if (!isAdmin) {
      try {
        const { data: lockRow } = await supabase
          .from("bot_settings")
          .select("is_active")
          .eq("id", "vst_members_lock")
          .maybeSingle();

        const membersGlobalEnabled = lockRow ? lockRow.is_active === true : false;
        if (!membersGlobalEnabled) {
          return NextResponse.json({
            reply: "⚠️ Bot ត្រូវបានផ្អាកបណ្ដោះអាសន្នសម្រាប់សមាជិក (Members) ដោយ Super Admin សម្រាប់ដំណាក់កាលរៀបចំ និងបង្រៀន AI។ មានតែ Super Admin ប៉ុណ្ណោះដែលអាចប្រើ និងបង្រៀន Bot បាននៅពេលនេះ!",
          });
        }
      } catch {}
    }

    // 3. Fetch trained knowledge base, rules & uploaded documents from Supabase
    let trainedPersona = "";
    let trainedKnowledge = "";
    let trainedRules = "";
    let trainedDocuments: any[] = [];
    let masterBotEnabled = true;

    try {
      const { data: knowledgeRow } = await supabase
        .from("bot_settings")
        .select("dm_template, is_active")
        .eq("id", "vst_ai_knowledge")
        .maybeSingle();

      if (knowledgeRow?.dm_template) {
        try {
          const parsed = JSON.parse(knowledgeRow.dm_template);
          trainedPersona = parsed.persona || "";
          trainedKnowledge = parsed.knowledgeBase || "";
          trainedRules = parsed.rules || "";
          if (Array.isArray(parsed.documents)) {
            trainedDocuments = parsed.documents;
          }
          if (typeof parsed.masterBotEnabled === "boolean") {
            masterBotEnabled = parsed.masterBotEnabled;
          }
        } catch {}
      }
    } catch (e) {
      console.error("Error reading ai knowledge:", e);
    }

    // 2. If Super Admin is asking, gather live Web App telemetry (Members, CRM Leads, Comments, Pages)
    let systemContext = BASE_SYSTEM_PROMPT;

    if (isAdmin) {
      let membersData: any[] = [];
      let totalCustomers = 0;
      let totalComments = 0;

      try {
        // Fetch members
        const { data: membersRow } = await supabase
          .from("bot_settings")
          .select("dm_template")
          .eq("id", "vst_members")
          .maybeSingle();

        if (membersRow?.dm_template) {
          try {
            membersData = JSON.parse(membersRow.dm_template);
          } catch {}
        }

        // Fetch customer leads count
        const { count: custCount } = await supabase
          .from("customers")
          .select("*", { count: "exact", head: true });
        totalCustomers = custCount || 0;

        // Fetch comments count
        const { count: commCount } = await supabase
          .from("comments")
          .select("*", { count: "exact", head: true });
        totalComments = commCount || 0;
      } catch (err) {
        console.error("Error fetching admin telemetry:", err);
      }

      const membersSummary = Array.isArray(membersData)
        ? membersData.map((m: any) => ({
            name: m.name,
            email: m.email,
            role: m.role || "Member",
            botStatus: m.botEnabled !== false ? "Active (បើក)" : "Disabled (បិទ)",
            pagesCount: Array.isArray(m.pages) ? m.pages.length : 0,
            pagesList: Array.isArray(m.pages) ? m.pages.map((p: any) => p.name || p.id).join(", ") : "គ្មាន",
          }))
        : [];

      systemContext += `
[ស្ថានភាពពិសេស៖ អ្នកកំពុងជជែកផ្ទាល់ជាមួយ SUPER ADMIN (ម្ចាស់ផ្តាច់មុខ និងអ្នកបញ្ជាផ្ទាល់នៃ Web App VST)]
- អ្នកស្ថិតនៅក្រោមការបញ្ជាផ្តាច់មុខពី Super Admin (${userName}) តែម្នាក់គត់!
- អ្នកមានសិទ្ធិពេញលេញ ១០០% ក្នុងការរាយការណ៍គ្រប់ទិន្នន័យទាំងអស់នៃ Web App នេះ រួមមានសមាជិក (Members), Pages, អតិថិជន (Leads), Comments, និងប្រព័ន្ធ Bot។
- ហាមលាក់បាំង ឬបដិសេធមិនឆ្លើយតបសំណួររបស់ Super Admin ឡើយ!

📊 [ទិន្នន័យជាក់ស្តែងពេលនេះក្នុង Web App]៖
- ស្ថានភាព Bot ទូទៅ (Master Bot Switch): ${masterBotEnabled ? "🟢 កំពុងបើកដំណើរការ (Active)" : "🔴 ត្រូវបានផ្អាក/បិទ (Paused by Super Admin)"}
- ចំនួនសមាជិក (Members): ${membersSummary.length} នាក់
- បញ្ជីសមាជិកលម្អិត៖ ${JSON.stringify(membersSummary, null, 2)}
- ចំនួនអតិថិជនសរុបក្នុង CRM Leads៖ ${totalCustomers} នាក់
- ចំនួន Comment ដែល Bot បានចាប់បានសរុប៖ ${totalComments} comments

🧠 [ចរិតលក្ខណៈ និងចំណេះដឹងដែល Super Admin បានបង្រៀន (Custom Training & Memory)]៖
- ចរិតលក្ខណៈ (Persona): ${trainedPersona || "ជំនួយការឆ្លាតវៃ រួសរាយ ស្មោះត្រង់ និងគោរពបទបញ្ជា Super Admin"}
- ឃ្លាំងចំណេះដឹងផលិតផល & អាជីវកម្ម (Knowledge Base):
${trainedKnowledge || "គ្មានចំណេះដឹងបន្ថែម"}
- ច្បាប់ និងបម្រាម (Rules):
${trainedRules || "គ្មានច្បាប់បន្ថែម"}

${
  trainedDocuments.length > 0
    ? `📄 [ឯកសារ និងទិន្នន័យចំណេះដឹងដែល Super Admin បាន Upload ចូលប្រព័ន្ធ (${trainedDocuments.length} ឯកសារ)]៖\n` +
      trainedDocuments
        .map(
          (doc: any) =>
            `--- ឯកសារ "${doc.name}": ---\n${(doc.content || "").slice(0, 4000)}`
        )
        .join("\n\n")
    : ""
}

សូមឆ្លើយតបទៅកាន់ Super Admin យ៉ាងឆ្លាតវៃ គោរព ភាពជាអ្នកគ្រប់គ្រង និងច្បាស់លាស់ចំសំណួរ!
`;
    } else {
      // Regular Member or General User
      systemContext += `
[ស្ថានភាព៖ អ្នកកំពុងជជែកជាមួយសមាជិក (Member) ឬអ្នកប្រើប្រាស់ទូទៅ (${userName})]
- ហាមដាច់ខាត (STRICTLY FORBIDDEN) ក្នុងការទម្លាយទិន្នន័យផ្ទៃក្នុង ហិរញ្ញវត្ថុ បញ្ជីសមាជិកផ្សេងទៀត ឬទិន្នន័យសម្ងាត់របស់ Super Admin!
- ឆ្លើយតបតែលើ៖ សុខភាពនារី & តម្រងនោម, ព័ត៌មានផលិតផល VST (ឃីដនីប្រូ, អេមមី, តែ Detox), និងការណែនាំបច្ចេកទេសប្រើប្រាស់ Web App VST Assistant ប៉ុណ្ណោះ។

🧠 [ចំណេះដឹងផលិតផលដែលត្រូវឆ្លើយជូនភ្ញៀវ]៖
${trainedKnowledge}
- ច្បាប់ឆ្លើយតប៖ ${trainedRules}

${
  trainedDocuments.length > 0
    ? `📄 [ឯកសារព័ត៌មានដែល Super Admin បាន Upload អនុញ្ញាតឱ្យឆ្លើយ]៖\n` +
      trainedDocuments
        .map(
          (doc: any) =>
            `--- ឯកសារ "${doc.name}": ---\n${(doc.content || "").slice(0, 3000)}`
        )
        .join("\n\n")
    : ""
}
`;
    }

    let historyText = "";
    if (Array.isArray(body.history) && body.history.length > 0) {
      const recent = body.history.slice(-10); // last 10 messages for continuous memory
      historyText = `
💬 [ប្រវត្តិសន្ទនាពីមុនៗ (Conversation History)]៖
${recent.map((m: any) => `${m.from === "user" ? userName : "Bot"}: ${m.text}`).join("\n")}
`;
    }

    const promptText = `
${systemContext}

${historyText}

---------------------
សំណួរថ្មីចុងក្រោយ៖ "${message}"
សូមឆ្លើយតបជាភាសាខ្មែរឱ្យបានល្អ និងសមរម្យបំផុត ដោយស៊ីសង្វាក់គ្នានឹងប្រវត្តិសន្ទនា និងចំណេះដឹងខាងលើ៖`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: promptText }],
            },
          ],
          generationConfig: {
            maxOutputTokens: 600,
            temperature: 0.7,
          },
        }),
      }
    );

    if (!response.ok) {
      console.warn(`[AI Chat] Gemini API status: ${response.status}`);
      return NextResponse.json({
        reply: "សូមអភ័យទោស ប្រព័ន្ធឆ្លើយតបកំពុងរវល់បន្តិច សូមសួរម្ដងទៀតណា៎បង!",
      });
    }

    const data = await response.json();
    const geminiReply = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (geminiReply) {
      return NextResponse.json({ reply: geminiReply });
    }

    return NextResponse.json({
      reply: "សួស្ដីបង! ខ្ញុំជា VST Support Bot ខ្ញុំអាចជួយឆ្លើយគ្រប់សំណួរ និងជួយសម្រួលការងារបងបានភ្លាមៗ!",
    });
  } catch (error) {
    console.error("AI Chat handler error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
