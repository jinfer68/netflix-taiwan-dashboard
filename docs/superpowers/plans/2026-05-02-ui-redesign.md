# UI Redesign — Header & Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move tab navigation into Header, replace the 230px filter sidebar with a 68px icon+label column that expands per-section via fixed-position slide-out panels, and fix all palette violations.

**Architecture:** Header grows to own tab switching; Sidebar shrinks to a pure icon+label filter rail; a `FilterPanel` sub-component (inside `Sidebar.tsx`) renders at `position: fixed` beside the rail so it overlays the chart without disrupting the flex layout. App.tsx wires the new Header props and removes `onTabChange` from Sidebar.

**Tech Stack:** React 18, TypeScript strict, inline `React.CSSProperties` only, no new packages.

---

### Task 1: Update Header.tsx — add Tab navigation

**Files:**
- Modify: `src/components/layout/Header.tsx`

- [ ] **Step 1: Replace `Header.tsx` with the new implementation**

```tsx
import type { CSSProperties } from 'react'
import { PILL_BTN } from '../../constants/styles'
import type { TabType } from '../layout/Sidebar'

const TABS: { key: TabType; label: string; icon: string }[] = [
  { key: 'rankings', label: '總排行榜', icon: '🏆' },
  { key: 'genre',    label: '類型分析', icon: '🥧' },
  { key: 'taiwan',   label: '台劇分析', icon: '🇹🇼' },
]

interface Props {
  dataFrom?: string
  dataThrough?: string
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

function fmt(dateStr: string) {
  return dateStr.replace(/-/g, '/')
}

export default function Header({ dataFrom, dataThrough, activeTab, onTabChange }: Props) {
  return (
    <header style={{
      background: '#0d0d1a',
      borderBottom: '1px solid #222',
      padding: '0 20px',
      display: 'flex',
      alignItems: 'center',
      height: 52,
      position: 'sticky',
      top: 0,
      zIndex: 100,
      gap: 0,
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{
          background: '#e50914', color: '#fff',
          fontWeight: 900, fontSize: 13, letterSpacing: 1,
          width: 22, height: 22, borderRadius: 3,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>N</span>
        <span style={{ color: '#eee', fontWeight: 700, fontSize: 15 }}>
          台灣收視儀表板
        </span>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 22, background: '#2a2a3e', margin: '0 16px', flexShrink: 0 }} />

      {/* Tabs */}
      <nav style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => onTabChange(t.key)}
            style={{
              ...PILL_BTN(activeTab === t.key, '#7c6fff'),
              fontSize: 13,
              padding: '5px 14px',
              border: activeTab === t.key ? '1px solid #7c6fff' : '1px solid transparent',
              cursor: 'pointer',
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </nav>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Date range + warning */}
      {dataFrom && dataThrough && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ color: '#555', fontSize: 11 }}>
            統計期間　{fmt(dataFrom)} ～ {fmt(dataThrough)}
          </span>
          <span style={{
            color: '#886600', fontSize: 10,
            background: '#2a1f00', border: '1px solid #3a2f00',
            borderRadius: 4, padding: '2px 7px',
          }}>
            ⚠ 首尾週資料可能不完整
          </span>
        </div>
      )}
    </header>
  )
}
```

- [ ] **Step 2: Run build to verify no type errors**

```bash
npm run build
```

Expected: `✓ built in` — zero TypeScript errors. If `TabType` import fails with a circular ref warning, move the `TabType` export to `src/types/index.ts` instead.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Header.tsx
git commit -m "feat: Header 加入 Tab 導覽（pill 樣式）"
```

---

### Task 2: Rewrite Sidebar.tsx — icon+label rail

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

This task replaces the entire `Sidebar.tsx`. The new file keeps all existing Props **except** it removes `onTabChange` (now owned by Header). It adds local `openPanel` state and renders a 68px icon+label column. The `FilterPanel` sub-component is added in Task 3 — for now it renders `null`.

- [ ] **Step 1: Replace `Sidebar.tsx` with the new skeleton**

```tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { RankingsData } from '../../types'
import { GENRE_COLORS, GENRE_ICONS, GENRE_LABELS } from '../../constants/genres'
import { PILL_BTN } from '../../constants/styles'
import { getDailyShowTitles, getWeeklyDerivedRankings } from '../../utils/dataTransforms'
import { getQuarter, weekToYearQuarter, weekToYearMonth } from '../../utils/dateHelpers'

