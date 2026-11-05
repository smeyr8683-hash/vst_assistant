import { NextRequest, NextResponse } from "next/server";
import { database as supabase, usingLocalDatabase } from "@/lib/server-database";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

export interface BatchItem {
  id: string;
  fileUrl?: string;
  mediaType: "photo" | "video";
  caption?: string;
  title?: string;
}

export interface StoryBatchRecord {
  id: string;
  targetPageId: string;
  targetPageName: string;
  publishType: "story" | "feed" | "reels";
  totalItems: number;
  successCount: number;
  publishedAt: string;
  items: {
    id: string;
    mediaType: "photo" | "video";
    status: "success" | "error";
    postId?: string;
    message?: string;
    preview?: string;
  }[];
}

// Retrieve valid Facebook Page Access Tokens from Supabase
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
      for (const m of members) {
        for (const p of m.pages || []) {
          if (p.id && p.accessToken) {
            tokenMap[p.id] = p.accessToken;
          }
        }
      }
    }
  } catch (err) {
    console.error("Error reading page tokens:", err);
  }

  // Fallback to row tokens in bot_settings
  try {
    const { data: pageRows } = await supabase
      .from("bot_settings")
      .select("id, dm_template")
      .neq("id", "vst_members")
      .neq("id", "vst_video_posts")
      .neq("id", "vst_story_posts");

    if (pageRows) {
      for (const row of pageRows) {
        if (row.dm_template && row.dm_template.startsWith("EAA")) {
          tokenMap[row.id] = row.dm_template;
        }
      }
    }
  } catch {}

  const envToken = process.env.FB_PAGE_ACCESS_TOKEN;
  const envDefaultPage = process.env.FB_DEFAULT_PAGE_ID;
  if (envToken && envDefaultPage && !tokenMap[envDefaultPage]) {
    tokenMap[envDefaultPage] = envToken;
  }

  return tokenMap;
}

