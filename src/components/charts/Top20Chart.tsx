import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Cell, ResponsiveContainer,
} from 'recharts'
import type { RankingsData, OverallRankingEntry } from '../../types'
import { GENRE_COLORS, GENRE_ICONS, GENRE_LABELS } from '../../constants/genres'
import { TOOLTIP_STYLE } from '../../constants/styles'
import { getWeeklyDerivedRankings } from '../../utils/dataTransforms'

interface Props {
  data: RankingsData
  selectedShow?: string | null
  onSelectShow?: (title: string | null) => void
}

interface ChartEntry extends OverallRankingEntry {
  chartRank: number
}

interface TooltipPayload {
  payload?: ChartEntry
}

function formatYearMonth(dateStr?: string): string {
  if (!dateStr) return '-'
  const [year, month] = dateStr.split('-')
  return `${year}年${parseInt(month)}月`
}

function CustomTooltip({
  active, payload, firstWeekStart, lastWeekStart,
}: {
  active?: boolean
  payload?: TooltipPayload[]
  firstWeekStart: string
  lastWeekStart: string
}) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  if (!d) return null
  const isEdgeWeek = (
    (firstWeekStart && d.firstWeekDate === firstWeekStart) ||
    (lastWeekStart  && d.lastWeekDate  === lastWeekStart)
  )
  return (
    <div style={TOOLTIP_STYLE}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>
        {d.title}
        {d.isNetflixOriginal && (
          <span style={{
            marginLeft: 8, fontSize: 11, fontWeight: 700,
            background: '#e50914', color: '#fff',
            padding: '1px 5px', borderRadius: 3,
          }}>N 獨家</span>
        )}
      </div>
      <div>類型：{d.genre}</div>
      <div>首次上榜：{formatYearMonth(d.firstWeekDate)}</div>
      <div>期間總積分：<strong>{d.totalScore}</strong></div>
      <div>上榜週數：{d.weeksOnChart} 週</div>
      <div>平均名次：第 {d.avgRank} 名</div>
      {isEdgeWeek && (
        <div style={{ color: '#f59e0b', fontSize: 11, marginTop: 6, borderTop: '1px solid #333', paddingTop: 6 }}>
          ⚠ 首尾週資料可能不完整
        </div>
      )}
    </div>
  )
}

function CustomYAxisTick({
  x, y, payload, index, netflixSet,
}: {
  x?: number; y?: number
  payload?: { value: string }
  index?: number
  netflixSet?: Set<string>
}) {
  const isOriginal = netflixSet?.has(payload?.value ?? '')
  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="end" dominantBaseline="middle" fontSize={12}>
        <tspan fill="#555" fontSize={11}>{(index ?? 0) + 1}.</tspan>
        <tspan fill="#ddd" dx={4}>{payload?.value ?? ''}</tspan>
        {isOriginal && (
          <tspan fill="#e50914" fontSize={10} fontWeight={700} dx={5}>N</tspan>
        )}
      </text>
    </g>
  )
}

// ── 時間篩選輔助 ──────────────────────────────────────────────
function getQuarter(month: number) {
  return `Q${Math.ceil(month / 3)}`
}

function weekToYearQuarter(dateRange: string): string {
  const date = dateRange.split(' ~ ')[0]
  const year = date.substring(0, 4)
  const month = parseInt(date.substring(5, 7))
  return `${year}-${getQuarter(month)}`
}

function weekToYearMonth(dateRange: string): string {
  const date = dateRange.split(' ~ ')[0]
  return date.substring(0, 7) // "2025-03"
}

