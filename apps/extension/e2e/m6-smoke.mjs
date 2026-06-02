// Milestone 6 E2E smoke test — Neural engine (ElevenLabs path) end to end.
//
// Switches to the Neural engine, plays, and verifies the panel fetches /tts
// from the (mock) Worker and highlights words from audio currentTime. Uses a
// fake Audio (currentTime clock) + the mock /tts provider, so it runs with no
// ElevenLabs key. Requires the dev Worker on :8787 (run-all.mjs boots it).

import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { launchExtension, SHOTS } from './launch.mjs';
import { installFakeSpeech } from './fake-speech.mjs';
import { installFakeAudio } from './fake-audio.mjs';

let failures = 0;
const check = (name, cond, extra = '') => {
  const ok = Boolean(cond);
  if (!ok) failures++;
  console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ` — ${extra}` : ''}`);
};

const PANEL = 'src/sidepanel/index.html';

const txtFile = (text) => ({
  kind: 'file',
  name: 'reading.txt',
  mime: 'text/plain',
  size: text.length,
  dataBase64: Buffer.from(text, 'utf-8').toString('base64'),
});

const TEXT =
  'Neural voices sound natural and expressive. ' +
  'The words light up as the audio plays.';

const run = async () => {
  mkdirSync(SHOTS, { recursive: true });

  check(
    'local Worker reachable',
    (await fetch('http://localhost:8787/health').then((r) => r.ok, () => false)),
  );

  const { context, openPage, seedHandoff } = await launchExtension();
  await context.addInitScript(installFakeSpeech, { fireBoundaries: true });
  await context.addInitScript(installFakeAudio, { duration: 1.5 });

  const seeder = await openPage(PANEL);
  await seedHandoff(seeder, txtFile(TEXT));
  const panel = await openPage(PANEL);
  await panel.waitForSelector('article.reader', { timeout: 15_000 });

  // Capture /tts requests to prove the proxy is exercised.
  let ttsRequests = 0;
  panel.on('request', (req) => {
    if (req.url().endsWith('/tts')) ttsRequests++;
  });

  // Switch to the Studio (neural) engine.
  await panel.locator('button:has-text("Studio")').click();
  await panel.waitForSelector('button[aria-label="Voice: Rachel"]', {
    timeout: 5_000,
  });
  check(
    'voice rail switches to Studio voices',
    (await panel.locator('button[aria-label="Voice: Rachel"]').count()) >= 1,
  );

  // Play → fetch /tts (mock) → fake audio advances → word highlight.
  await panel.locator('button[aria-label="Play"]').click();
  await panel.waitForSelector('article.reader .bg-accent', { timeout: 12_000 });
  check('neural playback highlights a word from audio currentTime', true);
  check('panel called the Worker /tts proxy', ttsRequests >= 1, `${ttsRequests} request(s)`);

  await panel.screenshot({ path: resolve(SHOTS, 'm6-neural.png'), fullPage: true });

  // Switch back to Built-in.
  await panel.locator('button:has-text("Built-in")').click();
  await panel.waitForSelector('button[aria-label="Voice: Fake Voice"]', {
    timeout: 5_000,
  });
  check(
    'voice rail switches back to Built-in voices',
    (await panel.locator('button[aria-label="Voice: Fake Voice"]').count()) >= 1,
  );

  await context.close();
  console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${failures} failing check(s)`);
  process.exit(failures === 0 ? 0 : 1);
};

run().catch((err) => {
  console.error('E2E harness error:', err);
  process.exit(1);
});
