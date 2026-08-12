import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Cell, LabelList, ResponsiveContainer,
} from 'recharts'
import type { RankingsData, OverallRankingEntry, Genre } from '../../types'
import { GENRE_COLORS } from '../../constants/genres'
import {
  TOOLTIP_STYLE, ACCENT, INK, INK_MUTED, INK_SECONDARY, RULE, RULE_STRONG, NUM,
} from '../../constants/styles'
import { getWeeklyDerivedRankings } from '../../utils/dataTransforms'
import { weekToYearQuarter, weekToYearMonth } from '../../utils/dateHelpers'

interface Props {
  data: RankingsData
  rankingMode: 'weekly' | 'daily'
  dailyRankings?: OverallRankingEntry[]
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
  if (!dateStr) return '—'
  const [year, month] = dateStr.split('-')
  return `${year}年${parseInt(month)}月`
}

function TooltipRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}>
      <span style={{ color: INK_SECONDARY }}>{label}</span>
      <span style={{ ...NUM, color: INK, fontWeight: strong ? 700 : 400 }}>{value}</span>
    </div>
  )
}

function TooltipTitle({ title, isOriginal }: { title: string; isOriginal?: boolean }) {
  return (
    <div style={{ fontWeight: 700, marginBottom: 6, color: INK }}>
      {title}
      {isOriginal && (
        <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: ACCENT }}>N</span>
      )}
    </div>
  )
}

function WeeklyTooltip({
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
    <div style={{ ...TOOLTIP_STYLE, minWidth: 190 }}>
      <TooltipTitle title={d.title} isOriginal={d.isNetflixOriginal} />
      <TooltipRow label="類型" value={d.genre} />
      <TooltipRow label="期間總積分" value={String(d.totalScore)} strong />
      <TooltipRow label="上榜週數" value={`${d.weeksOnChart} 週`} />
      <TooltipRow label="平均名次" value={`第 ${d.avgRank} 名`} />
      <TooltipRow label="首次上榜" value={formatYearMonth(d.firstWeekDate)} />
      {isEdgeWeek && (
        <div style={{ color: INK_MUTED, fontSize: 11, marginTop: 6, borderTop: `1px solid ${RULE}`, paddingTop: 6 }}>
          ※ 首尾週資料可能不完整
        </div>
      )}
    </div>
  )
}

function DailyTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  if (!d) return null
  return (
    <div style={{ ...TOOLTIP_STYLE, minWidth: 190 }}>
      <TooltipTitle title={d.title} isOriginal={d.isNetflixOriginal} />
      <TooltipRow label="類型" value={d.genre} />
      <TooltipRow label="日榜總積分" value={String(d.totalScore)} strong />
      <TooltipRow label="上榜天數" value={`${d.weeksOnChart} 天`} />
      <TooltipRow label="平均名次" value={`第 ${d.avgRank} 名`} />
      <div style={{ fontSize: 11, color: INK_MUTED, marginTop: 6, borderTop: `1px solid ${RULE}`, paddingTop: 6 }}>
        日榜積分＝各上榜天排名積分加總（第 1 名 10 分、第 10 名 1 分）
      </div>
    </div>
  )
}

function CustomYAxisTick({
  x, y, payload, index, netflixSet, selectedShow,
}: {
  x?: number; y?: number
  payload?: { value: string }
  index?: number
  netflixSet?: Set<string>
  selectedShow?: string | null
}) {
  const title = payload?.value ?? ''
  const isOriginal = netflixSet?.has(title)
  const isSelected = selectedShow === title
  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="end" dominantBaseline="middle" fontSize={12}>
        <tspan fill={INK_MUTED} fontSize={11} style={{ fontVariantNumeric: 'tabular-nums' }}>
          {(index ?? 0) + 1}
        </tspan>
        <tspan fill={isSelected ? INK : INK_SECONDARY} fontWeight={isSelected ? 700 : 400} dx={6}>
          {title}
        </tspan>
        {isOriginal && <tspan fill={ACCENT} fontSize={10} fontWeight={700} dx={5}>N</tspan>}
      </text>
    </g>
  )
}

