import { useState, useMemo, useEffect, useRef } from 'react'
import type { RankingsData } from '../../types'
import { getAllWeeklyTitles, getShowLookupEntry } from '../../utils/dataTransforms'
import { GENRE_COLORS, GENRE_ICONS } from '../../constants/genres'
import type { Genre } from '../../types'
import { SECTION_STYLE, SECTION_TITLE, PILL_BTN } from '../../constants/styles'
import { getQuarter, weekToYearQuarter, weekToYearMonth } from '../../utils/dateHelpers'

interface Props {
  data: RankingsData
  selectedShow: string | null
  onSelectShow: (title: string | null) => void
}

function dotColor(pos: number) {
  if (pos <= 3) return { bg: '#0d2b0d', border: '#1db954', text: '#1db954' }
  if (pos <= 7) return { bg: '#2b2200', border: '#f5c518', text: '#f5c518' }
  return { bg: '#1e1e1e', border: '#555', text: '#888' }
}

function formatYM(d: string) { return d.substring(0, 7).replace('-', '/') }


export default function QuickLookup({ data, selectedShow, onSelectShow }: Props) {
  const [activeTab, setActiveTab] = useState<'show' | 'week'>('show')

  // ── Show tab：搜尋 fallback ──
  const [searchQuery, setSearchQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Week tab：時間導航 ──
  const [selectedQuarter, setSelectedQuarter] = useState<string>('latest')
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [selectedWeekNum, setSelectedWeekNum] = useState<number | null>(null)

  // 當外部資料變更（年份切換）時 reset
  useEffect(() => {
    setSearchQuery('')
    setSelectedQuarter('latest')
    setSelectedMonth(null)
    setSelectedWeekNum(null)
  }, [data])

  // 外部選擇節目時自動切換到 show tab，並同步週次快覽到首次上榜週
  useEffect(() => {
    if (!selectedShow) return
    setActiveTab('show')
    // 找到該節目首次上榜的週次，同步週次快覽導航
    const firstWeek = data.weeklyRankings.find(w =>
      w.rankings.some(r => r.title === selectedShow)
    )
    if (firstWeek) {
      const dr = firstWeek.dateRange
      setSelectedQuarter(weekToYearQuarter(dr))
      setSelectedMonth(weekToYearMonth(dr))
      setSelectedWeekNum(firstWeek.weekNumber)
    }
  }, [selectedShow, data])

  // ── Show lookup ──
  const allTitles = useMemo(() => getAllWeeklyTitles(data), [data])
  const suggestions = useMemo(() =>
    searchQuery.length >= 1
      ? allTitles.filter(t => t.includes(searchQuery)).slice(0, 10)
      : [],
    [allTitles, searchQuery],
  )
  const entry = useMemo(
    () => selectedShow ? getShowLookupEntry(data, selectedShow) : null,
    [data, selectedShow],
  )

  // ── Week tab：可用時間區段 ──
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

  // 當前季度的月份
  const activeQ = selectedQuarter === 'latest' ? quarters[quarters.length - 1] : selectedQuarter
  const monthsInQ = monthsByQ[activeQ] ?? []

  // 自動選定最新月份
  const activeMonth = selectedMonth && monthsInQ.includes(selectedMonth)
    ? selectedMonth
    : monthsInQ[monthsInQ.length - 1] ?? null

  // 當前月份的週次
  const weeksInMonth = activeMonth ? (weeksByM[activeMonth] ?? []) : []

  // 當前選定的週次
  const activeWeekNum = selectedWeekNum && weeksInMonth.some(w => w.weekNumber === selectedWeekNum)
    ? selectedWeekNum
    : weeksInMonth[weeksInMonth.length - 1]?.weekNumber ?? null

  const currentWeek = activeWeekNum
    ? data.weeklyRankings.find(w => w.weekNumber === activeWeekNum) ?? null
    : null

  const genrePills = useMemo(() => {
    if (!currentWeek) return []
    const counts: Record<string, number> = {}
    currentWeek.rankings.forEach(r => {
      const g = r.genre === '實境' ? '實境秀' : r.genre
      counts[g] = (counts[g] ?? 0) + 1
    })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [currentWeek])

  // ── 季度 / 月份 label ──
  const qLabel = (q: string) => {
    const [y, quarter] = q.split('-')
    return `${y.substring(2)} ${quarter}`
  }
  const mLabel = (m: string) => `${parseInt(m.substring(5, 7))}月`

  return (
    <div style={SECTION_STYLE}>
      <div style={SECTION_TITLE}>快速查詢</div>

      {/* Tab 切換 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {([['show', '節目詳情'], ['week', '週次快覽']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              padding: '6px 20px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
              border: activeTab === key ? '1px solid #7c6fff' : '1px solid #333',
              background: activeTab === key ? '#2a2060' : 'transparent',
              color: activeTab === key ? '#b9aaff' : '#666',
              fontWeight: activeTab === key ? 700 : 400,
              transition: 'all 0.15s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ══════════ Tab 1：節目詳情 ══════════ */}
      {activeTab === 'show' && (
        <div>
          {/* 搜尋（備用入口） */}
          <div style={{ position: 'relative', maxWidth: 420, marginBottom: 16 }}>
            <input
              ref={inputRef}
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true) }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              placeholder="搜尋節目名稱，或點擊上方積分榜的節目…"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: '#1a1a2e', border: '1px solid #333', borderRadius: 8,
                padding: '9px 14px', color: '#eee', fontSize: 13, outline: 'none',
              }}
            />
            {showDropdown && suggestions.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                background: '#1a1a2e', border: '1px solid #333', borderRadius: 8,
                maxHeight: 240, overflowY: 'auto', marginTop: 4,
                boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
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
                    style={{ padding: '9px 14px', cursor: 'pointer', fontSize: 13, color: '#ddd', borderBottom: '1px solid #222' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#1e1e38')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {t}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 摘要卡片 */}
          {entry ? (
            <div style={{ background: '#16162a', border: '1px solid #2a2a3e', borderRadius: 10, padding: 20 }}>
              {/* 標題 + badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: '#eee' }}>{entry.title}</span>
                <span style={{
                  padding: '2px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                  background: GENRE_COLORS[entry.genre] + '33',
                  border: `1px solid ${GENRE_COLORS[entry.genre]}`,
                  color: GENRE_COLORS[entry.genre],
                }}>
                  {GENRE_ICONS[entry.genre]} {entry.genre}
                </span>
                {entry.isNetflixOriginal && (
                  <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 700, background: '#e50914', color: '#fff' }}>
                    N 原創
                  </span>
                )}
                <button
                  onClick={() => { onSelectShow(null); setSearchQuery('') }}
                  style={{ marginLeft: 'auto', background: 'transparent', border: '1px solid #333', borderRadius: 6, color: '#666', fontSize: 11, padding: '3px 10px', cursor: 'pointer' }}
                >
                  清除
                </button>
              </div>

              {/* 四格 stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
                {([
                  ['最高名次', `#${entry.peakRank}`],
                  ['平均名次', `${entry.avgRank}`],
                  ['上榜週數', `${entry.weeksOnChart} 週`],
                  ['累積積分', `${entry.totalScore}`],
                ] as const).map(([label, val]) => (
                  <div key={label} style={{ background: '#0f0f1e', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#f5c518' }}>{val}</div>
                  </div>
                ))}
              </div>

              {/* 上榜期間 */}
              <div style={{ fontSize: 13, color: '#888', marginBottom: 14 }}>
                上榜期間&ensp;
                <span style={{ color: '#bbb' }}>{formatYM(entry.firstWeekDate)} ～ {formatYM(entry.lastWeekDate)}</span>
              </div>

              {/* 週次 dots */}
              <div style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>各週名次</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {entry.weekAppearances.map(w => {
                  const c = dotColor(w.position)
                  return (
                    <div
                      key={w.weekNumber}
                      title={`W${String(w.weekNumber).padStart(2, '0')}  ${w.dateRange}  第 ${w.position} 名（點擊查看該週）`}
                      onClick={() => {
                        setSelectedQuarter(weekToYearQuarter(w.dateRange))
                        setSelectedMonth(weekToYearMonth(w.dateRange))
                        setSelectedWeekNum(w.weekNumber)
                        setActiveTab('week')
                      }}
                      style={{
                        width: 24, height: 24, borderRadius: '50%', fontSize: 11,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: c.bg, border: `1px solid ${c.border}`, color: c.text,
                        cursor: 'pointer', fontWeight: 600,
                      }}
                    >
                      {w.position}
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 11, color: '#555' }}>
                {[['#1-3', '#1db954'], ['#4-7', '#f5c518'], ['#8-10', '#555']].map(([lbl, col]) => (
                  <span key={lbl}>
                    <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', border: `1px solid ${col}`, marginRight: 4, verticalAlign: 'middle' }} />
                    {lbl}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ color: '#444', fontSize: 14, padding: '16px 0' }}>
              點擊上方積分榜中的節目，或搜尋節目名稱以查看詳情
            </div>
          )}
        </div>
      )}

      {/* ══════════ Tab 2：週次快覽 ══════════ */}
      {activeTab === 'week' && (
        <div>
          {/* 季度按鈕 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {quarters.map(q => (
              <button
                key={q}
                onClick={() => { setSelectedQuarter(q); setSelectedMonth(null); setSelectedWeekNum(null) }}
                style={PILL_BTN(activeQ === q)}
              >
                {qLabel(q)}
              </button>
            ))}
          </div>

          {/* 月份按鈕 */}
          {monthsInQ.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {monthsInQ.map(m => (
                <button
                  key={m}
                  onClick={() => { setSelectedMonth(m); setSelectedWeekNum(null) }}
                  style={PILL_BTN(activeMonth === m, '#f5c518')}
                >
                  {m.substring(0, 4)}/{mLabel(m)}
                </button>
              ))}
            </div>
          )}

          {/* 週次按鈕 */}
          {weeksInMonth.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {weeksInMonth.map((w, i) => (
                <button
                  key={w.weekNumber}
                  onClick={() => setSelectedWeekNum(w.weekNumber)}
                  style={PILL_BTN(activeWeekNum === w.weekNumber, '#1db954')}
                >
                  第{i + 1}週
                  <span style={{ fontSize: 10, marginLeft: 4, opacity: 0.6 }}>
                    {w.dateRange.split(' ~ ')[0].substring(5).replace('-', '/')}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Top-10 列表 */}
          {currentWeek ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <button
                  onClick={() => {
                    const idx = data.weeklyRankings.findIndex(w => w.weekNumber === currentWeek.weekNumber)
                    if (idx > 0) {
                      const prev = data.weeklyRankings[idx - 1]
                      setSelectedQuarter(weekToYearQuarter(prev.dateRange))
                      setSelectedMonth(weekToYearMonth(prev.dateRange))
                      setSelectedWeekNum(prev.weekNumber)
                    }
                  }}
                  disabled={data.weeklyRankings[0]?.weekNumber === currentWeek.weekNumber}
                  style={{
                    padding: '3px 10px', borderRadius: 6, fontSize: 13, cursor: 'pointer',
                    border: '1px solid #333', background: 'transparent',
                    color: data.weeklyRankings[0]?.weekNumber === currentWeek.weekNumber ? '#333' : '#aaa',
                  }}
                >◀</button>
                <span style={{ fontSize: 13, color: '#666' }}>
                  W{String(currentWeek.weekNumber).padStart(2, '0')}&ensp;{currentWeek.dateRange}
                </span>
                <button
                  onClick={() => {
                    const idx = data.weeklyRankings.findIndex(w => w.weekNumber === currentWeek.weekNumber)
                    if (idx < data.weeklyRankings.length - 1) {
                      const next = data.weeklyRankings[idx + 1]
                      setSelectedQuarter(weekToYearQuarter(next.dateRange))
                      setSelectedMonth(weekToYearMonth(next.dateRange))
                      setSelectedWeekNum(next.weekNumber)
                    }
                  }}
                  disabled={data.weeklyRankings[data.weeklyRankings.length - 1]?.weekNumber === currentWeek.weekNumber}
                  style={{
                    padding: '3px 10px', borderRadius: 6, fontSize: 13, cursor: 'pointer',
                    border: '1px solid #333', background: 'transparent',
                    color: data.weeklyRankings[data.weeklyRankings.length - 1]?.weekNumber === currentWeek.weekNumber ? '#333' : '#aaa',
                  }}
                >▶</button>
              </div>
              <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #1e1e32' }}>
                {currentWeek.rankings.map(item => {
                  const genre = (item.genre === '實境' ? '實境秀' : item.genre) as Genre
                  const color = GENRE_COLORS[genre] ?? '#95a5a6'
                  const score = item.score ?? (11 - item.position)
                  return (
                    <div
                      key={`${item.position}-${item.title}`}
                      onClick={() => { onSelectShow(item.title); setActiveTab('show') }}
                      style={{
                        display: 'flex', alignItems: 'center', height: 36,
                        borderBottom: '1px solid #16162a', background: '#111124',
                        cursor: 'pointer', transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#1a1a38')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#111124')}
                    >
                      <div style={{ width: 3, height: '100%', background: color, flexShrink: 0 }} />
                      <div style={{
                        width: 30, textAlign: 'right', paddingRight: 10, fontSize: 14,
                        color: item.position <= 3 ? '#f5c518' : '#555',
                        fontWeight: item.position <= 3 ? 700 : 400, flexShrink: 0,
                      }}>
                        {item.position}
                      </div>
                      <div style={{ flex: 1, fontSize: 13, color: '#ddd', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.title}
                        {item.isNetflixOriginal && (
                          <span style={{ color: '#e50914', fontWeight: 700, fontSize: 10, marginLeft: 6 }}>N</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#555', paddingRight: 14, flexShrink: 0 }}>
                        {score} 分
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* 類型 pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
                {genrePills.map(([g, count]) => {
                  const color = GENRE_COLORS[g as Genre] ?? '#95a5a6'
                  return (
                    <div key={g} style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '4px 10px', borderRadius: 20, fontSize: 12,
                      background: color + '1a', border: `1px solid ${color}`, color,
                    }}>
                      {GENRE_ICONS[g as Genre]} {g} ×{count}
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div style={{ color: '#444', fontSize: 14 }}>請選擇時間區段</div>
          )}
        </div>
      )}
    </div>
  )
}
