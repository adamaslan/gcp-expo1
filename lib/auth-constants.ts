export const SESSION_CACHE_KEY = 'auth_session_cache';
export const TOKEN_CACHE_KEY = 'auth_token_cache';
// Set after account erasure succeeded but sign-out failed; survives app restarts.
export const DELETED_PENDING_SIGNOUT_KEY = 'auth_deleted_pending_signout';

// 1-hour cap aligned with App.tsx SESSION_MAX_AGE_MS and Clerk dashboard config.
export const SESSION_TTL_MS = 60 * 60 * 1000;
