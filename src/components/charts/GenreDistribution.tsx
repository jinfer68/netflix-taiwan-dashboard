import { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { GenrePieSlice } from '../../utils/dataTransforms'
import { GENRE_COLORS, GENRE_LABELS } from '../../constants/genres'
import { TOOLTIP_STYLE, INK, INK_SECONDARY, INK_MUTED, PAPER, NUM } from '../../constants/styles'
import type { Genre } from '../../types'

interface Props {
  data: GenrePieSlice[]
  countLabel?: string
}

const RADIAN = Math.PI / 180

function CustomLabel({
  cx, cy, midAngle, innerRadius, outerRadius, percent,
}: {
  cx: number; cy: number; midAngle: number
  innerRadius: number; outerRadius: number
  percent: number
}) {
  if (percent < 0.07) return null
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text
      x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central"
      fontSize={11} fontWeight={700} style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      {`${Math.round(percent * 100)}%`}
    </text>
  )
}

function makeTooltip(countLabel: string, total: number) {
  return function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: GenrePieSlice }[] }) {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    const pct = total > 0 ? Math.round(d.totalScore / total * 100) : 0
    return (
      <div style={{ ...TOOLTIP_STYLE, minWidth: 150 }}>
        <div style={{ fontWeight: 700, marginBottom: 4, color: INK }}>{d.genre}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
          <span style={{ color: INK_SECONDARY }}>{countLabel}</span>
          <span style={{ ...NUM, fontWeight: 700 }}>{d.count}　{pct}%</span>
        </div>
        {d.detail && (
          <div style={{ marginTop: 6, color: INK_MUTED, fontSize: 11, lineHeight: 1.6 }}>
            {d.detail.split('、').map((s, i) => <div key={i}>{s}</div>)}
          </div>
        )}
      </div>
    )
  }
}

export default function GenreDistribution({ data, countLabel = '上榜次數' }: Props) {
  // 固定類型順序，避免篩選後扇區重排
  const ordered = useMemo(() => {
    const rank = (g: string) => {
      const i = GENRE_LABELS.indexOf(g as Genre)
      return i === -1 ? GENRE_LABELS.length : i
    }
    return [...data].sort((a, b) => rank(a.genre) - rank(b.genre))
  }, [data])

  const total = useMemo(() => ordered.reduce((s, d) => s + d.totalScore, 0), [ordered])
  const TooltipComp = makeTooltip(countLabel, total)

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={ordered}
              dataKey="totalScore"
              nameKey="genre"
              cx="50%"
              cy="50%"
              innerRadius="52%"
              outerRadius="88%"
              startAngle={90}
              endAngle={-270}
              labelLine={false}
              label={CustomLabel}
              isAnimationActive={false}
            >
              {ordered.map(entry => (
                <Cell
                  key={entry.genre}
                  fill={GENRE_COLORS[entry.genre as Genre] ?? '#9a9a94'}
                  stroke={PAPER}
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip content={<TooltipComp />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div style={{
        display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
        columnGap: 12, rowGap: 3, paddingTop: 8,
      }}>
        {ordered.map(d => (
          <span key={d.genre} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: INK_SECONDARY }}>
            <span style={{ width: 8, height: 8, background: GENRE_COLORS[d.genre as Genre] ?? '#9a9a94', flexShrink: 0 }} />
            {d.genre}
            <span style={{ ...NUM, color: INK_MUTED }}>{d.count}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
