import { NextRequest, NextResponse } from "next/server";
import { database as supabase } from "@/lib/server-database";
import { writeFile, readFile } from "fs/promises";
import path from "path";
import os from "os";

const STATUS_FILE = path.join(os.tmpdir(), "vst_bot_status.json");

async function readBotStatus(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("bot_settings")
      .select("is_active")
      .eq("id", "default")
      .single();

    if (!error && data) {
      return data.is_active;
    }
  } catch (e) {
    console.error("Supabase readBotStatus error, falling back to local file:", e);
  }

  try {
    const fileData = await readFile(STATUS_FILE, "utf-8");
    const json = JSON.parse(fileData);
    return json.active !== false;
  } catch {
    return true; // default ON
  }
}

async function writeBotStatus(active: boolean): Promise<void> {
  try {
    await supabase
      .from("bot_settings")
      .upsert({ id: "default", is_active: active, updated_at: new Date().toISOString() });
  } catch (e) {
    console.error("Supabase writeBotStatus error:", e);
  }

  try {
    await writeFile(STATUS_FILE, JSON.stringify({ active, updatedAt: new Date().toISOString() }), "utf-8");
  } catch {
    // ignore
  }
}

export async function GET(req: NextRequest) {
  if (process.env.ENABLE_BOT_AUTOMATION !== "true") return NextResponse.json({ active:false, membersGlobalEnabled:false, isLockedByAdmin:true, memberBotEnabled:false });
  const masterActive = await readBotStatus();

  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get("memberId");
  const memberName = searchParams.get("memberName");
  const isAdmin = searchParams.get("isAdmin") === "true";

  // Check Global Members Bot Access Lock (Controlled by Super Admin)
  let membersGlobalEnabled = true; // Default unlocked
  try {
    const { data: lockRow } = await supabase
      .from("bot_settings")
      .select("is_active")
      .eq("id", "vst_members_lock")
      .maybeSingle();

    if (lockRow) {
      membersGlobalEnabled = lockRow.is_active !== false;
    }
  } catch (e) {
    console.error("Error reading vst_members_lock:", e);
  }

  let isLockedByAdmin = false;
  let memberBotEnabled = true;

  if (!isAdmin) {
    // If Super Admin has disabled Members Bot Access globally:
    if (!membersGlobalEnabled) {
      isLockedByAdmin = true;
      memberBotEnabled = false;
    } else if (memberId || memberName) {
      // Check individual member status
      try {
        const { data } = await supabase
          .from("bot_settings")
          .select("dm_template")
          .eq("id", "vst_members")
          .maybeSingle();

        if (data?.dm_template) {
          const members = JSON.parse(data.dm_template);
          if (Array.isArray(members)) {
            const m = members.find((x: any) =>
              (memberId && (x.id === memberId || String(x.id) === String(memberId))) ||
              (memberName && x.name?.toLowerCase() === memberName.toLowerCase()) ||
              (memberName && x.name?.toLowerCase().includes("sam") && memberName.toLowerCase().includes("sam"))
            );
            if (m) {
              memberBotEnabled = m.botEnabled !== false && m.status !== "Disabled";
              isLockedByAdmin = !memberBotEnabled;
            }
          }
        }
      } catch (e) {
        console.error("Error reading member bot status:", e);
      }
    }
  }

  return NextResponse.json({
    active: masterActive,
    membersGlobalEnabled,
    isLockedByAdmin,
    memberBotEnabled,
  });
}

export async function POST(req: NextRequest) {
  if (process.env.ENABLE_BOT_AUTOMATION !== "true") return NextResponse.json({ success:false, active:false, error:"Bot ត្រូវបានបិទសម្រាប់ការសាកផុស។" }, {status:403});
  try {
    const text = await req.text();
    const body = JSON.parse(text);
    const { active, membersBotEnabled, isAdmin, memberId, memberName } = body;

    // Non-admin users cannot change global bot settings
    if (!isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: "មានតែ Super Admin ប៉ុណ្ណោះដែលអាចបញ្ជា Bot Status បាន!",
          locked: true,
        },
        { status: 403 }
      );
    }

    // 1. If Super Admin toggles Master Bot Status
    if (typeof active === "boolean") {
      await writeBotStatus(active);
    }

    // 2. If Super Admin toggles Members Global Bot Access
    if (typeof membersBotEnabled === "boolean") {
      await supabase.from("bot_settings").upsert({
        id: "vst_members_lock",
        is_active: membersBotEnabled,
        updated_at: new Date().toISOString(),
      });
    }

    const currentMaster = typeof active === "boolean" ? active : await readBotStatus();

    return NextResponse.json({
      success: true,
      active: currentMaster,
      membersGlobalEnabled: typeof membersBotEnabled === "boolean" ? membersBotEnabled : undefined,
    });
  } catch (err) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
