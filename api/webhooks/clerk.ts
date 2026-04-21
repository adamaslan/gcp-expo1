import type { NextApiRequest, NextApiResponse } from "next";
import { Webhook } from "svix";
import { authLogger } from "@/lib/resilience/auth-logger";

export const config = {
  api: { bodyParser: false },
};

const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET || "";

async function getRawBody(req: NextApiRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

type WebhookEvent = {
  type: string;
  data: Record<string, any>;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!WEBHOOK_SECRET) {
    authLogger.error("webhook_failed", "Missing CLERK_WEBHOOK_SECRET", new Error("No secret"));
    return res.status(500).json({ error: "Webhook secret not configured" });
  }

  try {
    const wh = new Webhook(WEBHOOK_SECRET);

    const payload = await getRawBody(req);
    const headers = req.headers as Record<string, string>;

    // Verify webhook signature
    const evt: WebhookEvent = wh.verify(payload, headers) as WebhookEvent;

    // Process different event types
    switch (evt.type) {
      case "user.created":
        handleUserCreated(evt.data);
        break;
      case "user.updated":
        handleUserUpdated(evt.data);
        break;
      case "user.deleted":
        handleUserDeleted(evt.data);
        break;
      case "session.created":
        handleSessionCreated(evt.data);
        break;
      case "session.ended":
        handleSessionEnded(evt.data);
        break;
      default:
        authLogger.info("webhook_event", `Unhandled event: ${evt.type}`, {
          eventType: evt.type,
        });
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    authLogger.error("webhook_failed", "Webhook verification failed", err as Error);
    res.status(400).json({ error: "Unauthorized" });
  }
}

function handleUserCreated(data: Record<string, any>) {
  authLogger.info("user_created", "New user created", {
    userId: data.id,
    email: data.email_addresses?.[0]?.email_address,
    createdAt: data.created_at,
  });
}

function handleUserUpdated(data: Record<string, any>) {
  authLogger.info("user_updated", "User updated", {
    userId: data.id,
    updatedAt: data.updated_at,
  });
}

function handleUserDeleted(data: Record<string, any>) {
  authLogger.info("user_deleted", "User deleted", {
    userId: data.id,
    deletedAt: data.deleted_at,
  });
}

function handleSessionCreated(data: Record<string, any>) {
  authLogger.info("session_created", "Session created", {
    sessionId: data.id,
    userId: data.user_id,
    createdAt: data.created_at,
  });
}

function handleSessionEnded(data: Record<string, any>) {
  authLogger.info("session_ended", "Session ended", {
    sessionId: data.id,
    userId: data.user_id,
    endedAt: data.ended_at,
  });
}
