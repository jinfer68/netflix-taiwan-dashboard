import {
  CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { TrendPoint } from '../../types'
import {
  TOOLTIP_STYLE, NUM,
  ACCENT, INK, INK_MUTED, INK_SECONDARY, PAPER, RULE, RULE_STRONG,
} from '../../constants/styles'

interface Props {
  points: TrendPoint[]
  focusDate: string | null
  onPickDate: (date: string) => void
  clickHint: string
}

// 斷線中孤立的單日上榜，沒有線段可畫，需補一個點才看得到
function TrendDot({ cx, cy, index, points }: {
  cx?: number; cy?: number; index?: number; points: TrendPoint[]
}) {
  const i = index ?? 0
  const isolated = points[i]?.rank !== null
    && (points[i - 1]?.rank ?? null) === null
    && (points[i + 1]?.rank ?? null) === null
  if (!isolated || cx === undefined || cy === undefined) return <g key={i} />
  return <circle key={i} cx={cx} cy={cy} r={2} fill={INK_SECONDARY} />
}

export default function DailyRankTrend({ points, focusDate, onPickDate, clickHint }: Props) {
  const focusInView = focusDate !== null && points.some(p => p.date === focusDate)
  return (
    <div style={{ height: 150 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={points}
          margin={{ top: 6, right: 8, bottom: 0, left: -24 }}
          onClick={(e: { activeLabel?: string }) => {
            if (e?.activeLabel) onPickDate(e.activeLabel)
          }}
          style={{ cursor: 'pointer' }}
        >
          <CartesianGrid vertical={false} stroke={RULE} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: INK_SECONDARY }}
            tickLine={false}
            axisLine={{ stroke: RULE_STRONG }}
            tickFormatter={(d: string) => d.slice(2).replace(/-/g, '/')}
            minTickGap={40}
          />
          <YAxis
            reversed
            domain={[1, 10]}
            ticks={[1, 5, 10]}
            allowDecimals={false}
            tick={{ fontSize: 11, fill: INK_SECONDARY }}
            tickLine={false}
            axisLine={{ stroke: RULE_STRONG }}
          />
          {focusInView && <ReferenceLine x={focusDate} stroke={ACCENT} strokeWidth={1} />}
          <Tooltip
            isAnimationActive={false}
            cursor={{ stroke: RULE_STRONG }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const p = payload[0].payload as TrendPoint
              return (
                <div style={TOOLTIP_STYLE}>
                  <div style={{ ...NUM, fontWeight: 700 }}>{p.date}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 12 }}>
                    <span style={{ color: INK_SECONDARY }}>日榜名次</span>
                    <span style={NUM}>{p.rank === null ? '未上榜' : `第 ${p.rank} 名`}</span>
                  </div>
                  <div style={{ fontSize: 11, color: INK_MUTED }}>{clickHint}</div>
                </div>
              )
            }}
          />
          <Line
            dataKey="rank"
            stroke={INK_SECONDARY}
            strokeWidth={2}
            connectNulls={false}
            isAnimationActive={false}
            dot={(p: { cx?: number; cy?: number; index?: number }) => (
              <TrendDot key={p.index} cx={p.cx} cy={p.cy} index={p.index} points={points} />
            )}
            activeDot={{ r: 4, fill: INK, stroke: PAPER }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
