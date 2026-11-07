import { NextRequest, NextResponse } from "next/server";
import { database as supabase } from "@/lib/server-database";

export interface AdCampaign {
  id: string;
  name: string;
  pageName: string;
  adAccountId: string;
  adAccountName: string;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED";
  objective: string;
  dailyBudget: number;
  spend: number;
  messages: number;
  cpr: number; // Cost Per Result (cost per message)
  impressions: number;
  clicks: number;
  ctr: number;
}

export interface AdAccountInfo {
  id: string;
  name: string;
  ownerName: string;
  status: "ACTIVE" | "PAUSED";
  currency: string;
  totalSpend: number;
  totalMessages: number;
  averageCpr: number;
  balance: number;
}

export interface AdsSummary {
  selectedAccountId: string;
  accounts: AdAccountInfo[];
  currency: string;
  datePreset: string;
  totalSpend: number;
  totalMessages: number;
  averageCpr: number;
  totalImpressions: number;
  totalClicks: number;
  averageCtr: number;
  accountBalance: number;
  campaigns: AdCampaign[];
  isDemo: boolean;
  statusMessage?: string;
}

// Pre-configured Generic Ad Accounts for Demo
const SAM_MOTO_ACCOUNTS: AdAccountInfo[] = [
  {
    id: "act_demo_01",
    name: "គណនីផ្សព្វផ្សាយទី ១ (Demo Account 1)",
    ownerName: "Business Manager",
    status: "ACTIVE",
    currency: "USD",
    totalSpend: 45.0,
    totalMessages: 90,
    averageCpr: 0.50,
    balance: 200.0,
  },
  {
    id: "act_demo_02",
    name: "គណនីផ្សព្វផ្សាយទី ២ (Demo Account 2)",
    ownerName: "Business Manager",
    status: "ACTIVE",
    currency: "USD",
    totalSpend: 30.0,
    totalMessages: 60,
    averageCpr: 0.50,
    balance: 150.0,
  },
];

