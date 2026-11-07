import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    // 1. Check against environment / default credentials or demo
    const matchesDefault =
      (cleanEmail === DEFAULT_ADMIN_EMAIL.toLowerCase() ||
        cleanEmail === "admin" ||
        cleanEmail === "admin@example.com") &&
      (cleanPassword === DEFAULT_ADMIN_PASSWORD ||
        cleanPassword === "admin123");

    let isAuthenticated = matchesDefault;
    let authUser: any = null;

    if (isAuthenticated) {
      authUser = {
        name: "VST Super Admin",
        email: cleanEmail,
        role: "owner",
        loginType: "admin",
        loginTime: new Date().toISOString(),
      };
    }

    // 2. Check if a custom password was saved in Supabase bot_settings for Admin
    if (!isAuthenticated) {
      try {
        const { data } = await supabase
          .from("bot_settings")
          .select("custom_admin_password, custom_admin_email")
          .eq("id", "default")
          .maybeSingle();

        if (data && data.custom_admin_password) {
          const dbEmail = data.custom_admin_email || DEFAULT_ADMIN_EMAIL;
          if (
            (cleanEmail === dbEmail.toLowerCase() || cleanEmail === "admin") &&
            cleanPassword === data.custom_admin_password
          ) {
            isAuthenticated = true;
            authUser = {
              name: "VST Super Admin",
              email: cleanEmail,
              role: "owner",
              loginType: "admin",
              loginTime: new Date().toISOString(),
            };
          }
        }
      } catch (err) {
        console.error("Supabase auth check error:", err);
      }
    }

    // 3. Check registered members in vst_members
    if (!isAuthenticated) {
      try {
        const { data: memberData } = await supabase
          .from("bot_settings")
          .select("dm_template")
          .eq("id", "vst_members")
          .maybeSingle();

        if (memberData?.dm_template) {
          const membersList = JSON.parse(memberData.dm_template);
          if (Array.isArray(membersList)) {
            const foundIdx = membersList.findIndex((m: any) =>
              (m.email && m.email.toLowerCase() === cleanEmail) ||
              (m.name && m.name.toLowerCase() === cleanEmail) ||
              (m.id && String(m.id).toLowerCase() === cleanEmail)
            );

            if (foundIdx >= 0) {
              const m = membersList[foundIdx];
              // If member has password, verify it; if legacy without password, save this password for them!
              const passwordMatches = !m.password || m.password === cleanPassword;
              if (passwordMatches) {
                if (!m.password) {
                  // Save password for future logins
                  membersList[foundIdx].password = cleanPassword;
                  await supabase.from("bot_settings").upsert({
                    id: "vst_members",
                    is_active: true,
                    dm_template: JSON.stringify(membersList),
                    updated_at: new Date().toISOString(),
                  });
                }

                isAuthenticated = true;
                authUser = {
                  id: m.id,
                  name: m.name,
                  email: m.email || cleanEmail,
                  role: m.role || "Member",
                  loginType: "member",
                  status: m.status || "Active",
                  botEnabled: m.botEnabled !== false,
                  picture: m.picture || null,
                  pagesCount: Array.isArray(m.pages) ? m.pages.length : 0,
                  loginTime: new Date().toISOString(),
                };
              }
            }
          }
        }
      } catch (memErr) {
        console.error("Member login check error:", memErr);
      }
    }

    if (!isAuthenticated || !authUser) {
      return NextResponse.json(
        { success: false, error: "INVALID_CREDENTIALS" },
        { status: 401 }
      );
    }

    // Success response with session token
    const token = `vst_token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    return NextResponse.json({
      success: true,
      token,
      user: authUser,
    });
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
