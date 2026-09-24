import { useMemo } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, LabelList,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { DailyBoard, MovieAttributes, MovieOverallEntry, WeeklyBoard } from '../../types'
import type { MovieFilters } from '../../hooks/useMovieFilters'
import { LANGUAGE_COLORS, LANGUAGE_LABELS } from '../../constants/languages'
import { aggregateDaily, aggregateWeekly } from '../../utils/boardTransforms'
import {
  TOOLTIP_STYLE, NUM,
  ACCENT, INK, INK_MUTED, INK_SECONDARY, RULE, RULE_STRONG,
} from '../../constants/styles'

interface Props {
  boards: DailyBoard[]
  weeks: WeeklyBoard[]
  entities: Record<string, MovieAttributes>
  filters: MovieFilters
  selectedTitle: string | null
  onSelectTitle: (title: string | null) => void
}

const TOP_N = 20
const MAX_TITLE = 14

function truncateTitle(title: string): string {
  return title.length > MAX_TITLE ? `${title.slice(0, MAX_TITLE)}…` : title
}

function CustomYAxisTick({
  x, y, payload, index, netflixSet, selectedTitle,
}: {
  x?: number; y?: number
  payload?: { value: string }
  index?: number
  netflixSet?: Set<string>
  selectedTitle?: string | null
}) {
  const title = payload?.value ?? ''
  const isOriginal = netflixSet?.has(title)
  const isSelected = selectedTitle === title
  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="end" dominantBaseline="middle" fontSize={12}>
        <title>{title}</title>
        <tspan fill={INK_MUTED} fontSize={11} style={{ fontVariantNumeric: 'tabular-nums' }}>
          {(index ?? 0) + 1}
        </tspan>
        <tspan fill={isSelected ? INK : INK_SECONDARY} fontWeight={isSelected ? 700 : 400} dx={6}>
          {truncateTitle(title)}
        </tspan>
        {isOriginal && <tspan fill={ACCENT} fontSize={10} fontWeight={700} dx={5}>N</tspan>}
      </text>
    </g>
  )
}

export default function MovieTop20Chart({
  boards, weeks, entities, filters, selectedTitle, onSelectTitle,
}: Props) {
  const rows = useMemo((): MovieOverallEntry[] => {
    const aggregates = filters.time.boardMode === 'daily'
      ? aggregateDaily(boards)
      : aggregateWeekly(weeks)

    return aggregates
      .map(agg => {
        const attrs = entities[agg.title]
        if (!attrs) return null
        return {
          rank: 0,
          title: agg.title,
          totalScore: agg.totalScore,
          language: attrs.language,
          format: attrs.format,
          isNetflixOriginal: attrs.isNetflixOriginal,
          onChartCount: agg.onChartCount,
          avgRank: agg.avgRank,
          bestRank: agg.bestRank,
        } satisfies MovieOverallEntry
      })
      .filter((v): v is MovieOverallEntry => v !== null)
      .filter(v => filters.languages.size === 0 || filters.languages.has(v.language))
      .filter(v => filters.format === 'all' || v.format === filters.format)
      .filter(v => !filters.originalOnly || v.isNetflixOriginal)
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, TOP_N)
      .map((v, i) => ({ ...v, rank: i + 1 }))
  }, [boards, weeks, entities, filters])

  const netflixSet = useMemo(
    () => new Set(rows.filter(r => r.isNetflixOriginal).map(r => r.title)),
    [rows],
  )

  // 圖例只列出當前結果實際出現的語言，順序照 LANGUAGE_LABELS 固定，不依數量重排
  const usedLanguages = useMemo(
    () => LANGUAGE_LABELS.filter(l => rows.some(r => r.language === l)),
    [rows],
  )

  // 選中的片不在這張榜上時不要淡化，否則整張圖無故灰掉，看起來像壞了
  const dimOthers = selectedTitle !== null && rows.some(r => r.title === selectedTitle)

  const unit = filters.time.boardMode === 'daily' ? '天' : '週'

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '14px 20px 10px' }}>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: INK_SECONDARY, letterSpacing: 1, whiteSpace: 'nowrap' }}>
          {filters.time.boardMode === 'daily' ? '日榜積分 TOP 20' : '週榜積分 TOP 20'}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', columnGap: 10, rowGap: 2 }}>
          {usedLanguages.map(l => (
            <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: INK_SECONDARY }}>
              <span style={{ width: 8, height: 8, background: LANGUAGE_COLORS[l] }} />
              {l}
            </span>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 4, right: 48, bottom: 4, left: 4 }}
            onClick={(e: { activeLabel?: string }) => {
              const title = e?.activeLabel
              if (title) onSelectTitle(title === selectedTitle ? null : title)
            }}
          >
            {/* 橫向長條只保留垂直格線（垂直於閱讀方向） */}
            <CartesianGrid horizontal={false} stroke={RULE} />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: INK_SECONDARY }}
              tickLine={false}
              axisLine={{ stroke: RULE_STRONG }}
            />
            <YAxis
              type="category"
              dataKey="title"
              width={200}
              interval={0}
              tickLine={false}
              axisLine={{ stroke: RULE_STRONG }}
              tick={<CustomYAxisTick netflixSet={netflixSet} selectedTitle={selectedTitle} />}
            />
            <Tooltip
              cursor={false}
              isAnimationActive={false}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload as MovieOverallEntry
                return (
                  <div style={TOOLTIP_STYLE}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{d.title}</div>
                    <Row label="總積分" value={String(d.totalScore)} />
                    <Row label="在榜" value={`${d.onChartCount} ${unit}`} />
                    <Row label="最佳名次" value={`第 ${d.bestRank} 名`} />
                    <Row label="平均名次" value={d.avgRank.toFixed(1)} />
                    <Row label="語言" value={d.language} />
                    <Row label="形式" value={d.format} />
                    {d.isNetflixOriginal && <Row label="片源" value="Netflix 獨家" />}
                  </div>
                )
              }}
            />
            <Bar dataKey="totalScore" barSize={14} radius={2} isAnimationActive={false}>
              {rows.map(row => (
                <Cell
                  key={row.title}
                  fill={LANGUAGE_COLORS[row.language]}
                  fillOpacity={dimOthers && selectedTitle !== row.title ? 0.35 : 1}
                />
              ))}
              <LabelList
                dataKey="totalScore"
                position="right"
                style={{ fontSize: 11, fill: INK_SECONDARY, fontVariantNumeric: 'tabular-nums' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 12 }}>
      <span style={{ color: INK_SECONDARY }}>{label}</span>
      <span style={NUM}>{value}</span>
    </div>
  )
}