export type TabType = 'rankings' | 'genre' | 'taiwan'
export type YearFilter = '2024' | '2025' | '2026' | 'all'
type ReleaseFilter = 'all' | 'weekly' | 'allAtOnce' | 'split'
type NetflixFilter = 'all' | 'original' | 'nonOriginal'
type PanelKey = 'time' | 'genre' | 'netflix' | 'mode' | 'search'

const RELEASE_COLORS: Record<string, string> = {
  weekly: '#7c6fff', allAtOnce: '#46d369', split: '#f5c518',
}

const TREND_COLORS = [...Object.values(GENRE_COLORS), '#7c6fff']

interface Props {
  activeTab: TabType
  data: RankingsData
  yearFilter: YearFilter
  setYearFilter: (v: YearFilter) => void
  rankingMode: 'weekly' | 'daily'
  setRankingMode: (v: 'weekly' | 'daily') => void
  activeGenres: Set<string>
  setActiveGenres: (v: Set<string>) => void
  netflixOnly: boolean
  setNetflixOnly: (v: boolean) => void
  selectedQuarter: string
  setSelectedQuarter: (v: string) => void
  selectedMonth: string | null
  setSelectedMonth: (v: string | null) => void
  selectedDailyWeek: number | null
  setSelectedDailyWeek: (v: number | null) => void
  sortMode: 'weekly' | 'daily'
  setSortMode: (v: 'weekly' | 'daily') => void
  filterRelease: ReleaseFilter
  setFilterRelease: (v: ReleaseFilter) => void
  filterNetflix: NetflixFilter
  setFilterNetflix: (v: NetflixFilter) => void
  selectedTitles: string[]
  setSelectedTitles: (v: string[]) => void
  search: string
  setSearch: (v: string) => void
  flowNetflixFilter: NetflixFilter
  setFlowNetflixFilter: (v: NetflixFilter) => void
}

// ── Icon buttons definition ──────────────────────────────────────
const FILTER_BTNS: { key: PanelKey; icon: string; label: string; tabs: TabType[] }[] = [
  { key: 'time',   icon: '🗓️', label: '時間範圍', tabs: ['rankings', 'genre', 'taiwan'] },
  { key: 'genre',  icon: '🎭', label: '類型篩選', tabs: ['rankings'] },
  { key: 'netflix',icon: '📺', label: 'Netflix',  tabs: ['rankings', 'genre', 'taiwan'] },
  { key: 'mode',   icon: '📊', label: '排名模式', tabs: ['rankings', 'taiwan'] },
  { key: 'search', icon: '🔍', label: '走勢搜尋', tabs: ['taiwan'] },
]

export default function Sidebar(props: Props) {
  const { activeTab } = props
  const [openPanel, setOpenPanel] = useState<PanelKey | null>(null)

  // Close panel when tab changes
  useEffect(() => { setOpenPanel(null) }, [activeTab])

  function togglePanel(key: PanelKey) {
    setOpenPanel(prev => prev === key ? null : key)
  }

  // Determine which buttons are visible for current tab
  const visibleBtns = FILTER_BTNS.filter(b => b.tabs.includes(activeTab))

  // Determine if a filter button has an active (non-default) state
  function hasActiveFilter(key: PanelKey): boolean {
    switch (key) {
      case 'time':    return props.yearFilter !== 'all' || props.selectedQuarter !== 'all' || props.selectedMonth !== null
      case 'genre':   return props.activeGenres.size > 0
      case 'netflix':
        if (activeTab === 'rankings') return props.netflixOnly
        if (activeTab === 'taiwan')   return props.filterNetflix !== 'all'
        return props.flowNetflixFilter !== 'all'
      case 'mode':
        if (activeTab === 'rankings') return props.rankingMode !== 'weekly'
        return props.sortMode !== 'weekly'
      case 'search':  return props.selectedTitles.length > 0
      default: return false
    }
  }

  return (
    <aside style={{ position: 'relative', width: 68, minWidth: 68, height: '100%', flexShrink: 0 }}>
      {/* ── Icon+label rail ── */}
      <div style={{
        width: 68,
        height: '100%',
        background: '#111124',
        borderRight: '1px solid #222',
        display: 'flex',
        flexDirection: 'column',
        paddingTop: 12,
        gap: 2,
      }}>
        <div style={{ fontSize: 8, color: '#333', letterSpacing: 0.5, textAlign: 'center', marginBottom: 6 }}>
          FILTERS
        </div>
        {visibleBtns.map(btn => {
          const isOpen   = openPanel === btn.key
          const hasFilter = hasActiveFilter(btn.key)
          return (
            <button
              key={btn.key}
              onClick={() => togglePanel(btn.key)}
              style={{
                position: 'relative',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 3, padding: '7px 4px', marginInline: 6,
                borderRadius: 8, border: isOpen ? '1px solid #7c6fff33' : '1px solid transparent',
                background: isOpen ? '#7c6fff18' : 'transparent',
                cursor: 'pointer', opacity: isOpen ? 1 : 0.5,
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 16 }}>{btn.icon}</span>
              <span style={{ fontSize: 7, color: isOpen ? '#7c6fff' : '#888', fontWeight: isOpen ? 700 : 400, textAlign: 'center', lineHeight: 1.2 }}>
                {btn.label}
              </span>
              {hasFilter && (
                <div style={{
                  position: 'absolute', top: 5, right: 6,
                  width: 6, height: 6, borderRadius: '50%',
                  background: '#7c6fff',
                }} />
              )}
            </button>
          )
        })}
      </div>

      {/* ── Slide-out filter panel (Task 3) ── */}
      {openPanel !== null && (
        <FilterPanel
          panelKey={openPanel}
          onClose={() => setOpenPanel(null)}
          {...props}
        />
      )}
    </aside>
  )
}

