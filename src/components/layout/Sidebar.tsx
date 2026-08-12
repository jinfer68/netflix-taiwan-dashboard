import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import type { RankingsData } from '../../types'
import { GENRE_COLORS, GENRE_LABELS, SERIES_COLORS, MAX_SERIES } from '../../constants/genres'
import { PAPER } from '../../constants/styles'
import {
  SEGMENT_BTN, SEGMENT_GROUP, GENRE_TOGGLE, DOT, INPUT_STYLE, hoverProps,
  ACCENT, INK, INK_MUTED, INK_SECONDARY, PAPER_RAISED, RULE, RULE_STRONG, NUM,
} from '../../constants/styles'
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

const TABS: { key: TabType; label: string }[] = [
  { key: 'rankings', label: '總排行榜' },
  { key: 'genre',    label: '類型分析' },
  { key: 'taiwan',   label: '台劇分析' },
]

const YEARS: YearFilter[] = ['2024', '2025', '2026', 'all']

const GROUP_LABEL: CSSProperties = {
  fontSize: 12, fontWeight: 700, color: INK_MUTED,
  letterSpacing: 1.5, marginBottom: 6, marginTop: 22,
}

const ROW: CSSProperties = SEGMENT_GROUP

/** 下鑽層級（季→月→週）：縮排並取消基準線，避免與上層混淆 */
const SUB_ROW = (indent: number): CSSProperties => ({
  display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end',
  paddingLeft: indent, marginTop: 2,
})

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
      return `${year}-${getQuarter(month)}` === selectedQuarter
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
    const next = selectedQuarter === q ? 'all' : q
    setSelectedQuarter(next)
    setSelectedMonth(null)
    setSelectedDailyWeek(null)
  }

  function quarterLabel(q: string) {
    if (q === 'all') return '全部'
    const [, quarter] = q.split('-')
    return quarter
  }

  function monthLabel(m: string) {
    return `${parseInt(m.substring(5, 7))}月`
  }

  /** 將 "2026-03-30 ~ 2026-04-05" 簡化為 "3/30–4/5" */
  function weekShortLabel(dateRange: string): string {
    const [start, end] = dateRange.split(' ~ ')
    const sm = parseInt(start.substring(5, 7))
    const sd = parseInt(start.substring(8, 10))
    const em = parseInt(end.substring(5, 7))
    const ed = parseInt(end.substring(8, 10))
    return sm === em ? `${sm}/${sd}–${ed}` : `${sm}/${sd}–${em}/${ed}`
  }

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

  const allTitles = useMemo(() => getDailyShowTitles(data), [data])
  const filteredTitles = allTitles.filter(t =>
    !search || t.toLowerCase().includes(search.toLowerCase())
  )

  function toggleShow(title: string) {
    setSelectedTitles(
      selectedTitles.includes(title)
        ? selectedTitles.filter(t => t !== title)
        : selectedTitles.length < MAX_SERIES
          ? [...selectedTitles, title]
          : selectedTitles
    )
  }

  function YearRow() {
    return (
      <>
        <div style={GROUP_LABEL}>時間範圍</div>
        <div style={ROW}>
          {YEARS.map(opt => (
            <button key={opt} onClick={() => handleYearChange(opt)} style={SEGMENT_BTN(yearFilter === opt)} {...hoverProps()}>
              {opt === 'all' ? '全部' : opt}
            </button>
          ))}
        </div>
      </>
    )
  }

  return (
    <aside style={{
      width: 252,
      minWidth: 252,
      height: '100%',
      background: PAPER_RAISED,
      borderRight: `1px solid ${RULE_STRONG}`,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>

      {/* ── 分頁導覽 ── */}
      <nav style={{ borderBottom: `1px solid ${RULE_STRONG}`, padding: '8px 0' }}>
        {TABS.map(t => {
          const active = activeTab === t.key
          return (
            <button
              key={t.key}
              onClick={() => onTabChange(t.key)}
              style={{
                display: 'block',
                width: '100%',
                padding: '11px 16px',
                border: 'none',
                borderLeft: `3px solid ${active ? ACCENT : 'transparent'}`,
                cursor: 'pointer',
                background: active ? PAPER : 'transparent',
                color: active ? INK : INK_SECONDARY,
                fontWeight: active ? 700 : 400,
                fontSize: 15,
                fontFamily: 'inherit',
                textAlign: 'left',
              }}
              {...hoverProps(active ? PAPER : 'transparent')}
            >
              {t.label}
            </button>
          )
        })}
      </nav>

      {/* ── 篩選區域 ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 14px 20px' }}>

        {/* ══ 總排行榜 ══ */}
        {activeTab === 'rankings' && (
          <>
            <div style={GROUP_LABEL}>榜單類型</div>
            <div style={ROW}>
              {([['weekly', '週榜'], ['daily', '日榜']] as const).map(([mode, label]) => (
                <button key={mode} onClick={() => setRankingMode(mode)} style={SEGMENT_BTN(rankingMode === mode)} {...hoverProps()}>
                  {label}
                </button>
              ))}
            </div>

            <YearRow />

            {/* 季度 */}
            {yearFilter !== 'all' && availableQuarters.filter(q => q !== 'all').length > 0 && (
              <div style={SUB_ROW(10)}>
                {availableQuarters.filter(q => q !== 'all').map(q => (
                  <button key={q} onClick={() => handleQuarterClick(q)} style={SEGMENT_BTN(selectedQuarter === q)} {...hoverProps()}>
                    {quarterLabel(q)}
                  </button>
                ))}
              </div>
            )}

            {/* 月份 */}
            {monthsInQuarter.length > 0 && (
              <div style={SUB_ROW(20)}>
                {monthsInQuarter.map(m => {
                  const active = selectedMonth === m
                  return (
                    <button key={m} onClick={() => {
                      setSelectedMonth(active ? null : m)
                      setSelectedDailyWeek(null)
                    }} style={SEGMENT_BTN(active)} {...hoverProps()}>
                      {monthLabel(m)}
                    </button>
                  )
                })}
              </div>
            )}

            {/* 週次（日榜） */}
            {rankingMode === 'daily' && weeksInDailyQuarter.length > 0 && (
              <div style={SUB_ROW(30)}>
                {weeksInDailyQuarter.map(w => {
                  const active = selectedDailyWeek === w.weekNumber
                  return (
                    <button
                      key={w.weekNumber}
                      onClick={() => setSelectedDailyWeek(active ? null : w.weekNumber)}
                      style={{ ...SEGMENT_BTN(active), ...NUM }}
                      {...hoverProps()}
                    >
                      {weekShortLabel(w.dateRange)}
                    </button>
                  )
                })}
              </div>
            )}

            {/* 類型篩選 */}
            <div style={{ ...GROUP_LABEL, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span>類型篩選</span>
              {activeGenres.size > 0 && (
                <button
                  onClick={() => setActiveGenres(new Set())}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 11, color: INK_MUTED, fontWeight: 400, fontFamily: 'inherit', padding: 0 }}
                >
                  清除
                </button>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: 2, rowGap: 0 }}>
              {availableGenres.map(g => {
                const isActive = activeGenres.has(g)
                return (
                  <button key={g} onClick={() => toggleGenre(g)} style={GENRE_TOGGLE(isActive)} {...hoverProps()}>
                    <span style={DOT(GENRE_COLORS[g], isActive)} />
                    {g}
                  </button>
                )
              })}
            </div>

            {/* Netflix 獨家 */}
            <div style={GROUP_LABEL}>片源</div>
            <button onClick={() => setNetflixOnly(!netflixOnly)} style={GENRE_TOGGLE(netflixOnly)} {...hoverProps()}>
              <span style={DOT(ACCENT, netflixOnly)} />
              僅 Netflix 獨家
            </button>
          </>
        )}

        {/* ══ 類型分析 ══ */}
        {activeTab === 'genre' && (
          <>
            <YearRow />
            <div style={GROUP_LABEL}>流向圖片源</div>
            <div style={ROW}>
              {([['all', '全部'], ['original', '獨家'], ['nonOriginal', '非獨家']] as const).map(([val, label]) => (
                <button key={val} onClick={() => setFlowNetflixFilter(val)} style={SEGMENT_BTN(flowNetflixFilter === val)} {...hoverProps()}>
                  {label}
                </button>
              ))}
            </div>
          </>
        )}

        {/* ══ 台劇分析 ══ */}
        {activeTab === 'taiwan' && (
          <>
            <YearRow />

            <div style={GROUP_LABEL}>榜單類型</div>
            <div style={ROW}>
              {([['weekly', '週榜'], ['daily', '日榜']] as const).map(([mode, label]) => (
                <button key={mode} onClick={() => setSortMode(mode)} style={SEGMENT_BTN(sortMode === mode)} {...hoverProps()}>
                  {label}
                </button>
              ))}
            </div>

            <div style={GROUP_LABEL}>上架方式</div>
            <div style={ROW}>
              {([['all', '全部'], ['weekly', '週播'], ['allAtOnce', '一次'], ['split', '拆分']] as const).map(([val, label]) => (
                <button key={val} onClick={() => setFilterRelease(val)} style={SEGMENT_BTN(filterRelease === val)} {...hoverProps()}>
                  {label}
                </button>
              ))}
            </div>

            <div style={GROUP_LABEL}>片源</div>
            <div style={ROW}>
              {([['all', '全部'], ['original', '獨家'], ['nonOriginal', '非獨家']] as const).map(([val, label]) => (
                <button key={val} onClick={() => setFilterNetflix(val)} style={SEGMENT_BTN(filterNetflix === val)} {...hoverProps()}>
                  {label}
                </button>
              ))}
            </div>

            <div style={{ ...GROUP_LABEL, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span>走勢比較</span>
              <span style={{ ...NUM, fontSize: 11, color: INK_MUTED, fontWeight: 400 }}>
                {selectedTitles.length}/{MAX_SERIES}
              </span>
            </div>
            <input
              type="text"
              placeholder="搜尋台劇名稱…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={INPUT_STYLE}
            />
            <div style={{ marginTop: 8, borderTop: `1px solid ${RULE}` }}>
              {filteredTitles.map(title => {
                const idx = selectedTitles.indexOf(title)
                const active = idx >= 0
                return (
                  <button
                    key={title}
                    onClick={() => toggleShow(title)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      width: '100%', padding: '8px 0',
                      border: 'none', borderBottom: `1px solid ${RULE}`,
                      background: 'transparent', cursor: 'pointer',
                      fontSize: 14, fontFamily: 'inherit', textAlign: 'left',
                      color: active ? INK : INK_SECONDARY,
                      fontWeight: active ? 700 : 400,
                    }}
                    {...hoverProps()}
                  >
                    <span style={DOT(active ? SERIES_COLORS[idx % SERIES_COLORS.length] : RULE_STRONG, active)} />
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
