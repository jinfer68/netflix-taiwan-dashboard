import { useMemo } from 'react'
import type { RankingsData } from '../../types'
import { GENRE_COLORS, GENRE_ICONS, GENRE_LABELS } from '../../constants/genres'
import { PILL_BTN } from '../../constants/styles'
import { getDailyShowTitles, getWeeklyDerivedRankings } from '../../utils/dataTransforms'
import { getQuarter, weekToYearQuarter, weekToYearMonth } from '../../utils/dateHelpers'

export type TabType = 'rankings' | 'genre' | 'taiwan'
export type YearFilter = '2024' | '2025' | '2026' | 'all'
type ReleaseFilter = 'all' | 'weekly' | 'allAtOnce' | 'split'
type NetflixFilter = 'all' | 'original' | 'nonOriginal'

interface Props {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  data: RankingsData
  yearFilter: YearFilter
  setYearFilter: (v: YearFilter) => void

  // TOP 20
  activeGenres: Set<string>
  setActiveGenres: (v: Set<string>) => void
  netflixOnly: boolean
  setNetflixOnly: (v: boolean) => void
  selectedQuarter: string
  setSelectedQuarter: (v: string) => void
  selectedMonth: string | null
  setSelectedMonth: (v: string | null) => void

  // 台劇分析
  sortMode: 'weekly' | 'daily'
  setSortMode: (v: 'weekly' | 'daily') => void
  filterRelease: ReleaseFilter
  setFilterRelease: (v: ReleaseFilter) => void
  filterNetflix: NetflixFilter
  setFilterNetflix: (v: NetflixFilter) => void

  // 走勢分析
  selectedTitles: string[]
  setSelectedTitles: (v: string[]) => void
  search: string
  setSearch: (v: string) => void

  // 流向圖
  flowNetflixFilter: NetflixFilter
  setFlowNetflixFilter: (v: NetflixFilter) => void
}

const TABS: { key: TabType; label: string; icon: string }[] = [
  { key: 'rankings', label: '排行榜',  icon: '🏆' },
  { key: 'genre',    label: '類型分析', icon: '🥧' },
  { key: 'taiwan',   label: '台劇',    icon: '🇹🇼' },
]

const RELEASE_COLORS: Record<string, string> = {
  weekly: '#6a5acd', allAtOnce: '#46d369', split: '#f5c518',
}

const COLORS = [
  '#e50914', '#f5c518', '#46d369', '#6a5acd', '#ff6b6b',
  '#4ecdc4', '#ff9f43', '#a29bfe', '#fd79a8', '#00cec9',
]

