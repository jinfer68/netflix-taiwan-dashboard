import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LabelList, Cell,
} from 'recharts'
import type { TaiwanDramaRanking, ShowAttributes } from '../../types'
import {
  TOOLTIP_STYLE, ACCENT, INK, INK_MUTED, INK_SECONDARY,
  PAPER, RULE, RULE_STRONG, NUM,
} from '../../constants/styles'

type ReleaseFilter = 'all' | 'weekly' | 'allAtOnce' | 'split'
type NetflixFilter = 'all' | 'original' | 'nonOriginal'

interface Props {
  data: TaiwanDramaRanking[]
  showAttributes?: Record<string, ShowAttributes>
  sortMode: 'weekly' | 'daily'
  filterRelease: ReleaseFilter
  filterNetflix: NetflixFilter
  selectedTitles?: string[]
  onToggleTitle?: (title: string) => void
}

interface ChartItem extends TaiwanDramaRanking {
  displayTitle: string
  releaseWeeks?: number
  totalEpisodes?: string
  scorePerWeek: number
  weeklyCoverage: number
  dailyCoverage: number
}

// 上架方式為分類識別，非數值大小 — 沿用經驗證的類型色階
const RELEASE_COLORS: Record<string, string> = {
  weekly: '#7b5cb8', allAtOnce: '#1f6f3f', split: '#b07d10',
}
const RELEASE_LABELS: Record<string, string> = {
  weekly: '週播', allAtOnce: '一次上架', split: '拆分上架',
}
const RELEASE_SHORT: Record<string, string> = {
  weekly: '週播', allAtOnce: '一次', split: '拆分',
}

const SPECIAL_NOTES: Record<string, string> = {
  '有生之年': '2023 年作品，金鐘獎得獎後回鍋上榜',
  '誰是被害者 第1季': '第二季上架，第一季回鍋上榜',
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}>
      <span style={{ color: INK_SECONDARY }}>{label}</span>
      <span style={{ ...NUM, color: INK, fontWeight: strong ? 700 : 400 }}>{value}</span>
    </div>
  )
}

function CoverageBar({ ratio, color }: { ratio: number; color: string }) {
  return (
    <div style={{ height: 4, background: RULE, marginTop: 4 }}>
      <div style={{ width: `${Math.min(100, ratio * 100)}%`, height: '100%', background: color }} />
    </div>
  )
}

function ShowTooltip({ active, payload, label, sortMode }: {
  active?: boolean; payload?: { payload?: ChartItem }[]; label?: string
  sortMode: 'weekly' | 'daily'
}) {
  if (!active || !payload?.length) return null
  const item = payload[0]?.payload
  if (!item) return null

  const releaseColor = RELEASE_COLORS[item.releaseType] ?? INK_MUTED
  const releaseLabel = RELEASE_LABELS[item.releaseType] ?? item.releaseType
  const specialNote = SPECIAL_NOTES[item.title]
  const totalDays = (item.releaseWeeks ?? 1) * 7
  const isWeekly = sortMode === 'weekly'
  const coverage = isWeekly ? item.weeklyCoverage : item.dailyCoverage

  return (
    <div style={{ ...TOOLTIP_STYLE, minWidth: 230 }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: INK }}>
        {label}
        {item.isNetflixOriginal && (
          <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: ACCENT }}>N</span>
        )}
      </div>

      <Row label={isWeekly ? '週榜積分' : '日榜積分'} value={`${isWeekly ? item.weeklyScore : item.dailyScore} 分`} strong />
      <Row label="上架方式" value={releaseLabel} />
      {item.totalEpisodes && <Row label="總集數" value={item.totalEpisodes} />}
      <Row
        label={isWeekly ? '上架 / 上榜' : '上架 / 上榜'}
        value={isWeekly
          ? `${item.releaseWeeks != null ? `${item.releaseWeeks} 週` : '—'} / ${item.weeksOnChart} 週`
          : `${totalDays} 天 / ${item.daysOnChart} 天`}
      />
      <Row
        label="效率"
        value={isWeekly
          ? `${item.scorePerWeek} 分/週`
          : `${item.daysOnChart > 0 ? Math.round(item.dailyScore / item.daysOnChart * 10) / 10 : 0} 分/天`}
      />

      <div style={{ marginTop: 8, borderTop: `1px solid ${RULE}`, paddingTop: 8 }}>
        <div style={{ ...NUM, fontSize: 11, color: INK_SECONDARY }}>
          上榜覆蓋率 {Math.round(coverage * 100)}%
        </div>
        <CoverageBar ratio={coverage} color={releaseColor} />
      </div>

      {specialNote && (
        <div style={{ fontSize: 11, color: INK_MUTED, marginTop: 8, borderTop: `1px solid ${RULE}`, paddingTop: 6 }}>
          ※ {specialNote}
        </div>
      )}
    </div>
  )
}

