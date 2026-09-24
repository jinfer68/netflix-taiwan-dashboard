import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import type { DailyBoard, MovieAttributes, WeeklyBoard } from '../../types'
import DailyRankTrend from './DailyRankTrend'
import { LANGUAGE_COLORS, LANGUAGE_LABELS } from '../../constants/languages'
import { dailyTrendOf, weeklyAppearances } from '../../utils/boardTransforms'
import type { WeekAppearance } from '../../utils/boardTransforms'
import { getQuarter, weekToYearMonth, weekToYearQuarter } from '../../utils/dateHelpers'
import {
  SEGMENT_BTN, INPUT_STYLE, DOT, NUM, hoverProps,
  ACCENT, ACCENT_WASH, INK, INK_MUTED, INK_SECONDARY, PAPER, RULE, RULE_STRONG,
} from '../../constants/styles'

interface Props {
  entities: Record<string, MovieAttributes>
  boards: DailyBoard[]          // 完整日榜（單片走勢跨越側欄期間）
  weeks: WeeklyBoard[]          // 完整週榜（週次快覽可翻到任一週）
  weeksInRange: WeeklyBoard[]   // 側欄期間內的週榜，決定週次快覽的預設週
  focusDate: string | null
  onFocusDate: (date: string) => void
  selectedTitle: string | null
  onSelectTitle: (title: string | null) => void
}

const MAX_RESULTS = 60

const GROUP_LABEL: CSSProperties = {
  fontSize: 11, fontWeight: 700, color: INK_SECONDARY, letterSpacing: 1, marginBottom: 6,
}

const navBtn = (disabled: boolean): CSSProperties => ({
  padding: '2px 10px', fontSize: 12, fontFamily: 'inherit',
  border: `1px solid ${RULE_STRONG}`, background: PAPER,
  color: disabled ? RULE_STRONG : INK_SECONDARY,
  cursor: disabled ? 'default' : 'pointer',
})

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
  appearances: WeekAppearance[]
  onJump: (weekNumber: number) => void
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
      {appearances.map(w => {
        const top = w.position <= 3
        return (
          <button
            key={w.weekNumber}
            title={`${w.dateRange}　第 ${w.position} 名`}
            onClick={() => onJump(w.weekNumber)}
            style={{
              ...NUM,
              width: 24, height: 24, fontSize: 11, fontWeight: top ? 700 : 400,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: top ? ACCENT_WASH : PAPER,
              border: `1px solid ${top ? ACCENT : RULE_STRONG}`,
              color: top ? ACCENT : INK_SECONDARY,
              cursor: 'pointer', fontFamily: 'inherit', padding: 0,
            }}
            {...hoverProps(top ? ACCENT_WASH : PAPER)}
          >
            {w.position}
          </button>
        )
      })}
    </div>
  )
}

