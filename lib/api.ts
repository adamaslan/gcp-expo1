import { useAuth } from "@clerk/clerk-expo";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL!;

if (!BACKEND_URL) {
  throw new Error("Missing EXPO_PUBLIC_BACKEND_URL in .env");
}

export function useApi() {
  const { getToken } = useAuth();

  async function fetchBackend<T>(
    path: string,
    params?: Record<string, string>
  ): Promise<T> {
    const token = await getToken();
    const url = new URL(path, BACKEND_URL);

    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(url.toString(), { headers });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Backend ${res.status}: ${body}`);
    }

    return res.json() as Promise<T>;
  }

  return { fetchBackend };
}