// ── FilterPanel placeholder (filled in Task 3) ──────────────────
function FilterPanel(_props: Props & { panelKey: PanelKey; onClose: () => void }) {
  return null
}
```

- [ ] **Step 2: Update App.tsx to remove `onTabChange` from Sidebar props (it now goes to Header)**

In `src/App.tsx`, find the `<Sidebar` JSX block and remove the `onTabChange={setActiveTab}` prop line.

Also add `activeTab` and `onTabChange` to `<Header`:

```tsx
<Header
  dataFrom={data.weeklyRankings[0]?.dateRange.split(' ~ ')[0]}
  dataThrough={data.meta.dataThrough || undefined}
  activeTab={activeTab}
  onTabChange={setActiveTab}
/>
```

- [ ] **Step 3: Run build**

```bash
npm run build
```

Expected: `✓ built in` with no errors. The app renders with a tiny 68px sidebar; all filter panels show nothing yet.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/Sidebar.tsx src/App.tsx
git commit -m "feat: Sidebar 縮為 68px icon+label 篩選欄（面板內容待填）"
```

---

### Task 3: Implement FilterPanel content

**Files:**
- Modify: `src/components/layout/Sidebar.tsx` — replace the `FilterPanel` stub

The panel uses `position: fixed` so it overlays the chart area regardless of parent overflow.

- [ ] **Step 1: Replace the `FilterPanel` stub at the bottom of `Sidebar.tsx`**

