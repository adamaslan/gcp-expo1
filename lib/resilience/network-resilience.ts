import NetInfo from "@react-native-community/netinfo";

const OFFLINE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: Error) => boolean;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 500,
    maxDelayMs = 5000,
    backoffMultiplier = 2,
    shouldRetry = (error) => !error.message.includes("validation"),
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxAttempts - 1) {
        throw lastError;
      }

      if (!shouldRetry(lastError)) {
        throw lastError;
      }

      const delay = Math.min(
        initialDelayMs * Math.pow(backoffMultiplier, attempt),
        maxDelayMs
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

export async function isNetworkAvailable(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected === true && state.isInternetReachable !== false;
}

export async function withNetworkCheck<T>(
  fn: () => Promise<T>,
  offlineFallback?: () => T
): Promise<T> {
  const isOnline = await isNetworkAvailable();

  if (!isOnline && offlineFallback) {
    console.warn("Network unavailable, using offline fallback");
    return offlineFallback();
  }

  if (!isOnline) {
    throw new Error("Network unavailable and no offline fallback provided");
  }

  return fn();
}
