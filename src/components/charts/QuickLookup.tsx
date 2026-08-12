import { useState, useMemo, useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import type { RankingsData, OverallRankingEntry, Genre } from '../../types'
import { getAllWeeklyTitles, getShowLookupEntry, getDailyShowEntry, getAllDailyTitles } from '../../utils/dataTransforms'
import { GENRE_COLORS } from '../../constants/genres'
import {
  SEGMENT_BTN, INPUT_STYLE, hoverProps, ACCENT, ACCENT_WASH, INK, INK_MUTED, INK_SECONDARY,
  PAPER, PAPER_RAISED, RULE, RULE_STRONG, NUM,
} from '../../constants/styles'
import { getQuarter, weekToYearQuarter, weekToYearMonth } from '../../utils/dateHelpers'

interface Props {
  data: RankingsData       // 年份過濾後資料（週次快覽用）
  fullData: RankingsData   // 完整資料（日榜模式查週榜摘要用）
  dailyOverallRankings: OverallRankingEntry[]
  rankingMode: 'weekly' | 'daily'
  selectedShow: string | null
  onSelectShow: (title: string | null) => void
}

function formatYM(d: string) { return d.substring(0, 7).replace('-', '/') }

const GROUP_LABEL: CSSProperties = {
  fontSize: 11, fontWeight: 700, color: INK_SECONDARY, letterSpacing: 1, marginBottom: 6,
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '8px 10px', borderRight: `1px solid ${RULE}` }}>
      <div style={{ fontSize: 11, color: INK_MUTED, marginBottom: 3 }}>{label}</div>
      <div style={{ ...NUM, fontSize: 17, fontWeight: 700, color: INK }}>{value}</div>
    </div>
  )
}

function WeekDots({
  appearances, onJump,
}: {
  appearances: { weekNumber: number; dateRange: string; position: number }[]
  onJump: (dateRange: string, weekNumber: number) => void
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
      {appearances.map(w => (
        <button
          key={w.weekNumber}
          title={`${w.dateRange}　第 ${w.position} 名`}
          onClick={() => onJump(w.dateRange, w.weekNumber)}
          style={{
            ...NUM,
            width: 24, height: 24, fontSize: 11, fontWeight: w.position <= 3 ? 700 : 400,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: w.position <= 3 ? ACCENT_WASH : PAPER,
            border: `1px solid ${w.position <= 3 ? ACCENT : RULE_STRONG}`,
            color: w.position <= 3 ? ACCENT : INK_SECONDARY,
            cursor: 'pointer', fontFamily: 'inherit', padding: 0,
          }}
          {...hoverProps(w.position <= 3 ? ACCENT_WASH : PAPER)}
        >
          {w.position}
        </button>
      ))}
    </div>
  )
}

