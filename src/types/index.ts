export type Genre =
  | '韓劇'
  | '台劇'
  | '陸劇'
  | '動畫劇 (日)'
  | '日劇'
  | '美劇'
  | '英劇'
  | '實境秀'
  | '其他'


export interface OverallRankingEntry {
  rank: number
  title: string
  totalScore: number
  genre: Genre
  weeksOnChart: number
  avgRank: number
  isNetflixOriginal: boolean
  releaseType?: 'weekly' | 'allAtOnce' | 'split'
  totalEpisodes?: string
  firstWeekDate?: string   // "YYYY-MM-DD"，首次出現於週榜的日期
  lastWeekDate?: string    // "YYYY-MM-DD"，最後出現於週榜的日期
}

export interface TaiwanDramaRanking {
  rank: number
  title: string
  weeklyRank: number
  weeklyScore: number
  weeksOnChart: number
  weeklyAvgRank: number
  dailyRank: number
  dailyScore: number
  daysOnChart: number
  dailyAvgRank: number
  totalScore: number
  isNetflixOriginal: boolean
  isAllAtOnce: boolean
  releaseType: 'weekly' | 'allAtOnce' | 'split'
}

export interface DailyRankingEntry {
  dayIndex: number   // 上架天數（0 起算）
  title: string
  rank: number
  score: number
}

export interface WeeklyRankingItem {
  position: number
  rank: number | null
  title: string
  genre: string
  trend: string
  isExclusive: boolean
  isNetflixOriginal?: boolean
  score?: number
}

export interface WeeklyRankingWeek {
  weekNumber: number
  dateRange: string
  rankings: WeeklyRankingItem[]
}

export interface ShowWeekAppearance {
  weekNumber: number
  dateRange: string
  position: number
}

export interface ShowLookupEntry {
  title: string
  genre: Genre
  isNetflixOriginal: boolean
  totalScore: number
  weeksOnChart: number
  avgRank: number
  peakRank: number
  firstWeekDate: string
  lastWeekDate: string
  weekAppearances: ShowWeekAppearance[]
}

export interface ShowAttributes {
  isNetflixOriginal: boolean
  releaseType: 'weekly' | 'allAtOnce' | 'split'
  releaseWeeks: number
  totalEpisodes: string
}

export interface DailyShowAttributes {
  genre: Genre
  isNetflixOriginal: boolean
}

export interface RankingsData {
  meta: {
    generatedAt: string
    dataThrough: string
  }
  showAttributes: Record<string, ShowAttributes>
  overallRankings: OverallRankingEntry[]
  dailyBoard: DailyBoard[]                                  // 逐日 Top 10；任何期間的日榜排行都由此彙總
  dailyAttributes: Record<string, DailyShowAttributes>      // 日榜片名 → 類型／獨家
  taiwanDramaRankings: TaiwanDramaRanking[]
  dailyRankings: DailyRankingEntry[]            // 台劇每日排名（供走勢圖使用）
  weeklyRankings: WeeklyRankingWeek[]
}

// ── 電影 ────────────────────────────────────────────────────────────

export type MovieLanguage = '英語' | '其他語言' | '台灣' | '日語' | '韓語' | '華語'
export type MovieFormat = '劇情片' | '動畫' | '紀錄片'

export interface MovieAttributes {
  language: MovieLanguage
  format: MovieFormat
  origin: string
  isNetflixOriginal: boolean
  firstDate: string
  lastDate: string
  daysOnChart: number
  bestRank: number
  avgRank: number
  totalScore: number
}

export interface DailyBoard {
  date: string
  entries: { rank: number; title: string }[]
}

export interface WeeklyBoardItem {
  rank: number
  title: string
  score: number
}

export interface WeeklyBoard {
  weekNumber: number
  dateRange: string
  rankings: WeeklyBoardItem[]
}

export interface YearCoverage {
  year: string
  haveDays: number
  missingDays: number
}

/** 榜單資料集的通用形狀。劇集之後收斂到同一個型別，屆時 TAttrs = ShowAttributes */
export interface BoardDataset<TAttrs> {
  meta: { generatedAt: string; dataThrough: string; coverage: YearCoverage[] }
  entities: Record<string, TAttrs>
  dailyBoard: DailyBoard[]
  weeklyRankings: WeeklyBoard[]
}

export type MoviesData = BoardDataset<MovieAttributes>

/** boardTransforms 衍生的排行項目，不出現在 json */
export interface MovieOverallEntry {
  rank: number
  title: string
  totalScore: number
  language: MovieLanguage
  format: MovieFormat
  isNetflixOriginal: boolean
  onChartCount: number
  avgRank: number
  bestRank: number
}

/** 單一片名的逐日名次，未上榜為 null */
export interface TrendPoint {
  date: string
  rank: number | null
}

export interface DateRange {
  from: string
  to: string
}
