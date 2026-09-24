import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import type { MovieAttributes } from '../../types'
import { LANGUAGE_COLORS } from '../../constants/languages'
import {
  SECTION_STYLE, SECTION_TITLE, INPUT_STYLE, DOT, NUM, hoverProps,
  ACCENT, ACCENT_WASH, INK, INK_MUTED, INK_SECONDARY, RULE,
} from '../../constants/styles'

interface Props {
  entities: Record<string, MovieAttributes>
  selectedTitle: string | null
  onSelectTitle: (title: string | null) => void
}

const MAX_RESULTS = 60

const FIELD: CSSProperties = {
  display: 'flex', justifyContent: 'space-between', gap: 12,
  padding: '5px 0', borderBottom: `1px solid ${RULE}`, fontSize: 13,
}

const RANGE_NOTE: CSSProperties = {
  fontSize: 11, color: INK_MUTED, marginTop: 6,
}

export default function MovieQuickLookup({ entities, selectedTitle, onSelectTitle }: Props) {
  const [search, setSearch] = useState('')

  const { results, total } = useMemo(() => {
    const all = Object.entries(entities)
    const keyword = search.trim().toLowerCase()
    const matched = keyword
      ? all.filter(([title]) => title.toLowerCase().includes(keyword))
      : all
    const sorted = matched.sort((a, b) => b[1].totalScore - a[1].totalScore)
    return { results: sorted.slice(0, MAX_RESULTS), total: sorted.length }
  }, [entities, search])

  const detail = selectedTitle ? entities[selectedTitle] : null

  const rangeNote = search.trim()
    ? total > MAX_RESULTS
      ? `※ 搜尋結果 ${total} 部（僅顯示前 ${MAX_RESULTS} 部）`
      : `※ 搜尋結果 ${total} 部`
    : `※ 全期積分排行　前 ${results.length} / ${total} 部`

  return (
    <div style={{ ...SECTION_STYLE, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={SECTION_TITLE}>快速查詢</div>

      <input
        type="text"
        placeholder="搜尋電影名稱…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ ...INPUT_STYLE, marginTop: 8 }}
      />

      <div style={RANGE_NOTE}>{rangeNote}</div>

      {detail && selectedTitle && (
        <div style={{ marginTop: 10, paddingBottom: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={DOT(LANGUAGE_COLORS[detail.language], true)} />
            {selectedTitle}
            <span style={{ fontSize: 11, fontWeight: 400, color: INK_MUTED }}>全期</span>
          </div>
          <div style={FIELD}><span style={{ color: INK_SECONDARY }}>語言／形式</span><span>{detail.language}・{detail.format}</span></div>
          <div style={FIELD}><span style={{ color: INK_SECONDARY }}>產地</span><span>{detail.origin || '—'}</span></div>
          <div style={FIELD}><span style={{ color: INK_SECONDARY }}>總積分</span><span style={NUM}>{detail.totalScore}</span></div>
          <div style={FIELD}><span style={{ color: INK_SECONDARY }}>在榜天數</span><span style={NUM}>{detail.daysOnChart}</span></div>
          <div style={FIELD}><span style={{ color: INK_SECONDARY }}>最佳名次</span><span style={NUM}>第 {detail.bestRank} 名</span></div>
          <div style={FIELD}><span style={{ color: INK_SECONDARY }}>平均名次</span><span style={NUM}>{detail.avgRank.toFixed(1)}</span></div>
          <div style={FIELD}><span style={{ color: INK_SECONDARY }}>首末上榜</span><span style={NUM}>{detail.firstDate} — {detail.lastDate}</span></div>
          <div style={FIELD}><span style={{ color: INK_SECONDARY }}>片源</span><span>{detail.isNetflixOriginal ? 'Netflix 獨家' : '非獨家'}</span></div>
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto', marginTop: 8, minHeight: 0 }}>
        {results.map(([title, attrs]) => {
          const selected = selectedTitle === title
          return (
            <button
              key={title}
              onClick={() => onSelectTitle(selected ? null : title)}
              title={title}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '7px 6px', border: 'none', borderBottom: `1px solid ${RULE}`,
                borderLeft: `2px solid ${selected ? ACCENT : 'transparent'}`,
                background: selected ? ACCENT_WASH : 'transparent',
                cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', textAlign: 'left',
                color: selected ? INK : INK_SECONDARY, fontWeight: selected ? 700 : 400,
              }}
              {...hoverProps(selected ? ACCENT_WASH : 'transparent')}
            >
              <span style={DOT(LANGUAGE_COLORS[attrs.language], selected)} />
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {title}
              </span>
              <span style={{ ...NUM, fontSize: 12, color: INK_MUTED }}>{attrs.totalScore}</span>
            </button>
          )
        })}
        {results.length === 0 && (
          <div style={{ fontSize: 12, color: INK_MUTED, padding: '8px 0' }}>找不到符合的電影</div>
        )}
      </div>
    </div>
  )
}
