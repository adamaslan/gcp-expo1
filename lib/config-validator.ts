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

const OPTIONAL_CONFIGS = [
  "GOOGLE_CLIENT_SECRET",
  "CLERK_WEBHOOK_SECRET",
  "NODE_ENV",
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

export function getConfigSummary(): Record<string, string | boolean> {
  const validation = validateConfig();

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
  };
}
