import type { MovieFormat, MovieLanguage } from '../types'

/**
 * 六色取自 GENRE_COLORS 已驗證的色階（美劇藍、其他灰、台劇綠、日劇粉、韓劇紅、陸劇琥珀），
 * 因此不需重新驗證色盲可辨性與對紙白底對比。
 */
export const LANGUAGE_COLORS: Record<MovieLanguage, string> = {
  英語: '#3568b0',
  其他語言: '#9a9a94',
  台灣: '#1f6f3f',
  日語: '#c4527e',
  韓語: '#b3302b',
  華語: '#b07d10',
}

/** 固定的圖例與堆疊順序，永不依數值重排 */
export const LANGUAGE_LABELS: MovieLanguage[] = [
  '英語', '其他語言', '台灣', '日語', '韓語', '華語',
]

export const FORMAT_LABELS: MovieFormat[] = ['劇情片', '動畫', '紀錄片']
