import { useMemo } from 'react'
import type { DailyBoard, MovieAttributes } from '../../types'
import { LANGUAGE_COLORS } from '../../constants/languages'
import { boardIndexAt, rankSeries, titlesIn } from '../../utils/boardTransforms'
import {
  SECTION_STYLE, SECTION_TITLE, NUM,
  INK, INK_MUTED, INK_SECONDARY, RULE, RULE_STRONG,
} from '../../constants/styles'

interface Props {
  boards: DailyBoard[]   // 完整日榜；以 endDate 為終點往前取 WINDOW 天
  endDate: string | null
  entities: Record<string, MovieAttributes>
  selectedTitle: string | null
}

const W = 820, H = 270
const L = 30, R = 190, T = 16, B = 30
const PX = W - L - R
const PY = H - T - B
const WINDOW = 14
const LABEL_GAP = 13
const SWATCH = 8
const LABEL_X = L + PX + 8

interface SeriesView {
  title: string
  attrs: MovieAttributes | undefined
  ranks: (number | null)[]
  active: boolean
  todayRank: number | null
}

interface LabelPlacement {
  s: SeriesView
  ly: number
}

function truncateTitle(title: string): string {
  return title.length > 13 ? `${title.slice(0, 13)}…` : title
}

/**
 * 端點標籤防重疊：依今天名次排序後由上而下堆疊，彼此至少間隔 LABEL_GAP。
 * 全部放完若最後一個超出圖高，整組上移超出量；上移後若第一個仍高於上緣，夾回上緣。
 * 如此無論標籤數量多寡都保證留在 [T, H-4] 內。
 */
function placeLabels(activeSeries: SeriesView[], idealY: (rank: number) => number): LabelPlacement[] {
  const sorted = [...activeSeries].sort((a, b) => (a.todayRank ?? 99) - (b.todayRank ?? 99))
  const placed: LabelPlacement[] = []
  for (const s of sorted) {
    const ideal = idealY(s.todayRank ?? 1)
    const prevLy = placed.length ? placed[placed.length - 1].ly : -Infinity
    placed.push({ s, ly: Math.max(ideal, prevLy + LABEL_GAP) })
  }
  if (placed.length === 0) return placed

  const overflow = placed[placed.length - 1].ly - (H - 4)
  if (overflow > 0) {
    for (const p of placed) p.ly -= overflow
  }
  if (placed[0].ly < T) {
    placed[0].ly = T
  }
  return placed
}

export default function MovieRaceChart({ boards, endDate, entities, selectedTitle }: Props) {
  const view = useMemo(() => {
    const end = endDate ? boardIndexAt(boards, endDate) : -1
    if (end < 0) return null
    const recent = boards.slice(Math.max(0, end - WINDOW + 1), end + 1)

    const dates = recent.map(b => b.date)
    const today = recent[recent.length - 1]
    const onToday = new Set(today.entries.map(e => e.title))

    const series: SeriesView[] = titlesIn(recent).map(title => ({
      title,
      attrs: entities[title],
      ranks: rankSeries(recent, title, dates),
      active: onToday.has(title),
      todayRank: today.entries.find(e => e.title === title)?.rank ?? null,
    }))

    series.sort((a, b) => Number(a.active) - Number(b.active))
    return { dates, series }
  }, [boards, endDate, entities])

  if (!view) {
    return (
      <div style={SECTION_STYLE}>
        <div style={SECTION_TITLE}>{WINDOW} 天名次競逐</div>
        <div style={{ fontSize: 12, color: INK_MUTED, marginTop: 8 }}>此期間無資料</div>
      </div>
    )
  }

  const x = (i: number) => L + (i / Math.max(1, view.dates.length - 1)) * PX
  const y = (rank: number) => T + ((rank - 1) / 9) * PY

  function pathOf(ranks: (number | null)[]): string[] {
    const out: string[] = []
    let current = ''
    ranks.forEach((rank, i) => {
      if (rank === null) {
        if (current) out.push(current)
        current = ''
        return
      }
      current += `${current ? 'L' : 'M'}${x(i).toFixed(1)} ${y(rank).toFixed(1)} `
    })
    if (current) out.push(current)
    return out
  }

  const lastIndex = view.dates.length - 1
  const labels = placeLabels(view.series.filter(s => s.active), y)

  return (
    <div style={{ ...SECTION_STYLE, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={SECTION_TITLE}>
        {WINDOW} 天名次競逐{'　'}
        <span style={{ ...NUM, fontSize: 11, fontWeight: 400, color: INK_MUTED }}>
          {view.dates[0]} — {view.dates[lastIndex]}
        </span>
      </div>
      <div style={{ fontSize: 11, color: INK_MUTED, margin: '4px 0 6px' }}>
        終點跟隨當日榜單的日期；灰線為期間內上榜過、當日已掉出的片
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
          {[1, 5, 10].map(rank => (
            <g key={rank}>
              <line x1={L} y1={y(rank)} x2={L + PX} y2={y(rank)} stroke={RULE} />
              <text
                x={L - 7} y={y(rank) + 4} textAnchor="end"
                fontSize={10} fill={INK_MUTED} style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {rank}
              </text>
            </g>
          ))}

          {view.dates.map((d, i) => {
            const show = i === lastIndex || (i % 3 === 0 && lastIndex - i >= 3)
            if (!show) return null
            return (
              <text
                key={d} x={x(i)} y={H - 10} textAnchor="middle"
                fontSize={10} fill={INK_MUTED} style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {d.slice(5).replace('-', '/')}
              </text>
            )
          })}

          {[...view.series]
            .sort((a, b) => Number(a.title === selectedTitle) - Number(b.title === selectedTitle))
            .map(s => {
            const highlighted = selectedTitle === s.title
            const color = s.active
              ? LANGUAGE_COLORS[s.attrs?.language ?? '其他語言']
              : highlighted ? INK_SECONDARY : RULE_STRONG
            return pathOf(s.ranks).map((d, i) => (
              <path
                key={`${s.title}-${i}`}
                d={d}
                fill="none"
                stroke={color}
                strokeOpacity={s.active || highlighted ? 1 : 0.7}
                strokeWidth={highlighted ? 3 : s.active ? 2 : 1.2}
                strokeLinejoin="round"
                strokeLinecap="round"
              >
                <title>{`${s.title}　在榜 ${s.attrs?.daysOnChart ?? '—'} 天`}</title>
              </path>
            ))
          })}

          {labels.map(({ s, ly }) => {
            const highlighted = selectedTitle === s.title
            const color = LANGUAGE_COLORS[s.attrs?.language ?? '其他語言']
            const idealY = s.todayRank !== null ? y(s.todayRank) : ly
            return (
              <g key={`label-${s.title}`}>
                {Math.abs(idealY - ly) > 1 && (
                  <line
                    x1={L + PX} y1={idealY} x2={LABEL_X} y2={ly}
                    stroke={color} strokeWidth={1} strokeOpacity={0.5}
                  />
                )}
                <rect x={LABEL_X} y={ly - SWATCH / 2} width={SWATCH} height={SWATCH} fill={color} />
                <text
                  x={LABEL_X + SWATCH + 5} y={ly + 4}
                  fontSize={11} fill={INK} fontWeight={highlighted ? 700 : 400}
                >
                  {truncateTitle(s.title)}
                  <title>{s.title}</title>
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
