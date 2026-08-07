import type { CSSProperties, MouseEvent } from 'react'

export const PAPER = '#fcfcfb'
export const PAPER_RAISED = '#f5f4f1'
export const INK = '#1a1a18'
export const INK_SECONDARY = '#55544f'
export const INK_MUTED = '#8a8984'
export const RULE = '#e3e1dc'
export const RULE_STRONG = '#c9c7c0'
export const ACCENT = '#e50914'
export const ACCENT_WASH = 'rgba(229,9,20,0.06)'
// 半透明墨色，於 PAPER 與 PAPER_RAISED 兩種底色上都看得出來
export const HOVER_WASH = 'rgba(26,26,24,0.07)'

/** inline style 無法寫 :hover，統一以事件處理器補上滑過底色 */
export function hoverProps(baseBackground = 'transparent') {
  return {
    onMouseEnter: (e: MouseEvent<HTMLElement>) => {
      e.currentTarget.style.background = HOVER_WASH
    },
    onMouseLeave: (e: MouseEvent<HTMLElement>) => {
      e.currentTarget.style.background = baseBackground
    },
  }
}

export const TOOLTIP_STYLE: CSSProperties = {
  background: '#ffffff',
  border: `1px solid ${RULE_STRONG}`,
  borderRadius: 2,
  padding: '8px 12px',
  fontSize: 13,
  color: INK,
  lineHeight: 1.7,
  boxShadow: '0 2px 8px rgba(26,26,24,0.10)',
}

export const SECTION_STYLE: CSSProperties = {
  background: PAPER,
  borderBottom: `1px solid ${RULE}`,
  padding: '16px 20px',
}

export const SECTION_TITLE: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: INK_SECONDARY,
  letterSpacing: 1,
  marginBottom: 10,
}

/** segmented control 的容器：底部基準線讓選取態的紅底線有所依附 */
export const SEGMENT_GROUP: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'flex-end',
  borderBottom: `1px solid ${RULE}`,
}

/** 文字型 segmented control：選取態以底部 accent 底線標示 */
export const SEGMENT_BTN = (active: boolean): CSSProperties => ({
  padding: '6px 12px',
  marginBottom: -1,
  fontSize: 14,
  lineHeight: 1.3,
  cursor: 'pointer',
  border: 'none',
  borderBottom: `2px solid ${active ? ACCENT : 'transparent'}`,
  background: 'transparent',
  color: active ? INK : INK_SECONDARY,
  fontWeight: active ? 700 : 400,
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
})

/** 類型多選項目：前綴色點（實心＝已選，空心＝未選） */
export const GENRE_TOGGLE = (active: boolean): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  padding: '6px 12px 6px 0',
  fontSize: 14,
  lineHeight: 1.3,
  cursor: 'pointer',
  border: 'none',
  background: 'transparent',
  color: active ? INK : INK_SECONDARY,
  fontWeight: active ? 700 : 400,
  fontFamily: 'inherit',
})

export const DOT = (color: string, filled: boolean, size = 10): CSSProperties => ({
  display: 'inline-block',
  width: size,
  height: size,
  borderRadius: '50%',
  background: filled ? color : 'transparent',
  border: `1px solid ${color}`,
  flexShrink: 0,
})

export const NUM: CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
}

export const TABLE_HEAD_CELL: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: INK_SECONDARY,
  background: PAPER_RAISED,
  padding: '6px 10px',
  textAlign: 'left',
  borderBottom: `1px solid ${RULE_STRONG}`,
}

export const INPUT_STYLE: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: PAPER,
  border: `1px solid ${RULE_STRONG}`,
  borderRadius: 2,
  padding: '7px 10px',
  color: INK,
  fontSize: 14,
  fontFamily: 'inherit',
  outline: 'none',
}
