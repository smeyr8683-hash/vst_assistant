import { NextRequest, NextResponse } from "next/server";
import { database as supabase, usingLocalDatabase } from "@/lib/server-database";

export interface PageCaptionItem {
  pageId: string;
  pageName: string;
  category?: string;
  caption: string;
  status?: "pending" | "uploading" | "success" | "error";
  postId?: string;
  errorMessage?: string;
}

export interface VideoPostRecord {
  id: string;
  title: string;
  videoUrl?: string;
  mediaType?: "video" | "photo" | "text";
  postType: "reels" | "video";
  captionStyle: string;
  targetPagesCount: number;
  publishedAt: string;
  status: "completed" | "partial" | "failed";
  results: {
    pageId: string;
    pageName: string;
    status: "success" | "error";
    postId?: string;
    captionPreview: string;
  }[];
}

// Dynamic Company Pages loaded from database/OAuth
const OFFICIAL_COMPANY_PAGES: Array<{
  id: string;
  name: string;
  category: string;
  niche: string;
  description: string;
}> = [];

// Master Deep-Thinking Unique Caption Generator per Page & Style
function generateUniqueCaptionByNiche(
  pageId: string,
  pageName: string,
  style: string,
  baseTopic: string
): string {
  const extraNote = baseTopic.trim() ? `\n📌 ${baseTopic.trim()}` : "";
  const cleanName = (pageName || "brand").replace(/\s+/g, "");

  if (style === "education" || style === "question") {
    return `💡 ចំណេះដឹង និងគន្លឹះពិសេសពី ${pageName || "យើងខ្ញុំ"}!
តើបងប្អូនកំពុងស្វែងរកដំណោះស្រាយ ឬព័ត៌មានលម្អិតទាក់ទងនឹងបញ្ហាដែលកំពុងជួបប្រទះមែនទេ?${extraNote}

✨ មកតាមដានទស្សនាវីដេអូនេះជាមួយយើងខ្ញុំទាំងអស់គ្នា៖
✅ គន្លឹះងាយៗ អាចអនុវត្តបានភ្លាមៗ
✅ ព័ត៌មានត្រឹមត្រូវ ច្បាស់លាស់ និងមានទំនុកចិត្ត
✅ ផ្ដល់ការប្រឹក្សា និងឆ្លើយតបរាល់ចម្ងល់

📩 ឆាតមកកាន់យើងខ្ញុំឥឡូវនេះ ដើម្បីទទួលបានការប្រឹក្សាបន្ថែមដោយឥតគិតថ្លៃ!

#${cleanName} #ចំណេះដឹង #ដំណោះស្រាយល្អៗ #គុណភាពខ្ពស់`;
  }

  if (style === "promotion") {
    return `🔥 ប្រូម៉ូសិនពិសេស មិនធ្លាប់មានពីមុនមក! 💥
ឱកាសចំណេញបានមកដល់ហើយសម្រាប់អតិថិជនជាទីស្រឡាញ់របស់ ${pageName || "យើងខ្ញុំ"}${extraNote}

🎁 អត្ថប្រយោជន៍ និងការផ្ដល់ជូនពិសេស៖
✅ ផលិតផល/សេវាកម្មគុណភាពខ្ពស់ ស្តង់ដារ ១០០%
✅ តម្លៃពិសេសសមរម្យ និងមានកាដូថែមជូន
✅ ដឹកជញ្ជូនរហ័សទូទាំង ២៥ ខេត្ត/ក្រុង

👉 ឆាតមកយើងឥឡូវនេះ ដើម្បីកក់ប្រូម៉ូសិនមុនគេ ព្រោះចំនួនមានកំណត់!

#${cleanName} #ប្រូម៉ូសិនពិសេស #ប្រញាប់ឡើង #ទិញភ្លាមចំណេញភ្លាម`;
  }

  return `✨ ស្វាគមន៍មកកាន់ ${pageName || "យើងខ្ញុំ"}!
ផលិតផល និងសេវាកម្មប្រកបដោយគុណភាពខ្ពស់ និងការធានាត្រឹមត្រូវជូនអតិថិជន${extraNote}

🌟 ចំណុចលេចធ្លោ៖
✅ គុណភាពជាចម្បង ផ្ដល់ទំនុកចិត្តខ្ពស់
✅ សេវាកម្មរាក់ទាក់ និងរហ័សទាន់ចិត្ត
✅ ប្រឹក្សាយោបល់ឥតគិតថ្លៃ

📩 ផ្ញើសារមកកាន់យើងខ្ញុំឥឡូវនេះដើម្បីដឹងព័ត៌មានលម្អិត!

#${cleanName} #គុណភាពខ្ពស់ #សេវាកម្មល្អ #ទំនុកចិត្ត`;
}

