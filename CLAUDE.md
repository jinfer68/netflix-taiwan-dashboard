# 影視數據儀表板 — Claude Code Instructions

## Project Overview

Netflix Taiwan drama rankings dashboard. A single-page React + TypeScript app rendered entirely via inline styles (no CSS framework). Data is loaded from `public/data/rankings.json` at runtime. Deployed as a static site under the `/netflix-taiwan-dashboard/` subpath via Vite.

---

## Figma MCP Integration Rules

These rules define how to translate Figma inputs into code for this project and must be followed for every Figma-driven change.

### Required Flow (do not skip)

1. Run `get_design_context` first to fetch the structured representation for the exact node(s)
2. If the response is too large or truncated, run `get_metadata` to get the high-level node map, then re-fetch only the required node(s) with `get_design_context`
3. Run `get_screenshot` for a visual reference of the node being implemented
4. Only after you have both `get_design_context` and `get_screenshot`, start implementation
5. Translate the output (usually React + Tailwind) into this project's inline-style conventions
6. Validate against Figma for 1:1 visual parity before marking complete

### Implementation Rules

- Treat the Figma MCP output (React + Tailwind) as a representation of design intent, not final code
- **Replace ALL Tailwind utility classes** with inline `React.CSSProperties` objects — this project uses zero CSS classes on components
- Reuse existing shared styles from `src/constants/styles.ts` (`SECTION_STYLE`, `SECTION_TITLE`, `TOOLTIP_STYLE`, `PILL_BTN`) instead of writing duplicate inline objects
- Use the project's color palette and genre color system consistently (see Color Tokens below)
- Strive for 1:1 visual parity with the Figma design
- Validate the final UI against the Figma screenshot for both look and behavior

### Asset Handling

- **IMPORTANT:** If the Figma MCP server returns a localhost source for an image or SVG, use that source directly
- **IMPORTANT:** DO NOT install new icon packages — and do not use emoji either; category identity is a colour dot plus a text label (see `DOT` in `src/constants/styles.ts`)
- **IMPORTANT:** DO NOT use or create placeholders if a localhost asset source is provided
- Static assets go in `public/`; there is currently no `public/assets/` subdirectory — create it if needed

---

## Design System Structure

The full rationale lives in [`docs/design-guidelines.md`](docs/design-guidelines.md) — read it before any visual change. The aesthetic is **editorial data journalism**: paper-white surface, ink type, hairline rules, no cards, no gradients, no shadows, no emoji, one small-area accent.

### 1. Color Tokens

**Global palette** (exported from `src/constants/styles.ts` — never introduce new hex values):

| Token | Value | Usage |
|---|---|---|
| `PAPER` | `#fcfcfb` | Page / chart surface |
| `PAPER_RAISED` | `#f5f4f1` | Sidebar, table headers, row hover |
| `INK` | `#1a1a18` | Primary text and numbers |
| `INK_SECONDARY` | `#55544f` | Secondary text, axis labels |
| `INK_MUTED` | `#8a8984` | Captions, disabled state |
| `RULE` | `#e3e1dc` | Hairline dividers, grid lines |
| `RULE_STRONG` | `#c9c7c0` | Section boundaries, axis lines, input borders |
| `ACCENT` | `#e50914` | Netflix red — logo, active state, selection only. **Never a data color** |
| `ACCENT_WASH` | `rgba(229,9,20,0.06)` | Selected row background |

**IMPORTANT:** The accent must stay under ~5% of any screen. It marks focus; it is not a theme color.

**Genre colors** (`GENRE_COLORS` in `src/constants/genres.ts`). The first eight are OKLab-validated: colorblind-separable in adjacent order, distinguishable to normal vision, ≥ 3:1 contrast on `PAPER`. The listed order is the fixed legend / stacking order — never re-sort by value.

| # | Genre | Color |
|---|---|---|
| 1 | 韓劇 | `#b3302b` |
| 2 | 美劇 | `#3568b0` |
| 3 | 陸劇 | `#b07d10` |
| 4 | 動畫劇 (日) | `#7b5cb8` |
| 5 | 日劇 | `#c4527e` |
| 6 | 台劇 | `#1f6f3f` |
| 7 | 實境秀 | `#c67612` |
| 8 | 英劇 | `#0d9488` |
| 9 | 其他 | `#9a9a94` |

Always import and use `GENRE_COLORS[genre]` — never hardcode genre colors inline. Color follows the entity: a filter that changes the series count must not repaint the survivors. `SERIES_COLORS` (same eight hues) drives multi-show comparison; `MAX_SERIES` caps selection at 8 — do not add a 9th generated hue.

### 2. Shared Style Constants (`src/constants/styles.ts`)

Always prefer these over writing equivalent inline objects:

