import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Cell, ResponsiveContainer,
} from 'recharts'
import type { RankingsData, OverallRankingEntry } from '../../types'
import { GENRE_COLORS } from '../../constants/genres'
import { TOOLTIP_STYLE } from '../../constants/styles'
import { getWeeklyDerivedRankings } from '../../utils/dataTransforms'
import { weekToYearQuarter, weekToYearMonth } from '../../utils/dateHelpers'

interface Props {
  data: RankingsData
  activeGenres: Set<string>
  netflixOnly: boolean
  selectedQuarter: string
  selectedMonth: string | null
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

export default function Top20Chart({
  data, activeGenres, netflixOnly, selectedQuarter, selectedMonth,
  selectedShow, onSelectShow,
}: Props) {

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

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '16px 20px' }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
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
                if (selectedShow === d.title) return
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
      </div>
      <div style={{ fontSize: 11, color: '#555', paddingTop: 6, textAlign: 'right' }}>
        <span style={{ color: '#e50914', fontWeight: 700 }}>N</span> = Netflix 獨家
      </div>
    </div>
  )
}
