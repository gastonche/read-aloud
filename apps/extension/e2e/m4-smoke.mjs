// Milestone 4 E2E smoke test — WebSpeech playback + highlighting.
//
// Headless Chromium has no system voices and won't fire real boundary events,
// so we inject a fake speechSynthesis (+ SpeechSynthesisUtterance) that drives
// onstart → onboundary(per word) → onend. This exercises the REAL engine, hook,
// transport, and reader highlighting end to end — and, in a second pass with no
// boundaries, the sentence-level fallback notice.

import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { launchExtension, SHOTS } from './launch.mjs';

let failures = 0;
const check = (name, cond, extra = '') => {
  const ok = Boolean(cond);
  if (!ok) failures++;
  console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ` — ${extra}` : ''}`);
};

const PANEL = 'src/sidepanel/index.html';

// Installed in the page before any app code runs.
function installFakeSpeech(opts) {
  function FakeUtter(text) {
    this.text = text;
    this.rate = 1;
    this.voice = null;
    this.onstart = null;
    this.onend = null;
    this.onerror = null;
    this.onboundary = null;
  }
  Object.defineProperty(window, 'SpeechSynthesisUtterance', {
    configurable: true,
    writable: true,
    value: FakeUtter,
  });
  const voices = [
    { voiceURI: 'fake-1', name: 'Fake Voice', lang: 'en-US', default: true },
  ];
  const synth = {
    _paused: false,
    getVoices: () => voices,
    addEventListener: () => {},
    removeEventListener: () => {},
    speak(u) {
      setTimeout(() => {
        u.onstart && u.onstart();
        if (!opts.fireBoundaries) {
          setTimeout(() => u.onend && u.onend(), 40);
          return;
        }
        const starts = [];
        const re = /\S+/g;
        let m;
        while ((m = re.exec(u.text))) starts.push(m.index);
        let i = 0;
        const step = () => {
          if (synth._paused) return setTimeout(step, 50);
          if (i < starts.length) {
            u.onboundary && u.onboundary({ name: 'word', charIndex: starts[i] });
            i++;
            setTimeout(step, 120);
          } else {
            u.onend && u.onend();
          }
        };
        step();
      }, 10);
    },
    cancel() {},
    pause() {
      this._paused = true;
    },
    resume() {
      this._paused = false;
    },
  };
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    get: () => synth,
  });
}

const txtFile = (text) => ({
  kind: 'file',
  name: 'reading.txt',
  mime: 'text/plain',
  size: text.length,
  dataBase64: Buffer.from(text, 'utf-8').toString('base64'),
});

const TEXT =
  'The first sentence has several words to highlight. ' +
  'A second sentence follows right after. ' +
  'And a third sentence ends the passage.';

const run = async () => {
  mkdirSync(SHOTS, { recursive: true });

  // ── Pass 1: word-level highlighting ──────────────────────────────
  {
    const { context, openPage, seedHandoff } = await launchExtension();
    await context.addInitScript(installFakeSpeech, { fireBoundaries: true });

    const seeder = await openPage(PANEL);
    await seedHandoff(seeder, txtFile(TEXT));
    const panel = await openPage(PANEL);
    await panel.waitForSelector('article.reader', { timeout: 15_000 });

    check(
      'transport shows the (fake) system voice',
      (await panel.locator('select[aria-label="Voice"]').innerText()).includes(
        'Fake Voice',
      ),
    );
    check(
      'play button present',
      (await panel.locator('button[aria-label="Play"]').count()) === 1,
    );

    // Play → a word should highlight (bg-accent on a word span).
    await panel.locator('button[aria-label="Play"]').click();
    await panel.waitForSelector('article.reader .bg-accent', { timeout: 10_000 });
    check('a word is highlighted during playback', true);
    check(
      'the active sentence is highlighted',
      (await panel.locator('article.reader .bg-accent-soft').count()) >= 1,
    );
    check(
      'play button became pause',
      (await panel.locator('button[aria-label="Pause"]').count()) === 1,
    );

    // Pause to freeze the highlight, then screenshot.
    await panel.locator('button[aria-label="Pause"]').click();
    await panel.waitForTimeout(150);
    const activeWord = await panel
      .locator('article.reader .bg-accent')
      .first()
      .innerText();
    check('paused holds an active word', activeWord.length > 0, activeWord);
    await panel.screenshot({ path: resolve(SHOTS, 'm4-highlight.png'), fullPage: true });

    // Skip to the next sentence (resume first so it's "playing").
    await panel.locator('button[aria-label="Play"]').click();
    const before = await activeSentenceId(panel);
    await panel.locator('button[aria-label="Next sentence"]').click();
    await panel.waitForTimeout(200);
    const after = await activeSentenceId(panel);
    check('next-sentence advances the highlight', after > before, `${before} -> ${after}`);

    await context.close();
  }

  // ── Pass 2: sentence-level fallback (no boundaries) ───────────────
  {
    const { context, openPage, seedHandoff } = await launchExtension();
    await context.addInitScript(installFakeSpeech, { fireBoundaries: false });
    const seeder = await openPage(PANEL);
    await seedHandoff(seeder, txtFile(TEXT));
    const panel = await openPage(PANEL);
    await panel.waitForSelector('article.reader', { timeout: 15_000 });
    await panel.locator('button[aria-label="Play"]').click();
    await panel.waitForSelector('text=highlights by sentence', { timeout: 10_000 });
    check('sentence-level fallback notice shown for boundary-less voice', true);
    await panel.screenshot({ path: resolve(SHOTS, 'm4-fallback.png'), fullPage: true });
    await context.close();
  }

  console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${failures} failing check(s)`);
  process.exit(failures === 0 ? 0 : 1);
};

/** The data-sentence-id of the currently highlighted sentence, or -1. */
async function activeSentenceId(panel) {
  return panel.evaluate(() => {
    const el = document.querySelector('article.reader .bg-accent-soft');
    return el ? Number(el.getAttribute('data-sentence-id')) : -1;
  });
}

run().catch((err) => {
  console.error('E2E harness error:', err);
  process.exit(1);
});
