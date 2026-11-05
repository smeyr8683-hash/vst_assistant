"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  Sparkles,
  Layers,
  Send,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Film,
  Image as ImageIcon,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  Play,
  History,
  ArrowRight,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { Language } from "@/lib/i18n";

interface ConnectedPage {
  id: string;
  name: string;
  category?: string;
  picture?: string | null;
  ownerName?: string;
  hasToken?: boolean;
}

interface BatchMediaItem {
  id: string;
  file: File;
  previewUrl: string;
  mediaType: "photo" | "video";
  caption: string;
  title: string;
  status: "idle" | "uploading" | "success" | "error";
  postId?: string;
  errorMessage?: string;
}

interface StoryBatchPublisherTabProps {
  lang: Language;
  connectedPages?: ConnectedPage[];
  currentUser?: {
    id?: string;
    name?: string;
    role?: string;
    loginType?: string;
  };
  isAdmin?: boolean;
}

const STORY_FUNNEL_PRESETS = [
  {
    step: "Story ១: បញ្ហា",
    title: "រោគសញ្ញា & បញ្ហាសុខភាព",
    caption:
      "⚠️ កុំមើលរំលងរោគសញ្ញាព្រមានទាំងនេះ!\n• ធ្លាក់/ស មានក្លិនមិនល្អ រមាស់ទ្វារ.មាស\n• នោមញឹកពេលយប់ នោមទាស់ ចុកចង្កេះ\n\n👉 ពិនិត្យសុខភាពមុនពេលយឺតពេល!",
  },
  {
    step: "Story ២: ដំណោះស្រាយ",
    title: "ផលិតផល & គុណភាពស្ដង់ដារ",
    caption:
      "🌿 ដំណោះស្រាយធម្មជាតិ ទុកចិត្តបាន ១០០%!\nផ្សំពីរុក្ខជាតិឱសថធម្មជាតិជំនួយសុខភាពចំគោលដៅ គ្មានផលប៉ះពាល់ និងមានប្រសិទ្ធភាពខ្ពស់។",
  },
  {
    step: "Story ៣: Feedback",
    title: "មតិកោតសរសើរអតិថិជនពិត",
    caption:
      "⭐⭐⭐⭐⭐ អរគុណអតិថិជនជាច្រើនដែលបានជ្រើសរើស និងផ្ញើសារអរគុណមកកាន់យើងខ្ញុំ! ប្រើត្រូវ ធូរស្បើយ និងមានទំនុកចិត្តឡើងវិញ។",
  },
  {
    step: "Story ៤: ប្រូម៉ូសិន",
    title: "ប្រូម៉ូសិនពិសេស & កម្ម៉ង់ឥឡូវនេះ",
    caption:
      "🎁 ប្រូម៉ូសិនពិសេសសម្រាប់តែថ្ងៃនេះប៉ុណ្ណោះ!\n• ទិញ ២ ថែម ១\n• ដឹកជញ្ជូនឥតគិតថ្លៃ ២៥ ខេត្តក្រុង\n\n📩 ឆាតមកឥឡូវនេះ ឬទាក់ទងមកយើងខ្ញុំដើម្បីទទួលបានការប្រឹក្សាឥតគិតថ្លៃ!",
  },
];

