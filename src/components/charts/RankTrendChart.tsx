import { useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceArea, LabelList,
} from 'recharts'
import type { TooltipProps } from 'recharts'
import type { RankingsData } from '../../types'
import { getDailyTrendSeries } from '../../utils/dataTransforms'
import { SERIES_COLORS } from '../../constants/genres'
import {
  TOOLTIP_STYLE, INK, INK_SECONDARY, INK_MUTED, PAPER, PAPER_RAISED, RULE, RULE_STRONG, NUM,
} from '../../constants/styles'

interface Props {
  data: RankingsData
  selectedTitles: string[]
}

function RankTick({ x, y, payload }: { x: number; y: number; payload: { value: number } }) {
  const val = payload.value
  if (val === 11) {
    return <text x={x} y={y} textAnchor="end" fill={INK_MUTED} fontSize={10} dy={4}>榜外</text>
  }
  return (
    <text x={x} y={y} textAnchor="end" fill={INK_SECONDARY} fontSize={11} dy={4}
      style={{ fontVariantNumeric: 'tabular-nums' }}>{val}</text>
  )
}

function RankTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  const dayIndex = label as number
  const epNum = dayIndex % 7 === 0 ? dayIndex / 7 + 1 : null
  return (
    <div style={{ ...TOOLTIP_STYLE, minWidth: 180 }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: INK }}>
        上架第 {dayIndex} 天{epNum != null && `　EP${epNum} 上線`}
      </div>
      {payload.map((entry, i) => {
        const v = entry.value as number | null | undefined
        const display = v == null ? '無資料' : v >= 11 ? '榜外' : `第 ${v} 名`
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span style={{ width: 8, height: 8, background: entry.color, flexShrink: 0 }} />
            <span style={{ flex: 1, color: INK_SECONDARY }}>{entry.name}</span>
            <span style={{ ...NUM, color: INK }}>{display}</span>
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
    return <circle cx={cx} cy={cy} r={3.5} fill={PAPER} stroke={stroke} strokeWidth={1.5} opacity={0.7} />
  }
  return <circle cx={cx} cy={cy} r={3} fill={stroke} stroke={PAPER} strokeWidth={1} />
}

export default function RankTrendChart({ data, selectedTitles }: Props) {
  const { indices, series, releaseTypes } = useMemo(
    () => getDailyTrendSeries(data, selectedTitles),
    [data, selectedTitles]
  )

  const hasWeeklyShow = Object.values(releaseTypes).some(
    t => t === 'weekly' || t === 'split'
  )

  const maxDayIndex = indices.length > 0 ? indices[indices.length - 1] : 0

  const epDays = hasWeeklyShow
    ? Array.from({ length: Math.floor(maxDayIndex / 7) + 1 }, (_, i) => i * 7)
    : []

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

  // 線尾直接標名（系列少時）用：每條線最後一個有值的位置
  const lastIndexByName = useMemo(() => {
    const map: Record<string, number> = {}
    for (const s of series) {
      for (let i = chartData.length - 1; i >= 0; i--) {
        if (chartData[i][s.name] != null) { map[s.name] = i; break }
      }
    }
    return map
  }, [series, chartData])

  const showEndLabels = series.length > 0 && series.length <= 4

  if (selectedTitles.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: INK_MUTED, fontSize: 13 }}>
        點擊上方排行榜中的節目以查看每日走勢
      </div>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '12px 20px 10px' }}>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: INK_SECONDARY, letterSpacing: 1, whiteSpace: 'nowrap' }}>
          每日名次走勢
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', columnGap: 12, rowGap: 2 }}>
          {series.map((s, i) => {
            const rt = releaseTypes[s.name]
            const suffix = rt === 'weekly' || rt === 'split' ? '週播' : rt === 'allAtOnce' ? '一次' : ''
            return (
              <span key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: INK_SECONDARY }}>
                <span style={{ width: 10, height: 2, background: SERIES_COLORS[i % SERIES_COLORS.length], flexShrink: 0 }} />
                {s.name}
                {suffix && <span style={{ color: INK_MUTED }}>{suffix}</span>}
              </span>
            )
          })}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: showEndLabels ? 90 : 20, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="0" vertical={false} stroke={RULE} />
            <ReferenceArea y1={10.5} y2={11.5} fill={PAPER_RAISED} fillOpacity={1} />
            <ReferenceLine y={10.5} stroke={RULE_STRONG} strokeDasharray="4 3" />
            {epDays.map(day => (
              <ReferenceLine
                key={`ep-${day}`}
                x={day}
                stroke={RULE_STRONG}
                strokeWidth={1}
                strokeDasharray="3 3"
                label={{
                  value: `EP${day / 7 + 1}`,
                  fill: INK_MUTED,
                  fontSize: 10,
                  position: 'insideTopRight',
                }}
              />
            ))}
            <XAxis
              dataKey="dayIndex"
              tick={{ fill: INK_SECONDARY, fontSize: 11 }}
              axisLine={{ stroke: RULE_STRONG }}
              tickLine={false}
              label={{ value: '上架天數', fill: INK_MUTED, fontSize: 11, position: 'insideBottomRight', offset: -4 }}
            />
            <YAxis
              reversed
              domain={[1, 11]}
              ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]}
              tick={RankTick as never}
              axisLine={{ stroke: RULE_STRONG }}
              tickLine={false}
              width={46}
              label={{ value: '名次', fill: INK_MUTED, fontSize: 11, angle: -90, position: 'insideLeft', offset: 12 }}
            />
            <Tooltip content={<RankTooltip />} cursor={{ stroke: RULE_STRONG, strokeWidth: 1 }} />
            {series.map((s, i) => {
              const color = SERIES_COLORS[i % SERIES_COLORS.length]
              return (
                <Line
                  key={s.name}
                  type="monotone"
                  dataKey={s.name}
                  name={s.name}
                  stroke={color}
                  strokeWidth={2}
                  isAnimationActive={false}
                  dot={<CustomDot cx={0} cy={0} value={null} stroke={color} index={0} />}
                  connectNulls={false}
                >
                  {showEndLabels && (
                    <LabelList
                      dataKey={s.name}
                      content={(props: { x?: string | number; y?: string | number; index?: number }) => {
                        if (props.index !== lastIndexByName[s.name]) return null
                        return (
                          <text
                            x={Number(props.x ?? 0) + 8} y={Number(props.y ?? 0)} dy={4}
                            fill={color} fontSize={11} fontWeight={700} textAnchor="start"
                          >
                            {s.name}
                          </text>
                        )
                      }}
                    />
                  )}
                </Line>
              )
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
