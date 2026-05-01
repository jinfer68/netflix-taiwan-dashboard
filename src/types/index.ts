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

export interface RankingsData {
  meta: {
    generatedAt: string
    dataThrough: string
  }
  showAttributes: Record<string, ShowAttributes>
  overallRankings: OverallRankingEntry[]
  dailyOverallRankings: OverallRankingEntry[]                    // 全期日榜積分總排行
  dailyOverallByQuarter: Record<string, OverallRankingEntry[]>   // 各季度日榜積分排行
  dailyOverallByWeek: Record<number, OverallRankingEntry[]>      // 各週日榜積分排行
  taiwanDramaRankings: TaiwanDramaRanking[]
  dailyRankings: DailyRankingEntry[]            // 台劇每日排名（供走勢圖使用）
  weeklyRankings: WeeklyRankingWeek[]
}