// Pre-configured campaigns under demo accounts
const DEFAULT_CAMPAIGNS: AdCampaign[] = [
  {
    id: "cmp_demo_101",
    name: "[Video Campaign] ប្រូម៉ូសិនផលិតផលថ្មី",
    pageName: "Page Demo 1",
    adAccountId: "act_demo_01",
    adAccountName: "គណនីផ្សព្វផ្សាយទី ១",
    status: "ACTIVE",
    objective: "MESSAGES",
    dailyBudget: 15.0,
    spend: 25.0,
    messages: 50,
    cpr: 0.50,
    impressions: 12000,
    clicks: 750,
    ctr: 6.25,
  },
  {
    id: "cmp_demo_102",
    name: "[Engagement] ប្រឹក្សាព័ត៌មានលម្អិត",
    pageName: "Page Demo 1",
    adAccountId: "act_demo_01",
    adAccountName: "គណនីផ្សព្វផ្សាយទី ១",
    status: "ACTIVE",
    objective: "MESSAGES",
    dailyBudget: 10.0,
    spend: 20.0,
    messages: 40,
    cpr: 0.50,
    impressions: 8000,
    clicks: 400,
    ctr: 5.0,
  },
  {
    id: "cmp_demo_201",
    name: "[Lead Generation] យុទ្ធនាការទាក់ទាញអតិថិជន",
    pageName: "Page Demo 2",
    adAccountId: "act_demo_02",
    adAccountName: "គណនីផ្សព្វផ្សាយទី ២",
    status: "ACTIVE",
    objective: "OUTCOME_LEADS",
    dailyBudget: 12.0,
    spend: 18.0,
    messages: 36,
    cpr: 0.50,
    impressions: 9000,
    clicks: 500,
    ctr: 5.5,
  },
  {
    id: "cmp_demo_202",
    name: "[Branding] កសាងម៉ាកសញ្ញាអាជីវកម្ម",
    pageName: "Page Demo 2",
    adAccountId: "act_demo_02",
    adAccountName: "គណនីផ្សព្វផ្សាយទី ២",
    status: "PAUSED",
    objective: "REACH",
    dailyBudget: 8.0,
    spend: 12.0,
    messages: 24,
    cpr: 0.50,
    impressions: 6000,
    clicks: 300,
    ctr: 5.0,
  },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const datePreset = searchParams.get("datePreset") || "today";
    const selectedAccountId = searchParams.get("accountId") || "all";

    // 1. Fetch saved campaign status overrides from Supabase
    let statusOverrides: Record<string, "ACTIVE" | "PAUSED"> = {};
    let customAccountConfig: {
      account1Id?: string;
      account2Id?: string;
      accessToken?: string;
      currency?: string;
    } = {};

    try {
      const { data } = await supabase
        .from("bot_settings")
        .select("id, dm_template")
        .in("id", ["vst_ads_campaign_status", "vst_ads_config"]);

      if (Array.isArray(data)) {
        data.forEach((row) => {
          if (row.id === "vst_ads_campaign_status" && row.dm_template) {
            try {
              statusOverrides = JSON.parse(row.dm_template);
            } catch {}
          }
          if (row.id === "vst_ads_config" && row.dm_template) {
            try {
              customAccountConfig = JSON.parse(row.dm_template);
            } catch {}
          }
        });
      }
    } catch (e) {
      console.warn("Could not load ads settings from Supabase:", e);
    }

    // 2. Prepare campaigns list with status overrides applied
    let allCampaigns: AdCampaign[] = DEFAULT_CAMPAIGNS.map((c) => ({
      ...c,
      status: statusOverrides[c.id] || c.status,
    }));

    // Filter by selected account
    let filteredCampaigns = allCampaigns;
    if (selectedAccountId !== "all") {
      filteredCampaigns = allCampaigns.filter(
        (c) => c.adAccountId === selectedAccountId
      );
    }

    // Calculate aggregated metrics
    const totalSpend = filteredCampaigns.reduce((acc, c) => acc + c.spend, 0);
    const totalMessages = filteredCampaigns.reduce(
      (acc, c) => acc + c.messages,
      0
    );
    const totalImpressions = filteredCampaigns.reduce(
      (acc, c) => acc + c.impressions,
      0
    );
    const totalClicks = filteredCampaigns.reduce((acc, c) => acc + c.clicks, 0);
    const averageCpr = totalMessages > 0 ? totalSpend / totalMessages : 0;
    const averageCtr =
      totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

    // Accounts summary
    const accounts = SAM_MOTO_ACCOUNTS.map((acc) => {
      const accCampaigns = allCampaigns.filter(
        (c) => c.adAccountId === acc.id
      );
      const accSpend = accCampaigns.reduce((sum, c) => sum + c.spend, 0);
      const accMsg = accCampaigns.reduce((sum, c) => sum + c.messages, 0);
      return {
        ...acc,
        totalSpend: parseFloat(accSpend.toFixed(2)),
        totalMessages: accMsg,
        averageCpr: accMsg > 0 ? parseFloat((accSpend / accMsg).toFixed(2)) : 0,
      };
    });

    const summary: AdsSummary = {
      selectedAccountId,
      accounts,
      currency: customAccountConfig.currency || "USD",
      datePreset,
      totalSpend: parseFloat(totalSpend.toFixed(2)),
      totalMessages,
      averageCpr: parseFloat(averageCpr.toFixed(2)),
      totalImpressions,
      totalClicks,
      averageCtr: parseFloat(averageCtr.toFixed(2)),
      accountBalance: 325.5,
      campaigns: filteredCampaigns,
      isDemo: true,
      statusMessage: "គណនីផ្សព្វផ្សាយ Demo (មាន 2 Ad Accounts)",
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error in ads-manager GET:", error);
    return NextResponse.json(
      { error: "Failed to fetch ads manager data" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, campaignId, newStatus, account1Id, account2Id, accessToken, currency } = body;

    // Action 1: Toggle Campaign Status (ACTIVE <-> PAUSED)
    if (action === "toggle_campaign" && campaignId && newStatus) {
      // 1. Fetch existing status overrides from Supabase
      let statusMap: Record<string, string> = {};
      try {
        const { data } = await supabase
          .from("bot_settings")
          .select("dm_template")
          .eq("id", "vst_ads_campaign_status")
          .maybeSingle();

        if (data?.dm_template) {
          statusMap = JSON.parse(data.dm_template);
        }
      } catch {}

      // 2. Update status
      statusMap[campaignId] = newStatus;

      // 3. Save to Supabase
      await supabase.from("bot_settings").upsert(
        {
          id: "vst_ads_campaign_status",
          dm_template: JSON.stringify(statusMap),
          is_active: true,
        },
        { onConflict: "id" }
      );

      // 4. If Facebook Graph API access token is present, attempt live status update
      const token = accessToken || process.env.FB_PAGE_ACCESS_TOKEN;
      if (token && campaignId.startsWith("act_")) {
        try {
          await fetch(
            `https://graph.facebook.com/v19.0/${campaignId}?status=${newStatus}&access_token=${token}`,
            { method: "POST" }
          );
        } catch (e) {
          console.warn("Live Meta API toggle attempt:", e);
        }
      }

      return NextResponse.json({
        success: true,
        campaignId,
        newStatus,
        message: `បានកែសម្រួលស្ថានភាព Campaign ទៅ ${newStatus === "ACTIVE" ? "បើកដំណើរការ (Active)" : "ផ្អាក (Paused)"} ជោគជ័យ!`,
      });
    }

    // Action 2: Save Ad Accounts Configuration
    if (action === "save_config") {
      const payload = {
        account1Id: (account1Id || "").trim(),
        account2Id: (account2Id || "").trim(),
        accessToken: (accessToken || "").trim(),
        currency: currency || "USD",
        ownerName: "Business Manager",
        updatedAt: new Date().toISOString(),
      };

      await supabase.from("bot_settings").upsert(
        {
          id: "vst_ads_config",
          dm_template: JSON.stringify(payload),
          is_active: true,
        },
        { onConflict: "id" }
      );

      return NextResponse.json({
        success: true,
        message: "បានរក្សាទុកការកំណត់ Ad Accounts ជោគជ័យ!",
        config: payload,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Error in ads-manager POST:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process request" },
      { status: 500 }
    );
  }
}
