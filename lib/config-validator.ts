export interface ConfigStatus {
  name: string;
  required: boolean;
  present: boolean;
  value?: string;
}

export interface ValidationResult {
  isValid: boolean;
  configs: ConfigStatus[];
  errors: string[];
}

const REQUIRED_CONFIGS = [
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_GOOGLE_CLIENT_ID",
];

// Backend URLs are required in production, optional in dev (demo mode still works)
const BACKEND_URL_CONFIGS = [
  "EXPO_PUBLIC_GCP3_BACKEND_URL",
  "EXPO_PUBLIC_HOLDFOLD_BACKEND_URL",
  "EXPO_PUBLIC_AITEXT_BACKEND_URL",
];

const OPTIONAL_CONFIGS = [
  "GOOGLE_CLIENT_SECRET",
  "CLERK_WEBHOOK_SECRET",
  "NODE_ENV",
  ...BACKEND_URL_CONFIGS,
];

export function validateConfig(): ValidationResult {
  const configs: ConfigStatus[] = [];
  const errors: string[] = [];

  // Check required configs
  for (const config of REQUIRED_CONFIGS) {
    const present = !!process.env[config];
    configs.push({
      name: config,
      required: true,
      present,
      value: present ? "[present]" : undefined,
    });

    if (!present) {
      errors.push(`Missing required configuration: ${config}`);
    }
  }

  // Check optional configs
  for (const config of OPTIONAL_CONFIGS) {
    const present = !!process.env[config];
    configs.push({
      name: config,
      required: false,
      present,
      value: present ? "[present]" : undefined,
    });
  }

  return {
    isValid: errors.length === 0,
    configs,
    errors,
  };
}

export interface BackendUrlStatus {
  gcp3: string | null;
  holdfold: string | null;
  aitext: string | null;
  allConfigured: boolean;
}

export function getBackendUrls(): BackendUrlStatus {
  const gcp3 = process.env.EXPO_PUBLIC_GCP3_BACKEND_URL ?? null;
  const holdfold = process.env.EXPO_PUBLIC_HOLDFOLD_BACKEND_URL ?? null;
  const aitext = process.env.EXPO_PUBLIC_AITEXT_BACKEND_URL ?? null;
  return { gcp3, holdfold, aitext, allConfigured: !!(gcp3 && holdfold && aitext) };
}

export function getConfigSummary(): Record<string, string | boolean> {
  const validation = validateConfig();

  const backends = getBackendUrls();
  return {
    isValid: validation.isValid,
    clerkConfigured: validation.configs.find(
      (c) => c.name === "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
    )?.present || false,
    googleConfigured: validation.configs.find(
      (c) => c.name === "NEXT_PUBLIC_GOOGLE_CLIENT_ID"
    )?.present || false,
    webhooksConfigured:
      !!process.env.CLERK_WEBHOOK_SECRET,
    environment: process.env.NODE_ENV || "development",
    backendsConfigured: backends.allConfigured,
    gcp3Configured: !!backends.gcp3,
    holdfoldConfigured: !!backends.holdfold,
    aitextConfigured: !!backends.aitext,
  };
}
