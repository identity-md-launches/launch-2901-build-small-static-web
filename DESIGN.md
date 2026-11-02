# Squeekchain interface system

## Overview

This is a public economy dashboard for newcomers and people checking Squeekchain’s Sepolia deployment. Its visual idea is a small instrument panel: warm paper, dark ink, a single orange action, and a quiet hamster-wheel drawing. Numbers and refresh come first; explanation and contract provenance follow.

The source of truth is `src/styles.css`, with page patterns in `src/App.tsx` and artwork in `src/components/Icon.tsx`. This document describes the final implementation, including the responsive and enlarged-text corrections. It does not define an official Squeekchain brand system.

## Colors

CSS uses hex primitives and semantic aliases in `src/styles.css:4`. Components consume semantic roles, apart from the small SVG artwork and status-dot colors.

| Semantic token | Implemented value | Role |
| --- | --- | --- |
| `--color-page` | `#f7f6f2` | Page and header background |
| `--color-surface` | `#fffefa` | Supply and secondary metric surfaces |
| `--color-surface-subtle` | `#eeeee6` | Newcomer guide, disabled action, progress track |
| `--color-text` / `--color-dark` | `#252a24` | Main text and dark round surface |
| `--color-muted` | `#646a60` | Descriptions, labels, secondary icons |
| `--color-border` | `#dedfd5` | Structural separators and outlines |
| `--color-accent` | `#e96b35` | Primary refresh fill and supply fill |
| `--color-accent-hover` | `#ee7842` | Refresh hover on hover-capable devices |
| `--color-accent-text` | `#252a24` | Text and icon on the primary action |
| `--color-link` / `--color-focus` | `#923911` | Brand punctuation and focus outline |
| `--color-on-dark` | `#f7f6f2` | Current-round heading and value |
| `--color-on-dark-muted` | `#c4c9b9` | Mining state caption |
| `--color-illustration` | `#87937b` | Decorative wheel lines |
| `--color-status` | `#41613b` | Successful API status, always paired with text |
| `--color-warning` / `--color-warning-soft` | `#7b471b` / `#fff1d9` | Delayed data and recoverable errors |

The light theme is intentional; there is no theme switch. The hamster illustration uses cream `#e6ddbb` and ink `#252a24`. Mining state dots use `#bbd1a7` or `#f2bd7b` with an explicit active/paused label.

Measured text contrasts: primary action 4.61:1 normally and 5.16:1 on final hover; muted text 5.15:1 on the page and 4.77:1 on the guide; primary light text 13.53:1 on the dark card; its muted caption 8.64:1; warning text 6.83:1 on its background. The rendered hover state and the applicable solid backgrounds were checked in Chromium. Further measurement coverage and limitations are in `artifacts/validation.md`.

## Typography

Both families are local WOFF2 files in `public/fonts/`; `@font-face` declarations are at `src/styles.css:1`. The production CSS rewrites the font URLs relative to its own location. Both faces were observed loaded in the browser.

- **DM Sans**, variable normal face, CSS range 100–1000; the interface uses only **400, 500, 600**. Fallback: Arial, sans-serif. It carries headings, prose, labels, and tabular headline numbers.
- **IBM Plex Mono**, normal 400. Fallback: Consolas, monospace. Used for full contract addresses, exact token amounts, release IDs, and step numbers, not explanatory prose.

| Token | Default size | Main role |
| --- | --- | --- |
| `--text-xs` | 0.75rem / 12px | Metadata, addresses, helper text |
| `--text-sm` | 0.875rem / 14px | Metric titles, controls, guide prose |
| `--text-base` | 1rem / 16px | Desktop introduction and base heading role |
| `--text-md` | 1.25rem / 20px | Section headings, phone secondary values |
| `--text-lg` | 1.75rem / 28px | Phone main heading, intermediate metric value |
| `--text-display` | 3rem / 48px | Desktop main heading and key numbers |

There are six sizes and three weights. The main heading is 600, line-height 1.12, tracking −0.045em; on phones it is 28px with −0.04em tracking. Section headings use 20px/1.3/600. Metric headings use 14px/1.5/500. Prose uses 1.5–1.6 line-height, with short captions at 12px. Numbers use `font-variant-numeric: tabular-nums`; exact values remain text, not images.

Headings use balanced wrapping. Prose uses `text-wrap: pretty`, with descriptions capped around 49–60ch and the snapshot explanation at 75ch. Addresses and exact values wrap anywhere without clipping or ellipses. Numeric precision belongs to `src/economy.ts`; typography never alters the underlying amount.

## Layout

The header, main, and footer share a **1280px outer maximum**. At desktop they have **40px inline padding**, producing a maximum 1200px content width. Space tokens are 4, 8, 12, 16, 20, 24, 32, 40, 48, and 64px. Actual grouping primarily uses 8–12px inside controls, 16–24px between related components, and 32–48px between sections.

Desktop metrics use `1.08fr 1fr .9fr`, with a 16px gap. The supply and guide use `1.08fr 1fr`, with a 32px gap. Contract rows are a shared aligned grid, not independent cards. Controls sit before the information they change. All content remains in normal document flow; there are no fixed overlays.

