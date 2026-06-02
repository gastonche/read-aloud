// A fake window.Audio for E2E. Headless Chromium won't actually play a data-URL
// audio clip or reliably advance currentTime, so we override Audio with a clock
// that advances currentTime after play() and fires 'ended' at the end. The
// ElevenLabsEngine samples currentTime via requestAnimationFrame, so this drives
// real timestamp-based highlighting. Installed via context.addInitScript.
export function installFakeAudio(opts) {
  const duration = opts?.duration ?? 1.2;
  class FakeAudio {
    constructor() {
      this.currentTime = 0;
      this.playbackRate = 1;
      this._src = '';
      this._listeners = {};
      this._timer = null;
      this.error = null;
    }
    set src(v) {
      this._src = v;
    }
    get src() {
      return this._src;
    }
    addEventListener(type, cb) {
      (this._listeners[type] = this._listeners[type] || []).push(cb);
    }
    _emit(type) {
      (this._listeners[type] || []).forEach((f) => f());
    }
    play() {
      clearInterval(this._timer);
      this._timer = setInterval(() => {
        this.currentTime += 0.04 * this.playbackRate;
        if (this.currentTime >= duration) {
          clearInterval(this._timer);
          this._emit('ended');
        }
      }, 40);
      return Promise.resolve();
    }
    pause() {
      clearInterval(this._timer);
    }
  }
  Object.defineProperty(window, 'Audio', {
    configurable: true,
    writable: true,
    value: FakeAudio,
  });
}
