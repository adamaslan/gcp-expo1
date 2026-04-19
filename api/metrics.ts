import type { NextApiRequest, NextApiResponse } from "next";

type MetricEvent = {
  name: string;
  timestamp: string;
  duration?: number;
  status: "success" | "failure" | "timeout";
  metadata?: Record<string, unknown>;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    const metric: MetricEvent = req.body;

    // Validate required fields
    if (!metric.name || !metric.timestamp || !metric.status) {
      return res.status(400).json({
        error: "Missing required fields: name, timestamp, status",
      });
    }

    // In production, you would:
    // 1. Store metrics in a database
    // 2. Send to a monitoring service (e.g., Datadog, New Relic)
    // 3. Aggregate and alert on anomalies
    //
    // For now, we just acknowledge receipt
    console.log(`[METRIC] ${metric.name}: ${metric.status}`, {
      duration: metric.duration,
      timestamp: metric.timestamp,
    });

    res.status(200).json({ ok: true });
  } else if (req.method === "GET") {
    // Return metrics summary
    res.status(200).json({
      message: "Metrics endpoint is operational",
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
