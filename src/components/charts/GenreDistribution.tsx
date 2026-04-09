import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { GenrePieSlice } from '../../utils/dataTransforms'
import { GENRE_COLORS } from '../../constants/genres'
import { TOOLTIP_STYLE } from '../../constants/styles'
import type { Genre } from '../../types'

interface Props {
  data: GenrePieSlice[]
  countLabel?: string  // 預設「上榜次數」
}

const RADIAN = Math.PI / 180

function CustomLabel({
  cx, cy, midAngle, innerRadius, outerRadius, percent,
}: {
  cx: number; cy: number; midAngle: number
  innerRadius: number; outerRadius: number
  percent: number
}) {
  if (percent < 0.04) return null
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
      {`${(percent * 100).toFixed(1)}%`}
    </text>
  )
}

function makeTooltip(countLabel: string) {
  return function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: GenrePieSlice }[] }) {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    return (
      <div style={{ ...TOOLTIP_STYLE, color: '#fff' }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>{d.genre}</div>
        <div>{countLabel}：<strong>{d.count}</strong></div>
        {d.detail && (
          <div style={{ marginTop: 6, color: '#bbb', fontSize: 12 }}>
            {d.detail.split('、').map((s, i) => <div key={i}>{s}</div>)}
          </div>
        )}
      </div>
    )
  }
}

export default function GenreDistribution({ data, countLabel = '上榜次數' }: Props) {
  const TooltipComp = makeTooltip(countLabel)
  return (
    <ResponsiveContainer width="100%" height={340}>
      <PieChart>
        <Pie
          data={data}
          dataKey="totalScore"
          nameKey="genre"
          cx="50%"
          cy="50%"
          innerRadius={70}
          outerRadius={130}
          paddingAngle={3}
          labelLine={false}
          label={CustomLabel}
        >
          {data.map(entry => (
            <Cell
              key={entry.genre}
              fill={GENRE_COLORS[entry.genre as Genre] ?? '#95a5a6'}
            />
          ))}
        </Pie>
        <Tooltip content={<TooltipComp />} />
        <Legend
          formatter={(value) => <span style={{ color: '#ddd', fontSize: 13 }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
