import type { NextApiRequest, NextApiResponse } from "next";

type HealthData = {
  clerk?: boolean;
  google_oauth?: boolean;
  timestamp: string;
  status: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthData>
) {
  if (req.method !== "GET") {
    return res.status(405).json({
      status: "error",
      timestamp: new Date().toISOString(),
    } as HealthData);
  }

  const checks = {
    clerk: await checkClerkHealth(),
    google_oauth: await checkGoogleOAuthHealth(),
    timestamp: new Date().toISOString(),
    status: "operational",
  };

  const allHealthy = checks.clerk && checks.google_oauth;
  res.status(allHealthy ? 200 : 503).json(checks);
}

async function checkClerkHealth(): Promise<boolean> {
  try {
    // Verify we have Clerk credentials
    const hasCredentials = !!process.env.CLERK_SECRET_KEY;
    if (!hasCredentials) return false;

    // Attempt to make a minimal request to Clerk API
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch("https://api.clerk.com/v1/users?limit=1", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return response.ok;
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return false;
  }
}

async function checkGoogleOAuthHealth(): Promise<boolean> {
  try {
    // Verify we have Google credentials
    const hasCredentials = !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!hasCredentials) return false;

    // Check Google OAuth endpoint availability
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "HEAD",
        signal: controller.signal,
      });
      clearTimeout(timeout);
      // 405 is expected for HEAD request; indicates service is up
      return response.ok || response.status === 405;
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return false;
  }
}
