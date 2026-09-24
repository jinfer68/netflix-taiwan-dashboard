import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import type { DailyBoard, MovieAttributes } from '../../types'
import { LANGUAGE_COLORS } from '../../constants/languages'
import { rankSeries } from '../../utils/boardTransforms'
import {
  SECTION_STYLE, SECTION_TITLE, DOT, NUM, hoverProps,
  ACCENT, ACCENT_WASH, INK, INK_MUTED, INK_SECONDARY, PAPER_RAISED, RULE, RULE_STRONG,
} from '../../constants/styles'

interface Props {
  boards: DailyBoard[]
  entities: Record<string, MovieAttributes>
  selectedTitle: string | null
  onSelectTitle: (title: string | null) => void
}

const SPARK_W = 78
const SPARK_H = 20
const WINDOW = 14

const TH: CSSProperties = {
  fontSize: 11, fontWeight: 700, color: INK_SECONDARY, textAlign: 'left',
  background: PAPER_RAISED, padding: '6px 8px', letterSpacing: 0.5, whiteSpace: 'nowrap',
}
const TD: CSSProperties = {
  padding: '5px 8px', borderBottom: `1px solid ${RULE}`, verticalAlign: 'middle',
}

/** 名次 1 在頂端；固定 1–10 不隨資料縮放，各列形狀才能互相比較 */
function sparkY(rank: number): number {
  return 2 + ((rank - 1) / 9) * (SPARK_H - 4)
}

function Sparkline({ series }: { series: (number | null)[] }) {
  const step = SPARK_W / Math.max(1, series.length - 1)
  const segments: string[] = []
  const isolated: { x: number; y: number }[] = []
  let current = ''

  series.forEach((rank, i) => {
    if (rank === null) {
      if (current) segments.push(current)
      current = ''
      return
    }
    const x = i * step
    const y = sparkY(rank)
    current += `${current ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)} `
    const before = i > 0 && series[i - 1] !== null
    const after = i < series.length - 1 && series[i + 1] !== null
    if (!before && !after) isolated.push({ x, y })
  })
  if (current) segments.push(current)

  const entryIndex = series.findIndex(r => r !== null)
  const lastRank = series[series.length - 1]

  return (
    <svg viewBox={`0 0 ${SPARK_W} ${SPARK_H}`} width={SPARK_W} height={SPARK_H} style={{ display: 'block' }}>
      {entryIndex > 0 && (
        <line
          x1={(entryIndex * step).toFixed(1)} y1={1}
          x2={(entryIndex * step).toFixed(1)} y2={SPARK_H - 1}
          stroke={RULE_STRONG} strokeWidth={1}
        />
      )}
      {segments.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={INK_SECONDARY} strokeWidth={1.6} strokeLinejoin="round" />
      ))}
      {isolated.map((p, i) => (
        <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r={1.6} fill={INK_SECONDARY} />
      ))}
      {lastRank !== null && (
        <circle cx={SPARK_W} cy={sparkY(lastRank).toFixed(1)} r={2.2} fill={INK} />
      )}
    </svg>
  )
}

export default function MovieBoardTable({ boards, entities, selectedTitle, onSelectTitle }: Props) {
  const view = useMemo(() => {
    if (boards.length === 0) return null
    const recent = boards.slice(Math.max(0, boards.length - WINDOW))
    const dates = recent.map(b => b.date)
    const today = boards[boards.length - 1]
    const prev = boards.length > 1 ? boards[boards.length - 2] : null

    const rows = today.entries.map(entry => ({
      rank: entry.rank,
      title: entry.title,
      attrs: entities[entry.title],
      series: rankSeries(recent, entry.title, dates),
      prevRank: prev?.entries.find(e => e.title === entry.title)?.rank ?? null,
    }))
    return { date: today.date, prevDate: prev?.date ?? null, rows }
  }, [boards, entities])

  if (!view) {
    return (
      <div style={SECTION_STYLE}>
        <div style={SECTION_TITLE}>當日榜單</div>
        <div style={{ fontSize: 12, color: INK_MUTED, marginTop: 8 }}>此期間無資料</div>
      </div>
    )
  }

  return (
    <div style={{ ...SECTION_STYLE, height: '100%', overflow: 'auto' }}>
      <div style={SECTION_TITLE}>
        當日榜單{'　'}
        <span style={{ ...NUM, fontSize: 11, fontWeight: 400, color: INK_MUTED }}>{view.date}</span>
      </div>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13, marginTop: 8 }}>
        <thead>
          <tr>
            <th style={TH}>#</th>
            <th style={TH}>近 {WINDOW} 天走勢</th>
            <th style={TH}>片名</th>
            <th style={TH}>語言</th>
            <th style={TH}>在榜</th>
            <th style={TH}>升降</th>
          </tr>
        </thead>
        <tbody>
          {view.rows.map(row => {
            const selected = selectedTitle === row.title
            const delta = row.prevRank === null
              ? '新'
              : row.prevRank === row.rank ? '—'
              : row.prevRank > row.rank ? `↑${row.prevRank - row.rank}`
              : `↓${row.rank - row.prevRank}`
            const deltaColor = row.prevRank === null
              ? ACCENT
              : row.prevRank > row.rank ? INK : INK_MUTED
            const deltaHint = view.prevDate
              ? `與 ${view.prevDate} 相比`
              : '無前一筆資料可比較'

            return (
              <tr
                key={row.title}
                onClick={() => onSelectTitle(selected ? null : row.title)}
                style={{
                  cursor: 'pointer',
                  background: selected ? ACCENT_WASH : 'transparent',
                  borderLeft: `2px solid ${selected ? ACCENT : 'transparent'}`,
                }}
                {...hoverProps(selected ? ACCENT_WASH : 'transparent')}
              >
                <td style={{ ...TD, ...NUM, fontSize: 15, fontWeight: 700, width: 24 }}>{row.rank}</td>
                <td style={{ ...TD, width: SPARK_W + 16 }}><Sparkline series={row.series} /></td>
                <td style={{ ...TD, maxWidth: 0, overflow: 'hidden' }} title={row.title}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                    <span style={{ ...DOT(LANGUAGE_COLORS[row.attrs?.language ?? '其他語言'], true), flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                      {row.title}
                    </span>
                    {row.attrs?.isNetflixOriginal && (
                      <span style={{ fontSize: 10, color: ACCENT, flexShrink: 0 }}>獨家</span>
                    )}
                  </div>
                </td>
                <td style={{ ...TD, fontSize: 12, color: INK_SECONDARY }}>{row.attrs?.language ?? '—'}</td>
                <td style={{ ...TD, ...NUM }}>{row.attrs?.daysOnChart ?? '—'}</td>
                <td style={{ ...TD, ...NUM, fontWeight: 700, color: deltaColor, width: 34 }} title={deltaHint}>
                  {delta}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
