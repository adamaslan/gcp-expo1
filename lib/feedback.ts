/**
 * In-app feedback submission.
 * Routes feedback to the backend which forwards to Discord webhook + email.
 * EXPO_PUBLIC_FEEDBACK_WEBHOOK_URL must be set (a Discord webhook or backend endpoint).
 */

const FEEDBACK_URL =
  process.env.EXPO_PUBLIC_FEEDBACK_WEBHOOK_URL ??
  (process.env.EXPO_PUBLIC_GCP3_BACKEND_URL ?? 'http://localhost:8000') + '/api/feedback';

export type FeedbackCategory = 'bug' | 'feature' | 'data' | 'other';

export interface FeedbackPayload {
  category: FeedbackCategory;
  message: string;
  /** Clerk user ID — attached server-side but sent for attribution */
  userId?: string;
  /** Screen where feedback was submitted */
  source?: string;
}

export async function submitFeedback(payload: FeedbackPayload): Promise<void> {
  const res = await fetch(FEEDBACK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      ts: new Date().toISOString(),
      platform: 'mobile',
    }),
  });

  if (!res.ok) {
    throw new Error(`Feedback submission failed: ${res.status}`);
  }
}
