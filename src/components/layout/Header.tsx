import { ACCENT, INK, INK_MUTED, NUM, PAPER, RULE_STRONG } from '../../constants/styles'

interface Props {
  dataFrom?: string
  dataThrough?: string
}

function fmt(dateStr: string) {
  return dateStr.replace(/-/g, '/')
}

export default function Header({ dataFrom, dataThrough }: Props) {
  return (
    <header style={{
      background: PAPER,
      borderBottom: `1px solid ${RULE_STRONG}`,
      padding: '0 20px',
      display: 'flex',
      alignItems: 'baseline',
      height: 60,
      gap: 12,
    }}>
      <span style={{
        alignSelf: 'center',
        background: ACCENT, color: '#fff',
        fontWeight: 900, fontSize: 14, letterSpacing: 1,
        padding: '2px 7px', borderRadius: 2,
      }}>
        N
      </span>
      <span style={{ color: INK, fontWeight: 700, fontSize: 17, letterSpacing: 0.5 }}>
        台灣收視儀表板
      </span>
      {dataFrom && dataThrough && (
        <>
          <span style={{ ...NUM, color: INK_MUTED, fontSize: 12 }}>
            統計期間 {fmt(dataFrom)} – {fmt(dataThrough)}
          </span>
          <span style={{ color: INK_MUTED, fontSize: 12 }}>
            ※ 首尾週資料可能不完整
          </span>
        </>
      )}
    </header>
  )
}
