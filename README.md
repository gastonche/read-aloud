# ReadAloud

> Listen to any web page or document, with the words highlighted as they're spoken.

A Speechify-style **Manifest V3** Chrome extension: it reads the current page or
an uploaded file (PDF / TXT, with EPUB / DOCX as fast-follows) aloud with
real-time word + sentence highlighting, adjustable speed, voice selection, two
selectable TTS engines (free system voices or premium neural voices), and an
optional AI "TL;DR" summary.

> **Status:** under active construction, built milestone by milestone.
> ✅ **M1 — scaffold + plumbing** (popup ↔ service worker ↔ side panel handshake
> and file handoff) is complete and verifiable. Features land in later milestones.

---

## Monorepo layout (Turborepo)

```
read-aloud/
├── apps/
│   ├── extension/   # Vite + CRXJS MV3 extension (React + Tailwind)
│   └── worker/      # Cloudflare Worker (Hono) — TTS proxy + summarizer [M5]
├── packages/
│   └── shared/      # @readaloud/shared — HTTP contract shared by both sides
└── turbo.json       # task orchestration (build / typecheck / dev)
```

## Dev setup

Requires Node ≥ 20 and npm ≥ 10 (developed on Node 25 / npm 11).

```bash
npm install        # installs all workspaces
npm run typecheck  # tsc --noEmit across every workspace
npm run build      # builds the extension to apps/extension/dist
npm run dev        # CRXJS dev server with HMR (for iterating)
```

## Load the extension in Chrome (dev)

1. `npm run build` (or `npm run dev` for hot reload).
2. Open `chrome://extensions`.
3. Toggle **Developer mode** on (top-right).
4. Click **Load unpacked** and select **`apps/extension/dist`**.
5. Pin **ReadAloud** to the toolbar and click it.

### Verifying Milestone 1

The popup shows a two-choice chooser:

- **Read this page** → stages `{kind:'page', tabId}`, asks the service worker to
  open the side panel for the active tab, then closes. The side panel boots and
  displays the received tab id + title (the handshake).
- **Upload a file** → drag-and-drop or browse a PDF/TXT. The popup reads it to an
  `ArrayBuffer`, base64-encodes it into `chrome.storage.session`, opens the side
  panel, and closes. The panel decodes the bytes and shows
  **name / MIME / size / decoded size** with a **✓ bytes match** check — proving
  the file survived the handoff intact. Files over 6 MB show a graceful error.

> Both flows converge on the side panel as the single playback surface — exactly
> where extraction, parsing, and TTS get wired in next.

## Architecture (so far)

The riskiest plumbing was built and verified first: the **popup → service worker
→ `sidePanel.open()` → side-panel boot** handshake, and the **file handoff**.

- The **popup owns no long-lived state.** It stages a "pending source" into
  `chrome.storage.session` and asks the service worker to open the panel, then
  closes immediately.
- The **service worker** is the only caller of `chrome.sidePanel.open()`, invoked
  inside the forwarded user gesture (it opens before awaiting anything else).
- The **side panel pulls** its pending source on boot rather than receiving a
  push — this removes the race where the SW messages a panel document that
  doesn't exist yet.

See [`apps/extension/src/messaging/contract.ts`](apps/extension/src/messaging/contract.ts)
for the full, typed message contract.

---

_Roadmap, dual-engine highlighting writeup, mermaid diagram, and cost notes land
with the corresponding milestones._
