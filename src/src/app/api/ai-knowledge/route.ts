import { NextRequest, NextResponse } from "next/server";
import { database as supabase } from "@/lib/server-database";

export interface KnowledgeDocument {
  id: string;
  name: string;
  size: number;
  type: string;
  content: string;
  uploadedAt: string;
}

export interface AIKnowledgeData {
  persona: string;
  knowledgeBase: string;
  rules: string;
  masterBotEnabled: boolean;
  documents?: KnowledgeDocument[];
  updatedAt?: string;
  updatedBy?: string;
}

const DEFAULT_PERSONA = `អ្នកជាបុគ្គលិកបម្រើអតិថិជនដ៏រួសរាយ រាក់ទាក់ សម្តីផ្អែមល្ហែម និងគួរសមបំផុត។
ត្រូវប្រើពាក្យ 'ចាសបង/បាទបង', 'អូន', 'បងសម្លាញ់' ឬសមរម្យតាមកាលៈទេសៈ។
ហាមឆ្លើយវែងអន្លាយ ឆ្លើយខ្លីៗ (១ ទៅ ២ ឃ្លា) ចំសំណួរ និងពោរពេញដោយភាពកក់ក្តៅដូចមនុស្សពិតកំពុងឆាតជជែក។`;

const DEFAULT_KNOWLEDGE = `【ព័ត៌មានផលិតផល និងសេវាកម្មទូទៅ】
- មុខងារ៖ ផលិតផល និងសេវាកម្មប្រកបដោយគុណភាពខ្ពស់ ផ្ដល់អត្ថប្រយោជន៍ពិតៗជូនអតិថិជន
- គុណភាព៖ ផលិតផលសុទ្ធ ១០០% ស្របតាមស្តង់ដារ និងមានការធានាត្រឹមត្រូវ
- តម្លៃ & ប្រូម៉ូសិន៖ មានតម្លៃសមរម្យ និងមានការបញ្ចុះតម្លៃពិសេសជាច្រើនសម្រាប់អតិថិជន`;

const DEFAULT_RULES = `១. ហាមប្រាប់តម្លៃផលិតផលនៅលើ Comment ហាមដាច់ខាត! ត្រូវឆ្លើយតបបែបផ្អែមល្ហែម និងទាក់ទាញ ហើយប្រាប់ឱ្យភ្ញៀវឆែកមើលប្រអប់សារ Inbox។
២. ត្រូវភ្ជាប់ Link Messenger https://m.me/{pageId} នៅចុងសារជានិច្ច។
៣. បើភ្ញៀវ comment ពាក្យ "សុំតម្លៃ", "ចាប់អារម្មណ៍", "ថ្លៃប៉ុន្មាន", "ជួយអីខ្លះ" ត្រូវឆ្លើយស្វាគមន៍ភ្លាមៗ។
៤. ហាមទម្លាយព័ត៌មានផ្ទាល់ខ្លួន ឬទិន្នន័យផ្ទៃក្នុងរបស់ Admin ទៅកាន់អ្នកដទៃ។`;

export async function GET(req: NextRequest) {
  try {
    const { data } = await supabase
      .from("bot_settings")
      .select("*")
      .eq("id", "vst_ai_knowledge")
      .maybeSingle();

    if (data?.dm_template) {
      try {
        const parsed = JSON.parse(data.dm_template);
        return NextResponse.json({
          persona: parsed.persona || DEFAULT_PERSONA,
          knowledgeBase: parsed.knowledgeBase || DEFAULT_KNOWLEDGE,
          rules: parsed.rules || DEFAULT_RULES,
          masterBotEnabled: typeof parsed.masterBotEnabled === "boolean" ? parsed.masterBotEnabled : true,
          documents: Array.isArray(parsed.documents) ? parsed.documents : [],
          updatedAt: parsed.updatedAt || data.updated_at,
          updatedBy: parsed.updatedBy || "VST Super Admin",
        });
      } catch {}
    }

    return NextResponse.json({
      persona: DEFAULT_PERSONA,
      knowledgeBase: DEFAULT_KNOWLEDGE,
      rules: DEFAULT_RULES,
      masterBotEnabled: true,
      documents: [],
      updatedAt: new Date().toISOString(),
      updatedBy: "VST Super Admin",
    });
  } catch (error) {
    console.error("Failed to fetch AI knowledge:", error);
    return NextResponse.json({ error: "Failed to load knowledge" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      persona = DEFAULT_PERSONA,
      knowledgeBase = DEFAULT_KNOWLEDGE,
      rules = DEFAULT_RULES,
      masterBotEnabled = true,
      documents = [],
      updatedBy = "VST Super Admin",
    } = body;

    const knowledgePayload: AIKnowledgeData = {
      persona: persona.trim(),
      knowledgeBase: knowledgeBase.trim(),
      rules: rules.trim(),
      masterBotEnabled: Boolean(masterBotEnabled),
      documents: Array.isArray(documents) ? documents : [],
      updatedAt: new Date().toISOString(),
      updatedBy,
    };

    const { error } = await supabase.from("bot_settings").upsert({
      id: "vst_ai_knowledge",
      is_active: masterBotEnabled,
      dm_template: JSON.stringify(knowledgePayload),
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: knowledgePayload,
    });
  } catch (error) {
    console.error("Failed to save AI knowledge:", error);
    return NextResponse.json({ error: "Failed to save knowledge" }, { status: 500 });
  }
}