export default function Top20Chart({
  data, rankingMode, dailyRankings,
  activeGenres, netflixOnly, selectedQuarter, selectedMonth,
  selectedShow, onSelectShow,
}: Props) {

  const filteredWeeklyData: RankingsData = useMemo(() => {
    if (rankingMode !== 'weekly') return data
    let weeks = data.weeklyRankings
    if (selectedMonth) {
      weeks = weeks.filter(w => weekToYearMonth(w.dateRange) === selectedMonth)
    } else if (selectedQuarter !== 'all') {
      weeks = weeks.filter(w => weekToYearQuarter(w.dateRange) === selectedQuarter)
    }
    return { ...data, weeklyRankings: weeks }
  }, [data, rankingMode, selectedQuarter, selectedMonth])

  const chartData: ChartEntry[] = useMemo(() => {
    const source: OverallRankingEntry[] =
      rankingMode === 'daily' && dailyRankings
        ? dailyRankings
        : getWeeklyDerivedRankings(filteredWeeklyData)

    return source
      .filter(d => activeGenres.size === 0 || activeGenres.has(d.genre))
      .filter(d => !netflixOnly || d.isNetflixOriginal)
      .slice(0, 20)
      .map((d, i) => ({ ...d, chartRank: i + 1 }))
  }, [rankingMode, dailyRankings, filteredWeeklyData, activeGenres, netflixOnly])

  const netflixSet = useMemo(
    () => new Set(chartData.filter(d => d.isNetflixOriginal).map(d => d.title)),
    [chartData],
  )

  const usedGenres = useMemo(() => {
    const seen: string[] = []
    for (const d of chartData) if (!seen.includes(d.genre)) seen.push(d.genre)
    return seen
  }, [chartData])

  const firstWeekStart = filteredWeeklyData.weeklyRankings[0]?.dateRange.split(' ~ ')[0] ?? ''
  const lastWeekStart  = filteredWeeklyData.weeklyRankings[filteredWeeklyData.weeklyRankings.length - 1]?.dateRange.split(' ~ ')[0] ?? ''

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '14px 20px 10px' }}>

      {/* 標題列 + 圖例 */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: INK_SECONDARY, letterSpacing: 1, whiteSpace: 'nowrap' }}>
          {rankingMode === 'daily' ? '日榜積分 TOP 20' : '週榜積分 TOP 20'}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', columnGap: 10, rowGap: 2 }}>
          {usedGenres.map(g => (
            <span key={g} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: INK_SECONDARY }}>
              <span style={{ width: 8, height: 8, background: GENRE_COLORS[g as Genre] ?? '#9a9a94' }} />
              {g}
            </span>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 4, right: 48, left: 0, bottom: 4 }}
            onDoubleClick={() => selectedShow && onSelectShow?.(null)}
          >
            <CartesianGrid strokeDasharray="0" horizontal={false} stroke={RULE} />
            <XAxis
              type="number"
              domain={[0, 'dataMax + 5']}
              tick={{ fill: INK_SECONDARY, fontSize: 11 }}
              axisLine={{ stroke: RULE_STRONG }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="title"
              width={200}
              axisLine={{ stroke: RULE_STRONG }}
              tickLine={false}
              tick={<CustomYAxisTick netflixSet={netflixSet} selectedShow={selectedShow} />}
            />
            <Tooltip
              cursor={{ fill: 'rgba(26,26,24,0.04)' }}
              content={({ active, payload }) =>
                rankingMode === 'daily'
                  ? <DailyTooltip active={active} payload={payload as TooltipPayload[]} />
                  : <WeeklyTooltip
                      active={active} payload={payload as TooltipPayload[]}
                      firstWeekStart={firstWeekStart}
                      lastWeekStart={lastWeekStart}
                    />
              }
            />
            <Bar
              dataKey="totalScore"
              radius={[0, 2, 2, 0]}
              barSize={14}
              name="積分"
              isAnimationActive={false}
              style={{ cursor: onSelectShow ? 'pointer' : 'default' }}
              onClick={(d: ChartEntry) => {
                if (selectedShow === d.title) return
                onSelectShow?.(d.title)
              }}
            >
              {chartData.map((entry) => (
                <Cell
                  key={entry.title}
                  fill={GENRE_COLORS[entry.genre] ?? '#9a9a94'}
                  fillOpacity={selectedShow && selectedShow !== entry.title ? 0.28 : 1}
                />
              ))}
              <LabelList
                dataKey="totalScore"
                position="right"
                offset={8}
                style={{ fill: INK_SECONDARY, fontSize: 11, fontVariantNumeric: 'tabular-nums' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ fontSize: 11, color: INK_MUTED, paddingTop: 8, textAlign: 'right' }}>
        <span style={{ color: ACCENT, fontWeight: 700 }}>N</span> ＝ Netflix 獨家
        {rankingMode === 'daily' && '　·　日榜資料涵蓋全期，不支援年份篩選'}
      </div>
    </div>
  )
}