export default function StoryBatchPublisherTab({
  lang,
  connectedPages = [],
  currentUser,
  isAdmin,
}: StoryBatchPublisherTabProps) {
  const isSuperAdmin =
    Boolean(isAdmin) ||
    currentUser?.role === "owner" ||
    currentUser?.loginType === "admin" ||
    currentUser?.name === "VST Super Admin";

  // 1. Pages state (Supports selecting multiple pages freely)
  const [pagesList, setPagesList] = useState<ConnectedPage[]>(connectedPages);
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>("all");

  const memberNames = Array.from(
    new Set(pagesList.map((p) => p.ownerName || (p as any).memberName).filter(Boolean))
  ) as string[];

  const displayedPages =
    !isSuperAdmin
      ? pagesList
      : selectedMemberFilter === "all"
      ? pagesList
      : pagesList.filter(
          (p) => (p.ownerName || (p as any).memberName) === selectedMemberFilter
        );

  const togglePageSelect = (id: string) => {
    setSelectedPageIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const selectAllDisplayed = () => {
    const displayedIds = displayedPages.map((p) => p.id);
    setSelectedPageIds((prev) => Array.from(new Set([...prev, ...displayedIds])));
  };

  const deselectAllDisplayed = () => {
    const displayedIds = displayedPages.map((p) => p.id);
    setSelectedPageIds((prev) => prev.filter((id) => !displayedIds.includes(id)));
  };

  // 2. Publish Destination & Delay Configuration
  const [publishDestination, setPublishDestination] = useState<"story" | "feed">("story");
  const [feedDelayMinutes, setFeedDelayMinutes] = useState<number>(3); // 0 = instant, 1, 3, 5, 10

  // 3. Batch Queue
  const [batchItems, setBatchItems] = useState<BatchMediaItem[]>([]);
  const [masterStoryTheme, setMasterStoryTheme] = useState<string>("");

  // 4. Publishing execution state
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [publishProgress, setPublishProgress] = useState<{
    current: number;
    total: number;
    statusText: string;
    percent: number;
  } | null>(null);

  // 5. History State
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [isGeneratingAiCaptions, setIsGeneratingAiCaptions] = useState<boolean>(false);
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load live pages from API
  useEffect(() => {
    let isMounted = true;
    const fetchPages = async () => {
      try {
        const query = isSuperAdmin
          ? "?action=pages&isAdmin=true"
          : `?action=pages&userId=${encodeURIComponent(currentUser?.id || "")}&userName=${encodeURIComponent(currentUser?.name || "")}`;

        const res = await fetch(`/api/video-publisher${query}`);
        if (res.ok) {
          const data = await res.json();
          if (data.pages && Array.isArray(data.pages)) {
            if (!isMounted) return;
            let validPages = data.pages;

            // Strict client-side isolation for non-admin
            if (!isSuperAdmin) {
              const curName = currentUser?.name?.toLowerCase();
              const curId = currentUser?.id;
              validPages = validPages.filter((p: any) =>
                (curName && (p.memberName || p.ownerName)?.toLowerCase() === curName) ||
                (curId && (p.userId === curId || p.ownerId === curId))
              );
            }

            setPagesList(validPages);
            if (!isSuperAdmin && currentUser?.name) {
              setSelectedMemberFilter(currentUser.name);
            }
            return;
          }
        }
      } catch (err) {
        console.warn("Could not load pages:", err);
      }

      if (connectedPages && connectedPages.length > 0) {
        setPagesList(connectedPages);
      } else if (!isSuperAdmin) {
        setPagesList([]);
      }
    };

    fetchPages();
    return () => {
      isMounted = false;
    };
  }, [currentUser?.name, currentUser?.id, isSuperAdmin, connectedPages]);

  // Load history
  const loadHistory = async () => {
    try {
      const res = await fetch("/api/story-publisher?action=history");
      if (res.ok) {
        const data = await res.json();
        if (data.history) setHistoryList(data.history);
      }
    } catch (e) {
      console.warn("Could not load story history:", e);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // Handle Multi-file selection (both photos & videos)
  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems: BatchMediaItem[] = [];
    Array.from(files).forEach((file, idx) => {
      const isVid = file.type.startsWith("video/");
      const isImg = file.type.startsWith("image/");

      if (!isVid && !isImg) return;

      const url = URL.createObjectURL(file);
      const cleanName = file.name.replace(/\.[^/.]+$/, "");

      // For Story, no caption needed (leave blank). For Feed, can assign preset or title.
      const preset = STORY_FUNNEL_PRESETS[(batchItems.length + idx) % STORY_FUNNEL_PRESETS.length];

      newItems.push({
        id: `batch_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 5)}`,
        file,
        previewUrl: url,
        mediaType: isVid ? "video" : "photo",
        caption: publishDestination === "story" ? "" : (preset ? preset.caption : cleanName),
        title: cleanName,
        status: "idle",
      });
    });

    setBatchItems((prev) => [...prev, ...newItems]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Remove item from batch
  const removeItem = (id: string) => {
    setBatchItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Apply sequential story funnel template to all items
  const applyStoryFunnelToAll = () => {
    setBatchItems((prev) =>
      prev.map((item, idx) => {
        const preset = STORY_FUNNEL_PRESETS[idx % STORY_FUNNEL_PRESETS.length];
        return {
          ...item,
          caption: preset ? `${preset.caption}` : item.caption,
          title: preset ? preset.title : item.title,
        };
      })
    );
  };

  // Trigger Gemini AI Caption Generation for all items in batch
  const handleGenerateAiCaptions = async () => {
    if (batchItems.length === 0 || selectedPageIds.length === 0) return;
    setIsGeneratingAiCaptions(true);

    try {
      const firstPage = pagesList.find((p) => p.id === selectedPageIds[0]);
      const pageName = firstPage?.name || "Our Page";

      // Call AI Caption Generator
      const res = await fetch("/api/video-publisher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_captions",
          videoTitle: masterStoryTheme || "Story ផ្សព្វផ្សាយពិសេស",
          videoContent: masterStoryTheme || "ប្រូម៉ូសិនពិសេស និងចំណេះដឹងសុខភាព",
          baseTopic: masterStoryTheme || "សុខភាព និងទំនុកចិត្ត",
          captionStyle: "promotion",
          pages: [{ id: selectedPageIds[0], name: pageName }],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const baseCaption = data.captions?.[selectedPageIds[0]];
        if (baseCaption) {
          setBatchItems((prev) =>
            prev.map((item, idx) => {
              const funnelPrefix = STORY_FUNNEL_PRESETS[idx % STORY_FUNNEL_PRESETS.length]?.step || `Slide ${idx + 1}`;
              return {
                ...item,
                caption: `✨ [${funnelPrefix}]\n${baseCaption}\n\n#Story${idx + 1} #${pageName.replace(/\s+/g, "")}`,
              };
            })
          );
        }
      }
    } catch (err) {
      console.warn("AI Caption error:", err);
    } finally {
      setIsGeneratingAiCaptions(false);
    }
  };

  // Execute Batch / Story Publishing across all selected pages
  const handlePublishBatch = async () => {
    if (selectedPageIds.length === 0) {
      alert("សូមជ្រើសរើស Page យ៉ាងហោចណាស់ ១ សម្រាប់ផុស!");
      return;
    }

    if (batchItems.length === 0) {
      alert("សូម Upload រូបភាព ឬវីដេអូយ៉ាងហោចណាស់ ១ ចូលក្នុងបញ្ជី!");
      return;
    }

    setIsPublishing(true);
    const totalPages = selectedPageIds.length;
    const totalItems = batchItems.length;
    const grandTotalSteps = totalPages * totalItems;
    let overallStep = 0;

    setPublishProgress({
      current: 0,
      total: grandTotalSteps,
      percent: 0,
      statusText: `កំពុងរៀបចំផុសទៅកាន់ ${totalPages} Pages (សរុប ${totalItems} ឯកសារក្នុងមួយ Page)...`,
    });

    for (let pIdx = 0; pIdx < selectedPageIds.length; pIdx++) {
      const pId = selectedPageIds[pIdx];
      const targetPage = pagesList.find((p) => p.id === pId);
      if (!targetPage) continue;

      let completedCount = 0;
      const historyItemResults: any[] = [];

      for (let i = 0; i < batchItems.length; i++) {
        const item = batchItems[i];
        overallStep++;

        setPublishProgress({
          current: overallStep,
          total: grandTotalSteps,
          percent: Math.round(((overallStep - 0.5) / grandTotalSteps) * 100),
          statusText: `[Page ${pIdx + 1}/${totalPages}: ${targetPage.name}] កំពុង Upload ${publishDestination === "story" ? "Story Slide" : "Post"} ទី ${i + 1}/${totalItems}...`,
        });

        // Update item status on current item
        setBatchItems((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, status: "uploading" } : it))
        );

        try {
          let finalPostId: string | undefined = undefined;

          // A. RESUMABLE CHUNKED UPLOAD FOR VIDEO STORIES (Bypasses Vercel 4.5MB limit)
          if (publishDestination === "story" && item.mediaType === "video") {
            const fileSize = item.file.size;
            const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB slices
            const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);

            // Step 1: Start Video Story Session
            const startRes = await fetch("/api/story-publisher", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "resumable_story_start",
                pageId: pId,
              }),
            });
            const startText = await startRes.text();
            let startData: any = {};
            try {
              startData = JSON.parse(startText);
            } catch {
              throw new Error(startText.slice(0, 100));
            }

            if (!startRes.ok || !startData.upload_url || !startData.video_id) {
              throw new Error(startData?.error || "មិនអាចបង្កើត Upload Session សម្រាប់ Story បានទេ");
            }

            const { upload_url, video_id } = startData;

            // Step 2: Transfer 2MB Chunks Sequentially
            let startOffset = 0;
            let chunkIdx = 0;
            while (startOffset < fileSize) {
              const endOffset = Math.min(startOffset + CHUNK_SIZE, fileSize);
              const chunkBlob = item.file.slice(startOffset, endOffset);

              setPublishProgress({
                current: overallStep,
                total: grandTotalSteps,
                percent: Math.min(
                  99,
                  Math.round(((overallStep - 1 + endOffset / fileSize) / grandTotalSteps) * 100)
                ),
                statusText: `[Page ${pIdx + 1}/${totalPages}: ${targetPage.name}] កំពុង Upload Chunk (${chunkIdx + 1}/${totalChunks}) នៃ Story ទី ${i + 1}/${totalItems}...`,
              });

              const chunkForm = new FormData();
              chunkForm.append("action", "resumable_story_transfer");
              chunkForm.append("pageId", pId);
              chunkForm.append("upload_url", upload_url);
              chunkForm.append("start_offset", startOffset.toString());
              chunkForm.append("file_size", fileSize.toString());
              chunkForm.append("chunk", chunkBlob, "chunk.mp4");

              const transferRes = await fetch("/api/story-publisher", {
                method: "POST",
                body: chunkForm,
              });
              const transferText = await transferRes.text();
              let transferData: any = {};
              try {
                transferData = JSON.parse(transferText);
              } catch {
                throw new Error(transferText.slice(0, 100));
              }

              if (!transferRes.ok || transferData.error) {
                const errDetail = transferData?.error?.message || transferData?.error || "Transfer failed";
                throw new Error(`Chunk (${chunkIdx + 1}/${totalChunks}): ${errDetail}`);
              }

              chunkIdx++;
              startOffset = endOffset;
            }

            // Step 3: Finish and Publish Video Story
            const finishRes = await fetch("/api/story-publisher", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "resumable_story_finish",
                pageId: pId,
                video_id,
              }),
            });
            const finishText = await finishRes.text();
            let finishData: any = {};
            try {
              finishData = JSON.parse(finishText);
            } catch {
              throw new Error(finishText.slice(0, 100));
            }

            if (!finishRes.ok || (!finishData.success && !finishData.postId)) {
              throw new Error(finishData?.error || "Failed to finalize video story");
            }
            finalPostId = finishData.postId || video_id;

          // B. RESUMABLE CHUNKED UPLOAD FOR FEED VIDEOS (> 3MB)
          } else if (publishDestination === "feed" && item.mediaType === "video" && item.file.size > 3 * 1024 * 1024) {
            const fileSize = item.file.size;
            const CHUNK_SIZE = 2 * 1024 * 1024;
            const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);

            const startRes = await fetch("/api/video-publisher", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "resumable_start",
                pageId: pId,
                fileSize,
              }),
            });
            const startData = await startRes.json();
            if (!startRes.ok || !startData.upload_session_id) {
              throw new Error(startData?.error?.message || startData?.error || "Failed to initialize video session");
            }

            const sessionId = startData.upload_session_id;
            let startOffset = Number(startData.start_offset || 0);
            let chunkIdx = 0;

            while (startOffset < fileSize) {
              const endOffset = Math.min(startOffset + CHUNK_SIZE, fileSize);
              const chunkBlob = item.file.slice(startOffset, endOffset);

              const chunkForm = new FormData();
              chunkForm.append("action", "resumable_transfer");
              chunkForm.append("pageId", pId);
              chunkForm.append("upload_session_id", sessionId);
              chunkForm.append("start_offset", startOffset.toString());
              chunkForm.append("chunk", chunkBlob, "chunk.mp4");

              const transferRes = await fetch("/api/video-publisher", {
                method: "POST",
                body: chunkForm,
              });
              const transferData = await transferRes.json();
              if (!transferRes.ok || transferData.error) {
                throw new Error(transferData?.error?.message || "Chunk transfer error");
              }
              chunkIdx++;
              startOffset = endOffset;
            }

            const finishRes = await fetch("/api/video-publisher", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "resumable_finish",
                pageId: pId,
                upload_session_id: sessionId,
                title: item.title || "Video Post",
                description: item.caption || "",
              }),
            });
            const finishData = await finishRes.json();
            if (!finishRes.ok || !finishData.success) {
              throw new Error(finishData?.error?.message || "Failed to finish video post");
            }
            finalPostId = finishData.videoId || finishData.id;

          // C. DIRECT UPLOAD FOR PHOTOS OR SMALL FILES (< 3MB)
          } else {
            const formData = new FormData();
            formData.append("pageId", pId);
            formData.append("file", item.file, item.file.name);
            formData.append("mediaType", item.mediaType);
            formData.append("caption", item.caption || "");
            formData.append("title", item.title || "");

            if (publishDestination === "story") {
              formData.append("action", "publish_photo_story");
            } else {
              formData.append("action", "publish_feed");
            }

            const res = await fetch("/api/story-publisher", {
              method: "POST",
              body: formData,
            });

            const resText = await res.text();
            let data: any = {};
            try {
              data = JSON.parse(resText);
            } catch {
              throw new Error(resText.slice(0, 100) || `HTTP Error ${res.status}`);
            }

            if (!res.ok || (!data.success && !data.postId)) {
              throw new Error(data.error || "ការផុសបរាជ័យ");
            }
            finalPostId = data.postId || data.id;
          }

          // SUCCESS
          completedCount++;
          setBatchItems((prev) =>
            prev.map((it) =>
              it.id === item.id ? { ...it, status: "success", postId: finalPostId } : it
            )
          );

          historyItemResults.push({
            id: item.id,
            mediaType: item.mediaType,
            status: "success",
            postId: finalPostId,
            preview: item.caption.slice(0, 50) + "...",
          });
        } catch (err: any) {
          const errMessage = err.message || "Network Error";
          setBatchItems((prev) =>
            prev.map((it) =>
              it.id === item.id
                ? { ...it, status: "error", errorMessage: errMessage }
                : it
            )
          );

          historyItemResults.push({
            id: item.id,
            mediaType: item.mediaType,
            status: "error",
            message: errMessage,
          });
        }

        // Small pause between items
        if (publishDestination === "feed" && feedDelayMinutes > 0 && i < batchItems.length - 1) {
          setPublishProgress((prev) => ({
            ...prev!,
            statusText: `⏳ [${targetPage.name}] រង់ចាំចន្លោះពេលសុវត្ថិភាព Meta (${feedDelayMinutes} នាទី)...`,
          }));
          await new Promise((r) => setTimeout(r, feedDelayMinutes * 60 * 1000));
        } else {
          await new Promise((r) => setTimeout(r, 1200));
        }
      }

      // Record history per page
      const record = {
        id: `batch_${Date.now()}_${pIdx}`,
        targetPageId: pId,
        targetPageName: targetPage.name,
        publishType: publishDestination,
        totalItems,
        successCount: completedCount,
        publishedAt: new Date().toISOString(),
        items: historyItemResults,
      };

      try {
        await fetch("/api/story-publisher", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "save_history", record }),
        });
      } catch {}
    }

    setPublishProgress({
      current: grandTotalSteps,
      total: grandTotalSteps,
      percent: 100,
      statusText: `🎉 បានផុសបញ្ចប់ទៅកាន់ ${selectedPageIds.length} Pages ជោគជ័យ!`,
    });
    loadHistory();
    setIsPublishing(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* HEADER BANNER */}
      <div className="relative overflow-hidden rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-[#0d1c33] via-[#091526] to-[#0d1322] p-6 shadow-2xl backdrop-blur-xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-400">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              <span>Facebook Page Stories & Batch Multi-Post System</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>ផុស Story & Multi-Post ក្នុង Page តែមួយ</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold">
                Pro
              </span>
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              ជ្រើសរើសរូបភាព ឬវីដេអូច្រើនក្នុងពេលតែមួយ ហើយផុសចូល **Facebook Page Story** (២៤ ម៉ោង)
              រៀបតាមលំដាប់លំដោយ ឬផុសជា **Multi-Post ចូល Page Feed** ដោយមានប្រព័ន្ធកំណត់ចន្លោះពេល (Interval Delay) ជៀសវាងការចោទប្រកាន់ថា Spam ដោយ Meta។
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-200 transition shadow-sm"
            >
              <History className="h-4 w-4 text-cyan-400" />
              <span>{showHistory ? "លាក់ប្រវត្តិ" : "មើលប្រវត្តិផុស"}</span>
              <span className="rounded-full bg-slate-700 px-1.5 py-0.2 text-[10px] text-cyan-300">
                {historyList.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* HISTORY DRAWER / VIEW */}
      {showHistory && (
        <div className="rounded-2xl border border-cyan-500/20 bg-slate-900/90 p-5 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <History className="h-4 w-4 text-cyan-400" />
              <span>ប្រវត្តិការផុស Story & Multi-Post ថ្មីៗ</span>
            </h3>
            <button
              onClick={() => setShowHistory(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕ បិទ
            </button>
          </div>

          {historyList.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              មិនទាន់មានប្រវត្តិផុស Story ឬ Batch នៅឡើយទេ
            </p>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {historyList.map((rec) => (
                <div
                  key={rec.id}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs hover:border-slate-700"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{rec.targetPageName}</span>
                      <span
                        className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                          rec.publishType === "story"
                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                            : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                        }`}
                      >
                        {rec.publishType === "story" ? "🌟 Page Story" : "🎬 Page Feed"}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {new Date(rec.publishedAt).toLocaleString("km-KH")} • ជោគជ័យ:{" "}
                      <span className="text-emerald-400 font-bold">
                        {rec.successCount}/{rec.totalItems}
                      </span>
                    </div>
                  </div>

                  <a
                    href={`https://facebook.com/${rec.targetPageId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 hover:underline"
                  >
                    <span>មើលលើ Facebook</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MAIN WORKSPACE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: TARGET PAGE & SETTINGS */}
        <div className="space-y-5">
          {/* 1. Target Page Selector (Multi-select with Member filter & Select All) */}
          <div className="rounded-2xl border border-slate-800 bg-[#0B1220] p-5 shadow-lg space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-white flex items-center gap-2">
                  <span>១. ជ្រើសរើស Facebook Pages ({pagesList.length} Pages)</span>
                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                </label>
                <span className="text-[10px] text-cyan-400">
                  ● អាចជ្រើសរើសច្រើន Page តាមចិត្តក្នុងពេលតែមួយ
                </span>
              </div>
              <span className="text-[11px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2.5 py-0.5 rounded-full font-mono">
                {selectedPageIds.length}/{pagesList.length} Pages
              </span>
            </div>

            {/* Member Filter Pills (Super Admin Only) */}
            {isSuperAdmin && memberNames.length > 1 && (
              <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedMemberFilter("all")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition text-[11px] ${
                    selectedMemberFilter === "all"
                      ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold shadow"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  ទាំងអស់ ({pagesList.length})
                </button>
                {memberNames.map((mName) => {
                  const mPagesCount = pagesList.filter(
                    (p) => (p.ownerName || (p as any).memberName) === mName
                  ).length;
                  return (
                    <button
                      key={mName}
                      type="button"
                      onClick={() => setSelectedMemberFilter(mName)}
                      className={`px-2.5 py-1 rounded-lg font-medium transition text-[11px] flex items-center gap-1 ${
                        selectedMemberFilter === mName
                          ? "bg-cyan-600 text-white font-bold shadow"
                          : "text-slate-400 hover:text-white hover:bg-slate-800"
                      }`}
                    >
                      <span>👤 {mName}</span>
                      <span className="opacity-80">({mPagesCount})</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Shortcuts: Select All / Deselect All */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1.5">
                <span>
                  {!isSuperAdmin
                    ? `Page របស់អ្នក (${displayedPages.length})`
                    : selectedMemberFilter === "all"
                    ? `Page ទាំងអស់ (${displayedPages.length})`
                    : `Page របស់ ${selectedMemberFilter} (${displayedPages.length})`}
                </span>
                {selectedPageIds.length > 0 && (
                  <span className="rounded-md bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-bold text-cyan-300 border border-cyan-500/30">
                    បានជ្រើស {selectedPageIds.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 font-semibold">
                <button
                  type="button"
                  onClick={selectAllDisplayed}
                  className="rounded-lg bg-cyan-500/10 px-2.5 py-1 text-[11px] font-bold text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 transition active:scale-95"
                >
                  ✓ ជ្រើសទាំងអស់
                </button>
                <button
                  type="button"
                  onClick={deselectAllDisplayed}
                  className="rounded-lg bg-slate-800/80 px-2.5 py-1 text-[11px] text-slate-400 border border-slate-700/80 hover:bg-slate-800 hover:text-white transition active:scale-95"
                >
                  ✕ ដោះទាំងអស់
                </button>
              </div>
            </div>

            {/* Pages Checkbox List */}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {displayedPages.length === 0 ? (
                <div className="py-8 text-center rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-4">
                  <span className="text-xl block mb-1">📄</span>
                  <span className="text-xs font-bold text-white block">
                    មិនទាន់មាន Facebook Page នៅឡើយទេ
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                    គណនីរបស់អ្នកមិនទាន់មាន Facebook Page សម្រាប់ផុស Story ទេ។ សូមភ្ជាប់ Page របស់អ្នកនៅលើផ្ទាំង Dashboard ជាមុនសិន។
                  </p>
                </div>
              ) : (
                displayedPages.map((p) => {
                const isSelected = selectedPageIds.includes(p.id);
                const owner = p.ownerName || (p as any).memberName;
                return (
                  <div
                    key={p.id}
                    onClick={() => togglePageSelect(p.id)}
                    className={`flex items-center justify-between rounded-xl p-3 text-xs transition border cursor-pointer select-none ${
                      isSelected
                        ? "border-cyan-400/80 bg-gradient-to-r from-cyan-950/50 to-blue-950/40 text-white font-medium shadow-md shadow-cyan-950/20"
                        : "border-slate-800/80 bg-slate-900/50 text-slate-400 hover:border-slate-700 hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 text-left truncate flex-1 mr-2">
                      <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white text-[11px] shrink-0">
                        {p.name.charAt(0)}
                      </div>
                      <div className="truncate">
                        <div className="truncate flex items-center gap-1.5">
                          <span className={isSelected ? "text-white font-bold" : "text-slate-300"}>
                            {p.name}
                          </span>
                          {owner && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                              {owner}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 font-normal truncate">
                          {p.category || "Facebook Page"}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // handled by parent onClick
                        className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-0 cursor-pointer pointer-events-none"
                      />
                    </div>
                  </div>
                );
              }))}
            </div>

            {selectedPageIds.length > 0 && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-[11px] text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>
                  បានជ្រើសរើស <b>{selectedPageIds.length} Pages</b> (រួចរាល់សម្រាប់ការផុស Story & Multi-Post)
                </span>
              </div>
            )}
          </div>

          {/* 2. Destination: Story vs Feed */}
          <div className="rounded-2xl border border-slate-800 bg-[#0B1220] p-5 shadow-lg space-y-4">
            <label className="text-xs font-bold text-white block">
              ២. ទីតាំងផុស (Publish Destination)
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPublishDestination("story")}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border text-xs transition text-center ${
                  publishDestination === "story"
                    ? "border-purple-400 bg-gradient-to-b from-purple-950/60 to-purple-900/30 text-white font-bold shadow-lg shadow-purple-950/40"
                    : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 border border-purple-500/30">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-bold">Facebook Story</div>
                  <div className="text-[10px] text-purple-300/80 font-normal">
                    បាត់ទៅវិញក្នុង ២៤ ម៉ោង
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPublishDestination("feed")}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border text-xs transition text-center ${
                  publishDestination === "feed"
                    ? "border-blue-400 bg-gradient-to-b from-blue-950/60 to-blue-900/30 text-white font-bold shadow-lg shadow-blue-950/40"
                    : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 border border-blue-500/30">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-bold">Page Feed / Reels</div>
                  <div className="text-[10px] text-blue-300/80 font-normal">
                    Post ធម្មតាលើ Timeline
                  </div>
                </div>
              </button>
            </div>

            {/* Interval Delay if Feed */}
            {publishDestination === "feed" && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-cyan-400" />
                    <span>ចន្លោះពេលផុស (Smart Interval Delay)</span>
                  </span>
                  <span className="text-cyan-400 font-bold">
                    {feedDelayMinutes === 0 ? "ភ្លាមៗ (Instant)" : `${feedDelayMinutes} នាទីម្ដង`}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-[11px]">
                  {[0, 1, 3, 5].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setFeedDelayMinutes(m)}
                      className={`py-1.5 rounded-lg border text-center transition font-medium ${
                        feedDelayMinutes === m
                          ? "border-cyan-400 bg-cyan-500/20 text-cyan-300 font-bold"
                          : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      {m === 0 ? "Instant" : `${m} នាទី`}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  💡 ណែនាំជ្រើសរើស ៣-៥ នាទី ដើម្បីឱ្យ Meta Algorithm ចាត់ទុកជា Post ធម្មជាតិ
                  និងបង្កើន Reach (ការមើល)។
                </p>
              </div>
            )}
          </div>

          {/* 3. Story Marketing Funnel Presets */}
          <div className="rounded-2xl border border-slate-800 bg-[#0B1220] p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-amber-400" />
                <span>
                  {publishDestination === "story"
                    ? "✨ យុទ្ធសាស្ត្រលំដាប់លំដោយ Story"
                    : "Funnel Presets សម្រាប់ Feed"}
                </span>
              </label>
              {publishDestination === "feed" && (
                <button
                  type="button"
                  onClick={applyStoryFunnelToAll}
                  className="text-[11px] text-amber-400 hover:text-amber-300 hover:underline font-semibold"
                >
                  ⚡ 1-Click Apply
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {publishDestination === "story"
                ? "📌 សម្រាប់ Facebook Story គឺបង្ហាញជារូបភាព ឬវីដេអូពេញអេក្រង់ ដូច្នេះមិនចាំបាច់សរសេរ Caption វែងអន្លាយទេ។ បងគ្រាន់តែរៀបចំរូបភាព ឬវីដេអូជាបន្តបន្ទាប់ (Slide 1, Slide 2...) គឺទាក់ទាញខ្លាំង!"
                : "អនុវត្តទម្រង់លក់ឆ្លាតវៃ (បញ្ហា ➔ ដំណោះស្រាយ ➔ Feedback ➔ ប្រូម៉ូសិន) ទៅលើ Caption ក្នុង Queue ដោយស្វ័យប្រវត្តិ។"}
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: BATCH QUEUE & MEDIA CARDS */}
        <div className="lg:col-span-2 space-y-5">
          {/* Uploader Card */}
          <div className="rounded-2xl border border-slate-800 bg-[#0B1220] p-6 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>បញ្ជីឯកសាររៀបចំផុស (Batch Queue)</span>
                  <span className="rounded-full bg-cyan-500/20 border border-cyan-500/30 px-2 py-0.2 text-xs font-bold text-cyan-300">
                    {batchItems.length} ឯកសារ
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  អាចជ្រើសរើសរូបភាព ឬវីដេអូច្រើនក្នុងពេលតែមួយ (JPG, PNG, MP4, MOV)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerateAiCaptions}
                  disabled={isGeneratingAiCaptions || batchItems.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 px-3 py-2 text-xs font-semibold text-purple-300 transition disabled:opacity-50"
                  title="ឱ្យ Gemini AI បង្កើត Caption និង Hashtag សម្រាប់ឯកសារនីមួយៗ"
                >
                  <Sparkles className={`h-3.5 w-3.5 ${isGeneratingAiCaptions ? "animate-spin" : ""}`} />
                  <span>{isGeneratingAiCaptions ? "AI កំពុងសរសេរ..." : "AI Auto-Captions"}</span>
                </button>

                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFilesSelected}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:opacity-90 transition"
                >
                  <Plus className="h-4 w-4" />
                  <span>បន្ថែមរូប/វីដេអូ</span>
                </button>
              </div>
            </div>

            {/* Empty State */}
            {batchItems.length === 0 ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer py-12 text-center rounded-2xl border-2 border-dashed border-slate-800 hover:border-cyan-500/50 bg-slate-900/30 p-8 transition duration-200"
              >
                <div className="mx-auto h-12 w-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-3 border border-cyan-500/20">
                  <Layers className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">
                  ចុចទីនេះដើម្បីជ្រើសរើសរូបភាព ឬវីដេអូជាច្រើនក្នុងពេលតែមួយ
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  គាំទ្រការជ្រើសរើស ៣ ទៅ ១០ រូបភាព/វីដេអូក្នុងពេលតែមួយ ដើម្បីផុសជា Facebook Story Sequence
                  ឬ Multi-Post ចូល Page របស់អ្នក
                </p>
                <button
                  type="button"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs font-bold text-cyan-300"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>ជ្រើសរើស Files ឥឡូវនេះ</span>
                </button>
              </div>
            ) : (
              /* Item Cards Queue */
              <div className="space-y-3.5">
                {batchItems.map((item, idx) => {
                  const preset = STORY_FUNNEL_PRESETS[idx % STORY_FUNNEL_PRESETS.length];
                  return (
                    <div
                      key={item.id}
                      className={`rounded-2xl border p-4 transition-all duration-200 ${
                        item.status === "uploading"
                          ? "border-cyan-400 bg-cyan-950/30 shadow-md shadow-cyan-950/40"
                          : item.status === "success"
                          ? "border-emerald-500/50 bg-emerald-950/20"
                          : item.status === "error"
                          ? "border-rose-500/50 bg-rose-950/20"
                          : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex flex-col md:flex-row items-start gap-4">
                        {/* Media Preview Thumbnail */}
                        <div className="relative h-28 w-24 rounded-xl overflow-hidden border border-slate-700 bg-black shrink-0">
                          {item.mediaType === "video" ? (
                            <video
                              src={item.previewUrl}
                              className="h-full w-full object-cover"
                              muted
                            />
                          ) : (
                            <img
                              src={item.previewUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          )}

                          <div className="absolute top-1.5 left-1.5 rounded-md bg-black/70 backdrop-blur-sm px-1.5 py-0.5 text-[9px] font-bold text-white flex items-center gap-1">
                            {item.mediaType === "video" ? (
                              <>
                                <Film className="h-2.5 w-2.5 text-cyan-400" />
                                <span>Video</span>
                              </>
                            ) : (
                              <>
                                <ImageIcon className="h-2.5 w-2.5 text-purple-400" />
                                <span>Photo</span>
                              </>
                            )}
                          </div>

                          <div className="absolute bottom-1.5 right-1.5 rounded-md bg-black/70 px-1 py-0.2 text-[9px] font-mono text-slate-300">
                            #{(idx + 1).toString().padStart(2, "0")}
                          </div>
                        </div>

                        {/* Content & Caption Form */}
                        <div className="flex-1 space-y-2 w-full">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">
                                {publishDestination === "story"
                                  ? `Story Slide ${idx + 1}`
                                  : `Post #${idx + 1}`}
                              </span>
                              {preset && (
                                <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.2 text-[10px] text-amber-300 font-medium">
                                  {preset.step}
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="text-slate-500 hover:text-rose-400 p-1 transition"
                              title="លុបចេញពី Queue"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {/* Caption Form: Only needed for Feed, or optional for Story */}
                          {publishDestination === "story" ? (
                            <div className="space-y-1.5">
                              <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 px-3 py-2 text-[11px] flex items-center justify-between text-purple-300">
                                <span className="flex items-center gap-1.5">
                                  <Sparkles className="h-3 w-3 text-purple-400" />
                                  <span>Story Slide {idx + 1} • រូបភាព/វីដេអូពេញអេក្រង់ (មិនបាច់មាន Caption ទេ)</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedNotes((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
                                  }
                                  className="text-[10px] text-cyan-400 hover:underline font-semibold ml-2"
                                >
                                  {expandedNotes[item.id] ? "លាក់ចំណាំ" : "+ ចំណាំ (Optional)"}
                                </button>
                              </div>

                              {expandedNotes[item.id] && (
                                <textarea
                                  rows={2}
                                  value={item.caption}
                                  onChange={(e) =>
                                    setBatchItems((prev) =>
                                      prev.map((it) =>
                                        it.id === item.id ? { ...it, caption: e.target.value } : it
                                      )
                                    )
                                  }
                                  placeholder="ចំណាំខ្លី ឬ Caption បន្ថែម (មិនដាក់ក៏បាន)..."
                                  className="w-full rounded-xl border border-slate-800 bg-slate-950/70 p-2 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400 resize-none font-sans"
                                />
                              )}
                            </div>
                          ) : (
                            /* Feed Caption Textarea */
                            <textarea
                              rows={3}
                              value={item.caption}
                              onChange={(e) =>
                                setBatchItems((prev) =>
                                  prev.map((it) =>
                                    it.id === item.id ? { ...it, caption: e.target.value } : it
                                  )
                                )
                              }
                              placeholder="បញ្ចូល Caption ឬកំណត់សម្គាល់សម្រាប់ Post នេះ..."
                              className="w-full rounded-xl border border-slate-800 bg-slate-950/70 p-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400 resize-none font-sans"
                            />
                          )}

                          {/* Status Indicator */}
                          {item.status === "uploading" && (
                            <div className="flex items-center gap-2 text-xs text-cyan-400 font-medium">
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              <span>កំពុង Upload ទៅកាន់ Facebook...</span>
                            </div>
                          )}

                          {item.status === "success" && (
                            <div className="flex items-center justify-between text-xs text-emerald-400 font-medium">
                              <span className="flex items-center gap-1.5">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>បានផុសជោគជ័យ!</span>
                              </span>
                              {item.postId && (
                                <a
                                  href={`https://facebook.com/${item.postId}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[11px] text-cyan-400 hover:underline inline-flex items-center gap-1"
                                >
                                  <span>មើលលើ FB</span>
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          )}

                          {item.status === "error" && (
                            <div className="text-xs text-rose-400 flex items-center gap-1.5 font-medium">
                              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{item.errorMessage || "ការផុសបរាជ័យ"}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* LIVE PROGRESS BAR */}
            {publishProgress && (
              <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/30 p-4 space-y-2 mt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-cyan-300 font-semibold flex items-center gap-2">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-cyan-400" />
                    <span>{publishProgress.statusText}</span>
                  </span>
                  <span className="text-cyan-400 font-bold">{publishProgress.percent}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-teal-400 transition-all duration-300"
                    style={{ width: `${publishProgress.percent}%` }}
                  />
                </div>
              </div>
            )}

            {/* ACTION SUBMIT BUTTON */}
            {batchItems.length > 0 && (
              <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                <div className="text-xs text-slate-400">
                  សរុប: <span className="text-white font-bold">{batchItems.length}</span> ឯកសារ ➔
                  គោលដៅ:{" "}
                  <span className="text-cyan-400 font-bold">
                    {selectedPageIds.length} Pages
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handlePublishBatch}
                  disabled={isPublishing || selectedPageIds.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500 hover:opacity-95 px-6 py-3 text-xs font-bold text-white shadow-xl shadow-cyan-500/25 transition disabled:opacity-50"
                >
                  {isPublishing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>កំពុងដំណើរការផុស...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>
                        {publishDestination === "story"
                          ? `ផុសចូល Facebook Story លើ ${selectedPageIds.length} Pages (${batchItems.length} Slides)`
                          : `ផុស Multi-Post (${batchItems.length}) ចូល ${selectedPageIds.length} Pages`}
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