export default function Top20Chart({ data, selectedShow, onSelectShow }: Props) {
  const [activeGenres, setActiveGenres] = useState<Set<string>>(new Set())
  const [netflixOnly, setNetflixOnly] = useState(false)

  // ── 可用時間區段 ──────────────────────────────────────────
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

  const [selectedQuarter, setSelectedQuarter] = useState<string>('all')
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)

  // 季度切換時清除月份
  function handleQuarterClick(q: string) {
    setSelectedQuarter(q)
    setSelectedMonth(null)
  }

  // 月份按鈕：只顯示所選季度下的月份
  const monthsInQuarter = useMemo(() => {
    if (selectedQuarter === 'all') return []
    return availableMonths.filter(m => {
      const year = m.substring(0, 4)
      const month = parseInt(m.substring(5, 7))
      const q = `${year}-${getQuarter(month)}`
      return q === selectedQuarter
    })
  }, [selectedQuarter, availableMonths])

  // ── 依時間過濾 weeklyRankings，再衍生積分 ──────────────────
  const filteredWeeklyData: RankingsData = useMemo(() => {
    let weeks = data.weeklyRankings
    if (selectedMonth) {
      weeks = weeks.filter(w => weekToYearMonth(w.dateRange) === selectedMonth)
    } else if (selectedQuarter !== 'all') {
      weeks = weeks.filter(w => weekToYearQuarter(w.dateRange) === selectedQuarter)
    }
    return { ...data, weeklyRankings: weeks }
  }, [data, selectedQuarter, selectedMonth])

  const derivedRankings = useMemo(
    () => getWeeklyDerivedRankings(filteredWeeklyData),
    [filteredWeeklyData],
  )

  // ── 套用類型 & Netflix 篩選 ───────────────────────────────
  const availableGenres = GENRE_LABELS.filter(g => derivedRankings.some(d => d.genre === g))

  function toggleGenre(g: string) {
    setActiveGenres(prev => {
      const next = new Set(prev)
      next.has(g) ? next.delete(g) : next.add(g)
      return next
    })
  }

  const chartData: ChartEntry[] = derivedRankings
    .filter(d => activeGenres.size === 0 || activeGenres.has(d.genre))
    .filter(d => !netflixOnly || d.isNetflixOriginal)
    .slice(0, 20)
    .map((d, i) => ({ ...d, chartRank: i + 1 }))

  const netflixSet = useMemo(
    () => new Set(chartData.filter(d => d.isNetflixOriginal).map(d => d.title)),
    [chartData],
  )

  const firstWeekStart = filteredWeeklyData.weeklyRankings[0]?.dateRange.split(' ~ ')[0] ?? ''
  const lastWeekStart  = filteredWeeklyData.weeklyRankings[filteredWeeklyData.weeklyRankings.length - 1]?.dateRange.split(' ~ ')[0] ?? ''

  // ── 季度 label ────────────────────────────────────────────
  function quarterLabel(q: string) {
    if (q === 'all') return '全部'
    const [year, quarter] = q.split('-')
    return `${year.substring(2)} ${quarter}`  // "25 Q1"
  }

  function monthLabel(m: string) {
    return `${parseInt(m.substring(5, 7))}月`
  }

  return (
    <div>
      {/* ── 時間篩選 ── */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>時間範圍</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: monthsInQuarter.length ? 8 : 0 }}>
          {availableQuarters.map(q => {
            const active = selectedQuarter === q && !selectedMonth
            return (
              <button
                key={q}
                onClick={() => handleQuarterClick(q)}
                style={{
                  padding: '4px 12px', borderRadius: 20, fontSize: 12,
                  cursor: 'pointer',
                  border: `1px solid ${active ? '#7c6fff' : '#333'}`,
                  background: active ? '#2a2060' : 'transparent',
                  color: active ? '#b9aaff' : '#888',
                  fontWeight: active ? 700 : 400,
                  transition: 'all 0.15s',
                }}
              >
                {quarterLabel(q)}
              </button>
            )
          })}
        </div>
        {/* 月份子按鈕 */}
        {monthsInQuarter.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingLeft: 4 }}>
            {monthsInQuarter.map(m => {
              const active = selectedMonth === m
              return (
                <button
                  key={m}
                  onClick={() => setSelectedMonth(active ? null : m)}
                  style={{
                    padding: '3px 10px', borderRadius: 20, fontSize: 12,
                    cursor: 'pointer',
                    border: `1px solid ${active ? '#f5c518' : '#444'}`,
                    background: active ? '#3a3010' : 'transparent',
                    color: active ? '#f5c518' : '#777',
                    fontWeight: active ? 700 : 400,
                    transition: 'all 0.15s',
                  }}
                >
                  {m.substring(0, 4)}/{monthLabel(m)}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── 類型 + Netflix 篩選 ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        {availableGenres.map(g => {
          const isActive = activeGenres.has(g)
          const color = GENRE_COLORS[g]
          return (
            <button
              key={g}
              onClick={() => toggleGenre(g)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 12px', borderRadius: 20, fontSize: 13,
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
            style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 12,
              cursor: 'pointer', border: '1px solid #555',
              background: 'transparent', color: '#888',
            }}
          >
            全部類型
          </button>
        )}

        {/* Netflix 原創篩選 */}
        <button
          onClick={() => setNetflixOnly(v => !v)}
          style={{
            marginLeft: 'auto',
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 14px', borderRadius: 20, fontSize: 13,
            cursor: 'pointer',
            border: `1px solid ${netflixOnly ? '#e50914' : '#555'}`,
            background: netflixOnly ? '#3a0505' : 'transparent',
            color: netflixOnly ? '#ff4d4d' : '#888',
            fontWeight: netflixOnly ? 700 : 400,
            transition: 'all 0.15s',
          }}
        >
          <span style={{ fontWeight: 900, color: netflixOnly ? '#e50914' : '#666' }}>N</span>
          Netflix 獨家
        </button>
      </div>

      {/* ── 主圖表 ── */}
      <ResponsiveContainer width="100%" height={Math.max(400, chartData.length * 30 + 40)}>
        <BarChart
          layout="vertical"
          data={chartData}
          margin={{ top: 4, right: 40, left: 0, bottom: 4 }}
          onDoubleClick={() => selectedShow && onSelectShow?.(null)}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#333" />
          <XAxis type="number" domain={[0, 'dataMax + 5']} tick={{ fill: '#aaa', fontSize: 12 }} />
          <YAxis
            type="category"
            dataKey="title"
            width={200}
            tick={<CustomYAxisTick netflixSet={netflixSet} />}
          />
          <Tooltip content={({ active, payload }) => (
            <CustomTooltip
              active={active} payload={payload as TooltipPayload[]}
              firstWeekStart={firstWeekStart}
              lastWeekStart={lastWeekStart}
            />
          )} />
          <Bar
            dataKey="totalScore"
            radius={[0, 4, 4, 0]}
            name="期間積分"
            style={{ cursor: onSelectShow ? 'pointer' : 'default' }}
            onClick={(d: ChartEntry) => {
              if (selectedShow === d.title) return          // 單擊同一節目不動作，留給雙擊取消
              onSelectShow?.(d.title)
            }}
          >
            {chartData.map((entry) => (
              <Cell
                key={entry.title}
                fill={GENRE_COLORS[entry.genre] ?? '#95a5a6'}
                fillOpacity={selectedShow && selectedShow !== entry.title ? 0.35 : 1}
                stroke={selectedShow === entry.title ? '#fff' : 'none'}
                strokeWidth={selectedShow === entry.title ? 1.5 : 0}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* N 標記說明 */}
      <div style={{ fontSize: 11, color: '#555', marginTop: 8, textAlign: 'right' }}>
        <span style={{ color: '#e50914', fontWeight: 700 }}>N</span> = Netflix 獨家
      </div>
    </div>
  )
}
