import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LabelList, Cell,
} from 'recharts'
import type { TaiwanDramaRanking, ShowAttributes } from '../../types'
import { TOOLTIP_STYLE } from '../../constants/styles'

interface Props {
  data: TaiwanDramaRanking[]
  showAttributes?: Record<string, ShowAttributes>
}

interface ChartItem extends TaiwanDramaRanking {
  displayTitle: string
  releaseWeeks?: number
  totalEpisodes?: string
  scorePerWeek: number
  weeklyCoverage: number   // 上榜週 / 上架週
  dailyCoverage: number    // 上榜天 / (上架週*7)
  barColor: string
}

const RELEASE_COLORS: Record<string, string> = {
  weekly: '#6a5acd', allAtOnce: '#46d369', split: '#f5c518',  // 拆分標籤用黃色區別，bar 顏色邏輯同一次上架
}
const RELEASE_LABELS: Record<string, string> = {
  weekly: '週播', allAtOnce: '一次上架', split: '拆分上架',
}

// 特殊標記節目
const SPECIAL_NOTES: Record<string, string> = {
  '有生之年': '2023 年作品，金鐘獎得獎後回鍋上榜',
  '誰是被害者 第1季': '第二季上架，第一季回鍋上榜',
}

// ── 顏色計算 ──────────────────────────────────────────────────────

/** 週榜 bar 顏色：依上架方式 + 上榜覆蓋率/週數 */
function getWeeklyBarColor(item: ChartItem): string {
  const cov = item.weeklyCoverage
  if (item.releaseType === 'weekly') {
    // 週播：紫色系，覆蓋率分四階（含破百）
    if (cov > 1.0)  return '#c4b5ff'  // 超亮紫（覆蓋率破百）
    if (cov >= 0.8) return '#9b8aff'  // 亮紫
    if (cov >= 0.5) return '#7c6fff'  // 中紫
    return '#5a4abf'                   // 暗紫
  }
  // 一次上架 & 拆分上架：共用綠色系，上榜週數決定亮度
  if (item.weeksOnChart >= 8) return '#5eff8a'  // 亮綠
  if (item.weeksOnChart >= 5) return '#46d369'  // 中綠
  return '#2e8b47'                               // 暗綠
}

/** 日榜 bar 顏色：依上架方式 + 上榜天數 */
function getDailyBarColor(item: ChartItem): string {
  const cov = item.dailyCoverage
  if (item.releaseType === 'weekly') {
    // 週播：橙色系，日榜覆蓋率決定亮度
    if (cov >= 0.7) return '#ff9b5a'  // 亮橙
    if (cov >= 0.4) return '#e07030'  // 中橙
    return '#a04820'                   // 暗橙
  }
  // 一次上架 & 拆分上架：共用藍色系，日榜覆蓋率（%）決定亮度
  const covPct = cov * 100  // 轉為百分比（一次上架常破百）
  if (covPct >= 300) return '#5ac8ff'  // 亮藍（≥300%）
  if (covPct >= 150) return '#3090d0'  // 中藍（≥150%）
  return '#206090'                     // 暗藍（<150%）
}

// ── Tooltip ─────────────────────────────────────────────────────

