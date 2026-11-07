import { NextRequest, NextResponse } from "next/server";
import { database as supabase } from "@/lib/server-database";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const checkUserId = searchParams.get("checkUserId");
    const checkUserName = searchParams.get("checkUserName");

    const { data } = await supabase
      .from("bot_settings")
      .select("dm_template, updated_at")
      .eq("id", "vst_members")
      .maybeSingle();

    let members: any[] = [];
    if (data && data.dm_template) {
      try {
        members = JSON.parse(data.dm_template);
      } catch (e) {
        console.error("Error parsing members list:", e);
      }
    }

    // Always include Super Admin at the top
    const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
    const hasAdmin = members.some((m) => m.id === "owner" || m.role?.includes("Super Admin"));
    if (!hasAdmin) {
      members.unshift({
        id: "owner",
        name: "System Super Admin",
        email: adminEmail,
        role: "Owner (Super Admin)",
        loginType: "Master Credentials",
        pagesCount: 0,
        lastLogin: new Date().toISOString(),
        status: "Active",
        botEnabled: true,
      });
    }

    // Ensure all members have botEnabled flag
    members = members.map((m) => {
      const isEnabled = m.botEnabled !== false && m.status !== "Disabled";
      return {
        ...m,
        botEnabled: isEnabled,
        status: isEnabled ? "Active" : "Disabled",
      };
    });

    // Check specific user if query params present
    if (checkUserId || checkUserName) {
      const found = members.find(
        (m) =>
          (checkUserId && (m.id === checkUserId || String(m.id) === String(checkUserId))) ||
          (checkUserName && m.name?.toLowerCase() === checkUserName.toLowerCase()) ||
          (checkUserName && m.name?.toLowerCase().includes("sam") && checkUserName.toLowerCase().includes("sam"))
      );
      if (found) {
        return NextResponse.json({
          success: true,
          member: found,
          botEnabled: found.botEnabled,
          isLocked: !found.botEnabled,
        });
      }
    }

    return NextResponse.json({
      success: true,
      members,
      totalMembers: members.length,
    });
  } catch (error) {
    console.error("Get members error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { action, memberId, memberName, email, password, botEnabled, isAdmin } = await req.json();

    const isSignup = action === "signup" || Boolean(password && email);

    if (!isAdmin && !isSignup) {
      return NextResponse.json(
        {
          success: false,
          error: "មានតែ Super Admin ប៉ុណ្ណោះដែលអាចបិទ ឬបើក Bot របស់ Member បាន!",
        },
        { status: 403 }
      );
    }

    if (!memberId && !memberName && !email) {
      return NextResponse.json(
        { success: false, error: "Missing memberId, memberName or email" },
        { status: 400 }
      );
    }

    // 1. Fetch vst_members from bot_settings
    const { data: memberData } = await supabase
      .from("bot_settings")
      .select("dm_template")
      .eq("id", "vst_members")
      .maybeSingle();

    let membersList: any[] = [];
    if (memberData && memberData.dm_template) {
      try {
        membersList = JSON.parse(memberData.dm_template);
      } catch (e) {
        console.error("Error parsing members list:", e);
      }
    }

    // Locate target member by ID, name, or email
    let targetIdx = membersList.findIndex(
      (m: any) =>
        (memberId && (m.id === memberId || String(m.id) === String(memberId))) ||
        (memberName && m.name?.toLowerCase() === memberName.toLowerCase()) ||
        (email && m.email && m.email.toLowerCase() === email.toLowerCase())
    );

    let updatedMember: any = null;

    if (targetIdx >= 0) {
      if (typeof botEnabled === "boolean") {
        membersList[targetIdx].botEnabled = botEnabled;
        membersList[targetIdx].status = botEnabled ? "Active" : "Disabled";
      }
      if (email) membersList[targetIdx].email = email;
      if (password) membersList[targetIdx].password = password;
      membersList[targetIdx].lastLogin = new Date().toISOString();
      updatedMember = membersList[targetIdx];
    } else {
      const newEntry = {
        id: memberId || `member_${Date.now()}`,
        name: memberName || (email ? email.split("@")[0] : "Member"),
        email: email || null,
        password: password || undefined,
        role: "Member",
        loginType: "Email / System",
        pagesCount: 0,
        pages: [],
        lastLogin: new Date().toISOString(),
        status: botEnabled !== false ? "Active" : "Disabled",
        botEnabled: botEnabled !== false,
      };
      membersList.push(newEntry);
      updatedMember = newEntry;
    }

    // 2. Automatically sync all pages belonging to this member in bot_settings
    if (updatedMember && Array.isArray(updatedMember.pages)) {
      for (const p of updatedMember.pages) {
        const pageId = typeof p === "string" ? p : p.id;
        if (pageId) {
          await supabase.from("bot_settings").upsert(
            {
              id: pageId,
              is_active: botEnabled,
              dm_template: botEnabled ? "" : "LOCKED_BY_ADMIN",
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          );
        }
      }
    }

    // 3. Save updated members list into Supabase
    await supabase.from("bot_settings").upsert({
      id: "vst_members",
      is_active: true,
      dm_template: JSON.stringify(membersList),
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      member: updatedMember,
      members: membersList,
    });
  } catch (err: any) {
    console.error("POST /api/members error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update member" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing member ID" }, { status: 400 });
    }

    const { data } = await supabase
      .from("bot_settings")
      .select("dm_template")
      .eq("id", "vst_members")
      .maybeSingle();

    if (data && data.dm_template) {
      let members = JSON.parse(data.dm_template);
      members = members.filter((m: any) => m.id !== id);
      await supabase.from("bot_settings").upsert({
        id: "vst_members",
        is_active: true,
        dm_template: JSON.stringify(members),
        updated_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true, removedId: id });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Delete failed" }, { status: 500 });
  }
}