export default function QuickLookup({ data, fullData, dailyOverallRankings, rankingMode, selectedShow, onSelectShow }: Props) {
  const [activeTab, setActiveTab] = useState<'show' | 'week'>('show')

  const [searchQuery, setSearchQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const [selectedQuarter, setSelectedQuarter] = useState<string>('latest')
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [selectedWeekNum, setSelectedWeekNum] = useState<number | null>(null)

  useEffect(() => {
    setSearchQuery('')
    setSelectedQuarter('latest')
    setSelectedMonth(null)
    setSelectedWeekNum(null)
  }, [data])

  useEffect(() => {
    if (!selectedShow) return
    setActiveTab('show')
    if (rankingMode === 'weekly') {
      const firstWeek = data.weeklyRankings.find(w =>
        w.rankings.some(r => r.title === selectedShow)
      )
      if (firstWeek) {
        const dr = firstWeek.dateRange
        setSelectedQuarter(weekToYearQuarter(dr))
        setSelectedMonth(weekToYearMonth(dr))
        setSelectedWeekNum(firstWeek.weekNumber)
      }
    }
  }, [selectedShow, data, rankingMode])

  const allWeeklyTitles = useMemo(() => getAllWeeklyTitles(data), [data])
  const allDailyTitles  = useMemo(() => getAllDailyTitles(dailyOverallRankings), [dailyOverallRankings])
  const allTitles = rankingMode === 'daily' ? allDailyTitles : allWeeklyTitles

  const suggestions = useMemo(() =>
    searchQuery.length >= 1
      ? allTitles.filter(t => t.includes(searchQuery)).slice(0, 10)
      : [],
    [allTitles, searchQuery],
  )

  const weeklyEntry = useMemo(
    () => (rankingMode === 'weekly' && selectedShow) ? getShowLookupEntry(data, selectedShow) : null,
    [data, selectedShow, rankingMode],
  )
  const dailyEntry = useMemo(
    () => (rankingMode === 'daily' && selectedShow) ? getDailyShowEntry(dailyOverallRankings, selectedShow) : null,
    [dailyOverallRankings, selectedShow, rankingMode],
  )

  const { quarters, monthsByQ, weeksByM } = useMemo(() => {
    const qSet = new Set<string>()
    const mSet = new Set<string>()
    const wMap = new Map<string, { weekNumber: number; dateRange: string }[]>()

    for (const w of data.weeklyRankings) {
      const q = weekToYearQuarter(w.dateRange)
      const m = weekToYearMonth(w.dateRange)
      qSet.add(q)
      mSet.add(m)
      if (!wMap.has(m)) wMap.set(m, [])
      wMap.get(m)!.push({ weekNumber: w.weekNumber, dateRange: w.dateRange })
    }

    const quarters = [...qSet].sort()
    const monthsByQ: Record<string, string[]> = {}
    for (const m of [...mSet].sort()) {
      const y = m.substring(0, 4)
      const q = `${y}-${getQuarter(parseInt(m.substring(5, 7)))}`
      if (!monthsByQ[q]) monthsByQ[q] = []
      monthsByQ[q].push(m)
    }

    return { quarters, monthsByQ, weeksByM: Object.fromEntries(wMap) }
  }, [data])

  const activeQ = selectedQuarter === 'latest' ? quarters[quarters.length - 1] : selectedQuarter
  const monthsInQ = monthsByQ[activeQ] ?? []
  const activeMonth = selectedMonth && monthsInQ.includes(selectedMonth)
    ? selectedMonth
    : monthsInQ[monthsInQ.length - 1] ?? null
  const weeksInMonth = activeMonth ? (weeksByM[activeMonth] ?? []) : []
  const activeWeekNum = selectedWeekNum && weeksInMonth.some(w => w.weekNumber === selectedWeekNum)
    ? selectedWeekNum
    : weeksInMonth[weeksInMonth.length - 1]?.weekNumber ?? null
  const currentWeek = activeWeekNum
    ? data.weeklyRankings.find(w => w.weekNumber === activeWeekNum) ?? null
    : null

  const genreCounts = useMemo(() => {
    if (!currentWeek) return []
    const counts: Record<string, number> = {}
    currentWeek.rankings.forEach(r => {
      const g = r.genre === '實境' ? '實境秀' : r.genre
      counts[g] = (counts[g] ?? 0) + 1
    })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [currentWeek])

  const qLabel = (q: string) => {
    const [y, quarter] = q.split('-')
    return `${y.substring(2)} ${quarter}`
  }
  const mLabel = (m: string) => `${parseInt(m.substring(5, 7))}月`

  function jumpToWeek(dateRange: string, weekNumber: number) {
    setSelectedQuarter(weekToYearQuarter(dateRange))
    setSelectedMonth(weekToYearMonth(dateRange))
    setSelectedWeekNum(weekNumber)
    setActiveTab('week')
  }

  const weekIdx = currentWeek
    ? data.weeklyRankings.findIndex(w => w.weekNumber === currentWeek.weekNumber)
    : -1
  const atFirstWeek = weekIdx <= 0
  const atLastWeek = weekIdx < 0 || weekIdx >= data.weeklyRankings.length - 1

  function stepWeek(delta: -1 | 1) {
    const target = data.weeklyRankings[weekIdx + delta]
    if (!target) return
    setSelectedQuarter(weekToYearQuarter(target.dateRange))
    setSelectedMonth(weekToYearMonth(target.dateRange))
    setSelectedWeekNum(target.weekNumber)
  }

  const navBtn = (disabled: boolean): CSSProperties => ({
    padding: '2px 10px', fontSize: 12, fontFamily: 'inherit',
    border: `1px solid ${RULE_STRONG}`, background: PAPER,
    color: disabled ? RULE_STRONG : INK_SECONDARY,
    cursor: disabled ? 'default' : 'pointer',
  })

  // ─────────────────────────────────────────────────────────────
  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: PAPER, borderLeft: `1px solid ${RULE_STRONG}`, overflow: 'hidden',
    }}>

      <div style={{ flexShrink: 0, padding: '12px 16px 0', borderBottom: `1px solid ${RULE}` }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {([['show', '節目詳情'], ['week', '週次快覽']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)} style={{ ...SEGMENT_BTN(activeTab === key), padding: '6px 12px 9px' }} {...hoverProps()}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '14px 16px' }}>

        {/* ══════════ 節目詳情 ══════════ */}
        {activeTab === 'show' && (
          <div>
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <input
                ref={inputRef}
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true) }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                placeholder="搜尋節目，或點擊左側積分榜…"
                style={INPUT_STYLE}
              />
              {showDropdown && suggestions.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                  background: '#fff', border: `1px solid ${RULE_STRONG}`,
                  maxHeight: 220, overflowY: 'auto', marginTop: -1,
                  boxShadow: '0 2px 8px rgba(26,26,24,0.10)',
                }}>
                  {suggestions.map(t => (
                    <div
                      key={t}
                      onMouseDown={e => {
                        e.preventDefault()
                        onSelectShow(t)
                        setSearchQuery(t)
                        setShowDropdown(false)
                      }}
                      style={{ padding: '7px 10px', cursor: 'pointer', fontSize: 13, color: INK, borderBottom: `1px solid ${RULE}` }}
                      onMouseEnter={e => (e.currentTarget.style.background = PAPER_RAISED)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {t}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── 週榜節目詳情 ── */}
            {rankingMode === 'weekly' && weeklyEntry && (
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: INK, lineHeight: 1.35, flex: 1 }}>
                    {weeklyEntry.title}
                  </span>
                  <button onClick={() => { onSelectShow(null); setSearchQuery('') }}
                    style={{ border: 'none', background: 'transparent', color: INK_MUTED, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', padding: 0, flexShrink: 0 }}>
                    清除
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, fontSize: 12, color: INK_SECONDARY }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 8, height: 8, background: GENRE_COLORS[weeklyEntry.genre] }} />
                    {weeklyEntry.genre}
                  </span>
                  {weeklyEntry.isNetflixOriginal && (
                    <span style={{ color: ACCENT, fontWeight: 700 }}>N 獨家</span>
                  )}
                  <span style={{ ...NUM, color: INK_MUTED }}>
                    {formatYM(weeklyEntry.firstWeekDate)} – {formatYM(weeklyEntry.lastWeekDate)}
                  </span>
                </div>

                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                  border: `1px solid ${RULE}`, borderRight: 'none', marginBottom: 16,
                }}>
                  <StatCell label="最高名次" value={`${weeklyEntry.peakRank}`} />
                  <StatCell label="平均名次" value={`${weeklyEntry.avgRank}`} />
                  <StatCell label="上榜週數" value={`${weeklyEntry.weeksOnChart}`} />
                  <StatCell label="累積積分" value={`${weeklyEntry.totalScore}`} />
                </div>

                <div style={GROUP_LABEL}>各週名次</div>
                <WeekDots
                  appearances={weeklyEntry.weekAppearances}
                  onJump={jumpToWeek}
                />
                <div style={{ fontSize: 11, color: INK_MUTED, marginTop: 8 }}>
                  點擊可跳至該週榜單；紅框為前三名
                </div>
              </div>
            )}

            {/* ── 日榜節目詳情 ── */}
            {rankingMode === 'daily' && dailyEntry && (() => {
              const genre = dailyEntry.genre as Genre
              const alsoWeekly = getShowLookupEntry(fullData, dailyEntry.title)
              return (
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: INK, lineHeight: 1.35, flex: 1 }}>
                      {dailyEntry.title}
                    </span>
                    <button onClick={() => { onSelectShow(null); setSearchQuery('') }}
                      style={{ border: 'none', background: 'transparent', color: INK_MUTED, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', padding: 0, flexShrink: 0 }}>
                      清除
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, fontSize: 12, color: INK_SECONDARY }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 8, height: 8, background: GENRE_COLORS[genre] ?? '#9a9a94' }} />
                      {genre}
                    </span>
                    {dailyEntry.isNetflixOriginal && (
                      <span style={{ color: ACCENT, fontWeight: 700 }}>N 獨家</span>
                    )}
                    <span style={{ ...NUM, color: INK_MUTED }}>日榜第 {dailyEntry.rank} 名</span>
                  </div>

                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                    border: `1px solid ${RULE}`, borderRight: 'none', marginBottom: 16,
                  }}>
                    <StatCell label="日榜排名" value={`${dailyEntry.rank}`} />
                    <StatCell label="平均名次" value={`${dailyEntry.avgRank}`} />
                    <StatCell label="上榜天數" value={`${dailyEntry.weeksOnChart}`} />
                    <StatCell label="日榜積分" value={`${dailyEntry.totalScore}`} />
                  </div>

                  {alsoWeekly && (
                    <>
                      <div style={GROUP_LABEL}>週榜表現</div>
                      <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                        border: `1px solid ${RULE}`, borderRight: 'none', marginBottom: 14,
                      }}>
                        <StatCell label="週榜積分" value={`${alsoWeekly.totalScore}`} />
                        <StatCell label="上榜週數" value={`${alsoWeekly.weeksOnChart}`} />
                        <StatCell label="平均名次" value={`${alsoWeekly.avgRank}`} />
                      </div>
                      <div style={GROUP_LABEL}>各週名次</div>
                      <WeekDots appearances={alsoWeekly.weekAppearances} onJump={jumpToWeek} />
                      <div style={{ fontSize: 11, color: INK_MUTED, marginTop: 8 }}>
                        點擊可跳至該週榜單；紅框為前三名
                      </div>
                    </>
                  )}
                </div>
              )
            })()}

            {!weeklyEntry && !dailyEntry && (
              <div style={{ color: INK_MUTED, fontSize: 13, padding: '24px 0', lineHeight: 2 }}>
                點擊左側積分榜的節目，或搜尋節目名稱，即可查看詳情。
              </div>
            )}
          </div>
        )}

        {/* ══════════ 週次快覽 ══════════ */}
        {activeTab === 'week' && (
          <div>
            <div style={GROUP_LABEL}>選擇週次</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginBottom: 2 }}>
              {quarters.map(q => (
                <button
                  key={q}
                  onClick={() => { setSelectedQuarter(q); setSelectedMonth(null); setSelectedWeekNum(null) }}
                  style={{ ...SEGMENT_BTN(activeQ === q), ...NUM }}
                  {...hoverProps()}
                >
                  {qLabel(q)}
                </button>
              ))}
            </div>

            {monthsInQ.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, paddingLeft: 10, marginBottom: 2 }}>
                {monthsInQ.map(m => (
                  <button
                    key={m}
                    onClick={() => { setSelectedMonth(m); setSelectedWeekNum(null) }}
                    style={{ ...SEGMENT_BTN(activeMonth === m), ...NUM }}
                    {...hoverProps()}
                  >
                    {mLabel(m)}
                  </button>
                ))}
              </div>
            )}

            {weeksInMonth.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, paddingLeft: 20, marginBottom: 14 }}>
                {weeksInMonth.map((w, i) => (
                  <button
                    key={w.weekNumber}
                    onClick={() => setSelectedWeekNum(w.weekNumber)}
                    style={{ ...SEGMENT_BTN(activeWeekNum === w.weekNumber), ...NUM }}
                    {...hoverProps()}
                  >
                    第{i + 1}週
                  </button>
                ))}
              </div>
            )}

            {currentWeek ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <button onClick={() => stepWeek(-1)} disabled={atFirstWeek} style={navBtn(atFirstWeek)} {...hoverProps(PAPER)}>←</button>
                  <span style={{ ...NUM, flex: 1, fontSize: 12, color: INK_SECONDARY, textAlign: 'center' }}>
                    {currentWeek.dateRange.replace(' ~ ', ' – ')}
                  </span>
                  <button onClick={() => stepWeek(1)} disabled={atLastWeek} style={navBtn(atLastWeek)} {...hoverProps(PAPER)}>→</button>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <tbody>
                    {currentWeek.rankings.map(item => {
                      const genre = (item.genre === '實境' ? '實境秀' : item.genre) as Genre
                      const color = GENRE_COLORS[genre] ?? '#9a9a94'
                      const score = 11 - item.position
                      const isSelected = selectedShow === item.title
                      return (
                        <tr
                          key={`${item.position}-${item.title}`}
                          onClick={() => { onSelectShow(item.title); setActiveTab('show') }}
                          style={{
                            cursor: 'pointer',
                            background: isSelected ? ACCENT_WASH : 'transparent',
                            borderBottom: `1px solid ${RULE}`,
                          }}
                          onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = PAPER_RAISED }}
                          onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                        >
                          <td style={{
                            ...NUM, width: 28, textAlign: 'right', padding: '7px 8px 7px 0',
                            color: item.position <= 3 ? INK : INK_MUTED,
                            fontWeight: item.position <= 3 ? 700 : 400,
                            fontSize: item.position <= 3 ? 15 : 13,
                            borderLeft: `2px solid ${isSelected ? ACCENT : 'transparent'}`,
                          }}>
                            {item.position}
                          </td>
                          <td style={{ width: 12, padding: '7px 0' }}>
                            <span style={{ display: 'inline-block', width: 8, height: 8, background: color, verticalAlign: 'middle' }} />
                          </td>
                          <td style={{
                            padding: '7px 8px', color: INK, maxWidth: 0,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            fontWeight: isSelected ? 700 : 400,
                          }}>
                            {item.title}
                            {item.isNetflixOriginal && (
                              <span style={{ color: ACCENT, fontWeight: 700, fontSize: 10, marginLeft: 5 }}>N</span>
                            )}
                          </td>
                          <td style={{ ...NUM, width: 40, textAlign: 'right', padding: '7px 0', fontSize: 12, color: INK_MUTED }}>
                            {score}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: 12, rowGap: 3, marginTop: 12 }}>
                  {genreCounts.map(([g, count]) => (
                    <span key={g} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: INK_SECONDARY }}>
                      <span style={{ width: 8, height: 8, background: GENRE_COLORS[g as Genre] ?? '#9a9a94', flexShrink: 0 }} />
                      {g}
                      <span style={{ ...NUM, color: INK_MUTED }}>{count}</span>
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ color: INK_MUTED, fontSize: 13, padding: '24px 0' }}>請選擇時間區段。</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
