import { useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine, ReferenceArea,
} from 'recharts'
import type { TooltipProps } from 'recharts'
import type { RankingsData } from '../../types'
import { getDailyTrendSeries } from '../../utils/dataTransforms'
import { TOOLTIP_STYLE } from '../../constants/styles'

const COLORS = [
  '#e50914', '#f5c518', '#46d369', '#6a5acd', '#ff6b6b',
  '#4ecdc4', '#ff9f43', '#a29bfe', '#fd79a8', '#00cec9',
]

interface Props {
  data: RankingsData
  selectedTitles: string[]
}

function RankTick({ x, y, payload }: { x: number; y: number; payload: { value: number } }) {
  const val = payload.value
  if (val === 11) {
    return <text x={x} y={y} textAnchor="end" fill="#666" fontSize={10} dy={4}>榜外</text>
  }
  return <text x={x} y={y} textAnchor="end" fill="#aaa" fontSize={11} dy={4}>{val}</text>
}

function RankTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  return (
    <div style={TOOLTIP_STYLE}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>上架第 {label} 天</div>
      {payload.map((entry, i) => {
        const v = entry.value as number | null | undefined
        const display = v == null ? '無資料' : v >= 11 ? '榜外（未進 Top 10）' : `第 ${v} 名`
        return (
          <div key={i} style={{ color: entry.color, fontSize: 12 }}>
            {entry.name}：{display}
          </div>
        )
      })}
    </div>
  )
}

function CustomDot(props: {
  cx: number; cy: number; value: number | null
  stroke: string; index: number
}) {
  const { cx, cy, value, stroke } = props
  if (value == null) return null
  if (value >= 11) {
    return <circle cx={cx} cy={cy} r={4} fill="#1a1a2e" stroke={stroke} strokeWidth={1.5} strokeDasharray="2 2" opacity={0.6} />
  }
  return <circle cx={cx} cy={cy} r={3} fill={stroke} />
}

export default function RankTrendChart({ data, selectedTitles }: Props) {
  const { indices, series } = useMemo(
    () => getDailyTrendSeries(data, selectedTitles),
    [data, selectedTitles]
  )

  const chartData = useMemo(() =>
    indices.map(i => {
      const row: Record<string, number | null> = { dayIndex: i }
      for (const s of series) {
        const pt = s.data.find(d => d.dayIndex === i)
        row[s.name] = pt?.rank ?? null
      }
      return row
    }),
    [indices, series]
  )

  if (selectedTitles.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#555', fontSize: 14 }}>
        點擊上方排行榜中的節目以查看每日走勢
      </div>
    )
  }

  return (
    <div style={{ height: '100%', padding: '16px 20px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <ReferenceArea y1={10.5} y2={11.5} fill="#1a1a2e" fillOpacity={0.8} />
          <ReferenceLine y={10.5} stroke="#555" strokeDasharray="6 3"
            label={{ value: '── Top 10 ──', fill: '#555', fontSize: 10, position: 'right' }} />
          <XAxis
            dataKey="dayIndex"
            tick={{ fill: '#aaa', fontSize: 11 }}
            label={{ value: '上架天數', fill: '#aaa', fontSize: 11, position: 'insideBottomRight', offset: -5 }}
          />
          <YAxis
            reversed
            domain={[1, 11]}
            ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]}
            tick={RankTick as never}
            label={{ value: '排名', fill: '#aaa', fontSize: 11, angle: -90, position: 'insideLeft' }}
          />
          <Tooltip content={<RankTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {series.map((s, i) => (
            <Line
              key={s.name}
              type="monotone"
              dataKey={s.name}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={<CustomDot cx={0} cy={0} value={null} stroke={COLORS[i % COLORS.length]} index={0} />}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
