import { useMemo, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine, ReferenceArea,
} from 'recharts'
import type { TooltipProps } from 'recharts'
import type { RankingsData } from '../../types'
import { getDailyTrendSeries, getDailyShowTitles } from '../../utils/dataTransforms'
import { TOOLTIP_STYLE } from '../../constants/styles'

const COLORS = [
  '#e50914', '#f5c518', '#46d369', '#6a5acd', '#ff6b6b',
  '#4ecdc4', '#ff9f43', '#a29bfe', '#fd79a8', '#00cec9',
]

interface Props {
  data: RankingsData
}

/** 自訂 Y 軸 tick：11 顯示「榜外」 */
function RankTick({ x, y, payload }: { x: number; y: number; payload: { value: number } }) {
  const val = payload.value
  if (val === 11) {
    return (
      <text x={x} y={y} textAnchor="end" fill="#666" fontSize={10} dy={4}>
        榜外
      </text>
    )
  }
  return (
    <text x={x} y={y} textAnchor="end" fill="#aaa" fontSize={11} dy={4}>
      {val}
    </text>
  )
}

/** 自訂 Tooltip：從 payload 取得完整 typed data */
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

/** 自訂圓點：rank 11 用空心 + 叉 */
function CustomDot(props: {
  cx: number; cy: number; value: number | null
  stroke: string; index: number
}) {
  const { cx, cy, value, stroke } = props
  if (value == null) return null
  if (value >= 11) {
    // 榜外：空心圓 + 虛線邊框
    return (
      <circle cx={cx} cy={cy} r={4} fill="#1a1a2e" stroke={stroke}
        strokeWidth={1.5} strokeDasharray="2 2" opacity={0.6} />
    )
  }
  return <circle cx={cx} cy={cy} r={3} fill={stroke} />
}

export default function RankTrendChart({ data }: Props) {
  const allTitles = useMemo(() => getDailyShowTitles(data), [data])
  const [selectedTitles, setSelectedTitles] = useState<string[]>([])
  const [search, setSearch] = useState('')

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

  const filteredTitles = allTitles.filter(t =>
    !search || t.toLowerCase().includes(search.toLowerCase())
  )

  function toggle(title: string) {
    setSelectedTitles(prev =>
      prev.includes(title)
        ? prev.filter(t => t !== title)
        : prev.length < 10
          ? [...prev, title]
          : prev
    )
  }

  return (
    <div>
      {/* 節目選擇器 */}
      <div style={{ marginBottom: 12 }}>
        <input
          type="text"
          placeholder="搜尋台劇名稱…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', maxWidth: 300, padding: '6px 12px',
            background: '#1a1a2e', border: '1px solid #333', borderRadius: 8,
            color: '#eee', fontSize: 13, outline: 'none', marginBottom: 8,
          }}
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 120, overflow: 'auto' }}>
          {filteredTitles.map(title => {
            const idx = selectedTitles.indexOf(title)
            const active = idx >= 0
            return (
              <button
                key={title}
                onClick={() => toggle(title)}
                style={{
                  padding: '3px 10px', borderRadius: 14, fontSize: 11,
                  cursor: 'pointer', transition: 'all 0.15s',
                  border: `1px solid ${active ? COLORS[idx % COLORS.length] : '#333'}`,
                  background: active ? `${COLORS[idx % COLORS.length]}22` : 'transparent',
                  color: active ? COLORS[idx % COLORS.length] : '#888',
                  fontWeight: active ? 700 : 400,
                }}
              >
                {title}
              </button>
            )
          })}
        </div>
        {selectedTitles.length > 0 && (
          <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>
            已選 {selectedTitles.length}/10 · 點擊取消選擇
          </div>
        )}
      </div>

      {selectedTitles.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#555', padding: '40px 0', fontSize: 14 }}>
          請選擇要比較的台劇節目
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={420}>
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            {/* 榜外區域底色 */}
            <ReferenceArea y1={10.5} y2={11.5} fill="#1a1a2e" fillOpacity={0.8} />
            {/* 榜內/榜外分隔線 */}
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
      )}
    </div>
  )
}