export default function MovieQuickLookup({
  entities, boards, weeks, weeksInRange, focusDate, onFocusDate, selectedTitle, onSelectTitle,
}: Props) {
  const [activeTab, setActiveTab] = useState<'movie' | 'week'>('movie')
  const [search, setSearch] = useState('')

  const [pickedQuarter, setPickedQuarter] = useState<string | null>(null)
  const [pickedMonth, setPickedMonth] = useState<string | null>(null)
  const [pickedWeek, setPickedWeek] = useState<number | null>(null)

  useEffect(() => {
    if (selectedTitle) setActiveTab('movie')
  }, [selectedTitle])

  // 側欄期間一換，週次快覽回到新期間的最後一週
  useEffect(() => {
    setPickedQuarter(null)
    setPickedMonth(null)
    setPickedWeek(null)
  }, [weeksInRange])

  // ── 影片詳情 ──
  const { results, total } = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    const matched = Object.entries(entities)
      .filter(([title]) => !keyword || title.toLowerCase().includes(keyword))
      .sort((a, b) => b[1].totalScore - a[1].totalScore)
    return { results: matched.slice(0, MAX_RESULTS), total: matched.length }
  }, [entities, search])

  const detail = selectedTitle ? entities[selectedTitle] ?? null : null

  const trend = useMemo(
    () => (selectedTitle ? dailyTrendOf(boards, selectedTitle) : []),
    [boards, selectedTitle],
  )

  const appearances = useMemo(
    () => (selectedTitle ? weeklyAppearances(weeks, selectedTitle) : []),
    [weeks, selectedTitle],
  )
  const weeklyScore = appearances.reduce((sum, w) => sum + 11 - w.position, 0)
  const weeklyAvg = appearances.length
    ? (appearances.reduce((sum, w) => sum + w.position, 0) / appearances.length).toFixed(1)
    : '—'

  const showList = !detail || search.trim() !== ''
  const rangeNote = search.trim()
    ? total > MAX_RESULTS
      ? `※ 搜尋結果 ${total} 部（僅顯示前 ${MAX_RESULTS} 部）`
      : `※ 搜尋結果 ${total} 部`
    : `※ 全期積分排行　前 ${results.length} / ${total} 部`

  // ── 週次快覽 ──
  const { quarters, monthsByQ, weeksByM } = useMemo(() => {
    const monthsByQ: Record<string, string[]> = {}
    const weeksByM: Record<string, WeeklyBoard[]> = {}
    for (const w of weeks) {
      const m = weekToYearMonth(w.dateRange)
      const q = `${m.slice(0, 4)}-${getQuarter(parseInt(m.slice(5, 7)))}`
      if (!monthsByQ[q]) monthsByQ[q] = []
      if (!monthsByQ[q].includes(m)) monthsByQ[q].push(m)
      if (!weeksByM[m]) weeksByM[m] = []
      weeksByM[m].push(w)
    }
    return { quarters: Object.keys(monthsByQ).sort(), monthsByQ, weeksByM }
  }, [weeks])

  const baseWeek = weeks.find(w => w.weekNumber === pickedWeek)
    ?? weeksInRange[weeksInRange.length - 1]
    ?? weeks[weeks.length - 1]
    ?? null
  const activeQ = pickedQuarter ?? (baseWeek ? weekToYearQuarter(baseWeek.dateRange) : quarters[quarters.length - 1])
  const monthsInQ = monthsByQ[activeQ] ?? []
  const baseMonth = baseWeek ? weekToYearMonth(baseWeek.dateRange) : null
  const activeMonth = pickedMonth && monthsInQ.includes(pickedMonth) ? pickedMonth
    : baseMonth && monthsInQ.includes(baseMonth) ? baseMonth
    : monthsInQ[monthsInQ.length - 1] ?? null
  const weeksInMonth = activeMonth ? weeksByM[activeMonth] ?? [] : []
  const currentWeek = weeksInMonth.find(w => w.weekNumber === baseWeek?.weekNumber)
    ?? weeksInMonth[weeksInMonth.length - 1]
    ?? null

  const weekIdx = currentWeek ? weeks.indexOf(currentWeek) : -1
  const prevWeek = weekIdx > 0 ? weeks[weekIdx - 1] : null
  const atFirstWeek = weekIdx <= 0
  const atLastWeek = weekIdx < 0 || weekIdx >= weeks.length - 1

  function goToWeek(weekNumber: number) {
    const target = weeks.find(w => w.weekNumber === weekNumber)
    if (!target) return
    setPickedQuarter(weekToYearQuarter(target.dateRange))
    setPickedMonth(weekToYearMonth(target.dateRange))
    setPickedWeek(target.weekNumber)
    setActiveTab('week')
  }

  const languageCounts = useMemo(() => {
    if (!currentWeek) return []
    return LANGUAGE_LABELS
      .map(l => [l, currentWeek.rankings.filter(r => entities[r.title]?.language === l).length] as const)
      .filter(([, n]) => n > 0)
  }, [currentWeek, entities])

  const qLabel = (q: string) => `${q.slice(2, 4)} ${q.slice(5)}`
  const mLabel = (m: string) => `${parseInt(m.slice(5, 7))}月`

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: PAPER, overflow: 'hidden' }}>

      <div style={{ flexShrink: 0, padding: '12px 16px 0', borderBottom: `1px solid ${RULE}` }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {([['movie', '影片詳情'], ['week', '週次快覽']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{ ...SEGMENT_BTN(activeTab === key), padding: '6px 12px 9px' }}
              {...hoverProps()}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '14px 16px' }}>

        {activeTab === 'movie' && (
          <div>
            <input
              type="text"
              placeholder="搜尋電影，或點擊左側積分榜…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={INPUT_STYLE}
            />

            {!showList && detail && selectedTitle && (
              <div style={{ marginTop: 14 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: INK, lineHeight: 1.35, flex: 1 }}>
                    {selectedTitle}
                  </span>
                  <button
                    onClick={() => onSelectTitle(null)}
                    style={{ border: 'none', background: 'transparent', color: INK_MUTED, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', padding: 0, flexShrink: 0 }}
                  >
                    清除
                  </button>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 12, fontSize: 12, color: INK_SECONDARY }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 8, height: 8, background: LANGUAGE_COLORS[detail.language] }} />
                    {detail.language}・{detail.format}
                  </span>
                  {detail.origin && <span>產地 {detail.origin}</span>}
                  {detail.isNetflixOriginal && <span style={{ color: ACCENT, fontWeight: 700 }}>N 獨家</span>}
                  <span style={{ ...NUM, color: INK_MUTED }}>
                    {detail.firstDate.replace(/-/g, '/')} – {detail.lastDate.replace(/-/g, '/')}
                  </span>
                </div>

                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                  border: `1px solid ${RULE}`, borderRight: 'none', marginBottom: 16,
                }}>
                  <StatCell label="最佳名次" value={`${detail.bestRank}`} />
                  <StatCell label="平均名次" value={detail.avgRank.toFixed(1)} />
                  <StatCell label="在榜天數" value={`${detail.daysOnChart}`} />
                  <StatCell label="日榜積分" value={`${detail.totalScore}`} />
                </div>

                <div style={GROUP_LABEL}>日榜名次走勢</div>
                <DailyRankTrend
                  points={trend}
                  focusDate={focusDate}
                  onPickDate={onFocusDate}
                  clickHint="點擊查看當日榜單"
                />
                <div style={{ fontSize: 11, color: INK_MUTED, margin: '4px 0 16px' }}>
                  首次上榜至最後上榜；斷線處為當天未上榜。點擊任一天，下方當日榜單即跳至該日
                </div>

                {appearances.length > 0 && (
                  <>
                    <div style={GROUP_LABEL}>週榜表現</div>
                    <div style={{
                      display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                      border: `1px solid ${RULE}`, borderRight: 'none', marginBottom: 14,
                    }}>
                      <StatCell label="週榜積分" value={`${weeklyScore}`} />
                      <StatCell label="上榜週數" value={`${appearances.length}`} />
                      <StatCell label="平均名次" value={weeklyAvg} />
                    </div>
                    <div style={GROUP_LABEL}>各週名次</div>
                    <WeekDots appearances={appearances} onJump={goToWeek} />
                    <div style={{ fontSize: 11, color: INK_MUTED, marginTop: 8 }}>
                      點擊可跳至該週榜單；紅框為前三名
                    </div>
                  </>
                )}
              </div>
            )}

            {showList && (
              <>
                <div style={{ fontSize: 11, color: INK_MUTED, marginTop: 6 }}>{rangeNote}</div>
                <div style={{ marginTop: 8 }}>
                  {results.map(([title, attrs]) => (
                    <button
                      key={title}
                      onClick={() => { onSelectTitle(title); setSearch('') }}
                      title={title}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                        padding: '7px 6px', border: 'none', borderBottom: `1px solid ${RULE}`,
                        background: 'transparent', cursor: 'pointer', fontSize: 13,
                        fontFamily: 'inherit', textAlign: 'left', color: INK_SECONDARY,
                      }}
                      {...hoverProps()}
                    >
                      <span style={DOT(LANGUAGE_COLORS[attrs.language], true)} />
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {title}
                      </span>
                      <span style={{ ...NUM, fontSize: 12, color: INK_MUTED }}>{attrs.totalScore}</span>
                    </button>
                  ))}
                  {results.length === 0 && (
                    <div style={{ fontSize: 12, color: INK_MUTED, padding: '8px 0' }}>找不到符合的電影</div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'week' && (
          <div>
            <div style={GROUP_LABEL}>選擇週次</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginBottom: 2 }}>
              {quarters.map(q => (
                <button
                  key={q}
                  onClick={() => { setPickedQuarter(q); setPickedMonth(null); setPickedWeek(null) }}
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
                    onClick={() => { setPickedQuarter(activeQ); setPickedMonth(m); setPickedWeek(null) }}
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
                    onClick={() => goToWeek(w.weekNumber)}
                    style={{ ...SEGMENT_BTN(currentWeek?.weekNumber === w.weekNumber), ...NUM }}
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
                  <button
                    onClick={() => atFirstWeek || goToWeek(weeks[weekIdx - 1].weekNumber)}
                    disabled={atFirstWeek} style={navBtn(atFirstWeek)} {...hoverProps(PAPER)}
                  >←</button>
                  <span style={{ ...NUM, flex: 1, fontSize: 12, color: INK_SECONDARY, textAlign: 'center' }}>
                    {currentWeek.dateRange.replace(' ~ ', ' – ')}
                  </span>
                  <button
                    onClick={() => atLastWeek || goToWeek(weeks[weekIdx + 1].weekNumber)}
                    disabled={atLastWeek} style={navBtn(atLastWeek)} {...hoverProps(PAPER)}
                  >→</button>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <tbody>
                    {currentWeek.rankings.map(item => {
                      const attrs = entities[item.title]
                      const isSelected = selectedTitle === item.title
                      const prevRank = prevWeek?.rankings.find(r => r.title === item.title)?.rank ?? null
                      const delta = !prevWeek ? '' : prevRank === null ? '新'
                        : prevRank === item.rank ? '—'
                        : prevRank > item.rank ? `↑${prevRank - item.rank}`
                        : `↓${item.rank - prevRank}`
                      const deltaColor = prevRank === null ? ACCENT
                        : prevRank > item.rank ? INK : INK_MUTED
                      return (
                        <tr
                          key={`${item.rank}-${item.title}`}
                          onClick={() => { onSelectTitle(item.title); setActiveTab('movie') }}
                          style={{ cursor: 'pointer', background: isSelected ? ACCENT_WASH : 'transparent', borderBottom: `1px solid ${RULE}` }}
                          {...hoverProps(isSelected ? ACCENT_WASH : 'transparent')}
                        >
                          <td style={{
                            ...NUM, width: 28, textAlign: 'right', padding: '7px 8px 7px 0',
                            color: item.rank <= 3 ? INK : INK_MUTED,
                            fontWeight: item.rank <= 3 ? 700 : 400,
                            fontSize: item.rank <= 3 ? 15 : 13,
                            borderLeft: `2px solid ${isSelected ? ACCENT : 'transparent'}`,
                          }}>
                            {item.rank}
                          </td>
                          <td style={{ width: 12, padding: '7px 0' }}>
                            <span style={{ display: 'inline-block', width: 8, height: 8, background: LANGUAGE_COLORS[attrs?.language ?? '其他語言'], verticalAlign: 'middle' }} />
                          </td>
                          <td
                            title={item.title}
                            style={{
                              padding: '7px 8px', color: INK, maxWidth: 0,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              fontWeight: isSelected ? 700 : 400,
                            }}
                          >
                            {item.title}
                            {attrs?.isNetflixOriginal && (
                              <span style={{ color: ACCENT, fontWeight: 700, fontSize: 10, marginLeft: 5 }}>N</span>
                            )}
                          </td>
                          <td
                            title={prevWeek ? `與 ${prevWeek.dateRange} 相比` : undefined}
                            style={{ ...NUM, width: 34, textAlign: 'right', padding: '7px 0', fontSize: 12, fontWeight: 700, color: deltaColor }}
                          >
                            {delta}
                          </td>
                          <td style={{ ...NUM, width: 32, textAlign: 'right', padding: '7px 0', fontSize: 12, color: INK_MUTED }}>
                            {item.score}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: 12, rowGap: 3, marginTop: 12 }}>
                  {languageCounts.map(([l, n]) => (
                    <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: INK_SECONDARY }}>
                      <span style={{ width: 8, height: 8, background: LANGUAGE_COLORS[l], flexShrink: 0 }} />
                      {l}
                      <span style={{ ...NUM, color: INK_MUTED }}>{n}</span>
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ color: INK_MUTED, fontSize: 13, padding: '24px 0' }}>此期間沒有週榜資料。</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
