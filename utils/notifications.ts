/**
 * Notification utilities for sending push notifications via the backend.
 *
 * The backend uses ONESIGNAL_REST_API_KEY (never exposed to the frontend).
 * All notification sends go through POST /api/notifications/compliment.
 */

import { authenticatedPost } from "@/utils/api";

/**
 * Notify a compliment recipient via push notification.
 * Fire-and-forget — errors are logged but never thrown to the caller.
 *
 * @param recipientId  The user ID of the compliment recipient
 * @param category     The compliment category (e.g. "Personnalité")
 */
export async function notifyComplimentRecipient(
  recipientId: string,
  category: string
): Promise<void> {
  console.log(
    "[Notifications] Sending compliment notification to recipient:",
    recipientId,
    "category:",
    category
  );
  try {
    await authenticatedPost("/api/notifications/compliment", {
      recipient_id: recipientId,
      category,
    });
    console.log("[Notifications] Compliment notification sent successfully");
  } catch (err: any) {
    // Non-blocking — notification failure must never break the send flow
    console.warn(
      "[Notifications] Failed to send compliment notification (non-fatal):",
      err?.message
    );
  }
}
