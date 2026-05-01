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
  { key: 'rankings', label: '總排行榜', icon: '🏆' },
  { key: 'genre',    label: '類型分析', icon: '🥧' },
  { key: 'taiwan',   label: '台劇分析', icon: '🇹🇼' },
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

  function handleYearChange(y: YearFilter) {
    setYearFilter(y)
    setSelectedQuarter('all')
    setSelectedMonth(null)
    setSelectedDailyWeek(null)
  }

  function handleQuarterClick(q: string) {
    // 再點同一季度即取消選取，回到全季
    const next = selectedQuarter === q ? 'all' : q
    setSelectedQuarter(next)
    setSelectedMonth(null)
    setSelectedDailyWeek(null)
  }

  function quarterLabel(q: string) {
    if (q === 'all') return '全部'
    // 已在年份層選好年，此處只顯示 Q1/Q2/Q3/Q4
    const [, quarter] = q.split('-')
    return quarter
  }

  function monthLabel(m: string) {
    return `${parseInt(m.substring(5, 7))}月`
  }

  /** 將 "2026-03-30 ~ 2026-04-05" 簡化為 "3/30~4/5" 或 "3/23~29" */
  function weekShortLabel(dateRange: string): string {
    const [start, end] = dateRange.split(' ~ ')
    const sm = parseInt(start.substring(5, 7))
    const sd = parseInt(start.substring(8, 10))
    const em = parseInt(end.substring(5, 7))
    const ed = parseInt(end.substring(8, 10))
    return sm === em ? `${sm}/${sd}~${ed}` : `${sm}/${sd}~${em}/${ed}`
  }

  /** 日榜模式下：已選季度（必須）且已選月份時，返回該月的週次 */
  const weeksInDailyQuarter = useMemo(() => {
    if (rankingMode !== 'daily' || selectedQuarter === 'all' || !selectedMonth) return []
    return data.weeklyRankings.filter(w =>
      weekToYearQuarter(w.dateRange) === selectedQuarter &&
      weekToYearMonth(w.dateRange) === selectedMonth
    )
  }, [data, rankingMode, selectedQuarter, selectedMonth])

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
            {/* 週榜 / 日榜 切換 */}
            <div style={labelStyle}>榜單類型</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
              {([['weekly', '📅 週榜'], ['daily', '🌙 日榜']] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => setRankingMode(mode)}
                  style={{
                    flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 13,
                    cursor: 'pointer', border: '1px solid',
                    borderColor: rankingMode === mode
                      ? (mode === 'weekly' ? '#7c6fff' : '#f5c518')
                      : '#2a2a3e',
                    background: rankingMode === mode
                      ? (mode === 'weekly' ? '#2a2060' : '#2a2000')
                      : 'transparent',
                    color: rankingMode === mode
                      ? (mode === 'weekly' ? '#c9bbff' : '#f5c518')
                      : '#555',
                    fontWeight: rankingMode === mode ? 700 : 400,
                    transition: 'all 0.15s',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {/* 時間範圍 — 三層 drill-down：年 → 季 → 月/週 */}
            <>
              <div style={labelStyle}>時間範圍</div>

              {/* 第一層：年份（週榜＋日榜都顯示）*/}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: yearFilter !== 'all' ? 6 : 0 }}>
                {(['2024', '2025', '2026', 'all'] as YearFilter[]).map(opt => (
                  <button key={opt} onClick={() => handleYearChange(opt)} style={{
                    padding: '4px 10px', borderRadius: 14, fontSize: 12, cursor: 'pointer',
                    border: yearFilter === opt ? '1px solid #7c6fff' : '1px solid #2a2a3e',
                    background: yearFilter === opt ? '#2a2060' : 'transparent',
                    color: yearFilter === opt ? '#b9aaff' : '#555',
                    fontWeight: yearFilter === opt ? 700 : 400,
                    transition: 'all 0.15s',
                  }}>
                    {opt === 'all' ? '全部' : opt}
                  </button>
                ))}
              </div>

              {/* 第二層：季度（選了年份後才展開）*/}
              {yearFilter !== 'all' && availableQuarters.filter(q => q !== 'all').length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, paddingLeft: 4, marginBottom: selectedQuarter !== 'all' ? 6 : 0 }}>
                  {availableQuarters.filter(q => q !== 'all').map(q => {
                    const active = selectedQuarter === q
                    return (
                      <button key={q} onClick={() => handleQuarterClick(q)} style={pillBtn(active, '#7c6fff')}>
                        {quarterLabel(q)}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* 第三層：月份（週榜＋日榜，選了季度後才展開）*/}
              {monthsInQuarter.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, paddingLeft: 12, marginBottom: selectedMonth && rankingMode === 'daily' ? 6 : 0 }}>
                  {monthsInQuarter.map(m => {
                    const active = selectedMonth === m
                    return (
                      <button key={m} onClick={() => {
                        setSelectedMonth(active ? null : m)
                        setSelectedDailyWeek(null)
                      }} style={pillBtn(active, '#f5c518')}>
                        {monthLabel(m)}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* 第四層：週次（日榜，選了月份後才展開）*/}
              {rankingMode === 'daily' && weeksInDailyQuarter.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, paddingLeft: 20, marginBottom: 6 }}>
                  {weeksInDailyQuarter.map(w => {
                    const active = selectedDailyWeek === w.weekNumber
                    return (
                      <button
                        key={w.weekNumber}
                        onClick={() => setSelectedDailyWeek(active ? null : w.weekNumber)}
                        style={pillBtn(active, '#46d369')}
                      >
                        {weekShortLabel(w.dateRange)}
                      </button>
                    )
                  })}
                </div>
              )}
            </>

            {/* 類型篩選（週榜＋日榜都顯示）*/}
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

            {/* Netflix 獨家（週榜＋日榜都顯示）*/}
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
            <div style={labelStyle}>時間範圍</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
              {(['2024', '2025', '2026', 'all'] as YearFilter[]).map(opt => (
                <button key={opt} onClick={() => handleYearChange(opt)} style={{
                  padding: '4px 10px', borderRadius: 14, fontSize: 12, cursor: 'pointer',
                  border: yearFilter === opt ? '1px solid #7c6fff' : '1px solid #2a2a3e',
                  background: yearFilter === opt ? '#2a2060' : 'transparent',
                  color: yearFilter === opt ? '#b9aaff' : '#555',
                  fontWeight: yearFilter === opt ? 700 : 400,
                  transition: 'all 0.15s',
                }}>
                  {opt === 'all' ? '全部' : opt}
                </button>
              ))}
            </div>
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
            {/* 時間範圍 */}
            <div style={labelStyle}>時間範圍</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
              {(['2024', '2025', '2026', 'all'] as YearFilter[]).map(opt => (
                <button key={opt} onClick={() => handleYearChange(opt)} style={{
                  padding: '4px 10px', borderRadius: 14, fontSize: 12, cursor: 'pointer',
                  border: yearFilter === opt ? '1px solid #7c6fff' : '1px solid #2a2a3e',
                  background: yearFilter === opt ? '#2a2060' : 'transparent',
                  color: yearFilter === opt ? '#b9aaff' : '#555',
                  fontWeight: yearFilter === opt ? 700 : 400,
                  transition: 'all 0.15s',
                }}>
                  {opt === 'all' ? '全部' : opt}
                </button>
              ))}
            </div>
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