export default function Sidebar({
  activeTab, onTabChange, data,
  yearFilter, setYearFilter,
  activeGenres, setActiveGenres,
  netflixOnly, setNetflixOnly,
  selectedQuarter, setSelectedQuarter,
  selectedMonth, setSelectedMonth,
  sortMode, setSortMode,
  filterRelease, setFilterRelease,
  filterNetflix, setFilterNetflix,
  selectedTitles, setSelectedTitles,
  search, setSearch,
  flowNetflixFilter, setFlowNetflixFilter,
}: Props) {

  // ── TOP 20 計算 ──────────────────────────────────────────────
  const { availableQuarters, availableMonths } = useMemo(() => {
    const qSet = new Set<string>()
    const mSet = new Set<string>()
    data.weeklyRankings.forEach(w => {
      qSet.add(weekToYearQuarter(w.dateRange))
      mSet.add(weekToYearMonth(w.dateRange))
    })
    return {
      availableQuarters: ['all', ...Array.from(qSet).sort()],
      availableMonths: Array.from(mSet).sort(),
    }
  }, [data])

  const monthsInQuarter = useMemo(() => {
    if (selectedQuarter === 'all') return []
    return availableMonths.filter(m => {
      const year = m.substring(0, 4)
      const month = parseInt(m.substring(5, 7))
      const q = `${year}-${getQuarter(month)}`
      return q === selectedQuarter
    })
  }, [selectedQuarter, availableMonths])

  const availableGenres = useMemo(() => {
    let weeks = data.weeklyRankings
    if (selectedMonth) {
      weeks = weeks.filter(w => weekToYearMonth(w.dateRange) === selectedMonth)
    } else if (selectedQuarter !== 'all') {
      weeks = weeks.filter(w => weekToYearQuarter(w.dateRange) === selectedQuarter)
    }
    const derived = getWeeklyDerivedRankings({ ...data, weeklyRankings: weeks })
    return GENRE_LABELS.filter(g => derived.some(d => d.genre === g))
  }, [data, selectedQuarter, selectedMonth])

  function handleQuarterClick(q: string) {
    setSelectedQuarter(q)
    setSelectedMonth(null)
  }

  function quarterLabel(q: string) {
    if (q === 'all') return '全部'
    const [year, quarter] = q.split('-')
    return `${year.substring(2)} ${quarter}`
  }

  function monthLabel(m: string) {
    return `${parseInt(m.substring(5, 7))}月`
  }

  function toggleGenre(g: string) {
    const next = new Set(activeGenres)
    next.has(g) ? next.delete(g) : next.add(g)
    setActiveGenres(next)
  }

  // ── 走勢分析計算 ─────────────────────────────────────────────
  const allTitles = useMemo(() => getDailyShowTitles(data), [data])
  const filteredTitles = allTitles.filter(t =>
    !search || t.toLowerCase().includes(search.toLowerCase())
  )

  function toggleShow(title: string) {
    setSelectedTitles(
      selectedTitles.includes(title)
        ? selectedTitles.filter(t => t !== title)
        : selectedTitles.length < 10
          ? [...selectedTitles, title]
          : selectedTitles
    )
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 13, color: '#666', marginBottom: 7, marginTop: 14, fontWeight: 600,
  }

  const pillBtn = (active: boolean, accent = '#7c6fff'): React.CSSProperties => ({
    ...PILL_BTN(active, accent),
    fontSize: 13,
    padding: '5px 13px',
  })

  return (
    <aside style={{
      width: 230,
      minWidth: 230,
      height: '100%',
      background: '#0d0d1a',
      borderRight: '1px solid #1e1e2e',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>

      {/* ── 年份篩選（全域）── */}
      <div style={{ padding: '12px 14px 8px', borderBottom: '1px solid #1e1e2e' }}>
        <div style={{ fontSize: 12, color: '#555', marginBottom: 7 }}>資料範圍</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {(['2024', '2025', '2026', 'all'] as YearFilter[]).map(opt => (
            <button
              key={opt}
              onClick={() => setYearFilter(opt)}
              style={{
                padding: '5px 11px', borderRadius: 14, fontSize: 13, cursor: 'pointer',
                border: yearFilter === opt ? '1px solid #7c6fff' : '1px solid #2a2a3e',
                background: yearFilter === opt ? '#2a2060' : 'transparent',
                color: yearFilter === opt ? '#b9aaff' : '#666',
                fontWeight: yearFilter === opt ? 700 : 400,
                transition: 'all 0.15s',
              }}
            >
              {opt === 'all' ? '全部' : opt}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab 導航 ── */}
      <nav style={{ padding: '10px 12px 8px' }}>
        {TABS.map(t => {
          const active = activeTab === t.key
          return (
            <button
              key={t.key}
              onClick={() => onTabChange(t.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                marginBottom: 2,
                border: 'none',
                cursor: 'pointer',
                background: active ? '#1e1e3a' : 'transparent',
                color: active ? '#c9bbff' : '#666',
                fontWeight: active ? 700 : 400,
                fontSize: 15,
                textAlign: 'left',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 18 }}>{t.icon}</span>
              {t.label}
            </button>
          )
        })}
      </nav>

      <div style={{ borderTop: '1px solid #1e1e2e', margin: '0 12px' }} />

      {/* ── 篩選區域（可滾動）── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '6px 14px 14px' }}>

        {/* ══ 排行榜：TOP 20 篩選 ══ */}
        {activeTab === 'rankings' && (
          <>
            <div style={labelStyle}>時間範圍</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: monthsInQuarter.length ? 7 : 0 }}>
              {availableQuarters.map(q => {
                const active = selectedQuarter === q && !selectedMonth
                return (
                  <button key={q} onClick={() => handleQuarterClick(q)} style={pillBtn(active, '#7c6fff')}>
                    {quarterLabel(q)}
                  </button>
                )
              })}
            </div>
            {monthsInQuarter.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, paddingLeft: 4, marginBottom: 6 }}>
                {monthsInQuarter.map(m => {
                  const active = selectedMonth === m
                  return (
                    <button key={m} onClick={() => setSelectedMonth(active ? null : m)} style={pillBtn(active, '#f5c518')}>
                      {m.substring(0, 4)}/{monthLabel(m)}
                    </button>
                  )
                })}
              </div>
            )}

            <div style={labelStyle}>類型篩選</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {availableGenres.map(g => {
                const isActive = activeGenres.has(g)
                const color = GENRE_COLORS[g]
                return (
                  <button
                    key={g}
                    onClick={() => toggleGenre(g)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '5px 10px', borderRadius: 20, fontSize: 13,
                      cursor: 'pointer',
                      border: `1px solid ${color}`,
                      background: isActive ? color : 'transparent',
                      color: isActive ? '#fff' : color,
                      fontWeight: isActive ? 700 : 400,
                      transition: 'all 0.15s',
                    }}
                  >
                    {GENRE_ICONS[g]} {g}
                  </button>
                )
              })}
              {activeGenres.size > 0 && (
                <button
                  onClick={() => setActiveGenres(new Set())}
                  style={{ padding: '5px 10px', borderRadius: 20, fontSize: 13, cursor: 'pointer', border: '1px solid #444', background: 'transparent', color: '#666' }}
                >
                  全部
                </button>
              )}
            </div>

            <div style={{ marginTop: 12 }}>
              <button
                onClick={() => setNetflixOnly(!netflixOnly)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '7px 14px', borderRadius: 20, fontSize: 13,
                  cursor: 'pointer', width: '100%',
                  border: `1px solid ${netflixOnly ? '#e50914' : '#333'}`,
                  background: netflixOnly ? '#3a0505' : 'transparent',
                  color: netflixOnly ? '#ff4d4d' : '#666',
                  fontWeight: netflixOnly ? 700 : 400,
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontWeight: 900, fontSize: 15, color: netflixOnly ? '#e50914' : '#444' }}>N</span>
                Netflix 獨家
              </button>
            </div>
          </>
        )}

        {/* ══ 類型分析：流向圖 Netflix 篩選 ══ */}
        {activeTab === 'genre' && (
          <>
            <div style={labelStyle}>流向圖 Netflix 獨家</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {([['all', '全部'], ['original', '獨家'], ['nonOriginal', '非獨家']] as const).map(([val, label]) => (
                <button key={val} onClick={() => setFlowNetflixFilter(val)} style={pillBtn(flowNetflixFilter === val, '#e50914')}>
                  {label}
                </button>
              ))}
            </div>
          </>
        )}

        {/* ══ 台劇：台劇分析 + 走勢分析 篩選 ══ */}
        {activeTab === 'taiwan' && (
          <>
            {/* 台劇分析篩選 */}
            <div style={labelStyle}>上架方式</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {([['all', '全部'], ['weekly', '週播'], ['allAtOnce', '一次'], ['split', '拆分']] as const).map(([val, label]) => {
                const color = val === 'all' ? '#7c6fff' : (RELEASE_COLORS[val] ?? '#7c6fff')
                return (
                  <button key={val} onClick={() => setFilterRelease(val)} style={pillBtn(filterRelease === val, color)}>
                    {label}
                  </button>
                )
              })}
            </div>

            <div style={labelStyle}>Netflix 獨家</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {([['all', '全部'], ['original', '獨家'], ['nonOriginal', '非獨家']] as const).map(([val, label]) => (
                <button key={val} onClick={() => setFilterNetflix(val)} style={pillBtn(filterNetflix === val, '#e50914')}>
                  {label}
                </button>
              ))}
            </div>

            <div style={labelStyle}>榜單</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {([['weekly', '週榜'], ['daily', '日榜']] as const).map(([mode, label]) => (
                <button key={mode} onClick={() => setSortMode(mode)} style={{
                  padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', border: '1px solid',
                  borderColor: sortMode === mode ? (mode === 'weekly' ? '#e50914' : '#f5c518') : '#333',
                  background: sortMode === mode ? (mode === 'weekly' ? '#2a0a0a' : '#2a2000') : 'transparent',
                  color: sortMode === mode ? (mode === 'weekly' ? '#e50914' : '#f5c518') : '#666',
                }}>
                  {label}
                </button>
              ))}
            </div>

            <div style={{ ...labelStyle, marginTop: 18 }}>走勢：搜尋節目</div>
            <input
              type="text"
              placeholder="搜尋台劇名稱…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '7px 11px',
                background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 8,
                color: '#eee', fontSize: 13, outline: 'none', boxSizing: 'border-box',
              }}
            />
            {selectedTitles.length > 0 && (
              <div style={{ fontSize: 12, color: '#555', marginTop: 5, marginBottom: 4 }}>
                已選 {selectedTitles.length}/10
              </div>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 7 }}>
              {filteredTitles.map(title => {
                const idx = selectedTitles.indexOf(title)
                const active = idx >= 0
                return (
                  <button
                    key={title}
                    onClick={() => toggleShow(title)}
                    style={{
                      padding: '4px 10px', borderRadius: 14, fontSize: 12,
                      cursor: 'pointer', transition: 'all 0.15s',
                      border: `1px solid ${active ? COLORS[idx % COLORS.length] : '#2a2a3e'}`,
                      background: active ? `${COLORS[idx % COLORS.length]}22` : 'transparent',
                      color: active ? COLORS[idx % COLORS.length] : '#666',
                      fontWeight: active ? 700 : 400,
                    }}
                  >
                    {title}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    </aside>
  )
}
