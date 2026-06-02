// Runs every milestone E2E smoke against a real extension build, booting the
// dev Worker (mock summarizer, offline) for the milestones that need it and
// tearing it down afterward. Exits non-zero if any smoke fails.

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
      if (r.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

const main = async () => {
  // Boot the dev Worker (needed by m5).
  console.log('▶ starting dev Worker (mock) on :8787…');
  const worker = spawn(
    'npx',
    ['wrangler', 'dev', '--ip', '127.0.0.1', '--port', '8787'],
    {
      cwd: workerDir,
      stdio: 'ignore',
      env: { ...process.env, WRANGLER_SEND_METRICS: 'false', CI: 'true' },
    },
  );

  const up = await waitForHealth('http://127.0.0.1:8787/health');
  if (!up) {
    console.error('✗ dev Worker did not become healthy');
    worker.kill('SIGTERM');
    process.exit(1);
  }
  console.log('✓ Worker healthy\n');

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
