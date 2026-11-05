"use client";

import React, { useState, useEffect } from "react";
import {
  DollarSign,
  Megaphone,
  TrendingUp,
  RefreshCw,
  Settings,
  AlertCircle,
  CheckCircle2,
  Pause,
  Play,
  ExternalLink,
  Calendar,
  Eye,
  MessageSquare,
  Layers,
  Sparkles,
  HelpCircle,
  X,
  Search,
  User,
  Power,
  Sliders,
} from "lucide-react";
import { AdCampaign, AdsSummary, AdAccountInfo } from "@/app/api/ads-manager/route";

interface AdsManagerTabProps {
  lang: "km" | "en";
  isAdmin: boolean;
}

export default function AdsManagerTab({ lang, isAdmin }: AdsManagerTabProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<AdsSummary | null>(null);
  const [datePreset, setDatePreset] = useState<string>("today");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "PAUSED">("ALL");

  // Settings Modal State
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [account1Id, setAccount1Id] = useState("act_sammoto_01");
  const [account2Id, setAccount2Id] = useState("act_sammoto_02");
  const [accessToken, setAccessToken] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [savingConfig, setSavingConfig] = useState(false);
  const [configMessage, setConfigMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Toggling Campaign state
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchAdsData = async (preset = datePreset, accId = selectedAccountId) => {
    try {
      setRefreshing(true);
      const res = await fetch(`/api/ads-manager?datePreset=${preset}&accountId=${accId}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load ads data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAdsData(datePreset, selectedAccountId);
  }, [datePreset, selectedAccountId]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setConfigMessage(null);

    try {
      const res = await fetch("/api/ads-manager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_config",
          account1Id,
          account2Id,
          accessToken,
          currency,
        }),
      });

      const resJson = await res.json();
      if (res.ok) {
        setConfigMessage({
          type: "success",
          text: lang === "km" ? "បានរក្សាទុកការកំណត់ 2 Ad Accounts ជោគជ័យ!" : "Saved 2 Ad Accounts configuration!",
        });
        setTimeout(() => {
          setShowConfigModal(false);
          fetchAdsData(datePreset, selectedAccountId);
        }, 1200);
      } else {
        setConfigMessage({
          type: "error",
          text: resJson.error || "Failed to save configuration",
        });
      }
    } catch (err) {
      setConfigMessage({ type: "error", text: "Network error occurred." });
    } finally {
      setSavingConfig(false);
    }
  };

  // Immediate 1-Click Toggle for Campaign (ON / OFF)
  const handleToggleCampaign = async (campaign: AdCampaign) => {
    const newStatus = campaign.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    setTogglingId(campaign.id);

    // Optimistically update local UI immediately
    setData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        campaigns: prev.campaigns.map((c) =>
          c.id === campaign.id ? { ...c, status: newStatus } : c
        ),
      };
    });

    try {
      await fetch("/api/ads-manager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_campaign",
          campaignId: campaign.id,
          newStatus,
          accessToken,
        }),
      });
    } catch (err) {
      console.error("Failed to toggle campaign status:", err);
    } finally {
      setTogglingId(null);
    }
  };

  const filteredCampaigns = (data?.campaigns || []).filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.pageName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "ALL" ? true : c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-indigo-500/30 p-5 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/25">
              <Megaphone className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  Meta Ads Manager
                </h2>
                <span className="flex items-center gap-1 text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2.5 py-0.5 rounded-full">
                  <User className="h-3 w-3" />
                  <span>គណនី Ad Accounts</span>
                </span>
                <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  ● ភ្ជាប់រួចរាល់
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {lang === "km"
                  ? "តាមដាន និងបញ្ជាបិទ/បើកយុទ្ធនាការ Ads លើគណនី Facebook Ads របស់អ្នក"
                  : "Monitor and toggle campaigns on your Facebook Ad Accounts"}
              </p>
            </div>
          </div>
        </div>

        {/* Date Filter & Settings */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Preset Filter */}
          <div className="flex items-center bg-slate-800/90 border border-slate-700/80 rounded-xl p-1 text-xs">
            {[
              { id: "today", label: lang === "km" ? "ថ្ងៃនេះ" : "Today" },
              { id: "yesterday", label: lang === "km" ? "ម្សិលមិញ" : "Yesterday" },
              { id: "last_7d", label: lang === "km" ? "៧ ថ្ងៃ" : "Last 7D" },
              { id: "this_month", label: lang === "km" ? "ខែនេះ" : "This Month" },
            ].map((preset) => (
              <button
                key={preset.id}
                onClick={() => setDatePreset(preset.id)}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  datePreset === preset.id
                    ? "bg-indigo-600 text-white shadow-sm font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => fetchAdsData(datePreset, selectedAccountId)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-blue-400" : ""}`} />
            <span>{refreshing ? (lang === "km" ? "កំពុងទាញ..." : "Refreshing...") : "Refresh"}</span>
          </button>

          {/* Config Settings Button */}
          {isAdmin && (
            <button
              onClick={() => setShowConfigModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition"
            >
              <Settings className="h-3.5 w-3.5" />
              <span>{lang === "km" ? "កំណត់ Ad Accounts" : "Ad Accounts Setup"}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2 AD ACCOUNTS SELECTOR TABS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Account 1 Tab */}
        <div
          onClick={() => setSelectedAccountId("act_sammoto_01")}
          className={`p-4 rounded-2xl border cursor-pointer transition relative overflow-hidden ${
            selectedAccountId === "act_sammoto_01"
              ? "bg-gradient-to-r from-blue-950/80 to-slate-900 border-blue-500 shadow-lg shadow-blue-950/50"
              : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-bold text-white flex items-center gap-1.5">
              <span>🏢 គណនីទី ១ (Ad Account 1)</span>
            </span>
            <span className="text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full">
              Account 1
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <div>
              <div className="text-lg font-black text-white">$46.70</div>
              <div className="text-[11px] text-slate-400">ចំណាយថ្ងៃនេះ • 86 ឆាត</div>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-emerald-400">$0.54</span>
              <div className="text-[10px] text-slate-500">CPR មធ្យម</div>
            </div>
          </div>
          {selectedAccountId === "act_sammoto_01" && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-400"></div>
          )}
        </div>

        {/* Account 2 Tab */}
        <div
          onClick={() => setSelectedAccountId("act_sammoto_02")}
          className={`p-4 rounded-2xl border cursor-pointer transition relative overflow-hidden ${
            selectedAccountId === "act_sammoto_02"
              ? "bg-gradient-to-r from-purple-950/80 to-slate-900 border-purple-500 shadow-lg shadow-purple-950/50"
              : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-bold text-white flex items-center gap-1.5">
              <span>🏢 គណនីទី ២ (Ad Account 2)</span>
            </span>
            <span className="text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full">
              Account 2
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <div>
              <div className="text-lg font-black text-white">$33.60</div>
              <div className="text-[11px] text-slate-400">ចំណាយថ្ងៃនេះ • 61 ឆាត</div>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-emerald-400">$0.55</span>
              <div className="text-[10px] text-slate-500">CPR មធ្យម</div>
            </div>
          </div>
          {selectedAccountId === "act_sammoto_02" && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
          )}
        </div>

        {/* Both Accounts Combined Tab */}
        <div
          onClick={() => setSelectedAccountId("all")}
          className={`p-4 rounded-2xl border cursor-pointer transition relative overflow-hidden ${
            selectedAccountId === "all"
              ? "bg-gradient-to-r from-indigo-950/80 to-slate-900 border-indigo-500 shadow-lg shadow-indigo-950/50"
              : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-bold text-white flex items-center gap-1.5">
              <span>🌐 រួមបញ្ចូលគណនីទាំង ២</span>
            </span>
            <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              All 2 Accounts
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <div>
              <div className="text-lg font-black text-cyan-300">$80.30</div>
              <div className="text-[11px] text-slate-400">សរុបចំណាយ • 147 ឆាត</div>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-emerald-400">$0.54</span>
              <div className="text-[10px] text-slate-500">CPR សរុប</div>
            </div>
          </div>
          {selectedAccountId === "all" && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-teal-400"></div>
          )}
        </div>
      </div>

      {/* 4 Big KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Spend */}
        <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-900/40 p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{lang === "km" ? "ចំណាយសរុប (Total Spend)" : "Total Spend"}</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white mt-2">
            ${data?.totalSpend.toFixed(2) || "0.00"}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span className="text-emerald-400 font-semibold flex items-center">
              <TrendingUp className="h-3 w-3 inline mr-0.5" /> 100%
            </span>
            <span>{selectedAccountId === "all" ? "គណនីទាំង ២ បូកបញ្ចូលគ្នា" : "សម្រាប់គណនីដែលបានរើស"}</span>
          </div>
        </div>

        {/* Card 2: Total Messaging Conversations */}
        <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-900/40 p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{lang === "km" ? "ចំនួនឆាតទទួលបាន (Messages)" : "Messaging Results"}</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <MessageSquare className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {data?.totalMessages || 0} <span className="text-xs font-normal text-slate-400">ឆាត</span>
          </div>
          <div className="text-[11px] text-blue-400 mt-1 font-medium">
            ភ្ញៀវឆាតចូល Messenger ផ្ទាល់
          </div>
        </div>

        {/* Card 3: CPR - Cost Per Result */}
        <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-900/40 p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{lang === "km" ? "ថ្លៃឆាតមួយ (Cost Per Message)" : "Cost Per Result (CPR)"}</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white mt-2">
            ${data?.averageCpr.toFixed(2) || "0.00"}
          </div>
          <div className="text-[11px] text-emerald-400 mt-1 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{data && data.averageCpr < 0.6 ? "តម្លៃល្អចំណេញខ្ពស់ (< $0.60)" : "ស្ថិតិមធ្យម"}</span>
          </div>
        </div>

        {/* Card 4: Impressions & Clicks */}
        <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-900/40 p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{lang === "km" ? "ការមើលឃើញ & ចុច (Reach)" : "Impressions & Clicks"}</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Eye className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {(data?.totalImpressions || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>{data?.totalClicks.toLocaleString() || 0} Clicks</span>
            <span className="text-indigo-400 font-bold">{data?.averageCtr.toFixed(1) || 0}% CTR</span>
          </div>
        </div>
      </div>

      {/* CAMPAIGNS TABLE WITH DIRECT ON/OFF SWITCH */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        {/* Table Filter & Search Header */}
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-blue-400" />
              <span>យុទ្ធនាការផ្សាយពាណិជ្ជកម្ម (Ad Campaigns)</span>
            </h3>
            <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full font-mono">
              {filteredCampaigns.length}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Status Filter Buttons */}
            <div className="flex items-center bg-slate-800/80 rounded-xl p-0.5 text-xs">
              <button
                onClick={() => setStatusFilter("ALL")}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  statusFilter === "ALL" ? "bg-slate-700 text-white font-bold" : "text-slate-400"
                }`}
              >
                ទាំងអស់
              </button>
              <button
                onClick={() => setStatusFilter("ACTIVE")}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  statusFilter === "ACTIVE" ? "bg-emerald-600 text-white font-bold" : "text-slate-400"
                }`}
              >
                កំពុងរត់ (Active)
              </button>
              <button
                onClick={() => setStatusFilter("PAUSED")}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  statusFilter === "PAUSED" ? "bg-rose-600 text-white font-bold" : "text-slate-400"
                }`}
              >
                បានផ្អាក (Paused)
              </button>
            </div>

            {/* Search Box */}
            <div className="relative flex-1 sm:w-48">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="ស្វែងរក Campaign..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/40 text-slate-400 font-medium uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">ឈ្មោះ Campaign</th>
                <th className="py-3 px-4">គណនី Ads</th>
                <th className="py-3 px-4">Page គោលដៅ</th>
                <th className="py-3 px-4">ស្ថានភាព (បិទ/បើក)</th>
                <th className="py-3 px-4">ថវិកា / ថ្ងៃ</th>
                <th className="py-3 px-4">បានចំណាយ</th>
                <th className="py-3 px-4">ឆាតចូល</th>
                <th className="py-3 px-4">ថ្លៃឆាតមួយ</th>
                <th className="py-3 px-4 text-right">ប៊ូតុងបញ្ជា</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filteredCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    មិនមាន Campaign ត្រូវនឹងការស្វែងរកឡើយ
                  </td>
                </tr>
              ) : (
                filteredCampaigns.map((camp) => (
                  <tr key={camp.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4 font-semibold text-white max-w-[240px]">
                      <div className="truncate" title={camp.name}>
                        {camp.name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">ID: {camp.id}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] font-medium border border-slate-700 text-cyan-300">
                        {camp.adAccountName}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <span className="bg-slate-800 px-2 py-0.5 rounded text-[11px] border border-slate-700">
                        {camp.pageName}
                      </span>
                    </td>

                    {/* STATUS WITH EASY TOGGLE SWITCH */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleCampaign(camp)}
                        disabled={togglingId === camp.id}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition shadow-sm ${
                          camp.status === "ACTIVE"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
                            : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"
                        }`}
                        title="ចុចដើម្បី បិទ ឬ បើក Campaign"
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            camp.status === "ACTIVE"
                              ? "bg-emerald-400 animate-pulse"
                              : "bg-slate-500"
                          }`}
                        />
                        <span>{camp.status === "ACTIVE" ? "🟢 ACTIVE" : "⏸️ PAUSED"}</span>
                      </button>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-medium text-slate-300">
                      ${camp.dailyBudget.toFixed(2)}/ថ្ងៃ
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      ${camp.spend.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-cyan-300 text-sm">{camp.messages}</span>
                      <span className="text-[10px] text-slate-500 ml-1">ឆាត</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold">
                      <span
                        className={`px-2 py-0.5 rounded ${
                          camp.cpr < 0.6
                            ? "text-emerald-400 bg-emerald-950/60"
                            : "text-amber-300 bg-amber-950/60"
                        }`}
                      >
                        ${camp.cpr.toFixed(2)}
                      </span>
                    </td>

                    {/* ACTION BUTTON: DIRECT ON/OFF BUTTON */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleToggleCampaign(camp)}
                          disabled={togglingId === camp.id}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition border ${
                            camp.status === "ACTIVE"
                              ? "bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/25"
                              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25"
                          }`}
                        >
                          {togglingId === camp.id ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : camp.status === "ACTIVE" ? (
                            <>
                              <Pause className="h-3 w-3" />
                              <span>បិទ (Pause)</span>
                            </>
                          ) : (
                            <>
                              <Play className="h-3 w-3" />
                              <span>បើក (Active)</span>
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Meta Ad Account Settings Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-[#0f172a] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  <Settings className="h-4 w-4" />
                </div>
                <h3 className="text-base font-bold text-white">
                  ការកំណត់ 2 Ad Accounts
                </h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              {/* Ad Account 1 ID */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Ad Account 1 ID:
                </label>
                <input
                  type="text"
                  placeholder="act_1234567890"
                  value={account1Id}
                  onChange={(e) => setAccount1Id(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Ad Account 2 ID */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Ad Account 2 ID:
                </label>
                <input
                  type="text"
                  placeholder="act_0987654321"
                  value={account2Id}
                  onChange={(e) => setAccount2Id(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Meta Access Token */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Meta Access Token:
                </label>
                <input
                  type="password"
                  placeholder="EAABw..."
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Currency */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  រូបិយប័ណ្ណ (Currency):
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="USD">USD ($) - ដុល្លារអាមេរិក</option>
                  <option value="KHR">KHR (៛) - រៀលខ្មែរ</option>
                </select>
              </div>

              {/* Feedback Message */}
              {configMessage && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    configMessage.type === "success"
                      ? "bg-emerald-950/60 border border-emerald-500/40 text-emerald-300"
                      : "bg-rose-950/60 border border-rose-500/40 text-rose-300"
                  }`}
                >
                  {configMessage.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  )}
                  <span>{configMessage.text}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  បោះបង់
                </button>
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2"
                >
                  {savingConfig ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : null}
                  <span>{savingConfig ? "កំពុងរក្សាទុក..." : "រក្សាទុកការកំណត់"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
