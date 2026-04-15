import { useState, useMemo, useEffect, useRef } from 'react'
import type { RankingsData } from '../../types'
import { getAllWeeklyTitles, getShowLookupEntry } from '../../utils/dataTransforms'
import { GENRE_COLORS, GENRE_ICONS } from '../../constants/genres'
import type { Genre } from '../../types'
import { PILL_BTN } from '../../constants/styles'
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

  // ── Show tab：搜尋 ──
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

  // 外部點選節目時→切到 show tab，並同步週次導航到首次上榜週
  useEffect(() => {
    if (!selectedShow) return
    setActiveTab('show')
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

  const genrePills = useMemo(() => {
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

  // ─────────────────────────────────────────────────────────────
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0f0f1e', borderRadius: 10, border: '1px solid #1e1e2e', overflow: 'hidden' }}>

      {/* ── 頂部：Tab 切換 ── */}
      <div style={{ flexShrink: 0, padding: '12px 14px 10px', borderBottom: '1px solid #1e1e2e' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {([['show', '🎬 節目詳情'], ['week', '📅 週次快覽']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                border: activeTab === key ? '1px solid #7c6fff' : '1px solid #2a2a3e',
                background: activeTab === key ? '#2a2060' : 'transparent',
                color: activeTab === key ? '#c9bbff' : '#555',
                fontWeight: activeTab === key ? 700 : 400,
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 捲動內容區 ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 14px' }}>

        {/* ══════════ Tab 1：節目詳情 ══════════ */}
        {activeTab === 'show' && (
          <div>
            {/* 搜尋框 */}
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <input
                ref={inputRef}
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true) }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                placeholder="搜尋節目，或點擊左側積分榜…"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 8,
                  padding: '9px 12px', color: '#eee', fontSize: 13, outline: 'none',
                }}
              />
              {showDropdown && suggestions.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                  background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 8,
                  maxHeight: 220, overflowY: 'auto', marginTop: 4,
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
                      style={{ padding: '9px 12px', cursor: 'pointer', fontSize: 13, color: '#ddd', borderBottom: '1px solid #1e1e2e' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#1e1e38')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {t}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 節目詳情卡片 */}
            {entry ? (
              <div style={{ background: '#16162a', border: '1px solid #2a2a3e', borderRadius: 10, padding: 14 }}>

                {/* 標題行 */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#eee', lineHeight: 1.4, flex: 1 }}>{entry.title}</span>
                  <button
                    onClick={() => { onSelectShow(null); setSearchQuery('') }}
                    style={{ background: 'transparent', border: '1px solid #333', borderRadius: 6, color: '#555', fontSize: 11, padding: '3px 8px', cursor: 'pointer', flexShrink: 0 }}
                  >
                    清除
                  </button>
                </div>

                {/* Badges */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                    background: GENRE_COLORS[entry.genre] + '33',
                    border: `1px solid ${GENRE_COLORS[entry.genre]}`,
                    color: GENRE_COLORS[entry.genre],
                  }}>
                    {GENRE_ICONS[entry.genre]} {entry.genre}
                  </span>
                  {entry.isNetflixOriginal && (
                    <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 12, fontWeight: 700, background: '#e50914', color: '#fff' }}>
                      N 原創
                    </span>
                  )}
                </div>

                {/* 2×2 統計格 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                  {([
                    ['最高名次', `#${entry.peakRank}`, '#1db954'],
                    ['平均名次', `${entry.avgRank}`, '#aaa'],
                    ['上榜週數', `${entry.weeksOnChart} 週`, '#f5c518'],
                    ['累積積分', `${entry.totalScore}`, '#e50914'],
                  ] as const).map(([label, val, col]) => (
                    <div key={label} style={{ background: '#0f0f1e', borderRadius: 8, padding: '10px 10px', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: '#555', marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: col }}>{val}</div>
                    </div>
                  ))}
                </div>

                {/* 上榜期間 */}
                <div style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
                  上榜期間&ensp;
                  <span style={{ color: '#bbb' }}>{formatYM(entry.firstWeekDate)} ～ {formatYM(entry.lastWeekDate)}</span>
                </div>

                {/* 各週名次 dots */}
                <div style={{ fontSize: 11, color: '#555', marginBottom: 7 }}>
                  各週名次
                  <span style={{ marginLeft: 8, color: '#333', fontStyle: 'italic' }}>點擊跳至該週榜單</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                  {entry.weekAppearances.map(w => {
                    const c = dotColor(w.position)
                    return (
                      <div
                        key={w.weekNumber}
                        title={`W${String(w.weekNumber).padStart(2, '0')}  ${w.dateRange}  第 ${w.position} 名`}
                        onClick={() => {
                          setSelectedQuarter(weekToYearQuarter(w.dateRange))
                          setSelectedMonth(weekToYearMonth(w.dateRange))
                          setSelectedWeekNum(w.weekNumber)
                          setActiveTab('week')
                        }}
                        style={{
                          width: 26, height: 26, borderRadius: '50%', fontSize: 11,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: c.bg, border: `1.5px solid ${c.border}`, color: c.text,
                          cursor: 'pointer', fontWeight: 700,
                          transition: 'transform 0.1s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.25)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
                      >
                        {w.position}
                      </div>
                    )
                  })}
                </div>

                {/* 圖例 */}
                <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#444' }}>
                  {[['#1-3', '#1db954'], ['#4-7', '#f5c518'], ['#8-10', '#555']].map(([lbl, col]) => (
                    <span key={lbl}>
                      <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', border: `1.5px solid ${col}`, marginRight: 4, verticalAlign: 'middle' }} />
                      {lbl}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ color: '#333', fontSize: 13, padding: '20px 0', textAlign: 'center', lineHeight: 2 }}>
                點擊左側積分榜的節目<br />或搜尋節目名稱<br />即可查看詳情
              </div>
            )}
          </div>
        )}

        {/* ══════════ Tab 2：週次快覽 ══════════ */}
        {activeTab === 'week' && (
          <div>
            {/* 季度按鈕 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
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
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
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
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
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
                {/* 週次導航 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
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
                      border: '1px solid #2a2a3e', background: 'transparent',
                      color: data.weeklyRankings[0]?.weekNumber === currentWeek.weekNumber ? '#333' : '#aaa',
                    }}
                  >◀</button>
                  <span style={{ flex: 1, fontSize: 12, color: '#555', textAlign: 'center' }}>
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
                      border: '1px solid #2a2a3e', background: 'transparent',
                      color: data.weeklyRankings[data.weeklyRankings.length - 1]?.weekNumber === currentWeek.weekNumber ? '#333' : '#aaa',
                    }}
                  >▶</button>
                </div>

                {/* 排行列表 */}
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
                          display: 'flex', alignItems: 'center', height: 38,
                          borderBottom: '1px solid #16162a', background: '#111124',
                          cursor: 'pointer', transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#1a1a38')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#111124')}
                      >
                        <div style={{ width: 3, height: '100%', background: color, flexShrink: 0 }} />
                        <div style={{
                          width: 30, textAlign: 'right', paddingRight: 8, fontSize: 14,
                          color: item.position <= 3 ? '#f5c518' : '#444',
                          fontWeight: item.position <= 3 ? 700 : 400, flexShrink: 0,
                        }}>
                          {item.position}
                        </div>
                        <div style={{ flex: 1, fontSize: 13, color: '#ddd', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.title}
                          {item.isNetflixOriginal && (
                            <span style={{ color: '#e50914', fontWeight: 700, fontSize: 10, marginLeft: 5 }}>N</span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: '#444', paddingRight: 10, flexShrink: 0 }}>
                          {score}分
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* 類型 pills */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                  {genrePills.map(([g, count]) => {
                    const color = GENRE_COLORS[g as Genre] ?? '#95a5a6'
                    return (
                      <div key={g} style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '3px 9px', borderRadius: 20, fontSize: 11,
                        background: color + '1a', border: `1px solid ${color}`, color,
                      }}>
                        {GENRE_ICONS[g as Genre]} {g} ×{count}
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <div style={{ color: '#333', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>請選擇時間區段</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