function WeeklyTooltip({ active, payload, label }: {
  active?: boolean; payload?: { payload?: ChartItem }[]; label?: string
}) {
  if (!active || !payload?.length) return null
  const item = payload[0]?.payload
  if (!item) return null

  const releaseColor = RELEASE_COLORS[item.releaseType] ?? '#888'
  const releaseLabel = RELEASE_LABELS[item.releaseType] ?? item.releaseType
  const specialNote = SPECIAL_NOTES[item.title]

  return (
    <div style={{ ...TOOLTIP_STYLE, minWidth: 230 }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
      {specialNote && (
        <div style={{ fontSize: 10, color: '#f5c518', background: '#2a2000', padding: '3px 8px', borderRadius: 4, marginBottom: 6, border: '1px solid #f5c51830' }}>
          {specialNote}
        </div>
      )}
      <div style={{ color: '#e50914', fontSize: 13 }}>
        週榜積分：<strong>{item.weeklyScore}</strong> 分
      </div>

      <div style={{
        marginTop: 8, padding: '8px 10px', borderRadius: 6,
        background: '#0d0d1a', border: '1px solid #2a2a3e',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{
            padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
            background: `${releaseColor}25`, color: releaseColor, border: `1px solid ${releaseColor}50`,
          }}>
            {releaseLabel}
          </span>
          {item.totalEpisodes && <span style={{ fontSize: 11, color: '#aaa' }}>{item.totalEpisodes}</span>}
        </div>

        <div style={{ display: 'flex', gap: 16, fontSize: 11 }}>
          <div>
            <div style={{ color: '#666', marginBottom: 2 }}>上架</div>
            <div style={{ color: '#ddd', fontWeight: 600, fontSize: 14 }}>
              {item.releaseWeeks != null ? `${item.releaseWeeks} 週` : '-'}
            </div>
          </div>
          <div style={{ borderLeft: '1px solid #333', paddingLeft: 16 }}>
            <div style={{ color: '#666', marginBottom: 2 }}>上榜</div>
            <div style={{ color: '#ddd', fontWeight: 600, fontSize: 14 }}>
              {item.weeksOnChart} 週
            </div>
          </div>
          <div style={{ borderLeft: '1px solid #333', paddingLeft: 16 }}>
            <div style={{ color: '#666', marginBottom: 2 }}>效率</div>
            <div style={{ color: '#e50914', fontWeight: 600, fontSize: 14 }}>
              {item.scorePerWeek} 分/週
            </div>
          </div>
        </div>

        {/* 覆蓋率條 */}
        {item.releaseWeeks != null && item.releaseWeeks > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 10, color: '#666', marginBottom: 3 }}>
              {item.releaseType === 'weekly'
                ? `上榜覆蓋率 ${Math.round(item.weeklyCoverage * 100)}%（${item.weeksOnChart}/${item.releaseWeeks} 週）`
                : `上榜持續 ${item.weeksOnChart} 週（上架 ${item.releaseWeeks} 週）`}
            </div>
            <div style={{ height: 5, borderRadius: 3, background: '#222', overflow: 'hidden' }}>
              <div style={{
                width: `${Math.min(100, item.weeklyCoverage * 100)}%`,
                height: '100%', borderRadius: 3, background: item.barColor,
              }} />
            </div>
          </div>
        )}
      </div>

      {item.releaseType === 'weekly' && item.releaseWeeks != null && item.releaseWeeks >= 4 && (
        <div style={{ fontSize: 10, color: '#666', marginTop: 4, fontStyle: 'italic' }}>
          週播 {item.releaseWeeks} 週，有更多機會累積週榜積分
        </div>
      )}
    </div>
  )
}

