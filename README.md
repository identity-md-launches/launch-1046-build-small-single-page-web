# Poolwatch

A self-contained React + TypeScript module for exploring new Ethereum liquidity pool alerts. The finished static website is in **`dist/`**, with relative asset URLs. Source, exact dependency versions, lockfile, design documentation and validation evidence are included.

## What it does

- Replays illustrative pool events: one immediately, then one every six seconds while the demo runs. Pause at any time or add a single event.
- Applies the community rule: **at least one token is neither ETH nor WETH**. USDC/WETH qualifies; ETH/WETH does not. An optional stricter rule requires both tokens to be outside that set.
- Restricts matches by pool type, enables/disables alerts, and saves preferences locally when storage is available.
- Delivers matching events to the in-page inbox; supports delivery tests and marking alerts read.
- Searches token pairs, filters rule results and pool types, opens pool details, and downloads the filtered dataset as CSV.
- Adapts to phone and desktop widths, including an iframe.

**This is an offline demonstration, not a live Ethereum monitor.** The assignment prohibits external runtime requests. No chain source can be queried and no email or push alert can be sent under that constraint. The UI makes this boundary explicit. All pool records, IDs, liquidity amounts, fees and event times are illustrative; none represents a real pool or transaction. Symbols are sample labels, not token identity verification. There are no contract addresses, account settings, keys, wallet connections, signing flows, trackers or third-party scripts.

Rule changes affect future alerts. Feed match badges reflect the current rule even when delivery is disabled. Test notifications deliberately bypass the rule. Feed and alert arrays each retain at most 100 records; counters describe those retained records. The inbox displays its latest eight alerts; “Mark all read” also handles older retained alerts. Events and alerts reset on reload. Rules remain in `localStorage` under `poolwatch.settings.v1`, or only in memory when storage is blocked. No background worker or service worker runs; background browser tabs may throttle the demo timer.

## Install and rebuild

Use Node.js **24 or newer** and npm.

```sh
npm ci
npm run typecheck
npm run build
```

`npm run build` replaces `dist/` with the complete production export. Vite's `base` is `./`. The bundled font is the Latin DM Sans variable WOFF2; its license and React licenses are included in `dist/licenses/`. A fresh install requires network access; the exported application does not.

## Preview

```sh
npm run preview -- --host 127.0.0.1
```

Open the local URL printed by Vite. Serve the files over HTTP rather than opening `index.html` as `file://`, because the export uses JavaScript modules. Rebuild after source changes. The production Content Security Policy allows local scripts/styles/fonts and sets `connect-src 'none'`; there is no development server/HMR workflow in the scripts.

## Publish or embed

Publish **the contents of `dist/` together**, including `assets/`, `licenses/`, `favicon.svg` and `index.html`, to any static HTTP host. For example, placing them under `/poolwatch/` serves the page at `/poolwatch/`. Use an ending slash for the directory URL. No server rewrite, API, environment variable or deployment secret is needed. Keep `dist/` in the submission: the publisher serves this export without rebuilding.

A parent page can embed it with:

```html
<iframe
  title="Poolwatch liquidity pool demo"
  src="./poolwatch/"
  width="100%"
  height="900"
  sandbox="allow-scripts allow-same-origin allow-downloads"
></iframe>
```

The parent controls frame dimensions; content scrolls vertically inside it. JavaScript must be allowed. Downloads require `allow-downloads` when sandboxed. The documented sandbox was tested; persistent preferences depend on the host/browser's storage policy. Hosts with stricter policies may override the document CSP or block features. No parent messaging or auto-height integration is required. This is an application embedding example, not a security isolation boundary for untrusted code.

## Validate

```sh
npx playwright install chromium
npm run typecheck
npm run build
npm test
```

`tests/validate.mjs` runs model assertions and a bounded Playwright Chromium session against the actual `dist/` served at `/preview/`. The script starts and closes its own local server/browser, exercises the primary interactions, checks console/resource failures and external requests, runs axe scans, measures representative rendered text contrast, and writes screenshots plus `artifacts/checks.json`.

Actual final worker checks: TypeScript and production build passed; all 12 interaction/verification groups passed; zero detected axe violations at 320, 360, 560, 768 and 1200 CSS pixels; no document overflow at those widths; 14 measured text contrast pairs passed 4.5:1; zero observed application console errors, failed requests or external runtime requests. The default, rule-dialog and keyboard-focus screenshots were visually reviewed. Details, source locations, fixes and coverage limitations are in [artifacts/validation.md](artifacts/validation.md). These are worker observations, not independent certification.

The worker installed tools and ran these commands in an identical temporary copy at `/tmp/poolwatch-build` with an npm cache and Playwright browser binaries under `/tmp`. This keeps dependency and cache directories out of the repository without changing ignore files. The resulting `dist/`, lockfile and evidence were copied back and checked against the final source. Do not submit `node_modules`, browser binaries, package caches or test downloads.

Not performed: Safari/Firefox, physical-device testing, native 200% browser zoom, a screen-reader session, exhaustive focus-ring contrast checks, or prolonged background-tab behavior. Live chain monitoring and external notification delivery are intentionally absent under the no-network constraint.

## Source map and credits

- `src/App.tsx`: interface, event replay, alerts and dialogs.
- `src/model.ts`: sample records, rule logic, storage validation and CSV serialization.
- `src/styles.css`: tokens, local font, components and responsive layout.
- `src/Icon.tsx`: local decorative SVG icons and original wordmark symbol.
- `DESIGN.md`: final implemented design system.
- `artifacts/`: review, test output and screenshots; no dependency archives.

The design review applies the pinned Better Interface guide, adapted from Jakub Krehel's Better Interface (MIT, commit `267330e1adfc66a718fb65fa6918c1f06d0a689e`). The design-document method is adapted from Paul Bakaus's Impeccable (Apache-2.0, commit `9d715cc4f5564a990ca8345abfdd5df6dc9b41c8`). Attribution and the supplied license texts are retained in `artifacts/design-guidance-LICENSE.txt`; the implementation and documentation are original adaptations for this assignment, not copies of those guides. DM Sans is distributed under SIL OFL 1.1. Runtime dependency notices are in `public/licenses/` and the export.
