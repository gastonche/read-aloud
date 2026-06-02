import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json';

/**
 * MV3 manifest for ReadAloud.
 *
 * Surfaces:
 *  - action.default_popup  → the two-choice chooser (popup document)
 *  - side_panel            → the single playback surface (side panel document)
 *  - background.service_worker → message router; owns sidePanel.open()
 *  - content_scripts       → Readability extraction, injected on demand [M2]
 *
 * Permissions rationale:
 *  - sidePanel : open and render the side panel
 *  - storage   : chrome.storage.session handoff (popup → side panel)
 *  - activeTab : read the active tab's content for "Read this page"
 *  - scripting : programmatic content-script injection fallback [M2]
 */
export default defineManifest({
  manifest_version: 3,
  name: 'ReadAloud',
  version: pkg.version,
  description: pkg.description,

  action: {
    default_title: 'ReadAloud',
    default_popup: 'src/popup/index.html',
  },

  side_panel: {
    default_path: 'src/sidepanel/index.html',
  },

  background: {
    service_worker: 'src/background/service-worker.ts',
    type: 'module',
  },

  // Readability extraction. Declared so it's present on pages loaded with the
  // extension installed; the SW also injects it on demand as a fallback for
  // pages that predate installation. Listener-only until asked to extract.
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/extract.ts'],
      run_at: 'document_idle',
    },
  ],

  permissions: ['sidePanel', 'storage', 'activeTab', 'scripting'],

  // Broad host access so "Read this page" works anywhere the user is.
  host_permissions: ['<all_urls>'],

  icons: {
    16: 'public/icons/icon-16.png',
    32: 'public/icons/icon-32.png',
    48: 'public/icons/icon-48.png',
    128: 'public/icons/icon-128.png',
  },
});
