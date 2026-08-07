import type { Genre } from '../types'

// 前八色經 OKLab 驗證：色盲相鄰可辨、正常視覺可辨、對紙白底對比 >= 3:1
// 「其他」為分類摺疊桶，使用中性灰
export const GENRE_COLORS: Record<Genre, string> = {
  '韓劇':        '#b3302b',
  '美劇':        '#3568b0',
  '陸劇':        '#b07d10',
  '動畫劇 (日)': '#7b5cb8',
  '日劇':        '#c4527e',
  '台劇':        '#1f6f3f',
  '實境秀':      '#c67612',
  '英劇':        '#0d9488',
  '其他':        '#9a9a94',
}

// 圖例順序、堆疊順序皆依此固定序，不得依數值重排
export const GENRE_LABELS: Genre[] = [
  '韓劇', '美劇', '陸劇', '動畫劇 (日)', '日劇', '台劇', '實境秀', '英劇', '其他',
]

// 多節目比較（走勢圖）的系列色，取自同一組驗證過的色階
export const SERIES_COLORS = [
  '#b3302b', '#3568b0', '#b07d10', '#7b5cb8',
  '#c4527e', '#1f6f3f', '#c67612', '#0d9488',
]

export const MAX_SERIES = SERIES_COLORS.length
