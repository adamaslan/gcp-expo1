#!/usr/bin/env npx ts-node --esm
// Smoke test: verifies all three backends are reachable and return sane health responses.
// Run: npx ts-node scripts/smoke-backends.ts
// Requires: EXPO_PUBLIC_GCP3_BACKEND_URL, EXPO_PUBLIC_HOLDFOLD_BACKEND_URL,
//           EXPO_PUBLIC_AITEXT_BACKEND_URL set in the environment (or .env.local).

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

interface Result {
  backend: string;
  url: string;
  ok: boolean;
  statusCode?: number;
  body?: unknown;
  error?: string;
  durationMs: number;
}

async function probe(backend: string, url: string, path: string): Promise<Result> {
  const full = url.replace(/\/$/, '') + path;
  const start = Date.now();
  try {
    const res = await fetch(full, { signal: AbortSignal.timeout(5_000) });
    const body = await res.json().catch(() => null);
    return { backend, url: full, ok: res.ok, statusCode: res.status, body, durationMs: Date.now() - start };
  } catch (err) {
    return { backend, url: full, ok: false, error: String(err), durationMs: Date.now() - start };
  }
}

async function main() {
  const gcp3Url = process.env.EXPO_PUBLIC_GCP3_BACKEND_URL;
  const holdfoldUrl = process.env.EXPO_PUBLIC_HOLDFOLD_BACKEND_URL;
  const aitextUrl = process.env.EXPO_PUBLIC_AITEXT_BACKEND_URL;

  if (!gcp3Url || !holdfoldUrl || !aitextUrl) {
    console.error('Missing one or more backend URL env vars. Set:');
    console.error('  EXPO_PUBLIC_GCP3_BACKEND_URL');
    console.error('  EXPO_PUBLIC_HOLDFOLD_BACKEND_URL');
    console.error('  EXPO_PUBLIC_AITEXT_BACKEND_URL');
    process.exit(1);
  }

  console.log('Probing all three backends...\n');

  const results = await Promise.all([
    probe('gcp3', gcp3Url, '/health'),
    probe('holdfold', holdfoldUrl, '/health'),
    probe('aitext', aitextUrl, '/api/health'),
  ]);

  let allOk = true;
  for (const r of results) {
    const icon = r.ok ? '✅' : '❌';
    console.log(`${icon} ${r.backend.padEnd(10)} ${r.url}`);
    console.log(`   status=${r.statusCode ?? 'N/A'}  time=${r.durationMs}ms`);
    if (r.body) console.log(`   body=${JSON.stringify(r.body)}`);
    if (r.error) console.log(`   error=${r.error}`);
    console.log();
    if (!r.ok) allOk = false;
  }

  if (!allOk) {
    console.error('One or more backends are unhealthy. Fix before shipping.');
    process.exit(1);
  }
  console.log('All backends healthy.');
}

main().catch((err) => { console.error(err); process.exit(1); });