function DailyTooltip({ active, payload, label }: {
  active?: boolean; payload?: { payload?: ChartItem }[]; label?: string
}) {
  if (!active || !payload?.length) return null
  const item = payload[0]?.payload
  if (!item) return null

  const releaseColor = RELEASE_COLORS[item.releaseType] ?? '#888'
  const releaseLabel = RELEASE_LABELS[item.releaseType] ?? item.releaseType
  const totalDays = (item.releaseWeeks ?? 1) * 7
  const specialNote = SPECIAL_NOTES[item.title]

  return (
    <div style={{ ...TOOLTIP_STYLE, minWidth: 230 }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
      {specialNote && (
        <div style={{ fontSize: 10, color: '#f5c518', background: '#2a2000', padding: '3px 8px', borderRadius: 4, marginBottom: 6, border: '1px solid #f5c51830' }}>
          {specialNote}
        </div>
      )}
      <div style={{ color: '#f5c518', fontSize: 13 }}>
        日榜積分：<strong>{item.dailyScore}</strong> 分
      </div>

      <div style={{
        marginTop: 8, padding: '8px 10px', borderRadius: 6,
        background: '#0d0d1a', border: '1px solid #2a2a3e',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{
            padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
            background: `${releaseColor}25`, color: releaseColor, border: `1px solid ${releaseColor}50`,
          }}>
            {releaseLabel}
          </span>
          {item.totalEpisodes && <span style={{ fontSize: 11, color: '#aaa' }}>{item.totalEpisodes}</span>}
        </div>

        <div style={{ display: 'flex', gap: 16, fontSize: 11 }}>
          <div>
            <div style={{ color: '#666', marginBottom: 2 }}>上架期間</div>
            <div style={{ color: '#ddd', fontWeight: 600, fontSize: 14 }}>
              {totalDays} 天
            </div>
          </div>
          <div style={{ borderLeft: '1px solid #333', paddingLeft: 16 }}>
            <div style={{ color: '#666', marginBottom: 2 }}>上榜天數</div>
            <div style={{ color: '#ddd', fontWeight: 600, fontSize: 14 }}>
              {item.daysOnChart} 天
            </div>
          </div>
          <div style={{ borderLeft: '1px solid #333', paddingLeft: 16 }}>
            <div style={{ color: '#666', marginBottom: 2 }}>效率</div>
            <div style={{ color: '#f5c518', fontWeight: 600, fontSize: 14 }}>
              {item.daysOnChart > 0 ? Math.round(item.dailyScore / item.daysOnChart * 10) / 10 : 0} 分/天
            </div>
          </div>
        </div>

        {/* 日榜覆蓋率條 */}
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 10, color: '#666', marginBottom: 3 }}>
            日榜覆蓋率 {Math.round(item.dailyCoverage * 100)}%（{item.daysOnChart}/{totalDays} 天）
          </div>
          <div style={{ height: 5, borderRadius: 3, background: '#222', overflow: 'hidden' }}>
            <div style={{
              width: `${Math.min(100, item.dailyCoverage * 100)}%`,
              height: '100%', borderRadius: 3, background: item.barColor,
            }} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────

type ReleaseFilter = 'all' | 'weekly' | 'allAtOnce' | 'split'
type NetflixFilter = 'all' | 'original' | 'nonOriginal'

export default function TaiwanDramaChart({ data, showAttributes = {} }: Props) {
  const [sortMode,      setSortMode]      = useState<'weekly' | 'daily'>('weekly')
  const [filterRelease, setFilterRelease] = useState<ReleaseFilter>('all')
  const [filterNetflix, setFilterNetflix] = useState<NetflixFilter>('all')

  const filtered = data.filter(d => {
    if (filterRelease !== 'all' && d.releaseType !== filterRelease) return false
    if (filterNetflix === 'original'    && !d.isNetflixOriginal) return false
    if (filterNetflix === 'nonOriginal' &&  d.isNetflixOriginal) return false
    return true
  })

  const chartData: ChartItem[] = filtered
    .filter(d => sortMode === 'weekly' ? d.weeklyScore > 0 : d.dailyScore > 0)
    .sort((a, b) => sortMode === 'weekly'
      ? b.weeklyScore - a.weeklyScore
      : b.dailyScore  - a.dailyScore)
    .map(d => {
      const attr = showAttributes[d.title]
      const weeksOn = d.weeksOnChart || 0
      const rw = attr?.releaseWeeks ?? 1
      const totalDays = rw * 7
      const weeklyCov = rw > 0 ? weeksOn / rw : 0
      const dailyCov = totalDays > 0 ? d.daysOnChart / totalDays : 0

      const base: ChartItem = {
        ...d,
        displayTitle: (d.isNetflixOriginal ? '★ ' : '') + d.title,
        releaseWeeks: attr?.releaseWeeks,
        totalEpisodes: attr?.totalEpisodes,
        scorePerWeek: weeksOn > 0 ? Math.round((d.weeklyScore / weeksOn) * 10) / 10 : 0,
        weeklyCoverage: weeklyCov,
        dailyCoverage: dailyCov,
        barColor: '',
      }
      base.barColor = sortMode === 'weekly' ? getWeeklyBarColor(base) : getDailyBarColor(base)
      return base
    })

  function releaseBtn(val: ReleaseFilter, label: string) {
    const active = filterRelease === val
    const color = val === 'all' ? '#7c6fff' : (RELEASE_COLORS[val] ?? '#7c6fff')
    return (
      <button key={val} onClick={() => setFilterRelease(val)} style={{
        padding: '4px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
        border: `1px solid ${active ? color : '#333'}`,
        background: active ? `${color}20` : 'transparent',
        color: active ? color : '#888', fontWeight: active ? 700 : 400,
        transition: 'all 0.15s',
      }}>{label}</button>
    )
  }

  function netflixBtn(val: NetflixFilter, label: string) {
    const active = filterNetflix === val
    return (
      <button key={val} onClick={() => setFilterNetflix(val)} style={{
        padding: '4px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
        border: `1px solid ${active ? '#e50914' : '#333'}`,
        background: active ? '#3a0505' : 'transparent',
        color: active ? '#ff4d4d' : '#888', fontWeight: active ? 700 : 400,
        transition: 'all 0.15s',
      }}>{label}</button>
    )
  }

  return (
    <div>
      {/* 篩選列 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#555', minWidth: 52 }}>上架方式</span>
          {releaseBtn('all', '全部')}
          {releaseBtn('weekly', '週播')}
          {releaseBtn('allAtOnce', '一次上架')}
          {releaseBtn('split', '拆分上架')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#555', minWidth: 52 }}>Netflix 獨家</span>
          {netflixBtn('all', '全部')}
          {netflixBtn('original', '獨家')}
          {netflixBtn('nonOriginal', '非獨家')}
        </div>
      </div>

      {/* 榜單切換 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {([['weekly', '週榜積分'], ['daily', '日榜積分']] as const).map(([mode, label]) => (
          <button key={mode} onClick={() => setSortMode(mode)} style={{
            padding: '4px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
            cursor: 'pointer', border: '1px solid',
            borderColor: sortMode === mode ? (mode === 'weekly' ? '#e50914' : '#f5c518') : '#444',
            background: sortMode === mode ? (mode === 'weekly' ? '#2a0a0a' : '#2a2000') : 'transparent',
            color: sortMode === mode ? (mode === 'weekly' ? '#e50914' : '#f5c518') : '#888',
          }}>{label}</button>
        ))}
      </div>

      {/* 色彩圖例 */}
      <div style={{ fontSize: 11, color: '#555', marginBottom: 12, lineHeight: 1.8 }}>
        <div>
          標籤：
          <span style={{ color: RELEASE_COLORS.weekly, margin: '0 4px', padding: '1px 5px', borderRadius: 4, border: `1px solid ${RELEASE_COLORS.weekly}40`, fontSize: 10 }}>週播</span>
          <span style={{ color: RELEASE_COLORS.allAtOnce, margin: '0 4px', padding: '1px 5px', borderRadius: 4, border: `1px solid ${RELEASE_COLORS.allAtOnce}40`, fontSize: 10 }}>一次</span>
          <span style={{ color: RELEASE_COLORS.split, margin: '0 4px', padding: '1px 5px', borderRadius: 4, border: `1px dashed ${RELEASE_COLORS.split}40`, background: `${RELEASE_COLORS.split}15`, fontSize: 10 }}>拆分</span>
          　數字 = 集數 · 上架週 → 上榜週
        </div>
        <div>
          {sortMode === 'weekly'
            ? <>
                <span style={{ color: RELEASE_COLORS.weekly }}>週播</span>：覆蓋率分 4 階（破百 / ≥80% / ≥50% / &lt;50%）
                <span style={{ color: RELEASE_COLORS.allAtOnce }}>一次/拆分</span>：上榜週數分 3 階（≥8週 / ≥5週 / &lt;5週）
              </>
            : <>
                <span style={{ color: RELEASE_COLORS.weekly }}>週播</span>：日榜覆蓋率分 3 階（≥70% / ≥40% / &lt;40%）
                <span style={{ color: RELEASE_COLORS.allAtOnce }}>一次/拆分</span>：日榜覆蓋率分 3 階（≥300% / ≥150% / &lt;150%）
              </>
          }
        </div>
      </div>

      {chartData.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#555', padding: '40px 0', fontSize: 14 }}>
          無符合條件的節目
        </div>
      ) : (
        <ResponsiveContainer key={sortMode} width="100%" height={Math.max(400, chartData.length * 40 + 60)}>
          <BarChart layout="vertical" data={chartData} margin={{ top: 4, right: 60, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#333" />
            <XAxis
              type="number"
              tick={{ fill: sortMode === 'weekly' ? '#e50914' : '#f5c518', fontSize: 11 }}
              label={{
                value: sortMode === 'weekly' ? '週榜積分' : '日榜積分',
                fill: sortMode === 'weekly' ? '#e50914' : '#f5c518',
                fontSize: 11, position: 'insideBottomRight', offset: -5,
              }}
            />
            <YAxis
              type="category" dataKey="displayTitle" width={230}
              tick={(props: { x: number; y: number; payload: { value: string; index: number } }) => {
                const { x, y, payload } = props
                const item = chartData[payload.index]
                if (!item) return <text x={x} y={y} />
                const releaseColor = RELEASE_COLORS[item.releaseType] ?? '#888'
                const isSplit = item.releaseType === 'split'
                const releaseShort = item.releaseType === 'weekly' ? '週播'
                  : isSplit ? '拆分' : '一次'
                const ep = item.totalEpisodes?.replace(/\s*集/, '') ?? ''
                const rw = item.releaseWeeks ?? ''
                const woc = item.weeksOnChart
                const hasNote = SPECIAL_NOTES[item.title]
                return (
                  <g>
                    <text x={x - 75} y={y} textAnchor="end" fill="#ddd" fontSize={12} dy={-3}>
                      {item.displayTitle}
                    </text>
                    <text x={x - 72} y={y} textAnchor="start" fill={releaseColor} fontSize={9} dy={-3} fontWeight={600}>
                      {releaseShort}
                    </text>
                    {hasNote && (
                      <text x={x - 40} y={y} textAnchor="start" fill="#f5c518" fontSize={8} dy={-3}>
                        *
                      </text>
                    )}
                    <text x={x - 2} y={y} textAnchor="end" fill="#777" fontSize={9} dy={9}>
                      {ep ? `${ep}集` : ''}{rw ? ` · ${rw}→${woc}週` : ` · ${woc}週`}
                    </text>
                  </g>
                )
              }}
            />
            <Tooltip content={sortMode === 'weekly' ? <WeeklyTooltip /> : <DailyTooltip />} />
            {sortMode === 'weekly' ? (
              <Bar dataKey="weeklyScore" name="週榜積分" radius={[0, 3, 3, 0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.barColor} />
                ))}
                <LabelList dataKey="weeklyScore" position="right" style={{ fill: '#ccc', fontSize: 11 }} />
              </Bar>
            ) : (
              <Bar dataKey="dailyScore" name="日榜積分" radius={[0, 3, 3, 0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.barColor} />
                ))}
                <LabelList dataKey="dailyScore" position="right" style={{ fill: '#ccc', fontSize: 11 }} />
              </Bar>
            )}
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
