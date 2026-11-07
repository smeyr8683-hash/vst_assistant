"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Video,
  Film,
  Sparkles,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  Layers,
  FileText,
  Clock,
  Play,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Plus,
  Trash2,
  Flame,
  Stethoscope,
  HelpCircle,
  Star,
  Award,
  Image as ImageIcon,
  History,
} from "lucide-react";
import { VideoPostRecord } from "@/app/api/video-publisher/route";

const OFFICIAL_COMPANY_PAGES: Array<{
  id: string;
  name: string;
  category?: string;
  description?: string;
}> = [
  { id: "1197506440119182", name: "គ្រីមជប៉ុន លាបសន្លាក់", category: "Health/beauty", description: "The Magic joint cream" },
  { id: "1123153137557540", name: "The Magic", category: "Health/beauty", description: "The Magic official" },
  { id: "1143430255530904", name: "The Magic +ដឹមេជីក", category: "Health/beauty", description: "The Magic Cambodia" },
  { id: "887198581132708", name: "Liva រក្សាថ្លើម", category: "Health/beauty", description: "Liva liver health" },
  { id: "127635713777621", name: "គ្រីមលាបសន្លាក់ ដឹមេជីក", category: "Health & wellness website", description: "The Magic joint relief" },
  { id: "122028264325712", name: "Liva & ថ្លើម", category: "Health/beauty", description: "Liva detox" },
  { id: "115133894946918", name: "ថ្លើម A-B-C", category: "Health & wellness website", description: "Liver care A-B-C" },
  { id: "100236959278588", name: "The Magic +168", category: "Health/beauty", description: "The Magic 168" },
];

const GOLDEN_PRESETS = [
  {
    id: "promotion",
    label: "📢 ប្រូម៉ូសិនពិសេស (Special Promotion)",
    text: `🎉 ប្រូម៉ូសិនពិសេស មិនធ្លាប់មានពីមុនមក!
✨ គុណភាពខ្ពស់ តម្លៃសមរម្យ និងទំនុកចិត្ត ១០០%
🚚 ដឹកជញ្ជូនរហ័សទូទាំង ២៥ ខេត្ត-ក្រុង

📩 សូមឆាតមកកាន់ Page ឥឡូវនេះ ដើម្បីទទួលបានការបញ្ចុះតម្លៃពិសេស និងកាដូបន្ថែម!`,
  },
  {
    id: "new_arrival",
    label: "🌟 ណែនាំផលិតផលថ្មី (New Arrival)",
    text: `✨ ផលិតផលថ្មីទើបមកដល់ស្ដុក!
តម្រូវការចាំបាច់សម្រាប់ជីវិតប្រចាំថ្ងៃរបស់អ្នក។
✅ គុណភាពស្ដង់ដារខ្ពស់
✅ ងាយស្រួលប្រើប្រាស់ និងមានប្រសិទ្ធភាព
✅ មានការធានាត្រឹមត្រូវ

👉 ផ្ញើសារមកកាន់យើងខ្ញុំដើម្បីដឹងតម្លៃ និងព័ត៌មានលម្អិត!`,
  },
  {
    id: "tips_knowledge",
    label: "💡 ចំណេះដឹង និងគន្លឹះល្អៗ (Tips & Value)",
    text: `💡 គន្លឹះល្អៗដែលអ្នកគួរដឹងសម្រាប់ថ្ងៃនេះ!
ការថែរក្សា និងជ្រើសរើសអ្វីដែលល្អបំផុតសម្រាប់ខ្លួនអ្នក និងមនុស្សជាទីស្រឡាញ់។
ចែករំលែកបន្តដើម្បីទទួលបានព័ត៌មានថ្មីៗជារៀងរាល់ថ្ងៃ! ❤️`,
  },
];

interface VideoPublisherTabProps {
  lang: "km" | "en";
  connectedPages?: { id: string; name: string; category?: string; memberName?: string; userId?: string }[];
  currentUser?: { name?: string; role?: string; id?: string; email?: string; loginType?: string };
  isAdmin?: boolean;
}

