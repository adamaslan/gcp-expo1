import type { NextApiRequest, NextApiResponse } from "next";
import { validateConfig, getConfigSummary } from "@/lib/config-validator";

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
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
