/**
 * portalPrivacy — data-subject-rights client for the portal's /api/privacy/*
 * routes (GDPR Art. 15/16/17, CPRA). The caller supplies the Clerk Bearer
 * token (`await getToken()`); nothing here reads auth state itself.
 *
 * httpJson never retries 4xx. 429s carry `retry_after_seconds` in the body,
 * surfaced via PortalPrivacyError.retryAfterSeconds.
 */
import { httpJson } from '../http';

const PORTAL_URL = process.env.EXPO_PUBLIC_PORTAL_URL ?? 'https://financial.nuwrrrld.com';

// Export runs a query per user-keyed table; allow more than httpJson's 10s default.
const EXPORT_TIMEOUT_MS = 30_000;
const DELETE_TIMEOUT_MS = 30_000;

// ---------- Errors ----------

export class PortalPrivacyError extends Error {
  constructor(
    readonly status: number,
    /** Server `error` code, e.g. "rate_limited", "invalid_or_expired_token", "erasure_failed". */
    readonly code: string | null,
    message: string,
    readonly retryAfterSeconds: number | null = null,
  ) {
    super(message);
    this.name = 'PortalPrivacyError';
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }

  get isTokenInvalid(): boolean {
    return this.code === 'invalid_or_expired_token';
  }
}

const HTTP_ERROR_PATTERN = /^HTTP (\d{3}): ([\s\S]*)$/;

/** httpJson throws `HTTP <status>: <body>`; recover status and the JSON body. */
function toPrivacyError(err: unknown): unknown {
  if (!(err instanceof Error)) return err;
  const match = HTTP_ERROR_PATTERN.exec(err.message);
  if (!match) return err;

  const status = Number(match[1]);
  let code: string | null = null;
  let hint: string | null = null;
  let retryAfter: number | null = null;
  try {
    const body = JSON.parse(match[2]) as Record<string, unknown>;
    if (typeof body.error === 'string') code = body.error;
    if (typeof body.hint === 'string') hint = body.hint;
    if (typeof body.retry_after_seconds === 'number') retryAfter = body.retry_after_seconds;
  } catch {
    // Non-JSON body (e.g. an edge 404/401 page) — fall through with status only.
  }
  return new PortalPrivacyError(status, code, hint ?? code ?? `Request failed (${status})`, retryAfter);
}

async function call<T>(path: string, token: string, options: Parameters<typeof httpJson>[2] = {}): Promise<T> {
  try {
    return await httpJson<T>(PORTAL_URL, path, { ...options, token });
  } catch (err) {
    throw toPrivacyError(err);
  }
}

// ---------- Types ----------

/** GET /api/privacy/export — full per-table dump; `_errors` lists incomplete sections. */
export interface PrivacyExport {
  generated_at: string;
  user_id: string;
  clerk: { email?: string; created_at?: string; public_metadata?: Record<string, unknown> } | null;
  council_sessions: unknown[];
  council_messages: unknown[];
  council_usage: unknown[];
  nuai_usage: unknown[];
  watchlist_items: unknown[];
  disclaimer_acks: unknown[];
  user_digest_cache: unknown | null;
  consent_records: unknown[];
  legal_consent_events: unknown[];
  _errors: string[];
}

/** GET /api/privacy/profile — derived view of personal data. */
export interface PrivacyProfile {
  plan: string;
  trial: Record<string, unknown>;
  referral: { code: string | null; referrals_completed: number };
  engagement: {
    council_messages_total: number;
    nuai_prompts_total: number;
    watchlist_size: number;
    disclaimer_acknowledged: boolean;
  };
  interest_tags: string[];
  consent: Record<string, unknown> | null;
  privacy_requests: unknown[];
  derived_profile: unknown | null;
  _errors: string[];
}

/** The only fields POST /api/privacy/rectify reads. field + requested_value are required. */
export interface RectifyFields {
  field: string;
  requested_value: string;
  current_value?: string;
  reason?: string;
}

export interface RectifyResult {
  ok: boolean;
  request_id: string | number | null;
  status: string;
  statutory_deadline_days: number;
  note: string;
}

/** POST /api/privacy/delete {confirm:false} — nothing is deleted by this call. */
export interface DeletionPreview {
  confirm_required: true;
  token: string;
  token_expires_in_seconds: number;
  /** Row count per table that would be erased. */
  will_delete: Record<string, number>;
  /** Data that is kept (and why), keyed by system. */
  not_deleted: Record<string, string>;
}

export interface DeletionResult {
  ok: boolean;
  clerk_account_deleted: boolean;
  deleted: Record<string, number | string>;
}

// ---------- Calls ----------

export function exportMyData(token: string): Promise<PrivacyExport> {
  return call<PrivacyExport>('/api/privacy/export', token, { timeoutMs: EXPORT_TIMEOUT_MS });
}

export function getMyProfile(token: string): Promise<PrivacyProfile> {
  return call<PrivacyProfile>('/api/privacy/profile', token);
}

export function rectifyMyData(token: string, fields: RectifyFields): Promise<RectifyResult> {
  return call<RectifyResult>('/api/privacy/rectify', token, { method: 'POST', body: fields });
}

/** Step 1 of erasure. Read-only on the server apart from a ledger entry. */
export function previewAccountDeletion(token: string): Promise<DeletionPreview> {
  return call<DeletionPreview>('/api/privacy/delete', token, {
    method: 'POST',
    body: { confirm: false },
    timeoutMs: DELETE_TIMEOUT_MS,
  });
}

/** Step 2 of erasure. IRREVERSIBLE: deletes the user's data and Clerk account. */
export function confirmAccountDeletion(token: string, deletionToken: string): Promise<DeletionResult> {
  return call<DeletionResult>('/api/privacy/delete', token, {
    method: 'POST',
    body: { confirm: true, token: deletionToken },
    timeoutMs: DELETE_TIMEOUT_MS,
  });
}