```tsx
function FilterPanel({
  panelKey, onClose, activeTab,
  data, yearFilter, setYearFilter,
  rankingMode, setRankingMode,
  activeGenres, setActiveGenres,
  netflixOnly, setNetflixOnly,
  selectedQuarter, setSelectedQuarter,
  selectedMonth, setSelectedMonth,
  selectedDailyWeek, setSelectedDailyWeek,
  sortMode, setSortMode,
  filterRelease, setFilterRelease,
  filterNetflix, setFilterNetflix,
  selectedTitles, setSelectedTitles,
  search, setSearch,
  flowNetflixFilter, setFlowNetflixFilter,
}: Props & { panelKey: PanelKey; onClose: () => void }) {

  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  // ── Shared derived data ──────────────────────────────────────
  const { availableQuarters, availableMonths } = useMemo(() => {
    const qSet = new Set<string>()
    const mSet = new Set<string>()
    data.weeklyRankings.forEach(w => {
      qSet.add(weekToYearQuarter(w.dateRange))
      mSet.add(weekToYearMonth(w.dateRange))
    })
    return {
      availableQuarters: Array.from(qSet).sort(),
      availableMonths: Array.from(mSet).sort(),
    }
  }, [data])

  const monthsInQuarter = useMemo(() => {
    if (selectedQuarter === 'all') return []
    return availableMonths.filter(m => {
      const year = m.substring(0, 4)
      const month = parseInt(m.substring(5, 7))
      return `${year}-${getQuarter(month)}` === selectedQuarter
    })
  }, [selectedQuarter, availableMonths])

  const weeksInMonth = useMemo(() => {
    if (!selectedMonth) return []
    return data.weeklyRankings.filter(w =>
      weekToYearMonth(w.dateRange) === selectedMonth &&
      (selectedQuarter === 'all' || weekToYearQuarter(w.dateRange) === selectedQuarter)
    )
  }, [data, selectedMonth, selectedQuarter])

  const availableGenres = useMemo(() => {
    let weeks = data.weeklyRankings
    if (selectedMonth) weeks = weeks.filter(w => weekToYearMonth(w.dateRange) === selectedMonth)
    else if (selectedQuarter !== 'all') weeks = weeks.filter(w => weekToYearQuarter(w.dateRange) === selectedQuarter)
    const derived = getWeeklyDerivedRankings({ ...data, weeklyRankings: weeks })
    return GENRE_LABELS.filter(g => derived.some(d => d.genre === g))
  }, [data, selectedQuarter, selectedMonth])

  const allTitles = useMemo(() => getDailyShowTitles(data), [data])
  const filteredTitles = useMemo(() =>
    !search ? allTitles : allTitles.filter(t => t.toLowerCase().includes(search.toLowerCase()))
  , [allTitles, search])

  // ── Helpers ──────────────────────────────────────────────────
  function handleYearChange(y: YearFilter) {
    setYearFilter(y); setSelectedQuarter('all'); setSelectedMonth(null); setSelectedDailyWeek(null)
  }
  function handleQuarterClick(q: string) {
    const next = selectedQuarter === q ? 'all' : q
    setSelectedQuarter(next); setSelectedMonth(null); setSelectedDailyWeek(null)
  }
  function toggleGenre(g: string) {
    const next = new Set(activeGenres); next.has(g) ? next.delete(g) : next.add(g); setActiveGenres(next)
  }
  function toggleTitle(title: string) {
    setSelectedTitles(
      selectedTitles.includes(title)
        ? selectedTitles.filter(t => t !== title)
        : selectedTitles.length < 10 ? [...selectedTitles, title] : selectedTitles
    )
  }
  function quarterLabel(q: string) { return q.split('-')[1] ?? q }
  function monthLabel(m: string) { return `${parseInt(m.substring(5, 7))}月` }
  function weekShortLabel(dateRange: string) {
    const [start, end] = dateRange.split(' ~ ')
    const sm = parseInt(start.substring(5, 7)), sd = parseInt(start.substring(8, 10))
    const em = parseInt(end.substring(5, 7)),   ed = parseInt(end.substring(8, 10))
    return sm === em ? `${sm}/${sd}~${ed}` : `${sm}/${sd}~${em}/${ed}`
  }

  const sectionLabel: CSSProperties = { fontSize: 10, color: '#555', fontWeight: 600, marginBottom: 6, marginTop: 12 }
  const pill = (active: boolean, accent = '#7c6fff') => ({ ...PILL_BTN(active, accent), fontSize: 11, padding: '3px 9px' })

  // ── Panel titles ─────────────────────────────────────────────
  const PANEL_TITLES: Record<PanelKey, string> = {
    time: '🗓️ 時間範圍', genre: '🎭 類型篩選',
    netflix: '📺 Netflix', mode: '📊 排名模式', search: '🔍 走勢搜尋',
  }

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        left: 68,
        top: 52,
        width: 180,
        height: 'calc(100vh - 52px)',
        background: '#111124',
        borderRight: '1px solid #2a2a3e',
        borderLeft: '2px solid #7c6fff',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Panel header */}
      <div style={{ padding: '12px 14px 8px', borderBottom: '1px solid #1e1e30', flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: '#7c6fff', fontWeight: 700 }}>
          {PANEL_TITLES[panelKey]}
        </span>
      </div>

      {/* Panel body (scrollable) */}
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 14px 14px' }}>

        {/* ══ 時間範圍 ══ */}
        {panelKey === 'time' && (
          <>
            <div style={sectionLabel}>年份</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {(['2024', '2025', '2026', 'all'] as YearFilter[]).map(opt => (
                <button key={opt} onClick={() => handleYearChange(opt)} style={pill(yearFilter === opt)}>
                  {opt === 'all' ? '全部' : opt}
                </button>
              ))}
            </div>

            {yearFilter !== 'all' && availableQuarters.length > 0 && (
              <>
                <div style={sectionLabel}>季度</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {availableQuarters.map(q => (
                    <button key={q} onClick={() => handleQuarterClick(q)} style={pill(selectedQuarter === q)}>
                      {quarterLabel(q)}
                    </button>
                  ))}
                </div>
              </>
            )}

            {monthsInQuarter.length > 0 && (
              <>
                <div style={sectionLabel}>月份</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {monthsInQuarter.map(m => (
                    <button key={m} onClick={() => {
                      setSelectedMonth(selectedMonth === m ? null : m)
                      setSelectedDailyWeek(null)
                    }} style={pill(selectedMonth === m, '#f5c518')}>
                      {monthLabel(m)}
                    </button>
                  ))}
                </div>
              </>
            )}

            {activeTab === 'rankings' && rankingMode === 'daily' && weeksInMonth.length > 0 && (
              <>
                <div style={sectionLabel}>週次</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {weeksInMonth.map(w => (
                    <button key={w.weekNumber} onClick={() =>
                      setSelectedDailyWeek(selectedDailyWeek === w.weekNumber ? null : w.weekNumber)
                    } style={pill(selectedDailyWeek === w.weekNumber, '#46d369')}>
                      {weekShortLabel(w.dateRange)}
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* ══ 類型篩選（rankings tab only）══ */}
        {panelKey === 'genre' && (
          <>
            {activeGenres.size > 0 && (
              <button onClick={() => setActiveGenres(new Set())} style={{ ...pill(false), marginTop: 8, marginBottom: 4 }}>
                全部（清除）
              </button>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
              {availableGenres.map(g => {
                const color = GENRE_COLORS[g]
                const isActive = activeGenres.has(g)
                return (
                  <button key={g} onClick={() => toggleGenre(g)} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '4px 10px', borderRadius: 20, fontSize: 11,
                    cursor: 'pointer', border: `1px solid ${color}`,
                    background: isActive ? color : 'transparent',
                    color: isActive ? '#fff' : color,
                    fontWeight: isActive ? 700 : 400, transition: 'all 0.15s',
                  }}>
                    {GENRE_ICONS[g]} {g}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* ══ Netflix ══ */}
        {panelKey === 'netflix' && (
          <>
            {activeTab === 'rankings' && (
              <>
                <div style={sectionLabel}>TOP 20</div>
                <button onClick={() => setNetflixOnly(!netflixOnly)} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 10px', borderRadius: 20, fontSize: 11,
                  cursor: 'pointer', width: '100%',
                  border: `1px solid ${netflixOnly ? '#e50914' : '#333'}`,
                  background: netflixOnly ? '#3a050522' : 'transparent',
                  color: netflixOnly ? '#e50914' : '#666',
                  fontWeight: netflixOnly ? 700 : 400, transition: 'all 0.15s',
                }}>
                  <span style={{ fontWeight: 900, fontSize: 12 }}>N</span> Netflix 獨家
                </button>
              </>
            )}

            {activeTab === 'taiwan' && (
              <>
                <div style={sectionLabel}>台劇分析</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {([['all', '全部'], ['original', '獨家'], ['nonOriginal', '非獨家']] as const).map(([val, label]) => (
                    <button key={val} onClick={() => setFilterNetflix(val)} style={pill(filterNetflix === val, '#e50914')}>
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {activeTab === 'genre' && (
              <>
                <div style={sectionLabel}>流向圖</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {([['all', '全部'], ['original', '獨家'], ['nonOriginal', '非獨家']] as const).map(([val, label]) => (
                    <button key={val} onClick={() => setFlowNetflixFilter(val)} style={pill(flowNetflixFilter === val, '#e50914')}>
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* ══ 排名模式 ══ */}
        {panelKey === 'mode' && (
          <>
            {activeTab === 'rankings' && (
              <>
                <div style={sectionLabel}>榜單類型</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {([['weekly', '📅 週榜', '#7c6fff'], ['daily', '🌙 日榜', '#f5c518']] as const).map(([mode, label, color]) => (
                    <button key={mode} onClick={() => setRankingMode(mode)} style={pill(rankingMode === mode, color)}>
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {activeTab === 'taiwan' && (
              <>
                <div style={sectionLabel}>台劇排名</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {([['weekly', '週榜', '#e50914'], ['daily', '日榜', '#f5c518']] as const).map(([mode, label, color]) => (
                    <button key={mode} onClick={() => setSortMode(mode)} style={pill(sortMode === mode, color)}>
                      {label}
                    </button>
                  ))}
                </div>
                <div style={sectionLabel}>上架方式</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {([['all', '全部'], ['weekly', '週播'], ['allAtOnce', '一次'], ['split', '拆分']] as const).map(([val, label]) => {
                    const color = val === 'all' ? '#7c6fff' : (RELEASE_COLORS[val] ?? '#7c6fff')
                    return (
                      <button key={val} onClick={() => setFilterRelease(val)} style={pill(filterRelease === val, color)}>
                        {label}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </>
        )}

        {/* ══ 走勢搜尋（taiwan tab only）══ */}
        {panelKey === 'search' && (
          <>
            <div style={{ marginTop: 8 }}>
              <input
                type="text"
                placeholder="搜尋台劇名稱…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', padding: '6px 10px',
                  background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 8,
                  color: '#eee', fontSize: 11, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            {selectedTitles.length > 0 && (
              <div style={{ fontSize: 10, color: '#555', marginTop: 6 }}>
                已選 {selectedTitles.length}/10
                <button onClick={() => setSelectedTitles([])} style={{ marginLeft: 8, fontSize: 10, color: '#444', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  清除
                </button>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 8 }}>
              {filteredTitles.map(title => {
                const idx = selectedTitles.indexOf(title)
                const active = idx >= 0
                const color = TREND_COLORS[idx % TREND_COLORS.length] ?? '#7c6fff'
                return (
                  <button key={title} onClick={() => toggleTitle(title)} style={{
                    padding: '3px 10px', borderRadius: 14, fontSize: 11,
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                    border: `1px solid ${active ? color : '#2a2a3e'}`,
                    background: active ? `${color}22` : 'transparent',
                    color: active ? color : '#666',
                    fontWeight: active ? 700 : 400,
                  }}>
                    {title}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Panel footer */}
      <div style={{ padding: '8px 14px', borderTop: '1px solid #1e1e30', flexShrink: 0, textAlign: 'center' }}>
        <button onClick={onClose} style={{
          fontSize: 10, color: '#444', background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        }}>
          關閉
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: `✓ built in` — no TypeScript errors.

- [ ] **Step 3: Start dev server and verify visually**

```bash
npm run dev
```

Open http://localhost:5173/netflix-taiwan-dashboard/ and check:
- Header shows Logo | divider | three Tab pills | date range
- Clicking tabs switches charts correctly
- Sidebar is 68px with icon+label buttons
- Clicking a button opens the slide-out panel at `left: 68px`
- Panel content matches the active tab's filters
- Clicking outside the panel closes it
- Purple dot appears when a filter is active

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat: FilterPanel slide-out 實作（所有篩選區段）"
```

