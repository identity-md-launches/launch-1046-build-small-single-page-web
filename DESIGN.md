# Poolwatch design system

## Overview

Poolwatch is a compact, English-only dashboard for exploring liquidity pool alerts. It uses a pale gray workspace, white data surfaces, dark ink, and a restrained burnt-orange action color. The title and one primary replay control lead into a visible offline-demo disclosure, three session counters, the pool feed, the inbox and the current rule. The dark explanatory card is a supporting illustration, not a second theme.

The implemented system lives in `src/styles.css`; interface patterns and named components live in `src/App.tsx`. The desktop and phone screenshots in `artifacts/` show the delivered export. All data is explicitly illustrative. Preserve that distinction in new views and exports.

## Colors

The `:root` block in `src/styles.css` uses hexadecimal neutral, orange and green primitives, then semantic roles. Reuse the roles for equivalent UI work.

| Semantic token | Resolved value | Use |
| --- | --- | --- |
| `--color-page` | `#f6f7f9` | Workspace canvas |
| `--color-surface` | `#ffffff` | Panels, controls and sidebar |
| `--color-inset` | `#fbfcfd` | Quiet nested surfaces and headers |
| `--color-text` | `#202736` | Main text |
| `--color-muted` | `#646c7a` | Supporting text |
| `--color-border` | `#e3e6eb` | Structural separation |
| `--color-control-border` | `#858b98` | Control boundaries |
| `--color-hover` | `#eef0f3` | Neutral hover and count badges |
| `--color-accent` | `#c34222` | Primary action, selected navigation and filters |
| `--color-accent-hover` | `#a93619` | Primary hover, demo label |
| `--color-accent-subtle` | `#fff5ee` | Selected rule/navigation and demo disclosure |
| `--color-accent-tint` | `#ffe7d8` | Orange borders and decorative bars |
| `--color-success` | `#28704d` | Match and enabled statuses |
| `--color-success-subtle` | `#edf7f1` | Match badges and alert icons |
| `--color-focus` | `#385dc4` | Keyboard outline |
| `--color-inverse` | `#ffffff` | Primary button and dark-card text |
| `--color-dark-surface` | `#171f2e` | Explanatory card |
| `--color-dark-muted` | `#bdc4cf` | Dark-card supporting text |
| `--color-dark-line` | `#394252` | Dark-card structure and decorative orbits |

Token avatar swatches are decorative category colors, declared in `.token-*`; adjacent text carries the actual symbol. The bell illustration also has local blue, violet and peach swatches. These are not additional action/status colors. Status always includes text or an icon; color alone is insufficient.

Measured rendered pairs include white on primary orange **5.09:1**, muted copy on the page **4.94:1**, green on pale green **5.46:1**, and dark-card supporting copy **9.40:1**. See `artifacts/checks.json` for all 14 measured pairs. These numbers do not cover every possible state or outline.

## Typography

`@font-face` loads only the local Latin `dm-sans-latin-wght-normal.woff2` from `@fontsource-variable/dm-sans`. The actual font supports normal weights 100–1000. The family is `'DM Sans Variable'`, with `-apple-system`, `BlinkMacSystemFont`, `'Segoe UI'`, then `sans-serif` fallbacks. No remote font service or italic face is used. Font synthesis is disabled; smoothing is set on the root. The browser validation confirmed the font loaded.

Root text is 16px at 1.5 line height. The interface deliberately uses a denser scale:

| Token / role | Size and treatment |
| --- | --- |
| `--text-xs` | 12px captions and metadata |
| `--text-sm` | 13px labels, controls and rule text |
| `--text-body` | 14px UI descriptions |
| `--text-base` | 16px baseline |
| `--text-section` | 16px, weight 650, line height 1.4 |
| `--text-title` | 34px, weight 650, line height 1.2, tracking −1.25px |
| `.stat-value` | 34px, weight 550, line height 1.3, tracking −1px |
| `.brand` | 23px, weight 750, tracking −1px |
| `.signal-card h2` | 23px, weight 500, line height 1.25 |

Small badges/overlines use 11px in limited places. Body text is weight 400; controls use 500–550; important labels use 600. Headings use `text-wrap: balance`; descriptions use `text-wrap: pretty`. Numeric counters, amounts and event times use tabular figures. Long rule-detail values and empty search text wrap instead of being truncated. The explanatory paragraphs fit within a 540px dialog or narrow supporting column.

At 752px and below inputs/selects are at least 16px, buttons at least 44px tall. The page title becomes 31px, then 29px at 560px; phone counters are 28px. The dark card heading becomes 26px on the narrowest layout. No animation changes typography.

## Layout

Spacing variables `--space-1` through `--space-10` map to 4, 8, 12, 16, 20, 24, 32 and 40px (only the named steps in source exist). Components also use local optical offsets. Major panel gaps are 20–26px; within-control gaps are generally 5–12px.

