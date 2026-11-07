import { database as supabase } from "@/lib/server-database";

export interface GenerateCommentReplyOptions {
  pageName: string;
  pageId: string;
  senderName?: string;
  senderId?: string;
  userComment: string;
}

/**
 * Generate a smart, polite, customized Khmer comment response using Google Gemini AI.
 * Incorporates custom knowledge & persona trained by Super Admin.
 * Falls back to null on failure or timeout so standard templates take over seamlessly.
 */
export async function generateSmartCommentReply({
  pageName,
  pageId,
  senderName,
  senderId,
  userComment,
}: GenerateCommentReplyOptions): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("[Gemini AI] No GEMINI_API_KEY found in environment.");
    return null;
  }

  // 1. Fetch trained knowledge base & persona from Supabase
  let customPersona = "អ្នកជាអ្នកលក់ស្រីវ័យក្មេង សម្តីផ្អែមល្ហែម គួរសម រួសរាយ រាក់ទាក់";
  let customKnowledge = "";
  let customRules = "ហាមប្រាប់តម្លៃលើ comment ឱ្យទាញចូល inbox";

  try {
    const { data: knowledgeRow } = await supabase
      .from("bot_settings")
      .select("dm_template")
      .eq("id", "vst_ai_knowledge")
      .maybeSingle();

    if (knowledgeRow?.dm_template) {
      try {
        const parsed = JSON.parse(knowledgeRow.dm_template);
        if (parsed.persona) customPersona = parsed.persona;
        if (parsed.knowledgeBase) customKnowledge = parsed.knowledgeBase;
        if (parsed.rules) customRules = parsed.rules;
      } catch {}
    }
  } catch (e) {
    // Non-blocking fallback
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000); // 4s timeout for fast responsiveness

    const prompt = `តួនាទី និងចរិតរបស់អ្នក៖ ${customPersona}
ចំណេះដឹងផលិតផល៖
${customKnowledge}
ច្បាប់នៃការឆ្លើយ៖
${customRules}

ស្ថានភាពជាក់ស្តែង៖
អ្នកកំពុងឆ្លើយតប Comment លើ Facebook Page "${pageName}"។
អតិថិជនបាន comment ថា: "${userComment}"។

សូមសរសេរសារឆ្លើយតបខ្លីមួយបែបគួរសម ផ្អែមល្ហែម ដូចមនុស្សពិតកំពុងជជែក (ប្រវែងខ្លីបំផុត ១ ទៅ ២ ឃ្លា) ជាភាសាខ្មែរ ដោយឆ្លើយតបចំសំណួរគាត់ ហើយប្រាប់ថាបានផ្ញើព័ត៌មានលម្អិត និងប្រូម៉ូសិនពិសេសជូនក្នុងប្រអប់សារ Inbox រួចហើយណា៎បង។ មិនបាច់ដាក់ឈ្មោះ ឬ Tag ទេ (ព្រោះប្រព័ន្ធនឹងដាក់អោយ)។ ត្រូវមាន Link: https://m.me/${pageId} នៅចុងសារ។ ហាមដាក់សម្រង់ "" ឬអត្ថបទវែងអន្លាយ។`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 150,
          temperature: 0.7,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[Gemini AI] API responded with status ${res.status}`);
      return null;
    }

    const data = await res.json();
    const rawReply = data.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text?.trim();

    if (rawReply && rawReply.length > 5) {
      const mentionTag = senderId
        ? `@[${senderId}]`
        : senderName && senderName !== "Customer" && senderName !== "អតិថិជន" && senderName !== "អតិថិជន Facebook"
        ? `@${senderName}`
        : "បង";

      // Clean leading tags if AI added them
      const cleanBody = rawReply
        .replace(/^(@\[\w+\]|@[^\s]+|សួស្ដី|ជម្រាបសួរ)[,\s!🌸😊]*/iu, "")
        .trim();

      let finalReply = `សួស្ដី ${mentionTag}! 🌸 ${cleanBody}`;

      // Ensure the m.me link is present
      if (!finalReply.includes(`https://m.me/${pageId}`)) {
        finalReply += ` 💬👉 https://m.me/${pageId}`;
      }

      return finalReply;
    }
  } catch (error) {
    console.error("[Gemini AI] generateSmartCommentReply error:", error);
  }

  return null;
}
