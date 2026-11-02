# Squeekchain dashboard

A small, static, read-only dashboard for Squeekchain on Ethereum Sepolia. The finished export is in **`dist/`**, alongside the React/TypeScript source and exact npm lockfile.

It reads [the public economy API](https://api.squeekchain.com/v1/economy/state) directly in the browser. There is no wallet connector, key, transaction, backend, analytics service, or build-time API snapshot.

## Install, preview, and rebuild

Use Node **22.18+ in the 22.x line, or 24+**, with npm.

```sh
npm ci
npm run dev
```

For the production export:

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

Open the local URL printed by Vite. Deploy the **contents of `dist/`** to any static HTTP host. Vite uses `base: './'`; scripts, styles, fonts, favicon, and share image use relative paths. Navigation is by page anchors, so gateway subpaths need no route rewrites. Rebuild and replace the whole export after source changes. Opening `index.html` with `file://` is not a supported preview.

No environment file or credential is needed. The single endpoint and timing settings live in `src/economy.ts`. Fonts and artwork are local; the API is the only external runtime request. Clipboard copying needs a secure context, normally HTTPS or localhost. If permission is denied, the full address remains selectable and the page explains how to copy it manually.

## What the numbers mean

| Dashboard item | API field |
| --- | --- |
| Current mining round | `lifecycle.currentRound` |
| Mining active/paused | `lifecycle.stage`, `lifecycle.paused` |
| Total SQK mined | `supply.miningMintedBaseUnits` |
| Live Squeeks | `nft.live` |
| Lifetime supply breakdown | `supply.totalMintedBaseUnits`, `capBaseUnits`, `unmintedCapacityBaseUnits` |
| Contracts | `identities.core`, `token`, `genesis`, `mining.proxy`, `staking.proxy`; supporting identities in a disclosure |
| Snapshot provenance | `generatedAt`, `chain.safeThroughBlock`, `safeBlockTimestamp`, `confirmations`, `release.id` |

Token math uses `BigInt` and the API’s 18 decimals. Main SQK counts show **whole tokens, truncated**; “View exact amounts” exposes all 18 decimal places. The cap percentage is truncated to two decimal places. Mined issuance is kept distinct from total minted, which can include preminting.

The API is an indexed, confirmation-delayed view of Sepolia, not instantaneous wheel activity. The page shows the safe block and timestamps under “About this snapshot.” The API-connected indicator describes the API read, not whether the hamster is running. The wheel drawing is decorative.

The page fetches on entry and every 30 seconds while visible. The checkbox pauses automatic reads; manual refresh remains available. Requests time out after 12 seconds, overlapping requests are prevented, and HTTP `Retry-After` is honored. A snapshot older than three minutes by API time **or safe-block time** is labeled delayed. Errors retain the last successful snapshot with a warning. Before any successful read, values say “Unavailable”; genuine zero counts display as zero. Unsupported schemas, inconsistent totals, invalid identities, and other networks are rejected.

## Validation performed

The worker ran the production build and typecheck successfully, **7 data tests**, **27 Chromium production checks**, and the pinned **taste@1 probe: 16/16 passed**. The production checks exercised `/preview/` hosting, refresh/loading, 30-second polling with a simulated clock, pause/resume, timeout, retry limits, copy success/failure, anchor navigation, disclosures, unknown/zero states, stale snapshots, malformed responses, and recovery. Axe reported no violations in the tested successful and initial-error states at 320, 390, 560, 820, 1090, and 1440 pixels. A separate 200% text-size check passed without horizontal overflow or splitting the round number.

Live API reads and actual clipboard copying were also checked manually in the supplied Chromium browser. The product and refresh action are visible on the first 390 × 844 screen. See [the review and actual limitations](artifacts/validation.md), [mobile screenshot](artifacts/mobile.png), [desktop screenshot](artifacts/desktop.png), and [design system](DESIGN.md).

**Limitations:** WebKit could not launch because its browser runtime dependencies were unavailable, so Safari/WebKit behavior is unverified. No physical-device, native browser zoom, or screen-reader session was performed. Automated text enlargement is not native zoom. Social metadata and the 1200 × 630 share image were checked locally; an external platform’s unfurl was not tested because the final hosting origin is assigned later. Clipboard permission and future API availability depend on the visitor’s browser and the public service. No data, addresses, or check results were fabricated; test-only alterations of the recorded response are isolated from production.

Dependencies and browser downloads were installed in a temporary build mirror outside the repository to respect its restricted dependency paths. The mirror used the delivered source and lockfile; its build wrote directly to the delivered `dist/`. No dependency directory or cache is included.

To rerun browser validation on a machine with the runtimes available:

```sh
npx playwright install chromium webkit
npm run test:browser
```

This bounded foreground runner serves `dist/` under `/preview/` and closes its server and browsers when finished. It writes disposable evidence to `test/scratch/production/`. An engine that cannot launch is explicitly recorded as unverified, and no available engine is an error. Test fixtures are recorded public API data; mocked timestamps and failure responses are only used by these tests. To regenerate the share PNG from its source SVG, install Chromium and run `npm run social-card`, then rebuild.

## Sources and notices

The field definitions and availability handling follow [the official API reference](https://docs.squeekchain.com/developers/api/). The newcomer explanation follows [What is Squeekchain?](https://docs.squeekchain.com/start/overview/). Contract addresses are always read from the current API response rather than copied from an older deployment page. The site makes no claim of a mainnet deployment, token price, or return.

Design guidance, font licenses, and original-asset notices are recorded in [NOTICE.md](NOTICE.md). Run `node scripts/check-export.mjs` after the documentation and screenshots exist to verify required paths, assets, metadata, lockfile consistency, and the 8 MiB delivery budget.
