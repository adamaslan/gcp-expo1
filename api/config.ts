import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getConfigSummary } from "@/lib/config-validator";

export default function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const summary = getConfigSummary();

  // Return only non-sensitive information
  res.status(200).json({
    isValid: summary.isValid,
    clerkConfigured: summary.clerkConfigured,
    googleConfigured: summary.googleConfigured,
    webhooksConfigured: summary.webhooksConfigured,
    environment: summary.environment,
    timestamp: new Date().toISOString(),
  });
}
