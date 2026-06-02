// A fake window.speechSynthesis (+ SpeechSynthesisUtterance) for E2E.
// Headless Chromium has no system voices and won't fire boundary events, so we
// install this via context.addInitScript to drive onstart → onboundary → onend
// deterministically. With { fireBoundaries: false } it exercises the engine's
// sentence-level fallback path.
//
// Exported as a plain function so Playwright can serialize it into the page.
export function installFakeSpeech(opts) {
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
