// Runs every milestone E2E smoke against a real extension build, booting the
// dev Worker for the milestones that need it and tearing it down afterward.
//
// The Worker is started with `--var SUMMARY_BACKEND:mock` so the suite is
// hermetic — no Cloudflare login / AI Gateway needed in CI. (Normal local dev
// uses real Workers AI via the gateway; see apps/worker/wrangler.toml.)
// Exits non-zero if any smoke fails.

import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const workerDir = resolve(__dirname, '..', '..', 'worker');

const SMOKES = [
  'm1-smoke.mjs',
  'm2-smoke.mjs',
  'm3-smoke.mjs',
  'm4-smoke.mjs',
  'm5-smoke.mjs',
  'm6-smoke.mjs',
  'm7-smoke.mjs',
  'm8-smoke.mjs',
];

function run(cmd, args, opts = {}) {
  return new Promise((resolveRun) => {
    const child = spawn(cmd, args, { stdio: 'inherit', ...opts });
    child.on('exit', (code) => resolveRun(code ?? 1));
  });
}

async function waitForHealth(url, attempts = 40) {
  for (let i = 0; i < attempts; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return await r.json();
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

const main = async () => {
  // Boot the dev Worker (needed by m5).
  console.log('▶ starting dev Worker (mock) on :8787…');
  const worker = spawn(
    'npx',
    [
      'wrangler',
      'dev',
      '-c',
      'wrangler.e2e.toml', // no AI binding → boots offline, no auth
      '--ip',
      '127.0.0.1',
      '--port',
      '8787',
    ],
    {
      cwd: workerDir,
      stdio: 'ignore',
      env: { ...process.env, WRANGLER_SEND_METRICS: 'false', CI: 'true' },
    },
  );

  const health = await waitForHealth('http://127.0.0.1:8787/health');
  if (!health) {
    console.error('✗ dev Worker did not become healthy');
    worker.kill('SIGTERM');
    process.exit(1);
  }
  // Guard against a foreign worker already squatting :8787 (e.g. a real
  // `wrangler dev`). The hermetic config reports the mock backend.
  if (health.summaryBackend !== 'mock') {
    console.error(
      `✗ another worker is on :8787 (summaryBackend=${health.summaryBackend}). Stop it first.`,
    );
    worker.kill('SIGTERM');
    process.exit(1);
  }
  console.log('✓ Worker healthy (hermetic mock)\n');

  let failed = 0;
  try {
    for (const smoke of SMOKES) {
      console.log(`\n──────── ${smoke} ────────`);
      const code = await run('node', [resolve(__dirname, smoke)]);
      if (code !== 0) failed++;
    }
  } finally {
    worker.kill('SIGTERM');
  }

  console.log(
    `\n════════ ${failed === 0 ? 'ALL E2E PASSED' : `${failed} SMOKE(S) FAILED`} ════════`,
  );
  process.exit(failed === 0 ? 0 : 1);
};

main();