```typescript
import {
  TOOLTIP_STYLE, SECTION_STYLE, SECTION_TITLE,
  SEGMENT_BTN, GENRE_TOGGLE, DOT, NUM, INPUT_STYLE,
} from './constants/styles'

// Section container / heading
<div style={SECTION_STYLE}><div style={SECTION_TITLE}>標題</div></div>

// Custom chart tooltip
<div style={TOOLTIP_STYLE}>

// Filter control — text segmented control, accent underline when active
<button style={SEGMENT_BTN(isActive)}>標籤</button>

// Multi-select with leading colour dot (filled = selected)
<button style={GENRE_TOGGLE(isActive)}><span style={DOT(color, isActive)} />韓劇</button>

// Every numeric value must align vertically
<span style={NUM}>{score}</span>
```

There are no pill buttons. `PILL_BTN` was removed — use `SEGMENT_BTN`.

### 3. Typography

**Font stack** (defined in `src/index.css` — do not modify):
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang TC', 'Microsoft JhengHei', sans-serif;
```

**Common type scales** (use these sizes consistently):

| Usage | Size | Weight | Color |
|---|---|---|---|
| Page title | 17px | 700 | `INK` |
| Section / group label | 12px | 700 + `letterSpacing: 1` | `INK_SECONDARY` |
| Data body, table cells | 13px | 400 | `INK` |
| Headline figures | 15–18px | 700 | `INK` |
| Chart axis, legend, caption | 11px | 400 | `INK_SECONDARY` / `INK_MUTED` |
| Tooltip content | 12–13px | 400 | `INK` |

**IMPORTANT:** Never introduce `rem`, `em`, or Tailwind typography classes — use `px` units in inline styles throughout.

Every number carries `NUM` (`fontVariantNumeric: 'tabular-nums'`) so columns align. Ranks 1–3 may be emphasised with weight and one size step — never with medal emoji or gold/silver/bronze colors.

### 4. Spacing & Layout

- Base unit: **4px**. Use multiples: 4, 8, 12, 16, 20, 24px
- Section padding: `16px 20px`; sections butt against each other separated by a 1px `RULE` — no card gaps
- Border radius: containers = `0`; tooltips and small marks = `2px` max
- Chart fixed heights: page chart area = `calc(100vh - 60px)`, pie row = `370px`
- Ranked content is tabular: aligned columns, `PAPER_RAISED` header row, 1px `RULE` between rows, `PAPER_RAISED` on hover, `ACCENT_WASH` + 2px left `ACCENT` border when selected

### 5. Icon System

**There is no icon system, and emoji are banned from the UI.** Category identity is an 8px colour square or dot plus a text label (`DOT` in `styles.ts`). Status marks use text symbols: `※`, `—`, `←`, `→`. Never add an icon library.

---

## Component Organization

```
src/
├── components/
│   ├── charts/       ← Data visualization components (Recharts / ECharts)
│   │   ├── Top20Chart.tsx
│   │   ├── TaiwanDramaChart.tsx
│   │   ├── GenreDistribution.tsx
│   │   ├── RankTrendChart.tsx
│   │   ├── WeeklyGenreFlow.tsx
│   │   └── QuickLookup.tsx
│   └── layout/       ← Shell components (Header, Sidebar navigation)
│       ├── Header.tsx
│       └── Sidebar.tsx
├── constants/
│   ├── styles.ts     ← Shared CSSProperties tokens (SECTION_STYLE, PILL_BTN, …)
│   └── genres.ts     ← GENRE_COLORS, GENRE_LABELS, SERIES_COLORS, MAX_SERIES
├── types/
│   └── index.ts      ← All TypeScript interfaces (RankingsData, Genre, …)
├── utils/
│   └── dataTransforms.ts  ← Pure data derivation functions
├── App.tsx           ← Root: state management + layout composition
├── main.tsx          ← React entry point
└── index.css         ← Global reset + font + scrollbar only
```

**New UI components** → place in `src/components/charts/` (data views) or `src/components/layout/` (shell).

**New utility functions** → place in `src/utils/dataTransforms.ts`.

**New type definitions** → add to `src/types/index.ts`.

**New style constants** → add to `src/constants/styles.ts`.

### Component Pattern

Every component follows this structure:

```typescript
import type { CSSProperties } from 'react'
import type { RankingsData } from '../../types'
import { SECTION_STYLE, SECTION_TITLE, SEGMENT_BTN } from '../../constants/styles'
import { GENRE_COLORS } from '../../constants/genres'

interface Props {
  data: RankingsData
  // ... other props
}