---

### Task 4: Visual consistency fixes

**Files:**
- Modify: `src/components/layout/Sidebar.tsx` (already done — `RELEASE_COLORS` and `TREND_COLORS` fixed in Task 2 skeleton)

Verify the fixes are in place:

- [ ] **Step 1: Confirm `RELEASE_COLORS` uses `#7c6fff` for `weekly`**

In `Sidebar.tsx`, the constant should read:
```ts
const RELEASE_COLORS: Record<string, string> = {
  weekly: '#7c6fff', allAtOnce: '#46d369', split: '#f5c518',
}
```

- [ ] **Step 2: Confirm `TREND_COLORS` uses `GENRE_COLORS`**

```ts
const TREND_COLORS = [...Object.values(GENRE_COLORS), '#7c6fff']
```

- [ ] **Step 3: Run build**

```bash
npm run build
```

Expected: `✓ built in`.

- [ ] **Step 4: Commit (only if any changes were made)**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "fix: RELEASE_COLORS 和 TREND_COLORS 統一使用設計系統配色"
```

---

### Task 5: Final build + push

- [ ] **Step 1: Clean production build**

```bash
npm run build
```

Expected: `✓ built in` — zero errors, only the expected chunk-size warning.

- [ ] **Step 2: Push to remote**

```bash
git push origin main
```
