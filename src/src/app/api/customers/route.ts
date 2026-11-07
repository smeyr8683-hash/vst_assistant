import { NextRequest, NextResponse } from "next/server";
import { database as supabase } from "@/lib/server-database";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("last_activity_at", { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }

    return NextResponse.json({ customers: data || [] });
  } catch (error) {
    console.error("Error fetching customers:", error);
    return NextResponse.json({ error: "Failed to fetch customers", customers: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fb_user_id, name, phone, notes, status } = body;

    const { data, error } = await supabase
      .from("customers")
      .upsert({
        fb_user_id,
        name,
        phone,
        notes,
        status: status || "new",
        last_activity_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, customer: data });
  } catch (error) {
    console.error("Error saving customer:", error);
    return NextResponse.json({ error: "Failed to save customer" }, { status: 500 });
  }
}
