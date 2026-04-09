interface Props {
  dataFrom?: string
  dataThrough?: string
}

function fmt(dateStr: string) {
  // "2024-12-30" → "2024/12/30"
  return dateStr.replace(/-/g, '/')
}

export default function Header({ dataFrom, dataThrough }: Props) {
  return (
    <header style={{
      background: '#0d0d1a',
      borderBottom: '1px solid #222',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      height: 60,
      position: 'sticky',
      top: 0,
      zIndex: 100,
      gap: 14,
    }}>
      <span style={{
        background: '#e50914', color: '#fff',
        fontWeight: 900, fontSize: 15, letterSpacing: 1,
        padding: '3px 8px', borderRadius: 4,
      }}>
        N
      </span>
      <span style={{ color: '#eee', fontWeight: 700, fontSize: 16 }}>
        台灣收視儀表板
      </span>
      {dataFrom && dataThrough && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#666', fontSize: 12 }}>
            統計期間　{fmt(dataFrom)} ～ {fmt(dataThrough)}
          </span>
          <span style={{
            color: '#554400', fontSize: 11,
            background: '#2a1f00', border: '1px solid #3a2f00',
            borderRadius: 4, padding: '1px 7px',
          }}>
            ⚠ 首尾週資料可能不完整
          </span>
        </span>
      )}
    </header>
  )
}
