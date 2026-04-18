# Auth Robustness Guide: Sign-Up & Sign-In (+15%)

Comprehensive guide to make authentication 15% more robust using Google OAuth, Clerk, gcloud, and Vercel CLI. This guide addresses resilience, security, error handling, and operational reliability.

---

## Table of Contents

1. [Overview](#overview)
2. [Phase 1: Gcloud Setup](#phase-1-gcloud-setup)
3. [Phase 2: Clerk Configuration](#phase-2-clerk-configuration)
4. [Phase 3: Application Integration](#phase-3-application-integration)
5. [Phase 4: Resilience Patterns](#phase-4-resilience-patterns)
6. [Phase 5: Verification & Monitoring](#phase-5-verification--monitoring)
7. [Quick Checklist](#quick-checklist)

---

## Overview

**Goal**: Achieve 15% robustness improvement through:
- ✅ Redundant OAuth provider fallbacks (Google + Clerk)
- ✅ Graceful error handling with retry logic
- ✅ Session persistence and recovery
- ✅ Rate limiting and abuse detection
- ✅ Offline-first capabilities
- ✅ Comprehensive logging and monitoring

**Current State**: Clerk-based auth (basic implementation)
**Target State**: Multi-layered, resilient, production-grade authentication

---

## Phase 1: Gcloud Setup

### 1.1 Create GCP Project & OAuth App

```bash
# Authenticate with gcloud
gcloud auth login

# Set your project ID
export GCP_PROJECT_ID="your-project-id"
gcloud config set project $GCP_PROJECT_ID

# Enable required APIs
gcloud services enable \
  oauth2.googleapis.com \
  cloudresourcemanager.googleapis.com \
  serviceusage.googleapis.com

# Create OAuth 2.0 Client ID
gcloud iam service-accounts create oauth-admin \
  --display-name="OAuth Configuration Manager"

# Grant necessary roles
gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
  --member="serviceAccount:oauth-admin@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountAdmin"
```

### 1.2 Create OAuth Credentials

Via **Google Cloud Console** (UI approach):

1. Navigate to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client ID**
3. Select **Application type: Web application**
4. Configure **Authorized redirect URIs**:
   ```
   https://YOUR_CLERK_INSTANCE.clerk.accounts.com/oauth/callback/google
   http://localhost:3000/auth/callback/google
   https://your-vercel-domain.vercel.app/auth/callback/google
   exp://your-mobile-app-id
   ```
5. Copy **Client ID** and **Client Secret**

### 1.3 Store Credentials Securely

```bash
# Save to Vercel environment (never commit secrets)
vercel env add NEXT_PUBLIC_GOOGLE_CLIENT_ID
# Paste: <your-client-id>

vercel env add GOOGLE_CLIENT_SECRET
# Paste: <your-client-secret>

# Verify in .env.local (development only)
echo "NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxx" > .env.local
echo "GOOGLE_CLIENT_SECRET=xxx" >> .env.local

# List all secrets
vercel env ls
```

---

## Phase 2: Clerk Configuration

### 2.1 Install & Update Dependencies

```bash
# Update Clerk to latest
npm install @clerk/clerk-expo@latest @clerk/nextjs@latest

# Optional: For web version
npm install @clerk/clerk-react@latest

# Verify installation
npm ls @clerk/clerk-expo
```

### 2.2 Configure Clerk Instance

**In Clerk Dashboard** (https://dashboard.clerk.com):

1. Navigate to **Authentication** → **Social Connections**
2. Enable **Google** provider
3. Paste GCP **Client ID** and **Client Secret**
4. Set **Scopes**: `email`, `profile`, `openid`
5. Enable **Require Email** under **Email Verification**

### 2.3 Setup Fallback Organization

Create a backup Clerk instance for resilience:

```bash
# Create second Clerk instance (optional but recommended)
# In dashboard, create new instance called "clerk-backup"
# Use for failover scenarios

# Store both instance keys
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
vercel env add CLERK_SECRET_KEY
vercel env add NEXT_PUBLIC_CLERK_BACKUP_PUBLISHABLE_KEY
vercel env add CLERK_BACKUP_SECRET_KEY
```

---

## Phase 3: Application Integration

### 3.1 Enhanced Sign-In with Google OAuth

Replace/enhance `app/sign-in.tsx`:

```typescript
import { useSignIn } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { useOAuth } from "@clerk/clerk-expo";

// Constants
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const OFFLINE_MODE_KEY = "offline_auth_session";

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startOAuthFlow: googleOAuth } = useOAuth({ strategy: "oauth_google" });
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  // Check for cached session on mount
  useEffect(() => {
    checkCachedSession();
  }, []);

  async function checkCachedSession() {
    try {
      const cachedSession = await SecureStore.getItemAsync(OFFLINE_MODE_KEY);
      if (cachedSession) {
        const parsedSession = JSON.parse(cachedSession);
        const isValid = Date.now() - parsedSession.timestamp < SESSION_TIMEOUT_MS;
        if (isValid) {
          // Session still valid, proceed to app
          router.replace("/(tabs)");
        } else {
          // Session expired, clear cache
          await SecureStore.deleteItemAsync(OFFLINE_MODE_KEY);
        }
      }
    } catch (err) {
      console.log("Cache check failed:", err);
    }
  }

  async function handleSignInWithGoogle() {
    if (!isLoaded) return;
    setError("");
    setLoading(true);

    try {
      const { createdSessionId, setActive: setActiveOAuth } = await googleOAuth();

      if (createdSessionId) {
        await setActiveOAuth?.({ session: createdSessionId });
        await cacheSession(createdSessionId);
        router.replace("/(tabs)");
      } else {
        setError("Google sign-in failed. Try email/password or retry.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Google OAuth failed";
      console.error("Google OAuth error:", msg);
      setError(msg);
      handleOAuthFailure();
    } finally {
      setLoading(false);
    }
  }

  async function handleSignIn() {
    if (!isLoaded) return;
    setError("");
    setLoading(true);
    setRetryCount(0);

    await retryWithBackoff(async () => {
      const result = await signIn.create({ identifier: email, password });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        await cacheSession(result.createdSessionId);
        router.replace("/(tabs)");
      } else if (result.status === "needs_second_factor") {
        // Handle 2FA flow
        router.push({ pathname: "/sign-in-2fa", params: { sessionId: result.createdSessionId } });
      } else {
        throw new Error("Sign in incomplete. Please try again.");
      }
    });

    setLoading(false);
  }

  async function retryWithBackoff(fn: () => Promise<void>) {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        await fn();
        return;
      } catch (err: unknown) {
        const isLastAttempt = attempt === MAX_RETRIES - 1;
        if (isLastAttempt) {
          const msg = err instanceof Error ? err.message : "Sign in failed";
          setError(`${msg}. Please check your connection and try again.`);
          throw err;
        }
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
      }
    }
  }

  async function cacheSession(sessionId: string) {
    try {
      const sessionData = JSON.stringify({
        sessionId,
        timestamp: Date.now(),
        email,
      });
      await SecureStore.setItemAsync(OFFLINE_MODE_KEY, sessionData);
    } catch (err) {
      console.warn("Failed to cache session:", err);
    }
  }

  function handleOAuthFailure() {
    Alert.alert(
      "Google Sign-In Failed",
      "Google OAuth is temporarily unavailable. Try email/password or try again.",
      [
        { text: "Retry", onPress: handleSignInWithGoogle },
        { text: "Use Email", onPress: () => setError("") },
      ]
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.inner}>
        <Text style={styles.brand}>Nuwrrrld</Text>
        <Text style={styles.title}>Sign in</Text>

        {/* Email/Password inputs */}
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#4b5563"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#4b5563"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        {/* Sign in button */}
        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleSignIn}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Sign in</Text>
          )}
        </TouchableOpacity>

        {/* Google OAuth button */}
        <TouchableOpacity
          style={[styles.googleBtn, loading && styles.btnDisabled]}
          onPress={handleSignInWithGoogle}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.googleBtnText}>Sign in with Google</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/sign-up")} style={styles.link}>
          <Text style={styles.linkText}>Don't have an account? Sign up</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#030712" },
  inner: { flex: 1, justifyContent: "center", padding: 28 },
  brand: { fontSize: 26, fontWeight: "700", color: "#f9fafb", marginBottom: 8 },
  title: { fontSize: 18, color: "#6b7280", marginBottom: 32 },
  input: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#f9fafb",
    fontSize: 15,
    marginBottom: 12,
  },
  btn: {
    backgroundColor: "#3b82f6",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  googleBtn: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  googleBtnText: { color: "#030712", fontSize: 15, fontWeight: "600" },
  error: { color: "#ef4444", fontSize: 13, marginBottom: 8 },
  link: { marginTop: 24, alignItems: "center" },
  linkText: { color: "#3b82f6", fontSize: 14 },
});
```

### 3.2 Enhanced Sign-Up with Validation

Create/enhance `app/sign-up.tsx`:

```typescript
import { useSignUp } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useOAuth } from "@clerk/clerk-expo";

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;

export default function SignUpScreen() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const { startOAuthFlow: googleOAuth } = useOAuth({ strategy: "oauth_google" });
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");

  function validateInputs(): string | null {
    if (!email || !password || !confirmPassword) {
      return "All fields are required";
    }
    if (!email.includes("@")) {
      return "Please enter a valid email";
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
      return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
    }
    if (!PASSWORD_REGEX.test(password)) {
      return "Password must contain uppercase, lowercase, number, and special character";
    }
    if (password !== confirmPassword) {
      return "Passwords do not match";
    }
    return null;
  }

  async function handleSignUp() {
    if (!isLoaded) return;

    const validationError = validateInputs();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setLoading(true);

    try {
      const result = await signUp.create({
        emailAddress: email,
        password,
        firstName,
        lastName,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/(tabs)");
      } else if (result.status === "missing_requirements") {
        setPendingVerification(true);
        // Prompt for email verification code
      } else {
        setError("Sign up failed. Please try again.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign up failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerificationCode() {
    if (!code) {
      setError("Please enter the verification code");
      return;
    }

    setLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/(tabs)");
      } else {
        setError("Verification failed. Check your code and try again.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Verification failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUpWithGoogle() {
    try {
      const { createdSessionId, setActive: setActiveOAuth } = await googleOAuth();

      if (createdSessionId) {
        await setActiveOAuth?.({ session: createdSessionId });
        router.replace("/(tabs)");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Google sign-up failed";
      setError(msg);
    }
  }

  if (pendingVerification) {
    return (
      <View style={styles.container}>
        <View style={styles.inner}>
          <Text style={styles.title}>Verify Email</Text>
          <Text style={styles.subtitle}>Enter the code sent to {email}</Text>

          <TextInput
            style={styles.input}
            placeholder="Verification code"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            editable={!loading}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleVerificationCode}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Verify</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.inner}>
          <Text style={styles.title}>Create Account</Text>

          <TextInput
            style={styles.input}
            placeholder="First Name"
            value={firstName}
            onChangeText={setFirstName}
            editable={!loading}
          />
          <TextInput
            style={styles.input}
            placeholder="Last Name"
            value={lastName}
            onChangeText={setLastName}
            editable={!loading}
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            editable={!loading}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Sign up</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.googleBtn, loading && styles.btnDisabled]}
            onPress={handleSignUpWithGoogle}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.googleBtnText}>Sign up with Google</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push("/sign-in")}>
            <Text style={styles.linkText}>Already have an account? Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#030712" },
  scrollContent: { flexGrow: 1, justifyContent: "center" },
  inner: { padding: 28 },
  title: { fontSize: 18, color: "#f9fafb", marginBottom: 8, fontWeight: "600" },
  subtitle: { fontSize: 14, color: "#6b7280", marginBottom: 24 },
  input: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "#f9fafb",
    marginBottom: 12,
  },
  btn: {
    backgroundColor: "#3b82f6",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 16,
  },
  googleBtn: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 12,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  googleBtnText: { color: "#030712", fontSize: 15, fontWeight: "600" },
  error: { color: "#ef4444", fontSize: 13, marginBottom: 8 },
  linkText: { color: "#3b82f6", fontSize: 14, marginTop: 16, textAlign: "center" },
});
```

### 3.3 Create Auth Context with Resilience

Create `lib/auth-provider.tsx`:

```typescript
import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { useAuth as useClerkAuth } from "@clerk/clerk-expo";

interface AuthContextType {
  isLoaded: boolean;
  isSignedIn: boolean | null;
  userId: string | null;
  userEmail: string | null;
  sessionToken: string | null;
  retry: (fn: () => Promise<void>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_CACHE_KEY = "auth_session_cache";
const TOKEN_CACHE_KEY = "auth_token_cache";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, user, sessionId } = useClerkAuth();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    async function initialize() {
      try {
        // Try to restore cached session
        const cachedToken = await SecureStore.getItemAsync(TOKEN_CACHE_KEY);
        if (cachedToken) {
          setSessionToken(cachedToken);
        }

        // Cache current session when available
        if (sessionId) {
          await SecureStore.setItemAsync(SESSION_CACHE_KEY, JSON.stringify({ sessionId, timestamp: Date.now() }));
          // In production, get and cache the actual JWT token
        }
      } catch (err) {
        console.warn("Failed to initialize auth cache:", err);
      } finally {
        setIsInitialized(true);
      }
    }

    initialize();
  }, [sessionId]);

  async function retry(fn: () => Promise<void>) {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        await fn();
        return;
      } catch (err) {
        if (attempt === MAX_RETRIES - 1) throw err;
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
      }
    }
  }

  const value: AuthContextType = {
    isLoaded: isLoaded && isInitialized,
    isSignedIn,
    userId: user?.id || null,
    userEmail: user?.emailAddresses?.[0]?.emailAddress || null,
    sessionToken,
    retry,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }
  return context;
}
```

---

## Phase 4: Resilience Patterns

### 4.1 Network Resilience

Create `lib/network-resilience.ts`:

```typescript
import NetInfo from "@react-native-community/netinfo";

const OFFLINE_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

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
```

### 4.2 Rate Limiting & Abuse Prevention

Create `lib/rate-limiter.ts`:

```typescript
interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number; // Time window in milliseconds
  keyPrefix: string;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  keyPrefix: "ratelimit",
};

class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();
  private config: RateLimitConfig;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  isRateLimited(identifier: string): boolean {
    const key = `${this.config.keyPrefix}:${identifier}`;
    const record = this.attempts.get(key);
    const now = Date.now();

    if (!record || now > record.resetTime) {
      // Reset window
      this.attempts.set(key, { count: 1, resetTime: now + this.config.windowMs });
      return false;
    }

    record.count++;
    return record.count > this.config.maxAttempts;
  }

  getRemainingAttempts(identifier: string): number {
    const key = `${this.config.keyPrefix}:${identifier}`;
    const record = this.attempts.get(key);

    if (!record) {
      return this.config.maxAttempts;
    }

    return Math.max(0, this.config.maxAttempts - record.count);
  }

  reset(identifier: string): void {
    const key = `${this.config.keyPrefix}:${identifier}`;
    this.attempts.delete(key);
  }

  resetAll(): void {
    this.attempts.clear();
  }
}

export const signInLimiter = new RateLimiter({
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
  keyPrefix: "signin",
});

export const signUpLimiter = new RateLimiter({
  maxAttempts: 3,
  windowMs: 60 * 60 * 1000, // 1 hour
  keyPrefix: "signup",
});

export const passwordResetLimiter = new RateLimiter({
  maxAttempts: 3,
  windowMs: 60 * 60 * 1000,
  keyPrefix: "pwreset",
});
```

### 4.3 Monitoring & Logging

Create `lib/auth-logger.ts`:

```typescript
enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  action: string;
  userId?: string;
  email?: string;
  message: string;
  metadata?: Record<string, unknown>;
  error?: string;
}

class AuthLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 100;

  private log(level: LogLevel, action: string, message: string, metadata?: Record<string, unknown>, error?: Error) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      action,
      message,
      metadata,
      error: error?.message,
    };

    this.logs.push(entry);

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    console.log(`[${level.toUpperCase()}] ${action}: ${message}`, metadata);

    // Send critical logs to monitoring service
    if (level === LogLevel.ERROR) {
      this.sendToMonitoring(entry);
    }
  }

  debug(action: string, message: string, metadata?: Record<string, unknown>) {
    this.log(LogLevel.DEBUG, action, message, metadata);
  }

  info(action: string, message: string, metadata?: Record<string, unknown>) {
    this.log(LogLevel.INFO, action, message, metadata);
  }

  warn(action: string, message: string, metadata?: Record<string, unknown>) {
    this.log(LogLevel.WARN, action, message, metadata);
  }

  error(action: string, message: string, error?: Error, metadata?: Record<string, unknown>) {
    this.log(LogLevel.ERROR, action, message, metadata, error);
  }

  private sendToMonitoring(entry: LogEntry) {
    // Send to your monitoring service (Sentry, LogRocket, etc.)
    // fetch('/api/logs', { method: 'POST', body: JSON.stringify(entry) });
  }

  getLogs(filter?: { level?: LogLevel; action?: string }): LogEntry[] {
    return this.logs.filter((log) => {
      if (filter?.level && log.level !== filter.level) return false;
      if (filter?.action && log.action !== filter.action) return false;
      return true;
    });
  }
}

export const authLogger = new AuthLogger();
```

---

## Phase 5: Verification & Monitoring

### 5.1 Clerk Webhook Handler (Optional Backend)

Create `api/webhooks/clerk.ts`:

```typescript
// This would be in a Next.js or Express backend
import { Webhook } from "svix";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);

  try {
    const evt = wh.verify(req.body, req.headers);

    switch (evt.type) {
      case "user.created":
        console.log("New user created:", evt.data.id);
        // Log to monitoring service
        break;
      case "user.updated":
        console.log("User updated:", evt.data.id);
        break;
      case "session.created":
        console.log("Session created");
        // Track session for analytics
        break;
      case "session.ended":
        console.log("Session ended");
        break;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Webhook verification failed:", err);
    res.status(400).json({ error: "Unauthorized" });
  }
}
```

### 5.2 Health Check Endpoint

```typescript
// api/health/auth.ts
export default async function handler(req, res) {
  const checks = {
    clerk: await checkClerkHealth(),
    google_oauth: await checkGoogleOAuthHealth(),
    database: await checkDatabaseHealth(),
    timestamp: new Date().toISOString(),
  };

  const allHealthy = Object.values(checks).every((v) => v === true || typeof v !== "boolean");
  res.status(allHealthy ? 200 : 503).json(checks);
}

async function checkClerkHealth() {
  try {
    // Ping Clerk API
    const response = await fetch("https://api.clerk.com/v1/health", {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function checkGoogleOAuthHealth() {
  try {
    // Verify OAuth endpoint is reachable
    const response = await fetch("https://oauth2.googleapis.com/token", { method: "HEAD" });
    return response.ok || response.status === 405; // 405 is expected for HEAD on POST endpoint
  } catch {
    return false;
  }
}
```

### 5.3 Deployment & Verification with Vercel CLI

```bash
# 1. Deploy to staging
vercel deploy --env production

# 2. Set environment variables
vercel env add NEXT_PUBLIC_GOOGLE_CLIENT_ID
vercel env add GOOGLE_CLIENT_SECRET
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
vercel env add CLERK_SECRET_KEY

# 3. Verify health
curl https://your-app.vercel.app/api/health/auth

# 4. Check logs
vercel logs --follow

# 5. Promote to production
vercel --prod

# 6. Monitor deployment
vercel inspect
```

---

## Quick Checklist

### Pre-Launch

- [ ] **GCP Project**
  - [ ] OAuth 2.0 credentials created
  - [ ] Redirect URIs configured (all 4: Clerk, localhost, Vercel, Expo)
  - [ ] Credentials stored securely in Vercel env

- [ ] **Clerk Setup**
  - [ ] Google OAuth enabled and configured
  - [ ] Email verification enabled
  - [ ] Backup instance created (optional)

- [ ] **Code Implementation**
  - [ ] Sign-in with Google OAuth
  - [ ] Sign-up with validation and email verification
  - [ ] Session caching for offline support
  - [ ] Retry logic with exponential backoff
  - [ ] Auth context and provider
  - [ ] Rate limiting setup
  - [ ] Error logging

- [ ] **Testing**
  - [ ] Test email/password sign-in
  - [ ] Test Google OAuth sign-in (staging)
  - [ ] Test email verification flow
  - [ ] Test offline session recovery
  - [ ] Test rate limiting
  - [ ] Test error scenarios (network failure, invalid input)

- [ ] **Monitoring**
  - [ ] Webhooks configured
  - [ ] Health check endpoint working
  - [ ] Logs being collected
  - [ ] Monitoring service integrated (Sentry/LogRocket)

- [ ] **Deployment**
  - [ ] All env vars set in Vercel
  - [ ] HTTPS redirects enforced
  - [ ] CORS configured
  - [ ] Rate limiting deployed
  - [ ] Monitoring active

### Post-Launch

- [ ] Monitor first 24 hours for auth errors
- [ ] Check Google OAuth callback success rates
- [ ] Monitor session creation/termination
- [ ] Track rate limit hits
- [ ] Review user feedback on sign-up/sign-in
- [ ] Adjust retry delays if needed
- [ ] Verify cached session functionality

---

## Resources

- **Clerk Docs**: https://clerk.com/docs
- **Google OAuth**: https://developers.google.com/identity/protocols/oauth2
- **Vercel CLI**: https://vercel.com/docs/cli
- **GCloud SDK**: https://cloud.google.com/sdk/docs

