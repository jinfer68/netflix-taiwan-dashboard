import type { Genre } from '../types'

export const GENRE_COLORS: Record<Genre, string> = {
  '韓劇':        '#e50914',
  '台劇':        '#1db954',
  '陸劇':        '#f5a623',
  '動畫劇 (日)': '#9b59b6',
  '日劇':        '#f72585',
  '美劇':        '#3498db',
  '英劇':        '#e74c3c',
  '實境秀':      '#e67e22',
  '其他':        '#95a5a6',
}

export const GENRE_ICONS: Record<Genre, string> = {
  '韓劇':        '🇰🇷',
  '台劇':        '🇹🇼',
  '陸劇':        '🇨🇳',
  '動畫劇 (日)': '🎌',
  '日劇':        '🗾',
  '美劇':        '🇺🇸',
  '英劇':        '🇬🇧',
  '實境秀':      '🎬',
  '其他':        '🌐',
}

export const GENRE_LABELS: Genre[] = [
  '韓劇', '台劇', '日劇', '陸劇', '動畫劇 (日)', '美劇', '英劇', '實境秀', '其他',
]
