// Milestone 8 E2E — multi-language: detection, auto-matched voice, RTL, and the
// "no voice → try Studio" nudge. Injects fake system voices in several
// languages; content language comes from chrome.i18n.detectLanguage (real).

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

// Fake speech with voices in en/fr/ar (no ja → exercises the nudge).
function installMultiLangSpeech() {
  const voices = [
    { voiceURI: 'en', name: 'Samantha', lang: 'en-US', default: true, localService: true },
    { voiceURI: 'fr', name: 'Thomas', lang: 'fr-FR', default: false, localService: true },
    { voiceURI: 'ar', name: 'Maged', lang: 'ar-SA', default: false, localService: true },
  ];
  function U(t) {
    this.text = t;
    this.rate = 1;
    this.onstart = this.onend = this.onerror = this.onboundary = null;
  }
  Object.defineProperty(window, 'SpeechSynthesisUtterance', {
    configurable: true,
    writable: true,
    value: U,
  });
  const synth = {
    getVoices: () => voices,
    addEventListener() {},
    removeEventListener() {},
    speak(u) {
      setTimeout(() => u.onend && u.onend(), 10);
    },
    cancel() {},
    pause() {},
    resume() {},
  };
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    get: () => synth,
  });
}

const file = (name, text) => ({
  kind: 'file',
  name,
  mime: 'text/plain',
  size: text.length,
  dataBase64: Buffer.from(text, 'utf-8').toString('base64'),
});

const FR =
  "Le thé est une boisson aromatique préparée en versant de l'eau chaude sur des feuilles séchées. " +
  "Après l'eau, c'est la boisson la plus consommée au monde. Selon la légende, il fut découvert en Chine ancienne.";
const AR =
  'الشاي مشروب عطري يُحضَّر بصب الماء الساخن على الأوراق المجففة. ' +
  'وهو ثاني أكثر المشروبات استهلاكًا في العالم بعد الماء. يُقال إنه اكتُشف في الصين القديمة.';
const JA =
  'お茶は、乾燥させた茶葉に湯を注いで作る香り高い飲み物です。' +
  '水に次いで世界で最も消費されている飲み物です。伝説によれば古代中国で発見されました。';

const run = async () => {
  mkdirSync(SHOTS, { recursive: true });
  const { context, openPage, seedHandoff } = await launchExtension();
  await context.addInitScript(installMultiLangSpeech);

  const boot = async (f) => {
    const seeder = await openPage(PANEL);
    await seedHandoff(seeder, f);
    const panel = await openPage(PANEL);
    await panel.waitForSelector('article.reader', { timeout: 15_000 });
    await panel.waitForTimeout(300);
    return panel;
  };

  // ── French: detected, French voice auto-selected, chip shows French ──
  const fr = await boot(file('le-the.txt', FR));
  check(
    'French detected → language chip shows French',
    (await fr.locator('button[aria-label="Language: French"]').count()) === 1,
  );
  check(
    'French content auto-selects the French voice (Thomas)',
    (await fr.locator('button[aria-label="Voice: Thomas"]').count()) === 1,
  );
  // grouped picker shows a "Recommended · French" section
  await fr.locator('button[aria-label^="Voice:"]').first().click();
  await fr.waitForSelector('text=Recommended · French', { timeout: 5_000 });
  check('voice picker has a Recommended · French group', true);
  await fr.screenshot({ path: resolve(SHOTS, 'm8-french.png'), fullPage: true });

  // ── Arabic: right-to-left reader ──
  const ar = await boot(file('shay.txt', AR));
  check(
    'Arabic detected → language chip shows Arabic',
    (await ar.locator('button[aria-label="Language: Arabic"]').count()) === 1,
  );
  check(
    'Arabic content renders right-to-left',
    (await ar.locator('article.reader').getAttribute('dir')) === 'rtl',
  );
  await ar.screenshot({ path: resolve(SHOTS, 'm8-arabic.png'), fullPage: true });

  // ── Japanese: no system voice → "try Studio" nudge ──
  const ja = await boot(file('ocha.txt', JA));
  check(
    'Japanese detected → language chip shows Japanese',
    (await ja.locator('button[aria-label="Language: Japanese"]').count()) === 1,
  );
  await ja.locator('button[aria-label^="Voice:"]').first().click();
  await ja.waitForSelector('text=try Studio', { timeout: 5_000 });
  check('no Japanese voice → picker nudges to Studio', true);
  await ja.screenshot({ path: resolve(SHOTS, 'm8-japanese.png'), fullPage: true });

  await context.close();
  console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${failures} failing check(s)`);
  process.exit(failures === 0 ? 0 : 1);
};

run().catch((err) => {
  console.error('E2E harness error:', err);
  process.exit(1);
});
