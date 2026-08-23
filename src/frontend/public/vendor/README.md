# Vendored scripts

Self-hosted rather than loaded from a CDN, to keep the "no external calls" promise
(see the main README). Loaded on demand only when the document scanner opens
(see `src/lib/scanner.ts`) — never part of the main app bundle.

- `opencv.js` — from npm `@techstark/opencv-js` v5.0.0-release.1, `dist/opencv.js`.
  License: Apache-2.0 (`licenses/opencv-js-LICENSE.txt`).
- `jscanify.js` — from npm `jscanify` v1.4.3, `src/jscanify.js` (the plain browser
  build; not the Node.js entrypoint, which depends on `canvas`/`jsdom`).
  License: MIT (`licenses/jscanify-LICENSE.txt`).

To update either: `npm pack <package>`, extract, and copy the file back in —
these aren't installed as regular npm dependencies since both are meant to be
loaded as plain scripts, not bundled by Vite.
