import { useMemo } from 'react'
import type { RankingsData } from '../../types'
import { GENRE_COLORS, GENRE_ICONS, GENRE_LABELS } from '../../constants/genres'
import { PILL_BTN } from '../../constants/styles'
import { getDailyShowTitles, getWeeklyDerivedRankings } from '../../utils/dataTransforms'
import { getQuarter, weekToYearQuarter, weekToYearMonth } from '../../utils/dateHelpers'

export type TabType = 'top20' | 'lookup' | 'genre' | 'flow' | 'taiwan' | 'trend'
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
  { key: 'top20',  label: 'TOP 20',  icon: '🏆' },
  { key: 'lookup', label: '快速查詢', icon: '🔍' },
  { key: 'genre',  label: '類型分布', icon: '🥧' },
  { key: 'flow',   label: '流向圖',   icon: '📊' },
  { key: 'taiwan', label: '台劇分析', icon: '🇹🇼' },
  { key: 'trend',  label: '走勢分析', icon: '📈' },
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
    fontSize: 11, color: '#555', marginBottom: 6, marginTop: 12,
  }

  return (
    <aside style={{
      width: 220,
      minWidth: 220,
      height: '100%',
      background: '#0d0d1a',
      borderRight: '1px solid #1e1e2e',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>

      {/* ── 年份篩選（全域）── */}
      <div style={{ padding: '10px 12px 6px', borderBottom: '1px solid #1e1e2e' }}>
        <div style={{ fontSize: 10, color: '#444', marginBottom: 5 }}>資料範圍</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {(['2024', '2025', '2026', 'all'] as YearFilter[]).map(opt => (
            <button
              key={opt}
              onClick={() => setYearFilter(opt)}
              style={{
                padding: '3px 8px', borderRadius: 12, fontSize: 11, cursor: 'pointer',
                border: yearFilter === opt ? '1px solid #7c6fff' : '1px solid #2a2a3e',
                background: yearFilter === opt ? '#2a2060' : 'transparent',
                color: yearFilter === opt ? '#b9aaff' : '#555',
                fontWeight: yearFilter === opt ? 700 : 400,
                transition: 'all 0.15s',
              }}
            >
              {opt === 'all' ? '全部' : `${opt}`}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab 導航 ── */}
      <nav style={{ padding: '8px 10px 6px' }}>
        {TABS.map(t => {
          const active = activeTab === t.key
          return (
            <button
              key={t.key}
              onClick={() => onTabChange(t.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '8px 10px',
                borderRadius: 8,
                marginBottom: 1,
                border: 'none',
                cursor: 'pointer',
                background: active ? '#1e1e3a' : 'transparent',
                color: active ? '#b9aaff' : '#555',
                fontWeight: active ? 700 : 400,
                fontSize: 13,
                textAlign: 'left',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 15 }}>{t.icon}</span>
              {t.label}
            </button>
          )
        })}
      </nav>

      <div style={{ borderTop: '1px solid #1e1e2e', margin: '0 10px' }} />

      {/* ── 篩選區域（可滾動）── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px' }}>

        {/* ══ TOP 20 篩選 ══ */}
        {activeTab === 'top20' && (
          <>
            <div style={labelStyle}>時間範圍</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: monthsInQuarter.length ? 6 : 0 }}>
              {availableQuarters.map(q => {
                const active = selectedQuarter === q && !selectedMonth
                return (
                  <button key={q} onClick={() => handleQuarterClick(q)} style={PILL_BTN(active, '#7c6fff')}>
                    {quarterLabel(q)}
                  </button>
                )
              })}
            </div>
            {monthsInQuarter.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, paddingLeft: 4, marginBottom: 4 }}>
                {monthsInQuarter.map(m => {
                  const active = selectedMonth === m
                  return (
                    <button key={m} onClick={() => setSelectedMonth(active ? null : m)} style={PILL_BTN(active, '#f5c518')}>
                      {m.substring(0, 4)}/{monthLabel(m)}
                    </button>
                  )
                })}
              </div>
            )}

            <div style={labelStyle}>類型篩選</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {availableGenres.map(g => {
                const isActive = activeGenres.has(g)
                const color = GENRE_COLORS[g]
                return (
                  <button
                    key={g}
                    onClick={() => toggleGenre(g)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 3,
                      padding: '3px 8px', borderRadius: 20, fontSize: 11,
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
                  style={{ padding: '3px 8px', borderRadius: 20, fontSize: 11, cursor: 'pointer', border: '1px solid #444', background: 'transparent', color: '#555' }}
                >
                  全部
                </button>
              )}
            </div>

            <div style={{ marginTop: 10 }}>
              <button
                onClick={() => setNetflixOnly(!netflixOnly)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 10px', borderRadius: 20, fontSize: 12,
                  cursor: 'pointer', width: '100%',
                  border: `1px solid ${netflixOnly ? '#e50914' : '#333'}`,
                  background: netflixOnly ? '#3a0505' : 'transparent',
                  color: netflixOnly ? '#ff4d4d' : '#555',
                  fontWeight: netflixOnly ? 700 : 400,
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontWeight: 900, color: netflixOnly ? '#e50914' : '#444' }}>N</span>
                Netflix 獨家
              </button>
            </div>
          </>
        )}

        {/* ══ 快速查詢 ══ */}
        {activeTab === 'lookup' && (
          <div style={{ color: '#555', fontSize: 12, marginTop: 8 }}>
            在右側搜尋節目或瀏覽週榜
          </div>
        )}

        {/* ══ 類型分布 篩選 ══ */}
        {activeTab === 'genre' && (
          <div style={{ color: '#555', fontSize: 12, marginTop: 8 }}>
            純展示，無篩選
          </div>
        )}

        {/* ══ 流向圖 篩選 ══ */}
        {activeTab === 'flow' && (
          <>
            <div style={labelStyle}>Netflix 獨家</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {([['all', '全部'], ['original', '獨家'], ['nonOriginal', '非獨家']] as const).map(([val, label]) => (
                <button key={val} onClick={() => setFlowNetflixFilter(val)} style={PILL_BTN(flowNetflixFilter === val, '#e50914')}>
                  {label}
                </button>
              ))}
            </div>
          </>
        )}

        {/* ══ 台劇分析 篩選 ══ */}
        {activeTab === 'taiwan' && (
          <>
            <div style={labelStyle}>上架方式</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {([['all', '全部'], ['weekly', '週播'], ['allAtOnce', '一次'], ['split', '拆分']] as const).map(([val, label]) => {
                const color = val === 'all' ? '#7c6fff' : (RELEASE_COLORS[val] ?? '#7c6fff')
                return (
                  <button key={val} onClick={() => setFilterRelease(val)} style={PILL_BTN(filterRelease === val, color)}>
                    {label}
                  </button>
                )
              })}
            </div>

            <div style={labelStyle}>Netflix 獨家</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {([['all', '全部'], ['original', '獨家'], ['nonOriginal', '非獨家']] as const).map(([val, label]) => (
                <button key={val} onClick={() => setFilterNetflix(val)} style={PILL_BTN(filterNetflix === val, '#e50914')}>
                  {label}
                </button>
              ))}
            </div>

            <div style={labelStyle}>榜單</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {([['weekly', '週榜'], ['daily', '日榜']] as const).map(([mode, label]) => (
                <button key={mode} onClick={() => setSortMode(mode)} style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', border: '1px solid',
                  borderColor: sortMode === mode ? (mode === 'weekly' ? '#e50914' : '#f5c518') : '#333',
                  background: sortMode === mode ? (mode === 'weekly' ? '#2a0a0a' : '#2a2000') : 'transparent',
                  color: sortMode === mode ? (mode === 'weekly' ? '#e50914' : '#f5c518') : '#666',
                }}>
                  {label}
                </button>
              ))}
            </div>

            <div style={{ marginTop: 12, fontSize: 10, color: '#444', lineHeight: 1.9 }}>
              <div>
                <span style={{ color: RELEASE_COLORS.weekly, marginRight: 4 }}>■</span>週播
                <span style={{ color: RELEASE_COLORS.allAtOnce, marginLeft: 8, marginRight: 4 }}>■</span>一次
                <span style={{ color: RELEASE_COLORS.split, marginLeft: 8, marginRight: 4 }}>■</span>拆分
              </div>
              <div>★ = Netflix 獨家</div>
            </div>
          </>
        )}

        {/* ══ 走勢分析 篩選 ══ */}
        {activeTab === 'trend' && (
          <>
            <div style={labelStyle}>搜尋節目</div>
            <input
              type="text"
              placeholder="搜尋台劇名稱…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '6px 10px',
                background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 8,
                color: '#eee', fontSize: 12, outline: 'none', boxSizing: 'border-box',
              }}
            />
            {selectedTitles.length > 0 && (
              <div style={{ fontSize: 10, color: '#555', marginTop: 4, marginBottom: 4 }}>
                已選 {selectedTitles.length}/10
              </div>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
              {filteredTitles.map(title => {
                const idx = selectedTitles.indexOf(title)
                const active = idx >= 0
                return (
                  <button
                    key={title}
                    onClick={() => toggleShow(title)}
                    style={{
                      padding: '3px 8px', borderRadius: 14, fontSize: 11,
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
