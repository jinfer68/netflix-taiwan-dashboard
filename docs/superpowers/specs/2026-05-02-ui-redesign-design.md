# UI Redesign — Header & Sidebar

**Date:** 2026-05-02
**Scope:** `Header.tsx`, `Sidebar.tsx`, `App.tsx` layout wiring + visual consistency fixes

---

## Goal

Improve the dashboard's information architecture and visual consistency by:
1. Moving tab navigation into the Header (freeing the sidebar for filters only)
2. Replacing the full-width filter sidebar with a compact icon+label column that expands per-section via slide-out panels
3. Fixing all color values that deviate from the design system palette

---

## Architecture

### Header (52px, single row)

Layout: `[N badge] [title] | [Tab pills] ··· [date range] [warning badge]`

- **Logo:** `background: #e50914`, `border-radius: 3px`, `22×22px`, letter `N` weight 900
- **Divider:** `1px solid #2a2a3e`, height 22px
- **Tabs:** three pill buttons using `PILL_BTN(active, '#7c6fff')` — `'rankings' | 'genre' | 'taiwan'`
- **Date range:** `color: #555`, `fontSize: 9px`; `⚠` badge `background: #2a1f00`, `border: 1px solid #3a2f00`, `color: #886600`
- Background: `#0d0d1a` (keep existing — distinct from page bg for depth)
- `TabType` and `YearFilter` exports move from `Sidebar.tsx` → stay in `Sidebar.tsx` but `onTabChange` / `activeTab` props stay; Header receives `activeTab` + `onTabChange`

### Sidebar (68px wide, icon+label column)

Four filter sections, each an icon button with label text below:

| Icon | Label | Controls |
|---|---|---|
| 🗓️ | 時間範圍 | yearFilter, selectedQuarter, selectedMonth, selectedDailyWeek |
| 🎭 | 類型篩選 | activeGenres |
| 📺 | Netflix | netflixOnly / filterNetflix / flowNetflixFilter |
| 📊 | 排名模式 | rankingMode / sortMode |

**Button states:**
- Default: `opacity: 0.5`, no border
- Active (panel open): `background: #7c6fff18`, `border: 1px solid #7c6fff33`, full opacity
- Has-filter dot: `6px` circle `background: #7c6fff` at top-right corner when filter is non-default

**Slide-out panel:**
- Appears to the right of the Sidebar, overlapping the chart area
- Width: `160px`
- `background: #111124`, `border-right: 1px solid #2a2a3e`, `border-left: 2px solid #7c6fff`
- Padding: `14px 12px`
- Close: click outside panel or click same icon again
- Footer: "重設篩選" text button (`color: #555`, `fontSize: 11px`)

**Panel content per section:**

*時間範圍* — year pills (2024/2025/2026/全部) → when daily mode active: quarter pills → month pills → week pills (cascade)

*類型篩選* — all genres as pill buttons using `GENRE_COLORS[genre]` as accent; "全部" shortcut at top

*Netflix* — three pills: 全部 / Netflix原創 / 非原創

*排名模式* — two pills: 週榜 / 日榜

### App.tsx Layout Changes

```
<div style={{ display: 'flex', height: CHART_H }}>
  <Sidebar ... />                  // 68px, now filter-only
  {openPanel && <FilterPanel />}   // 160px slide-out, rendered here
  <main style={{ flex: 1 }}>      // chart area, unchanged
```

- `openPanel: 'time' | 'genre' | 'netflix' | 'mode' | null` state in App.tsx
- Click outside closes panel (mousedown listener on document)

### Header Props Change

```typescript
// Header.tsx — new props
interface Props {
  dataFrom?: string
  dataThrough?: string
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}
```

---

## Visual Consistency Fixes

These deviate from the design system and must be corrected:

| Location | Current (wrong) | Correct |
|---|---|---|
| `Sidebar.tsx` `RELEASE_COLORS.weekly` | `#6a5acd` | `#7c6fff` |
| `Sidebar.tsx` `COLORS` array | custom 10-color array | `Object.values(GENRE_COLORS)` |
| `Sidebar.tsx` year filter background (active) | inline `#7c6fff33` | `PILL_BTN(true, '#7c6fff')` |

---

## Out of Scope

- Chart components (`Top20Chart`, `TaiwanDramaChart`, etc.) — not touched
- Data logic in `dataTransforms.ts` — not touched
- Mobile / responsive layout — not in scope
- Animations / transitions — not in scope (keep it simple)

---

## Files Changed

| File | Change |
|---|---|
| `src/components/layout/Header.tsx` | Add `activeTab` + `onTabChange` props; render Tab pills |
| `src/components/layout/Sidebar.tsx` | Replace full filter layout with icon+label column; `FilterPanel` rendered as a local sub-component within the same file |
| `src/App.tsx` | Add `openPanel` state; wire `Header` new props; render slide-out panel |