Implemented breakpoints in `src/styles.css:174`:

| Condition | Behavior |
| --- | --- |
| At least 1440px | Total-mined value uses 48px |
| At most 1090px | Main title reduces to 28px, panels use 24px padding, grids tighten |
| At most 820px | Navigation moves to its own row; round spans the metric grid; secondary metrics auto-fit with an 8.5rem minimum; supply and guide stack; contract rows reorganize |
| At most 560px | 20px page margins; refresh and auto-refresh share a row; secondary values use 20px; cards use 12px radii; addresses get their own full-width row and Copy remains beside the contract name |
| At most 359px | 16px page margins; decorative secondary icons hide; supply rows can stack |

The metric grid’s `minmax(min(100%,8.5rem),1fr)` adapts to enlarged text. The round’s content has an 8rem flex basis and its decorative wheel can wrap below it; the value is given room rather than clipped. Copy’s phone column uses `max-content`, allowing its label to grow. At 390 × 844, the product, refresh controls, round, mined count, and NFT count were all observed on the first screen.

Production checks covered 320, 390, 560, 820, 1090, and 1440px without horizontal overflow. At 200% root text size and 390px, the metrics stack and the full round number stays on one line. This is text enlargement, not a verified native browser zoom session. English is the implemented language; translated layouts and RTL are unverified.

## Elevation & Depth

The system is flat. There are **no box shadows**, gradients, blurred overlays, or floating panels. The current round uses a dark surface; the guide uses a quiet tonal surface; supply and secondary metrics have a single 1px structural border. Contract rows and disclosures use separators. Do not add nested card shells to existing sections.

## Shapes

- `--radius-sm: 8px`: buttons, network tag, notices.
- `--radius-md: 12px`: phone cards and panels.
- `--radius-lg: 16px`: desktop metric and information panels.
- 3px progress-track corners, circular 6px status dots, and a 24px outlined step marker.

The 38px brand SVG has its own rounded square. Decorative SVGs are hidden from accessibility APIs. No critical text container uses clipping or truncation.

## Components

These are page-local patterns, not a separately published component library.

| Pattern / source | Use and states |
| --- | --- |
| `App`, `src/App.tsx:133` | One-page composition, semantic header/nav/main/footer, skip link, top refresh controls, status and error notices |
| `Metrics`, `src/App.tsx:23` | Three metrics; accepts `data` and `loading`; loading/unknown states, genuine zero counts, active/paused mining caption |
| `Supply`, `src/App.tsx:48` | Lifetime-cap meter and native exact-amount disclosure; unknown data does not create a fake zero-valued meter |
| `NewcomerGuide`, `src/App.tsx:71` | Three ordered steps and an explicitly labeled official-docs link |
| `Contracts`, `src/App.tsx:84` | Full selectable addresses, Sepolia explorer links, supporting-contract disclosure, Copy/Copied states and persistent polite feedback; unbound identity gets explicit text |
| `Snapshot`, `src/App.tsx:117` | Native disclosure for source timestamps, safe block, processed round, release, API reference |
| `ExternalLink`, `src/App.tsx:15` | Native anchor, current-color arrow, new-tab notice in its accessible name |
| `Icon`, `HamsterMark`, `WheelIllustration`, `src/components/Icon.tsx` | One outlined current-color icon set; original static decorative artwork |
| `useEconomy`, `src/useEconomy.ts:5` | Requests, 30-second visible-page polling, pause, 12-second timeout, retry periods, cleanup, last-good-data retention and stale detection |

The one filled action is **Refresh now**. It becomes **Refreshing…** during a request and **Wait Ns** during a retry period. Copy buttons stay neutral. Native checkbox labels, buttons, and disclosure summaries provide keyboard activation. Focus uses a **3px `--color-focus` outline with a 4px offset**. Copy controls, summaries, navigation, and address rows target 44px height; refresh is at least 48px.

Dynamic connection/copy feedback uses polite status regions; errors use `role="alert"`. Status includes text rather than relying on color. Checkboxes are native and have a 44px-high associated label. The small visible checkbox glyph itself remains 16px.

No entrance animation runs. Hover/color transitions are 120ms with `cubic-bezier(.2,0,0,1)`. Press scales to 0.96, and the refresh icon rotates over 1.2s only while loading. All motion is inside `prefers-reduced-motion: no-preference`; reduced-motion feedback is static text. Forced-colors CSS preserves outlines and system-color indicators; a native assistive-technology session was not performed.

## Do’s and Don’ts

- Start another section on the `.page` alignment edges and use the existing type and space tokens.
- Use the orange filled button for the primary refresh action and neutral styles for secondary actions.
- Keep unknown data explicit and preserve provenance when displaying a last-known snapshot.
- Use `BigInt` formatting and API identities; keep complete addresses available and selectable.
- Keep the wheel illustration decorative. Do not turn it into a live-activity indicator without a verified telemetry source.
- Add a section with a semantic heading, then reuse `.section-heading`, `.section-description`, existing grids, and native disclosures. Recheck the first screen, narrow widths, text enlargement, focus, and any changed states.

The review evidence and remaining browser limitations are recorded separately in `artifacts/validation.md`. Attribution and license notices are in `NOTICE.md`.