// GET: Fetch History or Live Pages
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "history") {
      const { data } = await supabase
        .from("bot_settings")
        .select("dm_template")
        .eq("id", "vst_story_posts")
        .maybeSingle();

      let history: StoryBatchRecord[] = [];
      if (data?.dm_template) {
        try {
          history = JSON.parse(data.dm_template);
        } catch {}
      }
      return NextResponse.json({ success: true, history });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Publish Photo Story, Video Story, or Batch Feed
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // 1. MULTIPART FORM-DATA: Direct file upload for Photo/Video Stories & Chunk Transfers
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const action = formData.get("action") as string;

      // 1A. RESUMABLE VIDEO STORY CHUNK TRANSFER (Bypasses Vercel 4.5MB payload limit)
      if (action === "resumable_story_transfer") {
        const pageId = formData.get("pageId") as string;
        const uploadUrl = formData.get("upload_url") as string;
        const startOffset = (formData.get("start_offset") as string) || "0";
        const fileSize = (formData.get("file_size") as string) || "0";
        const chunk = formData.get("chunk") as File | Blob | null;

        if (!pageId || !uploadUrl || !chunk) {
          return NextResponse.json({ error: "Missing required chunk transfer parameters" }, { status: 400 });
        }

        const tokenMap = await getPageTokensMap();
        const pageToken = tokenMap[pageId] || process.env.FB_PAGE_ACCESS_TOKEN;
        if (!pageToken) {
          return NextResponse.json({ error: `No access token found for page ${pageId}` }, { status: 400 });
        }

        const chunkBuffer = await chunk.arrayBuffer();

        const binRes = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            Authorization: `OAuth ${pageToken}`,
            offset: startOffset,
            file_size: fileSize,
            "Content-Type": "video/mp4",
          },
          body: chunkBuffer,
        });

        const binData = await binRes.json().catch(() => ({ success: binRes.ok }));
        return NextResponse.json(binData, { status: binRes.status });
      }

      const pageId = formData.get("pageId") as string;
      const file = formData.get("file") as File | null;
      const mediaType = (formData.get("mediaType") as "photo" | "video") || "photo";
      const caption = (formData.get("caption") as string) || "";
      const title = (formData.get("title") as string) || "";

      if (!pageId || !file) {
        return NextResponse.json({ error: "pageId and file are required" }, { status: 400 });
      }

      const tokenMap = await getPageTokensMap();
      const pageToken = tokenMap[pageId] || process.env.FB_PAGE_ACCESS_TOKEN;

      if (!pageToken) {
        return NextResponse.json(
          { error: `ពុំមាន Access Token សម្រាប់ Page ID ${pageId} ទេ (សូមភ្ជាប់ Facebook សាជាថ្មី)` },
          { status: 400 }
        );
      }

      // 1A. PUBLISH PHOTO STORY
      if (action === "publish_photo_story" || (action === "publish_story" && mediaType === "photo")) {
        // Step 1: Upload photo as unpublished
        const photoForm = new FormData();
        photoForm.append("published", "false");
        photoForm.append("access_token", pageToken);
        photoForm.append("source", file, file.name || "photo.jpg");

        const uploadRes = await fetch(`https://graph.facebook.com/v21.0/${pageId}/photos`, {
          method: "POST",
          body: photoForm,
        });
        const uploadData = await uploadRes.json();

        if (!uploadRes.ok || !uploadData.id) {
          const errMsg = uploadData?.error?.message || "Failed to upload photo to Facebook";
          return NextResponse.json({ error: errMsg }, { status: uploadRes.status });
        }

        const photoId = uploadData.id;

        // Step 2: Publish photo to photo_stories
        const storyParams = new URLSearchParams({
          photo_id: photoId,
          access_token: pageToken,
        });

        const storyRes = await fetch(`https://graph.facebook.com/v21.0/${pageId}/photo_stories`, {
          method: "POST",
          body: storyParams,
        });
        const storyData = await storyRes.json();

        if (!storyRes.ok || (!storyData.success && !storyData.post_id && !storyData.id)) {
          const errMsg = storyData?.error?.message || "Failed to publish photo to Story";
          return NextResponse.json({ error: errMsg }, { status: storyRes.status });
        }

        return NextResponse.json({
          success: true,
          type: "photo_story",
          postId: storyData.post_id || storyData.id || photoId,
          photoId,
          message: "បានផុស Photo Story ទៅកាន់ Facebook Page ជោគជ័យ!",
        });
      }

      // 1B. PUBLISH VIDEO STORY
      if (action === "publish_video_story" || (action === "publish_story" && mediaType === "video")) {
        // Step 1: Start video story session
        const startParams = new URLSearchParams({
          upload_phase: "start",
          access_token: pageToken,
        });

        const startRes = await fetch(`https://graph.facebook.com/v21.0/${pageId}/video_stories`, {
          method: "POST",
          body: startParams,
        });
        const startData = await startRes.json();

        if (!startRes.ok || !startData.upload_url || !startData.video_id) {
          const errMsg = startData?.error?.message || "Failed to initialize video story session";
          return NextResponse.json({ error: errMsg }, { status: startRes.status });
        }

        const { upload_url, video_id } = startData;

        // Step 2: Upload video binary to Facebook upload_url
        const fileBuffer = await file.arrayBuffer();
        const uploadHeaders: Record<string, string> = {
          Authorization: `OAuth ${pageToken}`,
          offset: "0",
          file_size: file.size.toString(),
          "Content-Type": file.type || "video/mp4",
        };

        const binRes = await fetch(upload_url, {
          method: "POST",
          headers: uploadHeaders,
          body: fileBuffer,
        });
        const binData = await binRes.json().catch(() => null);

        // Step 3: Finish video story
        const finishParams = new URLSearchParams({
          upload_phase: "finish",
          video_id,
          access_token: pageToken,
        });

        const finishRes = await fetch(`https://graph.facebook.com/v21.0/${pageId}/video_stories`, {
          method: "POST",
          body: finishParams,
        });
        const finishData = await finishRes.json();

        if (!finishRes.ok || (!finishData.success && !finishData.post_id && !finishData.id)) {
          const errMsg = finishData?.error?.message || "Failed to finish video story";
          return NextResponse.json({ error: errMsg }, { status: finishRes.status });
        }

        return NextResponse.json({
          success: true,
          type: "video_story",
          postId: finishData.post_id || finishData.id || video_id,
          videoId: video_id,
          message: "បានផុស Video Story ទៅកាន់ Facebook Page ជោគជ័យ!",
        });
      }

      // 1C. PUBLISH REGULAR SINGLE MEDIA TO PAGE FEED
      if (action === "publish_feed") {
        if (mediaType === "photo") {
          const feedForm = new FormData();
          feedForm.append("source", file, file.name || "photo.jpg");
          feedForm.append("caption", caption);
          feedForm.append("access_token", pageToken);

          const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/photos`, {
            method: "POST",
            body: feedForm,
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error?.message || "Error posting photo");
          return NextResponse.json({ success: true, postId: data.id || data.post_id });
        } else {
          // Direct video post
          const feedForm = new FormData();
          feedForm.append("source", file, file.name || "video.mp4");
          feedForm.append("description", caption);
          feedForm.append("title", title || "Video Post");
          feedForm.append("access_token", pageToken);
          feedForm.append("published", "true");

          const res = await fetch(`https://graph-video.facebook.com/v21.0/${pageId}/videos`, {
            method: "POST",
            body: feedForm,
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error?.message || "Error posting video");
          return NextResponse.json({ success: true, postId: data.id || data.post_id });
        }
      }
    }

    // 2. JSON REQUESTS (History, Remote Media, or Batch Configuration)
    const body = await req.json();
    const { action } = body;

    // 2A. RESUMABLE VIDEO STORY: START PHASE (Bypasses Vercel 4.5MB payload limit)
    if (action === "resumable_story_start") {
      const { pageId } = body as { pageId: string };
      if (!pageId) {
        return NextResponse.json({ error: "pageId is required" }, { status: 400 });
      }

      const tokenMap = await getPageTokensMap();
      const pageToken = tokenMap[pageId] || process.env.FB_PAGE_ACCESS_TOKEN;
      if (!pageToken) {
        return NextResponse.json(
          { error: `ពុំមាន Access Token សម្រាប់ Page ID ${pageId} ទេ (សូម Re-authorize តាម Facebook Login)` },
          { status: 400 }
        );
      }

      const startParams = new URLSearchParams({
        upload_phase: "start",
        access_token: pageToken,
      });

      const startRes = await fetch(`https://graph.facebook.com/v21.0/${pageId}/video_stories`, {
        method: "POST",
        body: startParams,
      });
      const startData = await startRes.json();

      if (!startRes.ok || !startData.upload_url || !startData.video_id) {
        const errMsg = startData?.error?.message || "Failed to initialize video story session";
        return NextResponse.json({ error: errMsg }, { status: startRes.status });
      }

      return NextResponse.json({
        success: true,
        upload_url: startData.upload_url,
        video_id: startData.video_id,
      });
    }

    // 2B. RESUMABLE VIDEO STORY: FINISH PHASE
    if (action === "resumable_story_finish") {
      const { pageId, video_id } = body as { pageId: string; video_id: string };
      if (!pageId || !video_id) {
        return NextResponse.json({ error: "pageId and video_id are required" }, { status: 400 });
      }

      const tokenMap = await getPageTokensMap();
      const pageToken = tokenMap[pageId] || process.env.FB_PAGE_ACCESS_TOKEN;
      if (!pageToken) {
        return NextResponse.json(
          { error: `ពុំមាន Access Token សម្រាប់ Page ID ${pageId} ទេ` },
          { status: 400 }
        );
      }

      const finishParams = new URLSearchParams({
        upload_phase: "finish",
        video_id,
        access_token: pageToken,
      });

      const finishRes = await fetch(`https://graph.facebook.com/v21.0/${pageId}/video_stories`, {
        method: "POST",
        body: finishParams,
      });
      const finishData = await finishRes.json();

      if (!finishRes.ok || (!finishData.success && !finishData.post_id && !finishData.id)) {
        const errMsg = finishData?.error?.message || "Failed to finish video story";
        return NextResponse.json({ error: errMsg }, { status: finishRes.status });
      }

      return NextResponse.json({
        success: true,
        type: "video_story",
        postId: finishData.post_id || finishData.id || video_id,
        videoId: video_id,
        message: "បានផុស Video Story ទៅកាន់ Facebook Page ជោគជ័យ!",
      });
    }

    // Save batch record to history
    if (action === "save_history") {
      const { record } = body as { record: StoryBatchRecord };
      if (record) {
        try {
          const { data: existingData } = await supabase
            .from("bot_settings")
            .select("dm_template")
            .eq("id", "vst_story_posts")
            .maybeSingle();

          let historyList: StoryBatchRecord[] = [];
          if (existingData?.dm_template) {
            try {
              historyList = JSON.parse(existingData.dm_template);
            } catch {}
          }

          historyList.unshift(record);
          if (historyList.length > 50) historyList = historyList.slice(0, 50);

          await supabase.from("bot_settings").upsert(
            {
              id: "vst_story_posts",
              dm_template: JSON.stringify(historyList),
              is_active: true,
            },
            { onConflict: "id" }
          );
        } catch (e) {
          console.error("Error saving story history:", e);
        }
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("Error in story publisher route:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