export default function MyComponent({ data }: Props) {
  return (
    <div style={SECTION_STYLE}>
      <div style={SECTION_TITLE}>標題</div>
      {/* ... */}
    </div>
  )
}
```

- **File naming:** PascalCase (e.g., `MyComponent.tsx`)
- **Export:** Always `export default function ComponentName()`
- **Props interface:** Defined as `interface Props` directly above the component
- **No named exports** for components (only for types/constants)

---

## Styling Approach

**This project uses inline `React.CSSProperties` exclusively.** There is no Tailwind, no CSS Modules, no styled-components, and no CSS-in-JS library.

### Rules

- **IMPORTANT:** All styles are inline objects typed as `CSSProperties` — never add a `className` to a component
- Reuse `SECTION_STYLE`, `SECTION_TITLE`, `TOOLTIP_STYLE`, `PILL_BTN` from `src/constants/styles.ts` before writing new style objects
- For dynamic/stateful styles, use factory functions like `PILL_BTN(active, accent)`
- For colors, always reference the palette above — never introduce new hex values
- For layout, use CSS Flexbox or CSS Grid via inline `display: 'flex'` / `display: 'grid'`
- Responsive design is not implemented — the app targets desktop only (fixed `height: 100vh`)

### Example

```typescript
// Correct ✓
<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
  <span style={{ fontSize: 13, color: '#aaa' }}>Label</span>
</div>

// Wrong ✗ — do not use className or CSS framework utilities
<div className="flex gap-2 items-center">
  <span className="text-sm text-gray-400">Label</span>
</div>
```

---

## Charting Libraries

| Library | Usage |
|---|---|
| **Recharts** `^2.13.3` | Bar, line, pie charts (`Top20Chart`, `TaiwanDramaChart`, `RankTrendChart`, `GenreDistribution`) |
| **ECharts** `^5.6.0` + **echarts-for-react** `^3.0.6` | Stream / river chart (`WeeklyGenreFlow`) |

- Always use `ResponsiveContainer` from Recharts for responsive bar/line charts
- For ECharts, pass options as a typed `EChartsOption` object to `ReactECharts`
- Never install additional charting libraries

### Chart Rules

1. **Recessive chrome.** Axis lines `RULE_STRONG`, tick text 11px `INK_SECONDARY`, `tickLine={false}`. Grid lines `RULE`, solid, and only the set perpendicular to reading direction (horizontal bars keep vertical grid only). No chart frame.
2. **Thin marks.** `barSize` 14, `radius` ≤ 2, solid genre fill, no gradients. Leave a 2px `PAPER` gap between adjacent or stacked fills.
3. **Lines** are 2px; dots hidden until hover (≥ 8px then). The rank axis stays reversed so #1 sits on top.
4. **Direct labels beat lookups.** Bar charts label the value at the bar end; line charts with ≤ 4 series label the show name at the line end.
5. **A legend is always present for ≥ 2 series** — an 8px colour square plus text, in a row above the plot. Never the library's default legend.
6. **One value axis.** Dual y-axes are forbidden; use two charts or index to a common base.
7. **Tooltips everywhere**, using `TOOLTIP_STYLE`: bold title, then label/value rows aligned left/right with `NUM` on the values.
8. **Text wears text tokens.** Values, labels and legends use the `INK` scale; identity is carried by the adjacent colour mark, never by coloured text.
9. Set `isAnimationActive={false}` — this is a reference tool, not a presentation.

---

## Data Architecture

- Runtime data source: `public/data/rankings.json` (fetched via `fetch(import.meta.env.BASE_URL + 'data/rankings.json')`)
- All data shapes are typed in `src/types/index.ts`; `RankingsData` is the root type
- Derived data is computed via `useMemo` in `App.tsx` using pure functions from `src/utils/dataTransforms.ts`
- State management: React `useState` / `useMemo` in `App.tsx` only — no external state library
- No API calls, no backend; this is a fully static, data-driven dashboard

---

## Frameworks & Build

| Tool | Version | Config |
|---|---|---|
| **React** | 18 | Functional components, hooks only |
| **TypeScript** | 5 (strict) | `tsconfig.app.json` — `noUnusedLocals`, `noUnusedParameters` enforced |
| **Vite** | 6 | `vite.config.ts` — base path `/netflix-taiwan-dashboard/` |

- No path aliases (`@/`) — use relative imports (e.g., `../../constants/styles`)
- Target: ES2020 / ESNext modules
- No testing framework is configured

---

## Project-Specific Conventions

- **Traditional Chinese UI:** All user-facing text is in Traditional Chinese (繁體中文). Keep it that way.
- **Tab system:** The app has three tabs — `'rankings'` (總排行榜), `'genre'` (類型分析), `'taiwan'` (台劇分析) — defined as `TabType` in `src/components/layout/Sidebar.tsx`
- **Year filter:** `YearFilter` (`'2025' | '2026' | 'all'`) is a global state in `App.tsx` passed down as a prop
- **No comments** unless the WHY is non-obvious. Do not add JSDoc blocks or multi-line comment sections
- **TypeScript strict:** Every new variable and function must be fully typed — no `any`, no implicit `any`
- **Unused imports/vars are compile errors** — clean them up before finishing any change