At 1200px, `.app-shell` has a 204px sidebar plus a flexible workspace. `main` has 32px inline padding and a 1450px maximum width. `.stats` has three equal columns with 16px gaps. `.dashboard-grid` has a flexible feed/inbox column and a 264px rule column, separated by 22px. DOM order is feed, inbox, then supporting rule content, which matches the stacked reading order.

| Breakpoint | Implemented adaptation |
| --- | --- |
| At least 90rem / 1440px | Sidebar 230px, main inline padding 40px, rule column 290px; data columns expand |
| At most 73rem / 1168px | Sidebar 178px; main padding 24px; rule column 240px; pool type moves out of the compact row, remaining available in details |
| At most 62rem / 992px | Sidebar becomes a top navigation strip; the workspace is a `minmax(0,1fr)` column |
| At most 47rem / 752px | Navigation wraps above the breadcrumb; dashboard stacks; support cards briefly share two columns; text fields become 16px |
| At most 35rem / 560px | 16px page margins, equal navigation cells without decorative icons, full-width primary action, stacked counters and support cards; pool rows become labeled cards |

At phone widths each pool keeps its pair, result, type, sample liquidity, creation time and details action. There is no horizontal scrolling. The inbox follows the feed, ahead of the supporting rule card. All content scrolls with the document; the toast is the only fixed application panel. Dialog height is limited to the viewport and scrolls internally.

No document overflow was measured at 320, 360, 560, 768 or 1200 CSS pixels. Desktop and mobile screenshots were visually inspected. Native 200% zoom and physical-device behavior were not verified; the 1440px expansion was reviewed in source only.

## Elevation & Depth

Panels are flat white surfaces with 1px structural borders. Nested rule definitions use the inset surface. Shadows are reserved for the toast (`0 6px 32px #1720311f`) and modal (`0 20px 80px #10182933`). The modal uses the native top layer with a `#151d2c80` backdrop. The toast has z-index 20; the keyboard skip link has z-index 100. Native modal modality keeps background content inert.

## Shapes

`--radius-control` is 7px and `--radius-card` is 12px. Badges use 4–5px, nested panels 8–9px, the brand mark 10px, the empty-state icon 14px and modal 18px. Token avatars, orbit decoration and status dots are circular. Controls have visible boundaries; table separators communicate row grouping rather than elevation.

## Components

- **`Button` (`src/App.tsx`)** accepts ordinary button attributes, optional `icon`, and `primary`. Default is a bordered neutral button; primary is solid orange. It supports hover, active, keyboard focus and native disabled states. Use one emphasized action per task context.
- **`Icon`, `Mark`, `Ethereum` (`src/Icon.tsx`)** are locally authored inline SVG. Icons use `currentColor`, 1.7px strokes and an 18px default size. SVGs are decorative and hidden from accessibility APIs; text or an accessible button label supplies meaning.
- **`Token` / `Pair` (`src/App.tsx`)** pair decorative initials/symbols with selectable token text and a fee caption. Do not substitute an avatar for the textual token identity.
- **`.panel` / `.panel-header` (`src/styles.css`)** group related content with a title, explanation and optional action. Reuse for feed, inbox and rules.
- **Feed pattern (`src/App.tsx`)** uses table/row/cell roles, native pressed-state filter buttons, a labeled search field and native type select. Empty results explain recovery and offer “Clear filters.” Export is disabled when the filtered dataset is empty. “Show more” reveals additional records.
- **`Dialog` (`src/App.tsx`)** uses native `showModal()`, an accessible title, explicit close button, Escape handling, backdrop dismissal and return to the trigger. Focus restoration was tested. `RuleEditor` keeps unsaved settings in a draft and uses native radios, a checkbox switch and select.
- **Alert pattern (`src/App.tsx`)** has match/test labels, timestamps, unread/read states and a test action. A persistent, initially empty `role="status"` node announces action feedback. Notices remain until dismissed or replaced; no automatic dismissal hides a required action.

There are no remote loading states, account forms or validation errors because this module has no network/input-dependent workflow. Storage denial is a supported session-only state. Reduced-motion mode has no button transitions. Otherwise buttons use a 150ms `cubic-bezier(0.2,0,0,1)` transition and scale to 0.96 on press. No decorative element autoplays. Hover styling is restricted to hover-capable devices. Focus uses a 3px outline with 3px offset; the dark-card action uses white, and forced-colors mode uses `Highlight`.

## Do's and Don'ts

- Start an additional view with the existing workspace, `.panel` and `.panel-header` patterns. Keep its most useful action near its heading and its explanation within the same group.
- Reuse semantic color roles and the existing font. Add only a role that an implemented component actually needs.
- Keep sample data labeled in UI, details and downloads. Do not add a live status, invented address or real-time claim without changing the product's actual capabilities.
- Keep token filtering separate from alert delivery state. Use `matchesRule` for match logic and the enabled setting for delivery.
- Use native buttons, radios, selects and dialogs; preserve labels, visible focus and mobile hit areas. Add a useful empty/recovery state alongside new filters.
- Do not introduce remote images/fonts, third-party scripts, wallet controls, additional themes or elaborate animation into this static module.