// Helper to convert Google Drive / Dropbox sharing links into direct stream URLs for Facebook (Supports 5GB+)
function convertToDirectMediaUrl(url: string): string {
  if (!url) return url;
  const trimmed = url.trim();
  // Google Drive
  const gdriveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (gdriveMatch && gdriveMatch[1]) {
    return `https://drive.usercontent.google.com/download?id=${gdriveMatch[1]}&export=download&authuser=0`;
  }
  // Dropbox
  if (trimmed.includes("dropbox.com") && trimmed.includes("dl=0")) {
    return trimmed.replace("dl=0", "dl=1");
  }
  return trimmed;
}

// Helper to fetch individual Page Access Tokens from Supabase vst_members & env
async function getPageTokensMap(): Promise<Record<string, string>> {
  const tokenMap: Record<string, string> = {};

  try {
    const { data: memberData } = await supabase
      .from("bot_settings")
      .select("dm_template")
      .eq("id", "vst_members")
      .maybeSingle();

    if (memberData?.dm_template) {
      const members = JSON.parse(memberData.dm_template);
      if (Array.isArray(members)) {
        for (const m of members) {
          if (Array.isArray(m.pages)) {
            for (const p of m.pages) {
              const token = p.accessToken || p.access_token;
              if (p.id && token) {
                tokenMap[p.id] = token;
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("Error reading page tokens from vst_members:", err);
  }

  // Fallback to individual page rows in bot_settings if any
  try {
    const { data: pageRows } = await supabase
      .from("bot_settings")
      .select("id, dm_template")
      .neq("id", "vst_members")
      .neq("id", "vst_video_posts");

    if (pageRows) {
      for (const row of pageRows) {
        if (row.dm_template && row.dm_template.startsWith("EAA")) {
          tokenMap[row.id] = row.dm_template;
        }
      }
    }
  } catch {}

  // Environment fallback
  const envToken = process.env.FB_PAGE_ACCESS_TOKEN;
  const envDefaultPage = process.env.FB_DEFAULT_PAGE_ID;
  if (envToken && envDefaultPage && !tokenMap[envDefaultPage]) {
    tokenMap[envDefaultPage] = envToken;
  }

  return tokenMap;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    if (searchParams.get("action") === "tokens") {
      const tokenMap = await getPageTokensMap();
      return NextResponse.json({ success: true, tokens: tokenMap });
    }

    if (searchParams.get("action") === "pages") {
      const isAdmin = searchParams.get("isAdmin") === "true";
      const userId = searchParams.get("userId");
      const userName = searchParams.get("userName") || searchParams.get("owner");

      const { data: memberData } = await supabase
        .from("bot_settings")
        .select("dm_template")
        .eq("id", "vst_members")
        .maybeSingle();

      const members = memberData?.dm_template ? JSON.parse(memberData.dm_template) : [];
      const pagesList: any[] = [];
      const tokenMap = await getPageTokensMap();

      for (const m of members) {
        // Strict Isolation: Non-admin users ONLY get their own connected pages!
        if (!isAdmin) {
          const matchId = userId && (String(m.id) === String(userId) || String(m.facebookId) === String(userId));
          const matchName = userName && m.name?.toLowerCase() === userName.toLowerCase();
          if (!matchId && !matchName) {
            continue; // Skip pages belonging to other members
          }
        }

        for (const p of m.pages || []) {
          if (p.id && !pagesList.some((existing) => existing.id === p.id)) {
            pagesList.push({
              id: p.id,
              name: p.name,
              category: p.category || "Facebook Page",
              memberName: m.name,
              userId: m.id,
              role: m.role,
              hasToken: !!tokenMap[p.id],
              canPublish: p.canPublish === true,
            });
          }
        }
      }

      // If Super Admin, also include official company pages if not already in list
      if (isAdmin) {
        for (const p of OFFICIAL_COMPANY_PAGES) {
          if (!pagesList.some((existing) => existing.id === p.id)) {
            pagesList.push({
              id: p.id,
              name: p.name,
              category: p.category || "Facebook Page (Official)",
              memberName: "VST Super Admin",
              userId: "admin",
              role: "owner",
              hasToken: !!tokenMap[p.id],
              canPublish: false,
            });
          }
        }
      }

      return NextResponse.json({
        success: true,
        pages: pagesList,
      });
    }

    if (searchParams.get("action") === "get_upload_url") {
      const fileName = searchParams.get("fileName") || `upload_${Date.now()}`;
      const ext = fileName.split(".").pop() || "bin";
      const cleanFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
      const filePath = `uploads/${cleanFileName}`;

      const { data, error } = await supabase.storage
        .from("vst-media")
        .createSignedUploadUrl(filePath);

      if (error || !data) {
        return NextResponse.json(
          { error: error?.message || "Failed to create upload URL" },
          { status: 500 }
        );
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("vst-media").getPublicUrl(filePath);

      return NextResponse.json({
        success: true,
        signedUrl: data.signedUrl,
        path: filePath,
        publicUrl,
      });
    }

    const { data } = await supabase
      .from("bot_settings")
      .select("dm_template")
      .eq("id", "vst_video_posts")
      .maybeSingle();

    let history: VideoPostRecord[] = [];
    if (data?.dm_template) {
      try {
        history = JSON.parse(data.dm_template);
      } catch (e) {
        console.error("Error parsing video post history:", e);
      }
    }

    return NextResponse.json({ history });
  } catch (error) {
    console.error("Error fetching video publisher history:", error);
    return NextResponse.json({ history: [] });
  }
}

async function uploadFacebookVideoThumbnail(
  postId: string,
  pageToken: string,
  thumbnail: File | string | Blob
): Promise<boolean> {
  try {
    let sourceBlob: Blob;
    if (typeof thumbnail === "string") {
      if (thumbnail.startsWith("data:")) {
        const base64Data = thumbnail.replace(/^data:image\/\w+;base64,/, "");
        sourceBlob = new Blob([Buffer.from(base64Data, "base64")], { type: "image/jpeg" });
      } else if (thumbnail.startsWith("http")) {
        const res = await fetch(thumbnail);
        const arrayBuf = await res.arrayBuffer();
        sourceBlob = new Blob([arrayBuf], { type: "image/jpeg" });
      } else {
        sourceBlob = new Blob([Buffer.from(thumbnail, "base64")], { type: "image/jpeg" });
      }
    } else {
      sourceBlob = thumbnail;
    }

    const fbFormData = new FormData();
    fbFormData.append("source", sourceBlob, "thumbnail.jpg");
    fbFormData.append("is_preferred", "true");
    fbFormData.append("access_token", pageToken);

    const res = await fetch(`https://graph.facebook.com/v21.0/${postId}/thumbnails`, {
      method: "POST",
      body: fbFormData,
    });
    const data = await res.json();
    return !!data?.success;
  } catch (e) {
    console.warn(`[Thumbnail] Error uploading thumbnail for video ${postId}:`, e);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // 1. MULTIPART FORM-DATA: Server-side direct media publishing & chunk transfer
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const action = formData.get("action");

      // Handle Resumable Transfer Chunk
      if (action === "resumable_transfer") {
        const pageId = formData.get("pageId") as string;
        const uploadSessionId = formData.get("upload_session_id") as string;
        const startOffset = formData.get("start_offset") as string;
        const chunk = formData.get("chunk") as File | Blob | null;

        if (!pageId || !uploadSessionId || !chunk) {
          return NextResponse.json({ error: "Missing required chunk transfer parameters" }, { status: 400 });
        }

        const tokenMap = await getPageTokensMap();
        const pageToken = tokenMap[pageId] || process.env.FB_PAGE_ACCESS_TOKEN;
        if (!pageToken) {
          return NextResponse.json({ error: `No access token found for page ${pageId}` }, { status: 400 });
        }

        const fbForm = new FormData();
        fbForm.append("upload_phase", "transfer");
        fbForm.append("upload_session_id", uploadSessionId);
        fbForm.append("start_offset", startOffset || "0");
        fbForm.append("access_token", pageToken);
        fbForm.append("video_file_chunk", chunk, "chunk.mp4");

        const fbRes = await fetch(`https://graph-video.facebook.com/v21.0/${pageId}/videos`, {
          method: "POST",
          body: fbForm,
        });
        const fbData = await fbRes.json();
        return NextResponse.json(fbData, { status: fbRes.status });
      }

      const mediaType = (formData.get("mediaType") as "video" | "photo" | "text") || "video";
      const file = formData.get("file") as File | null;
      const title = (formData.get("title") as string) || "";
      const postType = (formData.get("postType") as "reels" | "video") || "reels";
      const captionStyle = (formData.get("captionStyle") as string) || "promotion";
      const rawPageCaptions = formData.get("pageCaptions") as string;
      const thumbnailFile = formData.get("thumbnail") as File | null;
      const thumbnailData = formData.get("thumbnailData") as string | null;

      let pageCaptions: PageCaptionItem[] = [];
      try {
        pageCaptions = JSON.parse(rawPageCaptions || "[]");
      } catch (err) {
        return NextResponse.json({ error: "Invalid pageCaptions format" }, { status: 400 });
      }

      if (pageCaptions.length === 0) {
        return NextResponse.json({ error: "No target pages provided" }, { status: 400 });
      }

      const tokenMap = await getPageTokensMap();
      const defaultToken = process.env.FB_PAGE_ACCESS_TOKEN;
      const results: {
        pageId: string;
        pageName: string;
        status: "success" | "error";
        postId?: string;
        captionPreview: string;
        message?: string;
      }[] = [];

      for (const item of pageCaptions) {
        const pageToken = tokenMap[item.pageId] || defaultToken;
        if (!pageToken) {
          results.push({
            pageId: item.pageId,
            pageName: item.pageName,
            status: "error",
            captionPreview: item.caption.slice(0, 70) + "...",
            message: "ពុំមាន Access Token សម្រាប់ Page នេះទេ",
          });
          continue;
        }

        try {
          let fbRes: Response;
          let fbData: any;

          if (mediaType === "video" && file) {
            // Upload directly to graph-video.facebook.com from Node.js server
            const fbFormData = new FormData();
            fbFormData.append("source", file, file.name || "video.mp4");
            fbFormData.append("description", item.caption);
            fbFormData.append("title", title || "Video Post");
            fbFormData.append("access_token", pageToken);
            fbFormData.append("published", "true");

            fbRes = await fetch(`https://graph-video.facebook.com/v21.0/${item.pageId}/videos`, {
              method: "POST",
              body: fbFormData,
            });
            fbData = await fbRes.json();
          } else if (mediaType === "photo" && file) {
            // Upload directly to graph.facebook.com/photos from Node.js server
            const fbFormData = new FormData();
            fbFormData.append("source", file, file.name || "photo.jpg");
            fbFormData.append("caption", item.caption);
            fbFormData.append("access_token", pageToken);
            fbFormData.append("published", "true");

            fbRes = await fetch(`https://graph.facebook.com/v21.0/${item.pageId}/photos`, {
              method: "POST",
              body: fbFormData,
            });
            fbData = await fbRes.json();
          } else {
            // Pure text post to feed
            fbRes = await fetch(`https://graph.facebook.com/v21.0/${item.pageId}/feed`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                message: item.caption,
                access_token: pageToken,
              }),
            });
            fbData = await fbRes.json();
          }

          if (fbRes.ok && (fbData?.id || fbData?.post_id)) {
            const realPostId = fbData.id || fbData.post_id;

            // Upload thumbnail if available
            const thumbToUpload = thumbnailFile || thumbnailData;
            if (thumbToUpload && mediaType === "video") {
              await uploadFacebookVideoThumbnail(realPostId, pageToken, thumbToUpload);
            }

            results.push({
              pageId: item.pageId,
              pageName: item.pageName,
              status: "success",
              postId: realPostId,
              captionPreview: item.caption.slice(0, 70) + "...",
              message: "បានផុសទៅកាន់ Facebook Page ផ្ទាល់ជោគជ័យ!" + (thumbToUpload ? " (រួមទាំង Thumbnail)" : ""),
            });
          } else {
            const errMsg = fbData?.error?.message || "Facebook Graph API returned an error";
            results.push({
              pageId: item.pageId,
              pageName: item.pageName,
              status: "error",
              captionPreview: item.caption.slice(0, 70) + "...",
              message: `Facebook Error: ${errMsg}`,
            });
          }
        } catch (postErr: any) {
          results.push({
            pageId: item.pageId,
            pageName: item.pageName,
            status: "error",
            captionPreview: item.caption.slice(0, 70) + "...",
            message: postErr.message || "Failed to communicate with Facebook",
          });
        }
      }

      // Save to Supabase History
      const newRecord: VideoPostRecord = {
        id: `vpost_${Date.now()}`,
        title: title || (mediaType === "video" ? "វីដេអូផ្សព្វផ្សាយ" : mediaType === "photo" ? "រូបភាពផ្សព្វផ្សាយ" : "អត្ថបទផ្សព្វផ្សាយ"),
        videoUrl: file ? `[Uploaded ${mediaType === "video" ? "Video" : "Photo"} File]` : "[Text Post]",
        mediaType,
        postType,
        captionStyle,
        targetPagesCount: pageCaptions.length,
        publishedAt: new Date().toISOString(),
        status: results.every((r) => r.status === "success") ? "completed" : "partial",
        results,
      };

      try {
        const { data: existingData } = await supabase
          .from("bot_settings")
          .select("dm_template")
          .eq("id", "vst_video_posts")
          .maybeSingle();

        let historyList: VideoPostRecord[] = [];
        if (existingData?.dm_template) {
          try {
            historyList = JSON.parse(existingData.dm_template);
          } catch {}
        }

        historyList.unshift(newRecord);
        if (historyList.length > 30) historyList = historyList.slice(0, 30);

        await supabase.from("bot_settings").upsert(
          {
            id: "vst_video_posts",
            dm_template: JSON.stringify(historyList),
            is_active: true,
          },
          { onConflict: "id" }
        );
      } catch (histErr) {
        console.warn("Failed to persist history to Supabase:", histErr);
      }

      return NextResponse.json({
        success: true,
        record: newRecord,
        results,
      });
    }

    // 2. JSON REQUESTS
    const body = await req.json();
    const { action } = body;

    // ACTION: Resumable Upload Phase 1 - Start
    if (action === "resumable_start") {
      const { pageId, fileSize } = body as { pageId: string; fileSize: number };
      if (!pageId || !fileSize) {
        return NextResponse.json({ error: "pageId and fileSize are required" }, { status: 400 });
      }

      const tokenMap = await getPageTokensMap();
      const pageToken = tokenMap[pageId] || process.env.FB_PAGE_ACCESS_TOKEN;
      if (!pageToken) {
        return NextResponse.json({ error: `ពុំមាន Access Token សម្រាប់ Page ID ${pageId} ទេ (សូម Re-authorize តាម Facebook Login)` }, { status: 400 });
      }

      const params = new URLSearchParams({
        upload_phase: "start",
        file_size: fileSize.toString(),
        access_token: pageToken,
      });

      const fbRes = await fetch(`https://graph-video.facebook.com/v21.0/${pageId}/videos`, {
        method: "POST",
        body: params,
      });
      const fbData = await fbRes.json();
      return NextResponse.json(fbData, { status: fbRes.status });
    }

    // ACTION: Resumable Upload Phase 3 - Finish
    if (action === "resumable_finish") {
      const { pageId, upload_session_id, title, description, thumbnail } = body as {
        pageId: string;
        upload_session_id: string;
        title?: string;
        description?: string;
        thumbnail?: string;
      };

      if (!pageId || !upload_session_id) {
        return NextResponse.json({ error: "pageId and upload_session_id are required" }, { status: 400 });
      }

      const tokenMap = await getPageTokensMap();
      const pageToken = tokenMap[pageId] || process.env.FB_PAGE_ACCESS_TOKEN;
      if (!pageToken) {
        return NextResponse.json({ error: `ពុំមាន Access Token សម្រាប់ Page ID ${pageId} ទេ` }, { status: 400 });
      }

      const params = new URLSearchParams({
        upload_phase: "finish",
        upload_session_id,
        title: title || "Video Post",
        description: description || "",
        published: "true",
        access_token: pageToken,
      });

      const fbRes = await fetch(`https://graph-video.facebook.com/v21.0/${pageId}/videos`, {
        method: "POST",
        body: params,
      });
      const fbData = await fbRes.json();

      const finalVideoId = fbData.id || fbData.video_id;

      // Upload thumbnail if provided
      if (thumbnail && finalVideoId) {
        try {
          await uploadFacebookVideoThumbnail(finalVideoId, pageToken, thumbnail);
        } catch (thErr) {
          console.warn("Could not attach thumbnail to finished video:", thErr);
        }
      }

      return NextResponse.json(
        {
          success: fbData.success || !!finalVideoId,
          id: finalVideoId,
          ...fbData,
        },
        { status: fbRes.status }
      );
    }

    // ACTION: Check Video Processing Status & Fetch CDN URL
    if (action === "check_video_status") {
      const { pageId, videoId } = body as { pageId: string; videoId: string };
      if (!pageId || !videoId) {
        return NextResponse.json({ error: "pageId and videoId required" }, { status: 400 });
      }

      const tokenMap = await getPageTokensMap();
      const pageToken = tokenMap[pageId] || process.env.FB_PAGE_ACCESS_TOKEN;
      if (!pageToken) {
        return NextResponse.json({ error: "No token found" }, { status: 400 });
      }

      try {
        const fbRes = await fetch(
          `https://graph.facebook.com/v21.0/${videoId}?fields=source,status,title&access_token=${pageToken}`
        );
        const fbData = await fbRes.json();
        return NextResponse.json({
          source: fbData?.source || null,
          status: fbData?.status || null,
          fbData,
        });
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
    }

    // ACTION 1: Generate High-Thinking AI Captions tailored to each page & style
    if (action === "generate_captions") {
      const {
        videoTitle = "",
        videoContent = "",
        baseTopic = "",
        captionStyle = "promotion",
        pages,
        videoFrames = [],
      } = body as {
        videoTitle?: string;
        videoContent?: string;
        baseTopic?: string;
        captionStyle: "promotion" | "education" | "question" | "testimonial" | "branding";
        pages: { id: string; name: string; category?: string }[];
        videoFrames?: string[];
      };

      if (!Array.isArray(pages) || pages.length === 0) {
        return NextResponse.json(
          { error: "No pages selected" },
          { status: 400 }
        );
      }

      const apiKey = process.env.GEMINI_API_KEY;
      const captionsMap: Record<string, string> = {};

      // User's provided video description or topic
      const realContent = (videoContent || baseTopic || videoTitle || "ប្រូម៉ូសិនពិសេស គុណភាពខ្ពស់").trim();

      if (apiKey) {
        try {
          const pagesPromptList = pages
            .map(
              (p, idx) =>
                `${idx + 1}. Page ID: "${p.id}", Name: "${p.name}", Category: "${p.category || "Health/Beauty"}"`
            )
            .join("\n");

          const prompt = `You are an elite Cambodian digital marketing copywriter and conversion rate optimization (CRO) specialist.
The user wants to publish a Facebook Video across multiple Facebook pages.

${Array.isArray(videoFrames) && videoFrames.length > 0 ? `
*** CRITICAL REQUIREMENT: REAL MULTIMODAL VIDEO INSPECTION ***
You are provided with ${videoFrames.length} real visual keyframes directly extracted from the user's video scenes!
STEP 1: INSPECT THE ATTACHED FRAMES CAREFULLY:
- Who/what is in the video? (Customer, presenter, product packaging, demonstration)
- What action or demonstration is happening? (Showing product, explaining, unboxing, showing results)
- What text, numbers, prices, or promotion words appear on the video screen?

STEP 2: WRITE THE CAPTION'S OPENING HOOK BASED SPECIFICALLY ON WHAT IS SHOWN IN THIS VIDEO:
The VERY FIRST 1-3 LINES of each caption MUST hook the viewer by directly describing what is happening in the video!
Examples of how the captions MUST open:
- "ដូចដែលបងៗបានឃើញក្នុងវីដេអូនេះស្រាប់ គឺបង្ហាញពី..."
- "តោះមកមើលការបង្ហាញជាក់ស្តែងក្នុងវីដេអូនេះទាំងអស់គ្នា..."
- "វីដេអូនេះនឹងបង្ហាញជូនបងៗពីរបៀប..."
- "តើបងប្អូនកំពុងជួបប្រទះបញ្ហាដូចក្នុងវីដេអូនេះមែនទេ?..."
DO NOT output generic boilerplate slogans without referencing what is visually seen in the video!
` : ""}

VIDEO/MEDIA TITLE:
"${videoTitle || "វីដេអូផ្សព្វផ្សាយ"}"

USER'S STORY & PROMO NOTE:
"${realContent}"

CHOSEN CAPTION STRATEGY:
"${captionStyle}" (promotion, education, question, testimonial, branding)

TARGET PAGES TO GENERATE CAPTIONS FOR:
${pagesPromptList}

HOW TO TAILOR BY PAGE CATEGORY:
Connect what is seen in the video naturally to each page's specific niche, audience, and promotion focus.

CRITICAL POLICY SAFEGUARD (MANDATORY):
Always maintain respectful, natural, engaging language tailored for Cambodian social media audiences.

OUTPUT FORMAT:
Return ONLY valid JSON mapping each Page ID to its custom, video-inspected Khmer caption:
{
  "${pages[0]?.id}": "caption in Khmer with emojis and video hook...",
  "${pages[1]?.id || "2"}": "caption in Khmer..."
}`;

          const parts: any[] = [{ text: prompt }];

          if (Array.isArray(videoFrames) && videoFrames.length > 0) {
            videoFrames.slice(0, 4).forEach((vf) => {
              if (typeof vf === "string" && vf.length > 50) {
                const cleaned = vf.replace(/^data:image\/\w+;base64,/, "");
                parts.push({
                  inlineData: {
                    mimeType: "image/jpeg",
                    data: cleaned,
                  },
                });
              }
            });
          }

          const CANDIDATE_MODELS = [
            "gemini-3.5-flash-lite",
            "gemini-3.1-flash-lite",
            "gemini-3-flash-preview",
            "gemini-flash-lite-latest",
            "gemini-3.7-flash",
            "gemini-3.8-flash",
          ];

          for (const modelName of CANDIDATE_MODELS) {
            try {
              const geminiRes = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    contents: [{ parts }],
                    generationConfig: {
                      responseMimeType: "application/json",
                      temperature: 0.85,
                    },
                  }),
                }
              );

              if (geminiRes.ok) {
                const geminiData = await geminiRes.json();
                const rawJson = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
                if (rawJson) {
                  const parsed = JSON.parse(rawJson);
                  if (typeof parsed === "object" && Object.keys(parsed).length > 0) {
                    Object.assign(captionsMap, parsed);
                    console.log(`[Gemini Captions] Successfully generated captions with model: ${modelName}`);
                    break;
                  }
                }
              } else {
                console.warn(`[Gemini Captions] Model ${modelName} returned status ${geminiRes.status}`);
              }
            } catch (modelErr) {
              console.warn(`[Gemini Captions] Failed with model ${modelName}:`, modelErr);
            }
          }
        } catch (geminiError) {
          console.warn("Gemini caption generation error, using deep niche fallback:", geminiError);
        }
      }

      // Guarantee 100% distinct, tailored captions for every page via niche engine
      pages.forEach((p) => {
        if (!captionsMap[p.id]) {
          captionsMap[p.id] = generateUniqueCaptionByNiche(
            p.id,
            p.name,
            captionStyle,
            realContent
          );
        }
      });

      return NextResponse.json({
        success: true,
        captions: captionsMap,
        captionStyle,
        usedAi: Object.keys(captionsMap).length > 0,
      });
    }

    // ACTION: Save post record to history (when published directly from browser)
    if (action === "save_history") {
      const { record } = body as { record: VideoPostRecord };
      if (record) {
        try {
          const { data: existingData } = await supabase
            .from("bot_settings")
            .select("dm_template")
            .eq("id", "vst_video_posts")
            .maybeSingle();

          let historyList: VideoPostRecord[] = [];
          if (existingData?.dm_template) {
            try {
              historyList = JSON.parse(existingData.dm_template);
            } catch {}
          }

          historyList.unshift(record);
          if (historyList.length > 30) historyList = historyList.slice(0, 30);

          await supabase.from("bot_settings").upsert(
            {
              id: "vst_video_posts",
              dm_template: JSON.stringify(historyList),
              is_active: true,
            },
            { onConflict: "id" }
          );
        } catch (e) {
          console.error("Error saving history:", e);
        }
      }
      return NextResponse.json({ success: true });
    }

    // ACTION 2: Publish video / photo / text to multiple Facebook pages
    if (action === "publish_video") {
      const {
        title,
        videoUrl,
        thumbnail,
        mediaType = "video",
        postType = "reels",
        captionStyle = "promotion",
        pageCaptions,
      } = body as {
        title: string;
        videoUrl?: string;
        thumbnail?: string;
        mediaType?: "video" | "photo" | "text";
        postType: "reels" | "video";
        captionStyle?: string;
        pageCaptions: PageCaptionItem[];
      };

      if (!Array.isArray(pageCaptions) || pageCaptions.length === 0) {
        return NextResponse.json(
          { error: "No target pages provided" },
          { status: 400 }
        );
      }

      const results: {
        pageId: string;
        pageName: string;
        status: "success" | "error";
        postId?: string;
        captionPreview: string;
        message?: string;
        needsReauth?: boolean;
      }[] = [];

      const tokenMap = await getPageTokensMap();
      const defaultToken = process.env.FB_PAGE_ACCESS_TOKEN;

      // Process and dispatch to each page with genuine Meta API calls
      for (const item of pageCaptions) {
        const pageToken = tokenMap[item.pageId] || defaultToken;

        if (!pageToken) {
          results.push({
            pageId: item.pageId,
            pageName: item.pageName,
            status: "error",
            captionPreview: item.caption.slice(0, 70) + "...",
            message: "ពុំមាន Access Token សម្រាប់ Page នេះទេ (សូម Re-authorize តាម Facebook Login)",
            needsReauth: true,
          });
          continue;
        }

        try {
          const directMediaUrl = convertToDirectMediaUrl(videoUrl || "");
          const isRemoteVideoUrl =
            directMediaUrl &&
            (directMediaUrl.startsWith("http://") || directMediaUrl.startsWith("https://")) &&
            !directMediaUrl.includes("localhost") &&
            !directMediaUrl.startsWith("blob:");

          let fbRes: Response;
          let fbData: any;

          if (mediaType === "photo" && isRemoteVideoUrl) {
            // 1. Post Photo via /photos Graph API
            fbRes = await fetch(
              `https://graph.facebook.com/v21.0/${item.pageId}/photos`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  url: directMediaUrl,
                  caption: item.caption,
                  access_token: pageToken,
                }),
              }
            );
            fbData = await fbRes.json();
          } else if (isRemoteVideoUrl) {
            // 2. Post Video or Reel via /videos Graph API
            fbRes = await fetch(
              `https://graph-video.facebook.com/v21.0/${item.pageId}/videos`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  file_url: directMediaUrl,
                  description: item.caption,
                  title: title || "Video Post",
                  access_token: pageToken,
                  published: true,
                }),
              }
            );
            fbData = await fbRes.json();
          } else {
            // 3. Post directly to Page Feed (/feed) for text posts
            fbRes = await fetch(
              `https://graph.facebook.com/v21.0/${item.pageId}/feed`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  message: item.caption,
                  access_token: pageToken,
                }),
              }
            );
            fbData = await fbRes.json();
          }

          if (fbRes.ok && (fbData?.id || fbData?.post_id)) {
            const realPostId = fbData.id || fbData.post_id;

            // Upload custom thumbnail to Facebook if provided for video
            if (thumbnail && mediaType === "video") {
              await uploadFacebookVideoThumbnail(realPostId, pageToken, thumbnail);
            }

            results.push({
              pageId: item.pageId,
              pageName: item.pageName,
              status: "success",
              postId: realPostId,
              captionPreview: item.caption.slice(0, 70) + "...",
              message: "បានផុសទៅកាន់ Facebook Page ផ្ទាល់ជោគជ័យ!" + (thumbnail ? " (រួមទាំង Thumbnail)" : ""),
            });
          } else {
            const errObj = fbData?.error;
            const errCode = errObj?.code;
            const errMsg = errObj?.message || "Meta API returned an error";
            const isPermError =
              errCode === 200 ||
              errCode === 190 ||
              errMsg.includes("pages_manage_posts") ||
              errMsg.includes("requires both pages_read_engagement");

            results.push({
              pageId: item.pageId,
              pageName: item.pageName,
              status: "error",
              captionPreview: item.caption.slice(0, 70) + "...",
              message: isPermError
                ? "Facebook ទាមទារសិទ្ធិ 'pages_manage_posts' (សូមចុចប៊ូតុង 'ភ្ជាប់សិទ្ធិឡើងវិញ')"
                : `Facebook Error: ${errMsg}`,
              needsReauth: isPermError,
            });
          }
        } catch (e: any) {
          results.push({
            pageId: item.pageId,
            pageName: item.pageName,
            status: "error",
            captionPreview: item.caption.slice(0, 70) + "...",
            message: e.message || "Failed to communicate with Facebook",
          });
        }
      }

      // Save to Supabase History
      const newRecord: VideoPostRecord = {
        id: `vpost_${Date.now()}`,
        title: title || "វីដេអូផ្សព្វផ្សាយថ្មី",
        videoUrl: videoUrl?.startsWith("data:") ? "[Uploaded Video File]" : videoUrl,
        mediaType,
        postType,
        captionStyle,
        targetPagesCount: pageCaptions.length,
        publishedAt: new Date().toISOString(),
        status: results.every((r) => r.status === "success")
          ? "completed"
          : "partial",
        results,
      };

      try {
        const { data: existingData } = await supabase
          .from("bot_settings")
          .select("dm_template")
          .eq("id", "vst_video_posts")
          .maybeSingle();

        let historyList: VideoPostRecord[] = [];
        if (existingData?.dm_template) {
          try {
            historyList = JSON.parse(existingData.dm_template);
          } catch {}
        }

        historyList.unshift(newRecord);
        if (historyList.length > 30) historyList = historyList.slice(0, 30);

        await supabase.from("bot_settings").upsert(
          {
            id: "vst_video_posts",
            dm_template: JSON.stringify(historyList),
            is_active: true,
          },
          { onConflict: "id" }
        );
      } catch (histErr) {
        console.warn("Failed to persist history to Supabase:", histErr);
      }

      return NextResponse.json({
        success: true,
        record: newRecord,
        results,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Error in video-publisher POST:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