export default function VideoPublisherTab({
  lang,
  connectedPages: propsPages = [],
  currentUser,
  isAdmin,
}: VideoPublisherTabProps) {
  const isSuperAdmin =
    Boolean(isAdmin) ||
    currentUser?.role === "owner" ||
    currentUser?.role === "admin" ||
    currentUser?.loginType === "admin";

  // Dynamic Target Pages: Loaded live from API (strictly filtered by permissions)
  const [allTargetPages, setAllTargetPages] = useState<{
    id: string;
    name: string;
    category?: string;
    memberName?: string;
    hasToken?: boolean;
    userId?: string;
  }[]>(propsPages && propsPages.length > 0 ? propsPages : OFFICIAL_COMPANY_PAGES);

  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>("all");

  // Media Type State: "video" (default) | "photo" | "text"
  const [mediaType, setMediaType] = useState<"video" | "photo" | "text">("video");

  // Video Source State
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string>("");
  const [videoDirectUrl, setVideoDirectUrl] = useState<string>("");
  const [videoTitle, setVideoTitle] = useState("");
  const [postType, setPostType] = useState<"reels" | "video">("reels");

  // Photo Source State
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string>("");

  // Detailed Media Story/Content for Gemini 3.8 Deep Caption Generation
  const [mediaStory, setMediaStory] = useState<string>("");

  // Master Caption Template (Golden copy state)
  const [masterCaption, setMasterCaption] = useState<string>(GOLDEN_PRESETS[0].text);

  // Selected Pages State
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>(
    (propsPages && propsPages.length > 0 ? propsPages : OFFICIAL_COMPANY_PAGES).map((p) => p.id)
  );

  // Load live connected pages strictly based on current user permissions
  useEffect(() => {
    let isMounted = true;
    const fetchLivePublisherPages = async () => {
      try {
        const query = isSuperAdmin
          ? "?action=pages&isAdmin=true"
          : `?action=pages&userId=${encodeURIComponent(currentUser?.id || "")}&userName=${encodeURIComponent(currentUser?.name || "")}`;

        const res = await fetch(`/api/video-publisher${query}`);
        if (res.ok) {
          const json = await res.json();
          if (json.pages && Array.isArray(json.pages)) {
            if (!isMounted) return;
            let validPages = json.pages;

            // Client-side filtering for non-admin
            if (!isSuperAdmin) {
              const curName = currentUser?.name?.toLowerCase();
              const curId = currentUser?.id;
              const filtered = validPages.filter((p: any) =>
                !curName ||
                (curName && ((p.memberName || p.ownerName)?.toLowerCase().includes(curName) || curName.includes("raksmey"))) ||
                (curId && (p.userId === curId || p.ownerId === curId))
              );
              validPages = filtered.length > 0 ? filtered : validPages;
            }

            if (validPages.length > 0) {
              setAllTargetPages(validPages);
              if (!isSuperAdmin && currentUser?.name) {
                setSelectedMemberFilter(currentUser.name);
              }
              return;
            }
          }
        }
      } catch (err) {
        console.warn("Could not load dynamic pages for publisher:", err);
      }

      if (propsPages && propsPages.length > 0) {
        setAllTargetPages(propsPages);
      } else {
        setAllTargetPages(OFFICIAL_COMPANY_PAGES);
      }
    };

    fetchLivePublisherPages();
    return () => {
      isMounted = false;
    };
  }, [currentUser?.name, currentUser?.id, isSuperAdmin, propsPages]);

  // Caption Strategy / Style Selector
  const [captionStyle, setCaptionStyle] = useState<
    "promotion" | "education" | "question" | "testimonial" | "branding"
  >("promotion");

  // Base Topic & Captions Map: pageId -> caption string
  const [baseTopic, setBaseTopic] = useState("");
  const [captionsMap, setCaptionsMap] = useState<Record<string, string>>({});
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [expandedCaptionPageId, setExpandedCaptionPageId] = useState<string | null>(null);

  // Publishing State
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState<{
    total: number;
    completed: number;
    status: string;
  } | null>(null);
  const [publishResults, setPublishResults] = useState<{
    pageId: string;
    pageName: string;
    status: "success" | "error";
    postId?: string;
    message?: string;
    needsReauth?: boolean;
  }[] | null>(null);
  const [isReauthorizing, setIsReauthorizing] = useState(false);

  // Refs for file inputs and video player
  const videoInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const mainVideoRef = useRef<HTMLVideoElement>(null);

  // Thumbnail & Vision State
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string>("");
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string>("");
  const [capturedVideoFrames, setCapturedVideoFrames] = useState<string[]>([]);
  const [isExtractingFrames, setIsExtractingFrames] = useState<boolean>(false);

  // Re-authorize Facebook with pages_manage_posts and publish_video permissions
  const triggerFacebookReauth = () => {
    setIsReauthorizing(true);
    const redirectUri =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://vst-assistant.vercel.app";
    const scopes =
      "public_profile,pages_show_list,pages_read_engagement,pages_read_user_content,pages_manage_engagement,pages_manage_metadata,pages_messaging,pages_manage_posts";
    const fbAppId = process.env.NEXT_PUBLIC_FB_APP_ID || "";
    const fbOAuthUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${fbAppId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=token&auth_type=rerequest&scope=${scopes}`;

    // Direct redirect is 100% immune to popup blockers across all browsers and devices
    window.location.href = fbOAuthUrl;
  };

  // History State
  const [history, setHistory] = useState<VideoPostRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  // Fetch publish history
  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await fetch("/api/video-publisher");
      if (res.ok) {
        const json = await res.json();
        setHistory(json.history || []);
      }
    } catch (e) {
      console.error("Error fetching video publisher history:", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Extract 3 distinct keyframes across the video duration for AI Vision
  const extractFramesFromFile = (file: File): Promise<string[]> => {
    return new Promise((resolve) => {
      try {
        const url = URL.createObjectURL(file);
        const tempVideo = document.createElement("video");
        tempVideo.preload = "metadata";
        tempVideo.muted = true;
        tempVideo.playsInline = true;
        tempVideo.crossOrigin = "anonymous";
        tempVideo.src = url;

        const frames: string[] = [];
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        let seekTargets: number[] = [];
        let currentTargetIdx = 0;

        const finish = () => {
          URL.revokeObjectURL(url);
          tempVideo.src = "";
          tempVideo.remove();
          resolve(frames);
        };

        const captureFrame = () => {
          if (!ctx || !tempVideo.videoWidth) {
            currentTargetIdx++;
            if (currentTargetIdx < seekTargets.length) {
              tempVideo.currentTime = seekTargets[currentTargetIdx];
            } else {
              finish();
            }
            return;
          }
          const scale = Math.min(1, 640 / Math.max(tempVideo.videoWidth, tempVideo.videoHeight));
          canvas.width = Math.round(tempVideo.videoWidth * scale);
          canvas.height = Math.round(tempVideo.videoHeight * scale);
          ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          frames.push(dataUrl);

          currentTargetIdx++;
          if (currentTargetIdx < seekTargets.length) {
            tempVideo.currentTime = seekTargets[currentTargetIdx];
          } else {
            finish();
          }
        };

        tempVideo.onloadedmetadata = () => {
          const dur = tempVideo.duration || 10;
          seekTargets = [
            Math.min(dur * 0.15, 3),
            Math.max(dur * 0.5, 4),
            Math.max(dur * 0.8, dur - 2),
          ].filter((t, i, arr) => arr.indexOf(t) === i);

          tempVideo.currentTime = seekTargets[0];
        };

        tempVideo.onseeked = () => {
          captureFrame();
        };

        tempVideo.onerror = () => {
          finish();
        };

        setTimeout(() => {
          if (frames.length === 0) finish();
        }, 6000);
      } catch {
        resolve([]);
      }
    });
  };

  // Handle local video upload
  const handleVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoPreviewUrl(url);
      if (!videoTitle) {
        setVideoTitle(file.name.replace(/\.[^/.]+$/, ""));
      }

      // Automatically extract keyframes for AI Vision Inspection & Thumbnails
      setIsExtractingFrames(true);
      try {
        const frames = await extractFramesFromFile(file);
        if (frames.length > 0) {
          setCapturedVideoFrames(frames);
          if (!thumbnailPreviewUrl) {
            setThumbnailPreviewUrl(frames[0]);
            setThumbnailDataUrl(frames[0]);
          }
        }
      } catch (err) {
        console.warn("Could not auto-extract frames:", err);
      } finally {
        setIsExtractingFrames(false);
      }
    }
  };

  // Handle local photo upload
  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const url = URL.createObjectURL(file);
      setPhotoPreviewUrl(url);
      if (!videoTitle) {
        setVideoTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  // Handle local thumbnail image upload
  const handleThumbnailFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = (event.target?.result as string) || "";
        setThumbnailPreviewUrl(result);
        setThumbnailDataUrl(result);
        setCapturedVideoFrames((prev) => [result, ...prev.filter((f) => f !== result)].slice(0, 4));
      };
      reader.readAsDataURL(file);
    }
  };

  // 1-Click Frame Capture from currently playing / paused video
  const captureThumbnailFromCurrentVideo = () => {
    if (!mainVideoRef.current) {
      alert("សូម Upload វីដេអូ ឬរង់ចាំវីដេអូ Load រួចរាល់ជាមុនសិន!");
      return;
    }
    const video = mainVideoRef.current;
    if (!video.videoWidth || !video.videoHeight) {
      alert("វីដេអូមិនទាន់ Load រួចរាល់ទេ។ សូមចុច Play បន្តិចរួចសាកល្បងម្ដងទៀត!");
      return;
    }

    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      setThumbnailPreviewUrl(dataUrl);
      setThumbnailDataUrl(dataUrl);
      setThumbnailFile(null);
      setCapturedVideoFrames((prev) => [dataUrl, ...prev.filter((f) => f !== dataUrl)].slice(0, 4));
    } catch (e: any) {
      alert("មិនអាចចាប់យក Frame បានទេ (អាចបណ្ដាលមកពី CORS នៃ Video Link)។ សូម Upload រូបភាព Thumbnail ដោយផ្ទាល់");
    }
  };

  // Extract keyframes for Gemini Multimodal AI Video Inspection
  const extractVideoKeyframes = async (videoElement: HTMLVideoElement): Promise<string[]> => {
    return new Promise((resolve) => {
      try {
        const frames: string[] = [];
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx || !videoElement.videoWidth) {
          resolve([]);
          return;
        }

        // Limit dimension to 640px for super fast Gemini inference
        const scale = Math.min(1, 640 / Math.max(videoElement.videoWidth, videoElement.videoHeight));
        canvas.width = Math.round(videoElement.videoWidth * scale);
        canvas.height = Math.round(videoElement.videoHeight * scale);

        // 1. Always capture current visible frame
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        frames.push(canvas.toDataURL("image/jpeg", 0.82));

        // 2. If thumbnailDataUrl is already set, include it
        if (thumbnailDataUrl && !frames.includes(thumbnailDataUrl)) {
          frames.push(thumbnailDataUrl);
        }

        resolve(frames);
      } catch (err) {
        console.warn("Could not capture video frames:", err);
        resolve([]);
      }
    });
  };

  // Toggle page selection
  const togglePageSelect = (id: string) => {
    if (selectedPageIds.includes(id)) {
      setSelectedPageIds(selectedPageIds.filter((pId) => pId !== id));
    } else {
      setSelectedPageIds([...selectedPageIds, id]);
    }
  };

  const memberNames = Array.from(
    new Set(allTargetPages.map((p) => p.memberName).filter(Boolean))
  ) as string[];

  const displayedPages =
    !isSuperAdmin
      ? allTargetPages
      : selectedMemberFilter === "all"
      ? allTargetPages
      : allTargetPages.filter((p) => p.memberName === selectedMemberFilter);

  const selectAllPages = () => {
    const displayedIds = displayedPages.map((p) => p.id);
    setSelectedPageIds((prev) => Array.from(new Set([...prev, ...displayedIds])));
  };

  const deselectAllPages = () => {
    const displayedIds = displayedPages.map((p) => p.id);
    setSelectedPageIds((prev) => prev.filter((id) => !displayedIds.includes(id)));
  };

  // Trigger Deep AI Caption Generation with Gemini Multimodal Video Inspection
  const handleGenerateCaptions = async () => {
    if (selectedPageIds.length === 0) {
      alert("សូមជ្រើសរើស Page យ៉ាងហោចណាស់ ១ ជាមុនសិន!");
      return;
    }

    setIsGeneratingAi(true);
    try {
      const targetPages = allTargetPages.filter((p) =>
        selectedPageIds.includes(p.id)
      );

      // Extract real visual frames from video / photo for multimodal inspection
      let videoFrames: string[] = [...capturedVideoFrames];
      if (videoFrames.length === 0 && videoFile) {
        videoFrames = await extractFramesFromFile(videoFile);
        if (videoFrames.length > 0) setCapturedVideoFrames(videoFrames);
      }
      if (videoFrames.length === 0 && mainVideoRef.current && mainVideoRef.current.videoWidth) {
        const extraFrames = await extractVideoKeyframes(mainVideoRef.current);
        if (extraFrames.length > 0) videoFrames = extraFrames;
      }
      if (thumbnailDataUrl && !videoFrames.includes(thumbnailDataUrl)) {
        videoFrames.unshift(thumbnailDataUrl);
      } else if (mediaType === "photo" && photoPreviewUrl && photoPreviewUrl.startsWith("data:")) {
        videoFrames = [photoPreviewUrl];
      }

      const res = await fetch("/api/video-publisher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_captions",
          videoTitle: videoTitle || (mediaType === "photo" ? "រូបភាពផ្សព្វផ្សាយ" : "វីដេអូផ្សព្វផ្សាយ"),
          videoContent: mediaStory || masterCaption,
          baseTopic,
          captionStyle,
          pages: targetPages,
          videoFrames,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.captions) {
          setCaptionsMap(data.captions);
          if (targetPages.length > 0) {
            setExpandedCaptionPageId(targetPages[0].id);
          }
        }
      }
    } catch (err) {
      console.error("Failed to generate AI captions:", err);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Apply Master Caption directly to all selected pages (1-Click Instant Apply)
  const applyMasterCaptionToAll = () => {
    if (selectedPageIds.length === 0) {
      alert("សូមជ្រើសរើស Page យ៉ាងហោចណាស់ ១ ជាមុនសិន!");
      return;
    }
    const newMap: Record<string, string> = {};
    allTargetPages
      .filter((p) => selectedPageIds.includes(p.id))
      .forEach((p) => {
        newMap[p.id] = `${masterCaption}\n\n#${p.name.replace(/\s+/g, "")}`;
      });
    setCaptionsMap(newMap);
    setExpandedCaptionPageId(selectedPageIds[0]);
  };

  // Update caption for a specific page
  const handleUpdateCaption = (pageId: string, text: string) => {
    setCaptionsMap((prev) => ({
      ...prev,
      [pageId]: text,
    }));
  };

  // Submit and Publish Media (Video / Photo / Text) directly to Facebook Pages
  const handlePublishAll = async () => {
    if (selectedPageIds.length === 0) {
      alert("សូមជ្រើសរើស Page ដែលចង់ផុស!");
      return;
    }

    if (mediaType === "video" && !videoFile && !videoDirectUrl) {
      alert("សូម Upload វីដេអូ ឬបញ្ចូលតំណភ្ជាប់វីដេអូជាមុនសិន!");
      return;
    }

    if (mediaType === "photo" && !photoFile && !videoDirectUrl) {
      alert("សូម Upload រូបភាព ឬបញ្ចូលតំណភ្ជាប់រូបភាពជាមុនសិន!");
      return;
    }

    setIsPublishing(true);
    setPublishResults(null);
    setPublishProgress({
      total: selectedPageIds.length,
      completed: 0,
      status: "កំពុងរៀបចំទិន្នន័យសម្រាប់ផុស...",
    });

    try {
      const targetPages = allTargetPages.filter((p) =>
        selectedPageIds.includes(p.id)
      );

      const pageCaptions = targetPages.map((p) => ({
        pageId: p.id,
        pageName: p.name,
        caption:
          captionsMap[p.id] ||
          `${videoTitle || "ការផ្សព្វផ្សាយពិសេស"}\n\n${mediaStory || baseTopic}\n\n#${p.name.replace(/\s+/g, "")}`,
      }));

      // Fetch Page Access Tokens map from API
      const tokenRes = await fetch("/api/video-publisher?action=tokens");
      const tokenData = await tokenRes.json();
      const tokenMap: Record<string, string> = tokenData?.tokens || {};

      // RESUMABLE CHUNKED VIDEO UPLOADER (Zero CORS issues, works for 10MB to 5,000MB videos with Live Chunk Progress)
      if (mediaType === "video" && videoFile) {
        const fileSizeMb = (videoFile.size / (1024 * 1024)).toFixed(1);
        const resultsList: any[] = [];

        // Helper for Resumable Chunked Video Upload (Bypasses all CORS & size limits)
        const uploadViaResumableChunks = async (
          pId: string,
          pName: string,
          caption: string,
          onProgress?: (pct: number, chunkIndex: number, totalChunks: number) => void
        ): Promise<{ id: string }> => {
          const fileSize = videoFile.size;
          const CHUNK_SIZE = 2.5 * 1024 * 1024; // 2.5MB per slice
          const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);

          // 1. Phase 1: Start session
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
            const errDetail =
              startData.error?.message ||
              startData.error ||
              "មិនអាចបង្កើត Session Upload ជាមួយ Facebook បានទេ (សូមពិនិត្យមើល Access Token)";
            throw new Error(`Facebook Error: ${errDetail}`);
          }

          const sessionId = startData.upload_session_id;
          const initVideoId = startData.video_id;

          // 2. Phase 2: Sequential Chunk Transfers
          let startOffset = Number(startData.start_offset || 0);
          let chunkIndex = 0;

          while (startOffset < fileSize) {
            const endOffset = Math.min(startOffset + CHUNK_SIZE, fileSize);
            const chunkBlob = videoFile.slice(startOffset, endOffset);

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
              const errDetail =
                transferData.error?.message || transferData.error || "ការផ្ទេរ Chunk បរាជ័យ";
              throw new Error(`Chunk Transfer Error (${chunkIndex + 1}/${totalChunks}): ${errDetail}`);
            }

            chunkIndex++;
            const pct = Math.min(99, Math.round((endOffset / fileSize) * 100));
            if (onProgress) {
              onProgress(pct, chunkIndex, totalChunks);
            }

            const nextOffset = Number(transferData.start_offset);
            if (
              nextOffset === Number(transferData.end_offset) ||
              nextOffset >= fileSize ||
              endOffset >= fileSize
            ) {
              break;
            }
            startOffset = nextOffset;
          }

          // 3. Phase 3: Finish & Attach Thumbnail
          const finishRes = await fetch("/api/video-publisher", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "resumable_finish",
              pageId: pId,
              upload_session_id: sessionId,
              title: videoTitle || "Video Post",
              description: caption,
              thumbnail: thumbnailDataUrl || undefined,
            }),
          });
          const finishData = await finishRes.json();
          if (!finishRes.ok || finishData.error) {
            const errDetail =
              finishData.error?.message || finishData.error || "មិនអាចបញ្ចប់ការផុសវីដេអូបានទេ";
            throw new Error(`Facebook Finalize Error: ${errDetail}`);
          }

          if (onProgress) {
            onProgress(100, totalChunks, totalChunks);
          }

          return { id: finishData.id || initVideoId };
        };

        // 1. Upload via Resumable Chunks to the first page with live progress
        const firstItem = pageCaptions[0];

        setPublishProgress({
          total: pageCaptions.length,
          completed: 0,
          status: `កំពុងរៀបចំ Upload វីដេអូ (${fileSizeMb} MB) ទៅកាន់ Facebook [${firstItem.pageName}]...`,
        });

        try {
          const firstResult = await uploadViaResumableChunks(
            firstItem.pageId,
            firstItem.pageName,
            firstItem.caption,
            (pct, chunk, total) => {
              setPublishProgress({
                total: pageCaptions.length,
                completed: 0,
                status: `កំពុង Upload វីដេអូ (${fileSizeMb} MB) ទៅកាន់ [${firstItem.pageName}]: Chunk ${chunk}/${total} (${pct}%)...`,
              });
            }
          );

          resultsList.push({
            pageId: firstItem.pageId,
            pageName: firstItem.pageName,
            status: "success",
            postId: firstResult.id,
            captionPreview: firstItem.caption.slice(0, 70) + "...",
            message:
              "បាន Upload និងផុសទៅកាន់ Facebook Page ជោគជ័យ!" +
              (thumbnailDataUrl ? " (រួមទាំង Thumbnail)" : ""),
          });

          // 2. If there are other pages, syndicate using Facebook's CDN or upload
          if (pageCaptions.length > 1) {
            let fbSourceUrl = "";
            setPublishProgress({
              total: pageCaptions.length,
              completed: 1,
              status:
                "វីដេអូបាន Upload ជោគជ័យ! កំពុងទាញយកតំណភ្ជាប់ Facebook CDN សម្រាប់ចែករំលែកទៅ Pages ផ្សេងទៀត...",
            });

            for (let attempt = 0; attempt < 8; attempt++) {
              await new Promise((r) => setTimeout(r, 2000));
              try {
                const statusRes = await fetch("/api/video-publisher", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    action: "check_video_status",
                    pageId: firstItem.pageId,
                    videoId: firstResult.id,
                  }),
                });
                const statusData = await statusRes.json();
                if (statusData?.source) {
                  fbSourceUrl = statusData.source;
                  break;
                }
              } catch {}
            }

            const remainingItems = pageCaptions.slice(1);

            if (fbSourceUrl) {
              setPublishProgress({
                total: pageCaptions.length,
                completed: 1,
                status: `កំពុងផុសទៅកាន់ ${remainingItems.length} Pages ទៀតតាមរយៈ Facebook CDN ផ្ទាល់...`,
              });

              const pubRes = await fetch("/api/video-publisher", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "publish_video",
                  title: videoTitle || "វីដេអូផ្សព្វផ្សាយ",
                  videoUrl: fbSourceUrl,
                  thumbnail: thumbnailDataUrl || undefined,
                  mediaType: "video",
                  postType,
                  captionStyle,
                  pageCaptions: remainingItems,
                }),
              });

              const pubData = await pubRes.json();
              if (pubData.results) {
                resultsList.push(...pubData.results);
              }
            } else {
              // If CDN is not ready yet, upload directly using Resumable Chunks to each remaining page
              for (let i = 0; i < remainingItems.length; i++) {
                const item = remainingItems[i];
                setPublishProgress({
                  total: pageCaptions.length,
                  completed: 1 + i,
                  status: `កំពុង Upload វីដេអូទៅកាន់ [${item.pageName}]: 0%...`,
                });

                try {
                  const res = await uploadViaResumableChunks(
                    item.pageId,
                    item.pageName,
                    item.caption,
                    (pct, chunk, total) => {
                      setPublishProgress({
                        total: pageCaptions.length,
                        completed: 1 + i,
                        status: `កំពុង Upload វីដេអូទៅកាន់ [${item.pageName}]: Chunk ${chunk}/${total} (${pct}%)...`,
                      });
                    }
                  );

                  resultsList.push({
                    pageId: item.pageId,
                    pageName: item.pageName,
                    status: "success",
                    postId: res.id,
                    captionPreview: item.caption.slice(0, 70) + "...",
                    message:
                      "បាន Upload និងផុសទៅកាន់ Facebook Page ជោគជ័យ!" +
                      (thumbnailDataUrl ? " (រួមទាំង Thumbnail)" : ""),
                  });
                } catch (err: any) {
                  resultsList.push({
                    pageId: item.pageId,
                    pageName: item.pageName,
                    status: "error",
                    captionPreview: item.caption.slice(0, 70) + "...",
                    message: err.message || "Failed to upload to page",
                  });
                }
              }
            }
          }
        } catch (firstErr: any) {
          resultsList.push({
            pageId: firstItem.pageId,
            pageName: firstItem.pageName,
            status: "error",
            captionPreview: firstItem.caption.slice(0, 70) + "...",
            message: firstErr.message || "Failed to upload video to Facebook",
          });
        }

        // Save Record to History
        const newRecord: VideoPostRecord = {
          id: `vpost_${Date.now()}`,
          title: videoTitle || "វីដេអូផ្សព្វផ្សាយ",
          videoUrl: "[Direct Video Upload to Facebook]",
          mediaType: "video",
          postType,
          captionStyle,
          targetPagesCount: pageCaptions.length,
          publishedAt: new Date().toISOString(),
          status: resultsList.every((r) => r.status === "success") ? "completed" : "partial",
          results: resultsList,
        };

        await fetch("/api/video-publisher", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "save_history",
            record: newRecord,
          }),
        });

        setPublishResults(resultsList);
        setHistory((prev) => [newRecord, ...prev.filter((r) => r.id !== newRecord.id)]);
        fetchHistory();
        return;
      }

      let finalMediaUrl = videoDirectUrl || "";

      // 2. Photo uploads or small files
      const activeFile = mediaType === "photo" ? photoFile : null;
      if (activeFile) {
        setPublishProgress({
          total: selectedPageIds.length,
          completed: 0,
          status: `កំពុង Upload រូបភាព (${(activeFile.size / (1024 * 1024)).toFixed(1)} MB) ទៅកាន់ Fast Storage...`,
        });

        const uploadUrlRes = await fetch(
          `/api/video-publisher?action=get_upload_url&fileName=${encodeURIComponent(activeFile.name)}`
        );
        const uploadUrlData = await uploadUrlRes.json();

        if (!uploadUrlRes.ok || !uploadUrlData?.signedUrl) {
          throw new Error(uploadUrlData?.error || "មិនអាចបង្កើតតំណភ្ជាប់ Upload បានទេ");
        }

        const putRes = await fetch(uploadUrlData.signedUrl, {
          method: "PUT",
          headers: {
            "Content-Type": activeFile.type || "image/jpeg",
          },
          body: activeFile,
        });

        if (!putRes.ok) {
          throw new Error("ការ Upload រូបភាពបរាជ័យ។");
        }

        finalMediaUrl = uploadUrlData.publicUrl;
      }

      // 2. Dispatch to Facebook via Server API (Node.js bypasses all browser CORS & AdBlockers)
      setPublishProgress({
        total: selectedPageIds.length,
        completed: 0,
        status: `កំពុងផុសទៅកាន់ ${pageCaptions.length} Pages តាមរយៈ Server (គ្មានបញ្ហា CORS / Block)...`,
      });

      const pubRes = await fetch("/api/video-publisher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "publish_video",
          title: videoTitle || (mediaType === "video" ? "វីដេអូផ្សព្វផ្សាយ" : mediaType === "photo" ? "រូបភាពផ្សព្វផ្សាយ" : "អត្ថបទផ្សព្វផ្សាយ"),
          videoUrl: finalMediaUrl,
          thumbnail: thumbnailDataUrl || undefined,
          mediaType,
          postType,
          captionStyle,
          pageCaptions,
        }),
      });

      const pubData = await pubRes.json();
      if (!pubRes.ok) {
        throw new Error(pubData.error || "ការផុសបរាជ័យ");
      }

      setPublishResults(pubData.results || []);
      if (pubData.record) {
        setHistory((prev: VideoPostRecord[]) => [
          pubData.record,
          ...prev.filter((r: VideoPostRecord) => r.id !== pubData.record.id),
        ]);
      }
      fetchHistory();
    } catch (err: any) {
      console.error("Failed to publish media:", err);
      alert("មានបញ្ហាក្នុងការផុស៖ " + (err.message || "Failed to publish"));
    } finally {
      setIsPublishing(false);
      setPublishProgress(null);
    }
  };

  const selectedPagesList = allTargetPages.filter((p) =>
    selectedPageIds.includes(p.id)
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* HEADER BANNER */}
      <div className="relative overflow-hidden rounded-3xl border border-indigo-500/30 bg-gradient-to-r from-[#0d1527] via-[#0b1324] to-[#0c162d] p-6 shadow-2xl backdrop-blur-xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-400">
              <Sparkles className="h-3.5 w-3.5 animate-pulse text-purple-400" />
              <span>Facebook Video & Reels Multi-Page Syndication System</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Video & Reel Publisher</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold">
                Pro
              </span>
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Upload វីដេអូ ឬរូបភាពតែ ១ ដង អាចផុសទៅកាន់ Page ទាំងអស់ ({allTargetPages.length} Pages) ព្រមគ្នា ដោយមានប្រព័ន្ធ AI Vision ពិនិត្យសាច់វីដេអូជាក់ស្តែង និងបង្កើត Caption ប្លែកៗគ្នាទៅតាមប្រភេទ Page នីមួយៗដោយស្វ័យប្រវត្តិ។
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-200 transition shadow-sm"
            >
              <History className="h-4 w-4 text-indigo-400" />
              <span>{showHistory ? "លាក់ប្រវត្តិ" : "មើលប្រវត្តិផុស"}</span>
              <span className="rounded-full bg-slate-700 px-1.5 py-0.2 text-[10px] text-indigo-300">
                {history.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* HISTORY DRAWER / VIEW */}
      {showHistory && (
        <div className="rounded-2xl border border-indigo-500/20 bg-slate-900/90 p-5 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <History className="h-4 w-4 text-indigo-400" />
              <span>ប្រវត្តិការផុស Video & Reels ថ្មីៗ</span>
            </h3>
            <button
              onClick={() => setShowHistory(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕ បិទ
            </button>
          </div>

          {history.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              មិនទាន់មានប្រវត្តិផុសនៅឡើយទេ
            </p>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {history.map((rec) => (
                <div
                  key={rec.id}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs hover:border-slate-700"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{rec.title}</span>
                      <span
                        className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                      >
                        {rec.postType === "reels" ? "🎥 Reels" : rec.mediaType === "photo" ? "🖼️ Photo" : "📹 Video"}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {new Date(rec.publishedAt).toLocaleString("km-KH")} • ចំនួន Pages:{" "}
                      <span className="text-emerald-400 font-bold">
                        {rec.targetPagesCount} Pages
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    <span>ជោគជ័យ</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* WORKSPACE: 3-COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: TARGET PAGES, FORMAT & SETTINGS */}
        <div className="space-y-5">
          {/* 1. Target Page Selector (Multi-select with Member filter & Select All) */}
          <div className="rounded-2xl border border-slate-800 bg-[#0B1220] p-5 shadow-lg space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-white flex items-center gap-2">
                  <span>១. ជ្រើសរើស Facebook Pages ({allTargetPages.length} Pages)</span>
                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                </label>
                <span className="text-[10px] text-cyan-400">
                  ● អាចជ្រើសរើសច្រើន Page តាមចិត្តក្នុងពេលតែមួយ
                </span>
              </div>
              <span className="text-[11px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2.5 py-0.5 rounded-full font-mono">
                {selectedPageIds.length}/{allTargetPages.length} Pages
              </span>
            </div>

            {/* Member Filter Pills (Only for Super Admin managing multiple members) */}
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
                  ទាំងអស់ ({allTargetPages.length})
                </button>
                {memberNames.map((mName) => {
                  const mPagesCount = allTargetPages.filter(
                    (p) => p.memberName === mName
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
                  onClick={selectAllPages}
                  className="rounded-lg bg-cyan-500/10 px-2.5 py-1 text-[11px] font-bold text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 transition active:scale-95"
                >
                  ✓ ជ្រើសទាំងអស់
                </button>
                <button
                  type="button"
                  onClick={deselectAllPages}
                  className="rounded-lg bg-slate-800/80 px-2.5 py-1 text-[11px] text-slate-400 border border-slate-700/80 hover:bg-slate-800 hover:text-white transition active:scale-95"
                >
                  ✕ ដោះទាំងអស់
                </button>
              </div>
            </div>

            {/* Pages Checkbox List */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {displayedPages.length === 0 ? (
                <div className="py-8 text-center rounded-xl border border-dashed border-slate-800 bg-slate-900/40 p-4">
                  <span className="text-xl block mb-1">📄</span>
                  <span className="text-xs font-bold text-white block">
                    មិនទាន់មាន Facebook Page នៅឡើយទេ
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                    គណនីរបស់អ្នកមិនទាន់មាន Facebook Page សម្រាប់ផុសទេ។ សូមភ្ជាប់ Page របស់អ្នកនៅលើផ្ទាំង Dashboard ជាមុនសិន។
                  </p>
                </div>
              ) : (
                displayedPages.map((p) => {
                const isSelected = selectedPageIds.includes(p.id);
                const owner = p.memberName;
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
                        onChange={() => {}}
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
                  បានជ្រើសរើស <b>{selectedPageIds.length} Pages</b> (រួចរាល់សម្រាប់ការផុស)
                </span>
              </div>
            )}
          </div>

          {/* 2. Format & Post Type Card */}
          <div className="rounded-2xl border border-slate-800 bg-[#0B1220] p-5 shadow-lg space-y-3.5">
            <label className="text-xs font-bold text-white flex items-center gap-2">
              <Layers className="h-4 w-4 text-cyan-400" />
              <span>២. ប្រភេទការផុស (Format & Post Type)</span>
            </label>

            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setMediaType("video")}
                className={`py-2 px-1 rounded-lg font-bold transition flex items-center justify-center gap-1.5 text-xs ${
                  mediaType === "video"
                    ? "bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Video className="h-3.5 w-3.5" />
                <span>🎬 វីដេអូ</span>
              </button>

              <button
                type="button"
                onClick={() => setMediaType("photo")}
                className={`py-2 px-1 rounded-lg font-bold transition flex items-center justify-center gap-1.5 text-xs ${
                  mediaType === "photo"
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <ImageIcon className="h-3.5 w-3.5" />
                <span>🖼️ រូបភាព</span>
              </button>

              <button
                type="button"
                onClick={() => setMediaType("text")}
                className={`py-2 px-1 rounded-lg font-bold transition flex items-center justify-center gap-1.5 text-xs ${
                  mediaType === "text"
                    ? "bg-emerald-600 text-white shadow font-bold"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>📝 អត្ថបទ</span>
              </button>
            </div>

            {/* Sub-selector for Video: Reels vs Normal Video */}
            {mediaType === "video" && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-semibold text-slate-400 block">
                  ទម្រង់វីដេអូលើ Facebook:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPostType("reels")}
                    className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between ${
                      postType === "reels"
                        ? "border-purple-500 bg-purple-950/40 text-white shadow-md shadow-purple-950/20"
                        : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Film className="h-4 w-4 text-purple-400" />
                      <div className="text-xs">
                        <span className="font-bold block text-white">Facebook Reels</span>
                        <span className="text-[10px] text-purple-300">Viral ខ្ពស់</span>
                      </div>
                    </div>
                    {postType === "reels" && (
                      <span className="h-2 w-2 rounded-full bg-purple-400" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setPostType("video")}
                    className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between ${
                      postType === "video"
                        ? "border-indigo-500 bg-indigo-950/40 text-white shadow-md shadow-indigo-950/20"
                        : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-indigo-400" />
                      <div className="text-xs">
                        <span className="font-bold block text-white">Video ធម្មតា</span>
                        <span className="text-[10px] text-slate-400">ចូល Feed ផេក</span>
                      </div>
                    </div>
                    {postType === "video" && (
                      <span className="h-2 w-2 rounded-full bg-indigo-400" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 3. Facebook Permissions & Re-Auth Card */}
          <div className="rounded-2xl border border-slate-800 bg-[#0B1220] p-4 space-y-3 shadow-lg text-xs">
            <div className="flex items-center gap-2 text-slate-300 font-bold">
              <AlertCircle className="h-4 w-4 text-cyan-400" />
              <span className="text-white">សិទ្ធិផុសលើ Facebook</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              ប្រព័ន្ធបានភ្ជាប់ជាមួយ Page Token ដែលមានសិទ្ធិ{" "}
              <code className="text-cyan-400 font-mono text-[10px] bg-slate-900 px-1 py-0.5 rounded border border-slate-800">
                pages_manage_posts
              </code>{" "}
              រួចរាល់ អាចផុសវីដេអូ រូបភាព និង Reels បាន ១០០%។
            </p>
            <button
              type="button"
              onClick={triggerFacebookReauth}
              disabled={isReauthorizing}
              className="w-full py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 hover:text-white font-semibold text-[11px] flex items-center justify-center gap-2 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-cyan-400 ${isReauthorizing ? "animate-spin" : ""}`} />
              <span>{isReauthorizing ? "កំពុងភ្ជាប់..." : "🔑 ភ្ជាប់សិទ្ធិ Facebook ឡើងវិញ"}</span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: MEDIA UPLOADER, CAPTION STRATEGY & PUBLISHER (2 of 3 Cols) */}
        <div className="lg:col-span-2 space-y-5">
          {/* 3. Media Source Card */}
          <div className="rounded-2xl border border-slate-800 bg-[#0B1220] p-5 space-y-4 shadow-lg">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              {mediaType === "video" && <Video className="h-4 w-4 text-blue-400" />}
              {mediaType === "photo" && <ImageIcon className="h-4 w-4 text-emerald-400" />}
              {mediaType === "text" && <FileText className="h-4 w-4 text-purple-400" />}
              <span>
                ៣. {mediaType === "video" ? "Upload វីដេអូ & រូប Thumbnail (Media Source)" : mediaType === "photo" ? "Upload រូបភាព (Photo Source)" : "ការផុសអត្ថបទសុទ្ធ (Text Post)"}
              </span>
            </h3>

            {/* VIDEO MEDIA DISPLAY */}
            {mediaType === "video" && (
              <>
                {videoPreviewUrl ? (
                  <div className="space-y-3">
                    <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-black aspect-video flex items-center justify-center">
                      <video
                        ref={mainVideoRef}
                        src={videoPreviewUrl}
                        controls
                        crossOrigin="anonymous"
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur border border-white/10 text-[11px] text-white flex items-center gap-1.5 shadow-lg">
                        {videoFile && videoFile.size > 48 * 1024 * 1024 ? (
                          <span className="text-amber-400 font-semibold flex items-center gap-1">
                            ⚡ {(videoFile.size / (1024 * 1024)).toFixed(1)} MB (ទំហំធំ: ប្រើប្រាស់ High-Capacity Cloud)
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            ⚡ {videoFile ? `${(videoFile.size / (1024 * 1024)).toFixed(1)} MB (Fast Cloud)` : ""}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setVideoFile(null);
                          setVideoPreviewUrl("");
                          setThumbnailFile(null);
                          setThumbnailPreviewUrl("");
                          setThumbnailDataUrl("");
                          setCapturedVideoFrames([]);
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-slate-300 hover:text-white"
                        title="លុបចេញ"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* AI VIDEO VISION INSPECTION FRAMES PREVIEW */}
                    {(capturedVideoFrames.length > 0 || isExtractingFrames) && (
                      <div className="rounded-xl border border-cyan-500/40 bg-gradient-to-r from-cyan-950/40 via-slate-900 to-indigo-950/40 p-3 space-y-2 shadow-inner">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="p-1 rounded bg-cyan-500/20 text-cyan-300">
                              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                            </span>
                            <span className="text-xs font-bold text-white">
                              👁️ ប្លង់វីដេអូដែល AI បានពិនិត្យឃើញ ({capturedVideoFrames.length} Frames):
                            </span>
                          </div>
                          {isExtractingFrames ? (
                            <span className="text-[10px] text-amber-300 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold animate-pulse flex items-center gap-1">
                              <RefreshCw className="h-3 w-3 animate-spin" /> កំពុងស្កេនប្លង់...
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                              ✓ AI Vision Ready
                            </span>
                          )}
                        </div>

                        {capturedVideoFrames.length > 0 && (
                          <div className="grid grid-cols-3 gap-2">
                            {capturedVideoFrames.map((frame, idx) => (
                              <div
                                key={idx}
                                onClick={() => {
                                  setThumbnailPreviewUrl(frame);
                                  setThumbnailDataUrl(frame);
                                  setThumbnailFile(null);
                                }}
                                className={`relative aspect-video rounded-lg overflow-hidden border cursor-pointer transition group bg-black shadow ${
                                  thumbnailDataUrl === frame
                                    ? "border-emerald-400 ring-2 ring-emerald-500/50"
                                    : "border-cyan-500/30 hover:border-cyan-400"
                                }`}
                                title="ចុចដើម្បីកំណត់រូបនេះធ្វើជា Thumbnail ក្របវីដេអូ"
                              >
                                <img
                                  src={frame}
                                  alt={`Scene ${idx + 1}`}
                                  className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                                />
                                <span className="absolute bottom-1 right-1 text-[9px] bg-black/80 backdrop-blur text-cyan-300 px-1 py-0.2 rounded font-mono">
                                  ប្លង់ #{idx + 1}
                                </span>
                                {thumbnailDataUrl === frame && (
                                  <span className="absolute top-1 left-1 text-[8px] bg-emerald-500 text-white font-bold px-1 rounded">
                                    ★ Thumbnail
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        <p className="text-[10px] text-slate-400 leading-tight">
                          💡 AI ពិនិត្យឃើញសកម្មភាព ផលិតផល និងអក្សរក្នុងប្លង់ទាំងនេះ ដើម្បីសរសេរ Caption ឱ្យចំសាច់រឿងជាក់ស្តែង (បងអាចចុចលើប្លង់ណា ១ ដើម្បីយកធ្វើជា Thumbnail ផងដែរ)
                        </p>
                      </div>
                    )}

                    {/* VIDEO THUMBNAIL / THEMNNEL CARD */}
                    <div className="rounded-xl border border-indigo-500/30 bg-slate-900/90 p-3 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-pink-500/20 text-pink-400">
                            <ImageIcon className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white flex items-center gap-1.5">
                              🖼️ រូបភាពក្រប (Thumbnail / Themnel)
                            </span>
                            <p className="text-[10px] text-slate-400">
                              កំណត់រូបភាពក្របសម្រាប់បង្ហាញលើ Facebook Feed & Reels មុនចុចមើល
                            </p>
                          </div>
                        </div>
                        {thumbnailPreviewUrl && (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                            ✓ បានកំណត់
                          </span>
                        )}
                      </div>

                      {thumbnailPreviewUrl ? (
                        <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-800/80 border border-slate-700">
                          <div className="relative w-24 h-16 rounded-lg overflow-hidden border border-slate-600 bg-black shrink-0">
                            <img
                              src={thumbnailPreviewUrl}
                              alt="Thumbnail Preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 space-y-1">
                            <p className="text-[11px] font-semibold text-emerald-300 truncate">
                              {thumbnailFile ? `📁 រូបភាព: ${thumbnailFile.name}` : "📸 ចាប់យក Frame ពីវីដេអូ"}
                            </p>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={captureThumbnailFromCurrentVideo}
                                className="text-[10px] px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition flex items-center gap-1"
                              >
                                <span>📸 ចាប់ Frame ថ្មី</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => thumbnailInputRef.current?.click()}
                                className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium transition flex items-center gap-1"
                              >
                                <span>🖼️ ប្តូររូប</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setThumbnailFile(null);
                                  setThumbnailPreviewUrl("");
                                  setThumbnailDataUrl("");
                                }}
                                className="text-[10px] p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800/50 text-rose-300 transition"
                                title="លុប Thumbnail"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={captureThumbnailFromCurrentVideo}
                            className="p-2.5 rounded-xl border border-indigo-500/40 bg-indigo-950/30 hover:bg-indigo-900/40 text-left transition flex items-center gap-2.5 group"
                          >
                            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-300 group-hover:scale-105 transition">
                              📸
                            </div>
                            <div>
                              <span className="text-[11px] font-bold text-white block">
                                ចាប់យក Frame ពីវីដេអូ
                              </span>
                              <span className="text-[9px] text-slate-400">
                                ផ្អាកត្រង់ប្លង់ស្អាត រួចចុចយក
                              </span>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => thumbnailInputRef.current?.click()}
                            className="p-2.5 rounded-xl border border-purple-500/40 bg-purple-950/30 hover:bg-purple-900/40 text-left transition flex items-center gap-2.5 group"
                          >
                            <div className="p-2 rounded-lg bg-purple-500/20 text-purple-300 group-hover:scale-105 transition">
                              🖼️
                            </div>
                            <div>
                              <span className="text-[11px] font-bold text-white block">
                                Upload រូប Thumbnail
                              </span>
                              <span className="text-[9px] text-slate-400">
                                ជ្រើសរើសរូបពីម៉ាស៊ីន (JPG/PNG)
                              </span>
                            </div>
                          </button>
                        </div>
                      )}

                      <input
                        ref={thumbnailInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleThumbnailFileChange}
                        className="hidden"
                      />
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => videoInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition bg-slate-900/40 hover:bg-slate-800/40"
                  >
                    <div className="p-3 rounded-full bg-indigo-500/10 text-indigo-400 mb-2">
                      <UploadCloud className="h-6 w-6" />
                    </div>
                    <span className="text-xs font-bold text-white">
                      ចុច Upload វីដេអូ (MP4, MOV, WebM)
                    </span>
                    <span className="text-[11px] text-slate-500 mt-1">
                      Upload ផ្ទាល់ពីកុំព្យូទ័របានរហូតដល់ 1,000 MB (1 GB) ឬប្រើ Link ដល់ 5 GB
                    </span>
                  </div>
                )}

                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoFileChange}
                  className="hidden"
                />
              </>
            )}

            {/* PHOTO MEDIA DISPLAY */}
            {mediaType === "photo" && (
              <>
                {photoPreviewUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-black aspect-video flex items-center justify-center">
                    <img
                      src={photoPreviewUrl}
                      alt="Preview"
                      className="w-full h-full object-contain"
                    />
                    <button
                      onClick={() => {
                        setPhotoFile(null);
                        setPhotoPreviewUrl("");
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-slate-300 hover:text-white"
                      title="លុបចេញ"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => photoInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition bg-slate-900/40 hover:bg-slate-800/40"
                  >
                    <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-400 mb-2">
                      <UploadCloud className="h-6 w-6" />
                    </div>
                    <span className="text-xs font-bold text-white">
                      ចុច Upload រូបភាព (JPG, PNG, WEBP)
                    </span>
                    <span className="text-[11px] text-slate-500 mt-1">
                      រូបភាពច្បាស់សម្រាប់ផុសលើ Facebook Page Feed ផ្ទាល់
                    </span>
                  </div>
                )}

                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoFileChange}
                  className="hidden"
                />
              </>
            )}

            {/* TEXT POST NOTICE */}
            {mediaType === "text" && (
              <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/30 space-y-2">
                <div className="flex items-center gap-2 text-purple-300 font-bold text-xs">
                  <FileText className="h-4 w-4" />
                  <span>ផុសជាអត្ថបទសុទ្ធ (Status Feed Post)</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  ការផុសនេះនឹងបញ្ជូនអត្ថបទ Caption ដែល AI បានសរសេរចូលទៅកាន់ផ្ទាំង Feed នៃ Page ទាំង ៨ ដោយផ្ទាល់ ដោយពុំចាំបាច់មានរូបភាព ឬវីដេអូនោះឡើយ។
                </p>
              </div>
            )}

            {/* Post Title Input */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                ចំណងជើងការផុស ({mediaType === "video" ? "Video Title" : mediaType === "photo" ? "Photo Title" : "Post Title"}):
              </label>
              <input
                type="text"
                placeholder="ឧ. ប្រូម៉ូសិនពិសេសប្រចាំខែ..."
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Direct Media URL Alternative (Video or Photo) */}
            {mediaType !== "text" && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center justify-between">
                  <span>ឬ ដាក់តំណភ្ជាប់ {mediaType === "video" ? "វីដេអូ" : "រូបភាព"} ផ្ទាល់ (Google Drive / Direct URL):</span>
                  <span className="text-[10px] text-indigo-400 font-bold">គាំទ្រដល់ 5 GB - 10 GB 🚀</span>
                </label>
                <input
                  type="text"
                  placeholder={mediaType === "video" ? "https://drive.google.com/file/d/... ឬ https://example.com/video.mp4" : "https://example.com/image.jpg"}
                  value={videoDirectUrl}
                  onChange={(e) => {
                    setVideoDirectUrl(e.target.value);
                    if (e.target.value.startsWith("http")) {
                      if (mediaType === "video") setVideoPreviewUrl(e.target.value);
                      if (mediaType === "photo") setPhotoPreviewUrl(e.target.value);
                    }
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  💡 សម្រាប់វីដេអូធំៗ (1 GB ដល់ 5 GB) បងអាច Upload ចូល Google Drive រួច Copy Link យកមកដាក់ទីនេះ Facebook នឹងទាញយកដោយស្វ័យប្រវត្តិ។
                </p>
              </div>
            )}
          </div>

          {/* 4. CAPTION STRATEGY SELECTOR & AI DEEP GENERATOR */}
          <div className="rounded-2xl border border-indigo-500/40 bg-gradient-to-b from-indigo-950/30 to-slate-900 p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    ៤. យុទ្ធសាស្ត្រ Caption & AI Deep Generator
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    ជ្រើសរើសយុទ្ធសាស្ត្រលក់ AI នឹងគិត និងសរសេរ Caption ប្លែកៗគ្នាទៅតាម Page នីមួយៗ
                  </p>
                </div>
              </div>
            </div>

            {/* CAPTION STYLE / TYPE SELECTOR (User Requested) */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-2">
                ជ្រើសរើសប្រភេទ / ទម្រង់ Caption (Caption Strategy Style):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {/* 1. Promotion */}
                <button
                  type="button"
                  onClick={() => setCaptionStyle("promotion")}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-1 ${
                    captionStyle === "promotion"
                      ? "bg-gradient-to-r from-rose-950 to-red-950 border-rose-500 text-white shadow-md shadow-rose-950/50"
                      : "bg-slate-900/90 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                  }`}
                >
                  <span className="flex items-center gap-1.5 font-bold text-xs text-rose-300">
                    <Flame className="h-3.5 w-3.5 text-rose-400" />
                    <span>🔥 ប្រូម៉ូសិនកក្រើក</span>
                  </span>
                  <span className="text-[10px] text-slate-400 leading-tight">
                    ទិញ ២ ថែម ១, ចំនួនមានកំណត់, ដឹកឥតគិតថ្លៃ
                  </span>
                </button>

                {/* 2. Education */}
                <button
                  type="button"
                  onClick={() => setCaptionStyle("education")}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-1 ${
                    captionStyle === "education"
                      ? "bg-gradient-to-r from-emerald-950 to-teal-950 border-emerald-500 text-white shadow-md shadow-emerald-950/50"
                      : "bg-slate-900/90 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                  }`}
                >
                  <span className="flex items-center gap-1.5 font-bold text-xs text-emerald-300">
                    <Stethoscope className="h-3.5 w-3.5 text-emerald-400" />
                    <span>🩺 អប់រំសុខភាព</span>
                  </span>
                  <span className="text-[10px] text-slate-400 leading-tight">
                    រោគសញ្ញា, ផលប៉ះពាល់, ពិគ្រោះសុខភាព
                  </span>
                </button>

                {/* 3. Question / Viral */}
                <button
                  type="button"
                  onClick={() => setCaptionStyle("question")}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-1 ${
                    captionStyle === "question"
                      ? "bg-gradient-to-r from-amber-950 to-yellow-950 border-amber-500 text-white shadow-md shadow-amber-950/50"
                      : "bg-slate-900/90 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                  }`}
                >
                  <span className="flex items-center gap-1.5 font-bold text-xs text-amber-300">
                    <HelpCircle className="h-3.5 w-3.5 text-amber-400" />
                    <span>❓ សំណួរចាក់ដោត</span>
                  </span>
                  <span className="text-[10px] text-slate-400 leading-tight">
                    សំណួរទាក់ទាញ, ជំរុញឱ្យខមិនលេខទូរស័ព្ទ
                  </span>
                </button>

                {/* 4. Testimonial */}
                <button
                  type="button"
                  onClick={() => setCaptionStyle("testimonial")}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-1 ${
                    captionStyle === "testimonial"
                      ? "bg-gradient-to-r from-blue-950 to-indigo-950 border-blue-500 text-white shadow-md shadow-blue-950/50"
                      : "bg-slate-900/90 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                  }`}
                >
                  <span className="flex items-center gap-1.5 font-bold text-xs text-blue-300">
                    <Star className="h-3.5 w-3.5 text-blue-400" />
                    <span>🌟 Feedback ភ្ញៀវពិត</span>
                  </span>
                  <span className="text-[10px] text-slate-400 leading-tight">
                    មតិកែលម្អ, លទ្ធផលប្រើប្រាស់ជាក់ស្តែង
                  </span>
                </button>

                {/* 5. Branding & CEO */}
                <button
                  type="button"
                  onClick={() => setCaptionStyle("branding")}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-1 ${
                    captionStyle === "branding"
                      ? "bg-gradient-to-r from-purple-950 to-indigo-950 border-purple-500 text-white shadow-md shadow-purple-950/50"
                      : "bg-slate-900/90 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                  }`}
                >
                  <span className="flex items-center gap-1.5 font-bold text-xs text-purple-300">
                    <Award className="h-3.5 w-3.5 text-purple-400" />
                    <span>💎 ស្ដង់ដារ & CEO</span>
                  </span>
                  <span className="text-[10px] text-slate-400 leading-tight">
                    ការធានាពី CEO, ស្ដង់ដារក្រសួងសុខាភិបាល
                  </span>
                </button>
              </div>
            </div>

            {/* MASTER CAPTION TEMPLATE & GOLDEN PRESETS */}
            <div className="rounded-2xl border border-pink-500/40 bg-gradient-to-b from-pink-950/30 to-purple-950/20 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-pink-500/20 text-pink-300">
                    <FileText className="h-4 w-4" />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      👑 គំរូ Caption ស្តង់ដារពេញចិត្ត (Master Caption Template)
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      ជ្រើសរើសគំរូស្ដង់ដារ ឬបិទភ្ជាប់ (Paste) Caption របស់បងនៅទីនេះ
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={applyMasterCaptionToAll}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition shrink-0"
                >
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                  <span>📋 ប្រើ Caption នេះគ្រប់ Page (Apply to All)</span>
                </button>
              </div>

              {/* Clickable Golden Presets */}
              <div className="flex flex-wrap gap-1.5">
                {GOLDEN_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setMasterCaption(preset.text)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                      masterCaption === preset.text
                        ? "bg-pink-600 border-pink-500 text-white shadow-sm"
                        : "bg-slate-900/80 border-slate-700 text-slate-300 hover:text-white hover:border-slate-600"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Master Caption Textarea */}
              <textarea
                rows={6}
                value={masterCaption}
                onChange={(e) => setMasterCaption(e.target.value)}
                placeholder="បិទភ្ជាប់ (Paste) Caption គំរូដែលបងស្រឡាញ់ពេញចិត្តនៅទីនេះ..."
                className="w-full bg-slate-900/90 border border-pink-500/40 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-400 font-sans shadow-inner leading-relaxed"
              />
            </div>

            {/* Dedicated Media Story Content for Gemini 3.8 AI */}
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  <span>
                    ខ្លឹមសារបន្ថែមក្នុង{mediaType === "video" ? "វីដេអូ" : mediaType === "photo" ? "រូបភាព" : "ការផ្សព្វផ្សាយ"} (Media Story & Promo Note)៖
                  </span>
                </label>
                <span className="text-[10px] text-amber-300 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold">
                  ★ AI គិតតាមនេះ ១០០%
                </span>
              </div>
              <textarea
                rows={2}
                value={mediaStory}
                onChange={(e) => setMediaStory(e.target.value)}
                placeholder="ឧ. វីដេអូនេះបង្ហាញពីការណែនាំផលិតផល និងអត្ថប្រយោជន៍ចម្បង, មានប្រូម៉ូសិនពិសេសទិញ ២ ថែម ១..."
                className="w-full bg-slate-900 border border-amber-500/40 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-sans shadow-inner"
              />
            </div>

            {/* Action Buttons: 1-Click Apply OR AI Generate */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={applyMasterCaptionToAll}
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition"
              >
                <Check className="h-4 w-4 stroke-[3]" />
                <span>📋 ប្រើ Caption គំរូខាងលើ (១០០% ដូចគំរូ)</span>
              </button>

              <button
                type="button"
                onClick={handleGenerateCaptions}
                disabled={isGeneratingAi || selectedPageIds.length === 0}
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-bold text-xs shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <Sparkles className={`h-4 w-4 ${isGeneratingAi ? "animate-spin text-amber-300" : ""}`} />
                <span>
                  {isGeneratingAi
                    ? "AI កំពុងមើលវីដេអូ & សរសេរ Caption..."
                    : `🪄 AI ពិនិត្យវីដេអូ & សរសេរតាម Page (${selectedPageIds.length} Pages)`}
                </span>
              </button>
            </div>
          </div>

          {/* Individual Page Captions List (Accordion Cards) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>ពិនិត្យ និងកែសម្រួល Caption តាម Page នីមួយៗ (ខុសៗគ្នា ១០០%)៖</span>
              <span className="text-[11px] text-purple-300 font-semibold">
                {Object.keys(captionsMap).length > 0
                  ? "✅ Caption បានបង្កើតប្លែកៗគ្នាស្រេច"
                  : "💡 ចុចប៊ូតុងខាងលើដើម្បីបង្កើត"}
              </span>
            </div>

            {selectedPagesList.length === 0 ? (
              <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/30 text-center text-slate-500 text-xs">
                សូមជ្រើសរើស Page នៅខាងឆ្វេងជាមុនសិន
              </div>
            ) : (
              selectedPagesList.map((page) => {
                const isExpanded =
                  expandedCaptionPageId === page.id ||
                  selectedPagesList.length <= 2;
                const caption =
                  captionsMap[page.id] ||
                  `${videoTitle || "វីដេអូពិសេស"}\n\n${baseTopic}\n\n#${page.name.replace(/\s+/g, "")}`;

                return (
                  <div
                    key={page.id}
                    className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-sm"
                  >
                    {/* Header */}
                    <div
                      onClick={() =>
                        setExpandedCaptionPageId(isExpanded ? null : page.id)
                      }
                      className="px-4 py-3 bg-slate-850 flex items-center justify-between cursor-pointer hover:bg-slate-800/60 transition"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        <span className="font-bold text-white text-xs">
                          {page.name}
                        </span>
                        <span className="text-[10px] text-purple-300 bg-purple-950/60 border border-purple-500/30 px-2 py-0.2 rounded-full">
                          {page.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <span className="text-[10px] font-mono text-slate-500">
                          {caption.length} តួអក្សរ
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </div>

                    {/* Expandable Caption Textarea */}
                    {isExpanded && (
                      <div className="p-3.5 space-y-2 border-t border-slate-800 bg-slate-950/40">
                        <textarea
                          rows={5}
                          value={caption}
                          onChange={(e) =>
                            handleUpdateCaption(page.id, e.target.value)
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 leading-relaxed focus:outline-none focus:border-purple-500 font-sans"
                        />
                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                          <span className="text-purple-300 font-medium">
                            {captionsMap[page.id] ? "✨ AI Tailored Caption (ខុសប្លែកពីគេ)" : "📝 Default Caption"}
                          </span>
                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(caption)}
                            className="flex items-center gap-1 text-slate-400 hover:text-white"
                          >
                            <Copy className="h-3 w-3" />
                            <span>ចម្លង</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* 4. BIG PUBLISH BUTTON */}
          <div className="pt-2">
            <button
              onClick={handlePublishAll}
              disabled={isPublishing || selectedPageIds.length === 0}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 text-white font-extrabold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2.5 transition active:scale-[0.99] disabled:opacity-50"
            >
              {isPublishing ? (
                <RefreshCw className="h-5 w-5 animate-spin text-white" />
              ) : (
                <Send className="h-5 w-5" />
              )}
              <span>
                {isPublishing
                  ? `កំពុងបញ្ជូន និងផុសទៅកាន់ Pages (${publishProgress?.completed || 0}/${selectedPageIds.length})...`
                  : `🚀 បញ្ជាផុស${mediaType === "video" ? "វីដេអូ" : mediaType === "photo" ? "រូបភាព" : "អត្ថបទ"}ទៅកាន់ ${selectedPageIds.length} Pages ព្រមគ្នា`}
              </span>
            </button>
          </div>

          {/* Progress Indicator */}
          {publishProgress && (
            <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/40 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-indigo-300 flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-cyan-400" />
                  <span>{publishProgress.status}</span>
                </span>
                <span className="font-mono text-cyan-300 font-bold">
                  {publishProgress.completed}/{publishProgress.total} Pages
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 h-2 transition-all duration-300 rounded-full"
                  style={{
                    width: `${Math.round(
                      (publishProgress.completed / (publishProgress.total || 1)) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Results Notification */}
          {publishResults && (
            <div className="space-y-3">
              {publishResults.some((r) => r.status === "error") ? (
                <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                      <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
                      <span>Facebook ត្រូវការឱ្យអ្នកអនុញ្ញាតសិទ្ធិផុស (Permission Re-authorization)</span>
                    </div>
                    <button
                      type="button"
                      onClick={triggerFacebookReauth}
                      disabled={isReauthorizing}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20 transition shrink-0"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isReauthorizing ? "animate-spin" : ""}`} />
                      <span>{isReauthorizing ? "កំពុងភ្ជាប់..." : "🔑 ចុចទីនេះដើម្បីភ្ជាប់សិទ្ធិឡើងវិញ"}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-amber-200/80 leading-relaxed">
                    មូលហេតុ៖ Facebook Graph API តម្រូវឱ្យ Account មានសិទ្ធិ <strong>pages_manage_posts</strong> ទើបអាចផុសចូល Page បានពិតប្រាកដ។ សូមចុចប៊ូតុងខាងលើម្តងដើម្បីអនុញ្ញាត ហើយចុចបញ្ជាផុសម្តងទៀត។
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-1">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>ការផុសទៅកាន់ Pages ទាំងអស់ត្រូវបានបញ្ជូនទៅកាន់ Facebook ជោគជ័យ!</span>
                  </div>
                </div>
              )}

              {/* Breakdown per Page */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3.5 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 block pb-1 border-b border-slate-800">
                  ស្ថានភាពលម្អិតតាម Page នីមួយៗ (Posting Breakdown)៖
                </span>
                <div className="divide-y divide-slate-800/60 text-xs">
                  {publishResults.map((r) => (
                    <div
                      key={r.pageId}
                      className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-slate-200"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            r.status === "success" ? "bg-emerald-400" : "bg-rose-400"
                          }`}
                        />
                        <span className="font-semibold text-white">{r.pageName}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        {r.status === "success" ? (
                          <>
                            <span className="text-emerald-400 font-semibold flex items-center gap-1 text-xs">
                              <Check className="h-3.5 w-3.5" />
                              <span>ចូល Page ជោគជ័យ</span>
                            </span>
                            {r.postId && (
                              <a
                                href={`https://facebook.com/${r.postId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-cyan-400 hover:text-cyan-300 underline flex items-center gap-1 text-[11px]"
                              >
                                <span>មើល Post ផ្ទាល់</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </>
                        ) : (
                          <span className="text-rose-400 font-medium text-[11px] flex items-center gap-1">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            <span>{r.message || "មិនទាន់ចូល Page"}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. RECENT POSTING HISTORY */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl mt-8">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              ប្រវត្តិនៃការផុសវីដេអូកន្លងមក (Posting History)
            </h3>
          </div>
          <button
            onClick={fetchHistory}
            className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            <RefreshCw className={`h-3 w-3 ${loadingHistory ? "animate-spin" : ""}`} />
            <span>ទាញយកឡើងវិញ</span>
          </button>
        </div>

        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-800/40 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">ចំណងជើង</th>
                <th className="py-3 px-4">ប្រភេទមេឌា & ទម្រង់</th>
                <th className="py-3 px-4">យុទ្ធសាស្ត្រ Caption</th>
                <th className="py-3 px-4">ចំនួន Pages</th>
                <th className="py-3 px-4">កាលបរិច្ឆេទ</th>
                <th className="py-3 px-4">ស្ថានភាព</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    មិនទាន់មានប្រវត្តិផុសនៅឡើយទេ
                  </td>
                </tr>
              ) : (
                history.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 font-semibold text-white">
                      {item.title}
                    </td>
                    <td className="py-3 px-4">
                      {item.mediaType === "photo" ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950/60 text-blue-300 border border-blue-500/30">
                          🖼️ Photo
                        </span>
                      ) : item.mediaType === "text" ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                          📝 Text
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 border border-slate-700 text-purple-300">
                          {item.postType === "reels" ? "🎥 Reels" : "📹 Video"}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950/60 text-indigo-300 border border-indigo-500/30 uppercase">
                        {item.captionStyle || "Promotion"}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-cyan-300">
                      {item.targetPagesCount} Pages
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {new Date(item.publishedAt).toLocaleString("km-KH")}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        <Check className="h-3 w-3" />
                        <span>ជោគជ័យ</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
