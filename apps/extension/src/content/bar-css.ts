/** Styles for the floating bar, injected into its Shadow DOM (isolated). */
export const BAR_CSS = `
:host { all: initial; }
* { box-sizing: border-box; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }

.bar {
  position: fixed; z-index: 2147483647;
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 8px 6px; border-radius: 9999px;
  background: #ffffff; border: 1px solid #e2e8f0;
  box-shadow: 0 10px 34px rgba(15,23,42,.20);
}
.bar button { border: none; background: transparent; cursor: pointer; padding: 0; color: #475569; }

.grip { width: 28px; height: 18px; display: flex; align-items: center; justify-content: center; color: #cbd5e1; cursor: grab; touch-action: none; }
.grip:active { cursor: grabbing; }
.grip svg { width: 16px; height: 16px; fill: currentColor; }

.chip { font-size: 10px; font-weight: 700; color: #6366f1; border: 1px solid #e2e8f0 !important; border-radius: 9999px; padding: 2px 6px; }

.playwrap { position: relative; width: 46px; height: 46px; }
.ring { position: absolute; inset: 0; transform: rotate(-90deg); }
.ring-bg { fill: none; stroke: #e2e8f0; stroke-width: 3; }
.ring-fg { fill: none; stroke: #6366f1; stroke-width: 3; stroke-linecap: round; transition: stroke-dashoffset .2s linear; }
.playwrap .play { position: absolute; inset: 4px; border-radius: 9999px; background: linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; display:flex; align-items:center; justify-content:center; }
.play svg { width: 20px; height: 20px; fill: #fff; }
.play:active { transform: scale(.94); }

.icon { width: 28px; height: 28px; border-radius: 9999px; display:flex; align-items:center; justify-content:center; }
.icon:hover { background: #f1f5f9; color:#0f172a; }
.icon svg { width: 16px; height: 16px; fill: currentColor; }
.close { color:#94a3b8; }

.pill { font-size: 11px; font-weight: 700; color: #6366f1; border: 1px solid #e2e8f0 !important; border-radius: 9999px; padding: 3px 6px; min-width: 34px; }

.voicebtn { width: 32px; height: 32px; border-radius: 9999px; overflow: hidden; }
.avatar { border-radius: 9999px; display: block; background: #f1f5f9; }
.avatar-empty { width: 28px; height: 28px; border-radius: 9999px; background: #e2e8f0; display:block; }

.count { font-size: 9px; color: #94a3b8; font-variant-numeric: tabular-nums; }

/* Popovers, opening to the side of the bar */
.pop { position: absolute; top: 50%; transform: translateY(-50%); background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 12px 34px rgba(15,23,42,.20); padding: 10px; }
.pop-left { right: calc(100% + 10px); }
.pop-right { left: calc(100% + 10px); }

.pop-val { text-align:center; font-size:11px; font-weight:700; color:#6366f1; margin-bottom:6px; }
.slider { position: relative; width: 26px; height: 120px; border-radius: 9999px; background:#e2e8f0; cursor: pointer; touch-action: none; }
.slider .fill { position:absolute; left:0; right:0; bottom:0; border-radius: 9999px; background: linear-gradient(to top,#6366f1,#a78bfa); }

.pop-voice { width: 248px; }
.seg { display:flex; background:#f1f5f9; border-radius:10px; padding:3px; gap:3px; margin-bottom:8px; }
.seg-btn { flex:1; font-size:12px; font-weight:600; color:#64748b; border-radius:7px; padding:5px 0; }
.seg-btn.on { background:#fff; color:#0f172a; box-shadow:0 1px 2px rgba(15,23,42,.12); }
.nudge { display:block; width:100%; text-align:left; background:#eef2ff; color:#4f46e5; border-radius:10px; padding:7px 9px; font-size:11px; margin-bottom:6px; }
.voice-list { max-height: 260px; overflow-y: auto; display:flex; flex-direction:column; gap:2px; }
.voice-row { display:flex; align-items:center; gap:9px; padding:6px 7px; border-radius:11px; text-align:left; width:100%; }
.voice-row:hover { background:#f8fafc; }
.voice-row.on { background:#eef2ff; }
.voice-meta { flex:1; min-width:0; display:flex; flex-direction:column; }
.voice-name { font-size:13px; font-weight:600; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.voice-desc { font-size:11px; color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.tick { color:#6366f1; font-weight:700; }

.pop-err { width: 220px; font-size: 11px; line-height: 1.4; color: #b91c1c; background: #fef2f2; border-color: #fecaca; }
.pop-note { width: 220px; font-size: 11px; line-height: 1.4; color: #b45309; background: #fffbeb; border-color: #fde68a; }

.pop-lang { width: 168px; max-height: 280px; overflow-y:auto; display:flex; flex-direction:column; gap:2px; }
.lang-item { display:flex; justify-content:space-between; align-items:center; padding:7px 9px; border-radius:9px; font-size:12px; color:#0f172a; text-align:left; }
.lang-item:hover { background:#f8fafc; }
.lang-item.on { background:#eef2ff; color:#4f46e5; font-weight:600; }
`;
