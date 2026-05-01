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
- **IMPORTANT:** DO NOT install new icon packages — this project uses Unicode emoji for icons (see `GENRE_ICONS` in `src/constants/genres.ts`)
- **IMPORTANT:** DO NOT use or create placeholders if a localhost asset source is provided
- Static assets go in `public/`; there is currently no `public/assets/` subdirectory — create it if needed

---

## Design System Structure

### 1. Color Tokens

**Global palette** (use these hex values — never introduce new hardcoded colors):

| Token | Value | Usage |
|---|---|---|
| `bg-page` | `#0a0a16` | Page / app background |
| `bg-card` | `#111124` | Card / section background (`SECTION_STYLE`) |
| `bg-tooltip` | `#1a1a2e` | Tooltip background (`TOOLTIP_STYLE`) |
| `border-default` | `#222` | Default borders |
| `border-subtle` | `#1e1e30` | Subtle dividers |
| `border-section` | `#2a2a3e` | Section title bottom border |
| `text-primary` | `#eee` | Primary text |
| `text-muted` | `#aaa` | Muted / secondary text |
| `text-faint` | `#666` | Faint / disabled text |
| `text-dim` | `#888` | Dim labels |
| `accent-purple` | `#7c6fff` | Primary accent, active pill buttons |
| `accent-yellow` | `#f5c518` | IMDb-style rating, highlights |
| `accent-red` | `#e50914` | Netflix red / Korean dramas |
| `accent-green` | `#46d369` | Netflix green / Taiwan dramas |

**IMPORTANT:** Never hardcode a color that isn't in this palette without first checking `src/constants/styles.ts` and `src/constants/genres.ts`.

**Genre colors** (defined in `src/constants/genres.ts` as `GENRE_COLORS`):

| Genre | Color |
|---|---|
| 韓劇 | `#e50914` |
| 台劇 | `#1db954` |
| 陸劇 | `#f5a623` |
| 動畫劇 (日) | `#9b59b6` |
| 日劇 | `#f72585` |
| 美劇 | `#3498db` |
| 英劇 | `#e74c3c` |
| 實境秀 | `#e67e22` |
| 其他 | `#95a5a6` |

Always import and use `GENRE_COLORS[genre]` — never hardcode genre colors inline.

### 2. Shared Style Constants (`src/constants/styles.ts`)

These are the only shared style objects. Always prefer these over writing equivalent inline objects:

```typescript
import { TOOLTIP_STYLE, SECTION_STYLE, SECTION_TITLE, PILL_BTN } from './constants/styles'

// Card/section container
<div style={SECTION_STYLE}>

// Section heading
<div style={SECTION_TITLE}>標題</div>

// Recharts custom tooltip
<div style={TOOLTIP_STYLE}>

// Filter pill button (active: boolean, accent?: string)
<button style={PILL_BTN(isActive, '#7c6fff')}>標籤</button>
```

### 3. Typography

**Font stack** (defined in `src/index.css` — do not modify):
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang TC', 'Microsoft JhengHei', sans-serif;
```

**Common type scales** (use these sizes consistently):

| Usage | Size | Weight | Color |
|---|---|---|---|
| Section title | 16px | 700 | `#eee` |
| Chart label / muted caption | 13px | 400–600 | `#aaa` |
| Pill button | 12px | 400 / 700 | context |
| Tooltip content | 13px | 400 | `#eee` |
| Faint meta text | 12–13px | 400 | `#666` |

**IMPORTANT:** Never introduce `rem`, `em`, or Tailwind typography classes — use `px` units in inline styles throughout.

### 4. Spacing & Layout

- Base unit: **4px**. Use multiples: 4, 8, 12, 16, 20, 24px
- Section padding: `20px 24px` (from `SECTION_STYLE`)
- Section margin-bottom: `24px`
- Pill button padding: `4px 12px`
- Border radius: cards = `12px`, pills = `20px`, tooltips = `8px`
- Chart fixed heights: page chart area = `calc(100vh - 60px)`, pie charts = `370px`

### 5. Icon System

Icons are **Unicode emoji** mapped in `src/constants/genres.ts` as `GENRE_ICONS`. Import and use them — never add an icon library:

```typescript
import { GENRE_ICONS } from '../constants/genres'
// Usage: {GENRE_ICONS['韓劇']}  →  🇰🇷
```

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
│   └── genres.ts     ← GENRE_COLORS, GENRE_ICONS, GENRE_LABELS
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
import { SECTION_STYLE, SECTION_TITLE, PILL_BTN } from '../../constants/styles'
import { GENRE_COLORS, GENRE_ICONS } from '../../constants/genres'

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
| **Recharts** `^2.13.3` | Bar charts, tooltips, cartesian grids (`Top20Chart`, `TaiwanDramaChart`, `RankTrendChart`) |
| **ECharts** `^5.6.0` + **echarts-for-react** `^3.0.6` | Pie charts, stream/river charts (`GenreDistribution`, `WeeklyGenreFlow`) |

- Always use `ResponsiveContainer` from Recharts for responsive bar/line charts
- For ECharts, pass options as a typed `EChartsOption` object to `ReactECharts`
- Never install additional charting libraries

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
