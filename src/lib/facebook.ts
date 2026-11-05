/**
 * Facebook Graph API helper for sending comment replies and private messages
 */

export interface FBCommentReplyOptions {
  pageAccessToken: string;
  commentId: string;
  message: string;
}

export interface FBPrivateMessageOptions {
  pageAccessToken: string;
  recipientId: string;
  message: string;
}

/**
 * Reply directly to a Facebook comment
 */
export async function replyToComment({
  pageAccessToken,
  commentId,
  message,
}: FBCommentReplyOptions) {
  const url = `https://graph.facebook.com/v19.0/${commentId}/comments?access_token=${pageAccessToken}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  return res.json();
}

/**
 * Send a Private Message (DM) to customer via Messenger
 */
export interface FBPrivateReplyOptions {
  pageAccessToken: string;
  commentId: string;
  message: string;
}

/**
 * Send a Private Reply directly into the commenter's Messenger inbox
 * using Facebook's Send API with recipient.comment_id
 */
export async function sendPrivateReply({
  pageAccessToken,
  commentId,
  message,
}: FBPrivateReplyOptions) {
  try {
    const url = `https://graph.facebook.com/v21.0/me/messages?access_token=${pageAccessToken}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: {
          comment_id: commentId,
        },
        message: {
          text: message,
        },
      }),
    });
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("sendPrivateReply fetch error:", error);
    return { error: String(error) };
  }
}

/**
 * Send a Private Message (DM) to customer via Messenger PSID
 */
export async function sendMessengerMessage({
  pageAccessToken,
  recipientId,
  message,
}: FBPrivateMessageOptions) {
  const url = `https://graph.facebook.com/v21.0/me/messages?access_token=${pageAccessToken}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text: message },
    }),
  });
  return res.json();
}
