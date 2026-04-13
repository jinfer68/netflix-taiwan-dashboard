import type { CSSProperties } from 'react'

export const TOOLTIP_STYLE = {
  background: '#1a1a2e',
  border: '1px solid #333',
  borderRadius: 8,
  padding: '10px 14px',
  fontSize: 13,
  color: '#eee',
  lineHeight: 1.8,
} satisfies CSSProperties

export const SECTION_STYLE: CSSProperties = {
  background: '#111124',
  border: '1px solid #222',
  borderRadius: 12,
  padding: '20px 24px',
  marginBottom: 24,
}

export const SECTION_TITLE: CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  color: '#eee',
  marginBottom: 18,
  paddingBottom: 10,
  borderBottom: '1px solid #2a2a3e',
}

export const PILL_BTN = (active: boolean, accent = '#7c6fff'): CSSProperties => ({
  padding: '4px 12px',
  borderRadius: 20,
  fontSize: 12,
  cursor: 'pointer',
  border: `1px solid ${active ? accent : '#333'}`,
  background: active ? accent + '22' : 'transparent',
  color: active ? accent : '#888',
  fontWeight: active ? 700 : 400,
  transition: 'all 0.15s',
})