export default function TaiwanDramaChart({
  data, showAttributes = {}, sortMode, filterRelease, filterNetflix,
  selectedTitles = [], onToggleTitle,
}: Props) {
  const filtered = data.filter(d => {
    if (filterRelease !== 'all' && d.releaseType !== filterRelease) return false
    if (filterNetflix === 'original'    && !d.isNetflixOriginal) return false
    if (filterNetflix === 'nonOriginal' &&  d.isNetflixOriginal) return false
    return true
  })

  const chartData: ChartItem[] = filtered
    .filter(d => sortMode === 'weekly' ? d.weeklyScore > 0 : d.dailyScore > 0)
    .sort((a, b) => sortMode === 'weekly' ? b.weeklyScore - a.weeklyScore : b.dailyScore - a.dailyScore)
    .map(d => {
      const attr = showAttributes[d.title]
      const weeksOn = d.weeksOnChart || 0
      const rw = attr?.releaseWeeks ?? 1
      const totalDays = rw * 7
      return {
        ...d,
        displayTitle: d.title,
        releaseWeeks: attr?.releaseWeeks,
        totalEpisodes: attr?.totalEpisodes,
        scorePerWeek: weeksOn > 0 ? Math.round((d.weeklyScore / weeksOn) * 10) / 10 : 0,
        weeklyCoverage: rw > 0 ? weeksOn / rw : 0,
        dailyCoverage: totalDays > 0 ? d.daysOnChart / totalDays : 0,
      }
    })

  if (chartData.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: INK_MUTED, fontSize: 13 }}>
        無符合條件的節目
      </div>
    )
  }

  const usedReleaseTypes = ['weekly', 'allAtOnce', 'split'].filter(
    rt => chartData.some(d => d.releaseType === rt)
  )

  const chartHeight = Math.max(360, chartData.length * 44 + 40)
  const dataKey = sortMode === 'weekly' ? 'weeklyScore' : 'dailyScore'

  return (
    <div style={{ padding: '14px 20px 12px' }}>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: INK_SECONDARY, letterSpacing: 1, whiteSpace: 'nowrap' }}>
          台劇{sortMode === 'weekly' ? '週榜' : '日榜'}積分
          <span style={{ ...NUM, marginLeft: 8, fontWeight: 400, color: INK_MUTED }}>{chartData.length} 部</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', columnGap: 12, rowGap: 2 }}>
          {usedReleaseTypes.map(rt => (
            <span key={rt} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: INK_SECONDARY }}>
              <span style={{ width: 8, height: 8, background: RELEASE_COLORS[rt], flexShrink: 0 }} />
              {RELEASE_LABELS[rt]}
            </span>
          ))}
          <span style={{ fontSize: 11, color: INK_MUTED }}>
            <span style={{ color: ACCENT, fontWeight: 700 }}>N</span> ＝ Netflix 獨家
          </span>
        </div>
      </div>

      <div style={{ height: chartHeight }}>
        <ResponsiveContainer key={sortMode} width="100%" height={chartHeight}>
          <BarChart
            layout="vertical" data={chartData}
            margin={{ top: 4, right: 60, left: 0, bottom: 4 }}
            barSize={14}
            barCategoryGap="34%"
          >
            <CartesianGrid strokeDasharray="0" horizontal={false} stroke={RULE} />
            <XAxis
              type="number"
              tick={{ fill: INK_SECONDARY, fontSize: 11 }}
              axisLine={{ stroke: RULE_STRONG }}
              tickLine={false}
            />
            <YAxis
              type="category" dataKey="displayTitle" width={230}
              axisLine={{ stroke: RULE_STRONG }}
              tickLine={false}
              tick={(props: { x: number; y: number; payload: { value: string; index: number } }) => {
                const { x, y, payload } = props
                const item = chartData[payload.index]
                if (!item) return <text x={x} y={y} />
                const isSelected = selectedTitles.includes(item.title)
                const ep = item.totalEpisodes?.replace(/\s*集/, '') ?? ''
                const rw = item.releaseWeeks ?? ''
                const woc = item.weeksOnChart
                const infoText = [
                  RELEASE_SHORT[item.releaseType] ?? item.releaseType,
                  ep ? `${ep}集` : '',
                  rw ? `${rw}→${woc}週` : `${woc}週`,
                ].filter(Boolean).join(' · ')
                return (
                  <g>
                    <text x={x - 6} y={y - 6} textAnchor="end"
                      fill={isSelected ? INK : INK_SECONDARY} fontSize={12} fontWeight={isSelected ? 700 : 400}>
                      {item.displayTitle}
                      {SPECIAL_NOTES[item.title] ? ' ※' : ''}
                      {item.isNetflixOriginal && <tspan fill={ACCENT} fontSize={10} fontWeight={700} dx={4}>N</tspan>}
                    </text>
                    <text x={x - 6} y={y + 9} textAnchor="end" fill={INK_MUTED} fontSize={10}
                      style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {infoText}
                    </text>
                  </g>
                )
              }}
            />
            <Tooltip
              cursor={{ fill: 'rgba(26,26,24,0.04)' }}
              content={({ active, payload, label }) =>
                <ShowTooltip
                  active={active}
                  payload={payload as { payload?: ChartItem }[]}
                  label={label as string}
                  sortMode={sortMode}
                />
              }
            />
            <Bar
              dataKey={dataKey}
              name={sortMode === 'weekly' ? '週榜積分' : '日榜積分'}
              radius={[0, 2, 2, 0]}
              isAnimationActive={false}
              style={{ cursor: onToggleTitle ? 'pointer' : 'default' }}
              onClick={(entry: ChartItem) => onToggleTitle?.(entry.title)}
            >
              {chartData.map(d => {
                const isSelected = selectedTitles.includes(d.title)
                const dimmed = selectedTitles.length > 0 && !isSelected
                return (
                  <Cell
                    key={d.title}
                    fill={RELEASE_COLORS[d.releaseType] ?? INK_MUTED}
                    fillOpacity={dimmed ? 0.28 : 1}
                    stroke={isSelected ? PAPER : 'none'}
                    strokeWidth={isSelected ? 2 : 0}
                  />
                )
              })}
              <LabelList
                dataKey={dataKey}
                position="right"
                offset={8}
                style={{ fill: INK_SECONDARY, fontSize: 11, fontVariantNumeric: 'tabular-nums' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
