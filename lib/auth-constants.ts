export const SESSION_CACHE_KEY = 'auth_session_cache';
export const TOKEN_CACHE_KEY = 'auth_token_cache';

// 1-hour cap aligned with App.tsx SESSION_MAX_AGE_MS and Clerk dashboard config.
export const SESSION_TTL_MS = 60 * 60 * 1000;
