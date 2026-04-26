import type { RankingsData, OverallRankingEntry, TaiwanDramaRanking, Genre, ShowLookupEntry } from '../types'

// 年度類型河流圖顯示的類型清單（不在清單內的歸入「其他」）
export const FLOW_DISPLAY_GENRES = ['韓劇','台劇','日劇','動畫劇 (日)','美劇','陸劇','實境秀','其他']

// 週榜 genre → Genre 型別對照（不在清單內的歸入其他）
const WEEKLY_GENRE_MAP: Record<string, Genre> = {
  '韓劇': '韓劇', '台劇': '台劇', '陸劇': '陸劇',
  '動畫劇 (日)': '動畫劇 (日)', '日劇': '日劇', '美劇': '美劇',
  '英劇': '英劇', '實境秀': '實境秀', '實境': '實境秀',
}

/** 從週榜全年數據衍生所有節目積分排名，供 Top20 篩選使用 */
export function getWeeklyDerivedRankings(data: RankingsData): OverallRankingEntry[] {
  // 從 overallRankings 建立補充資訊對照（isNetflixOriginal）
  const origInfo = new Map(data.overallRankings.map(r => [r.title, r]))

  const scores = new Map<string, {
    score: number; genre: Genre; weeks: number; totalPos: number; isNetflixOriginal: boolean
    firstWeekDate: string; lastWeekDate: string
  }>()

  for (const week of data.weeklyRankings) {
    const weekStart = week.dateRange.split(' ~ ')[0]
    for (const item of week.rankings) {
      if (!item.title) continue
      const genre: Genre = WEEKLY_GENRE_MAP[item.genre] ?? '其他'
      const prev = scores.get(item.title)
      if (prev) {
        prev.score        += 11 - item.position
        prev.weeks        += 1
        prev.totalPos     += item.position
        prev.lastWeekDate  = weekStart
      } else {
        scores.set(item.title, {
          score: 11 - item.position,
          genre,
          weeks: 1,
          totalPos: item.position,
          isNetflixOriginal: origInfo.get(item.title)?.isNetflixOriginal ?? item.isNetflixOriginal ?? false,
          firstWeekDate: weekStart,
          lastWeekDate: weekStart,
        })
      }
    }
  }

  return [...scores.entries()]
    .map(([title, s]) => ({
      rank: 0,
      title,
      totalScore: s.score,
      genre: s.genre,
      weeksOnChart: s.weeks,
      avgRank: Math.round((s.totalPos / s.weeks) * 10) / 10,
      isNetflixOriginal: s.isNetflixOriginal,
      firstWeekDate: s.firstWeekDate,
      lastWeekDate: s.lastWeekDate,
    }))
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((e, i) => ({ ...e, rank: i + 1 }))
}

export function getTop20(data: RankingsData): OverallRankingEntry[] {
  return [...data.overallRankings]
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 20)
}

/**
 * 從 dailyRankings 彙整各節目的日榜總積分排行。
 * 注意：dailyRankings 只有上架天數（無實際日期），不支援年份篩選，
 * 跨參 overallRankings / weeklyRankings / showAttributes 補齊類型與 Netflix 資訊。
 */
export function getDailyOverallRankings(data: RankingsData): OverallRankingEntry[] {
  // 建立 genre 與 Netflix 狀態查找表
  const genreMap = new Map<string, Genre>()
  const netflixMap = new Map<string, boolean>()

  for (const r of data.overallRankings) {
    genreMap.set(r.title, r.genre)
    netflixMap.set(r.title, r.isNetflixOriginal)
  }
  for (const week of data.weeklyRankings) {
    for (const item of week.rankings) {
      if (!genreMap.has(item.title))
        genreMap.set(item.title, WEEKLY_GENRE_MAP[item.genre] ?? '其他')
      if (!netflixMap.has(item.title) && item.isNetflixOriginal)
        netflixMap.set(item.title, true)
    }
  }
  for (const [title, attr] of Object.entries(data.showAttributes)) {
    if (!netflixMap.has(title)) netflixMap.set(title, attr.isNetflixOriginal)
  }

  const scoreMap = new Map<string, {
    totalScore: number; days: number; totalRank: number; peakRank: number
  }>()

  for (const r of data.dailyRankings) {
    const prev = scoreMap.get(r.title)
    if (prev) {
      prev.totalScore += r.score
      prev.days++
      prev.totalRank += r.rank
      if (r.rank < prev.peakRank) prev.peakRank = r.rank
    } else {
      scoreMap.set(r.title, { totalScore: r.score, days: 1, totalRank: r.rank, peakRank: r.rank })
    }
  }

  return [...scoreMap.entries()]
    .map(([title, s]) => ({
      rank: 0,
      title,
      totalScore: s.totalScore,
      genre: genreMap.get(title) ?? '台劇',
      weeksOnChart: s.days,   // 此模式下代表「上榜天數」
      avgRank: Math.round((s.totalRank / s.days) * 10) / 10,
      isNetflixOriginal: netflixMap.get(title) ?? false,
    }))
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((e, i) => ({ ...e, rank: i + 1 }))
}

export function getTaiwanDramaComparison(data: RankingsData): TaiwanDramaRanking[] {
  if (data.taiwanDramaRankings.length > 0) {
    return [...data.taiwanDramaRankings].sort((a, b) => b.weeklyScore - a.weeklyScore)
  }
  return data.overallRankings
    .filter(r => r.genre === '台劇')
    .map((r, i) => ({
      rank: i + 1,
      title: r.title,
      weeklyRank: i + 1,
      weeklyScore: r.totalScore,
      weeksOnChart: r.weeksOnChart,
      weeklyAvgRank: r.avgRank,
      dailyRank: i + 1,
      dailyScore: 0,
      daysOnChart: r.weeksOnChart * 7,
      dailyAvgRank: 0,
      totalScore: r.totalScore,
      isNetflixOriginal: r.isNetflixOriginal,
      isAllAtOnce: false,
      releaseType: 'weekly' as const,
    }))
    .sort((a, b) => b.weeklyScore - a.weeklyScore)
}

export interface GenrePieSlice {
  genre: string
  totalScore: number
  count: number
  detail?: string  // 僅「其他」類別使用，展示細項
}


/** 統計 Top 50 積分榜各類型部數（從週榜衍生，跟隨年份篩選）*/
export function getTop50GenreDistribution(data: RankingsData): GenrePieSlice[] {
  const derived = getWeeklyDerivedRankings(data)
  const top50 = derived.slice(0, 50)
  const counts = new Map<string, number>()
  for (const r of top50) {
    const g = r.genre || '其他'
    counts.set(g, (counts.get(g) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([genre, count]) => ({ genre, totalScore: count, count }))
    .sort((a, b) => b.count - a.count)
}

// 週榜主要類型（獨立顯示）；其餘合併至「其他」
const WEEKLY_MAJOR_GENRES = new Set(['韓劇', '台劇', '日劇', '動畫劇 (日)', '美劇', '陸劇', '實境秀', '實境'])

/** 統計全年度週榜 Top 10 的類型分布（以上榜次數計算）*/
export function getWeeklyGenreDistribution(data: RankingsData): GenrePieSlice[] {
  const counts = new Map<string, number>()
  for (const week of data.weeklyRankings) {
    for (const item of week.rankings) {
      const g = item.genre || '其他'
      counts.set(g, (counts.get(g) ?? 0) + 1)
    }
  }

  const major: GenrePieSlice[] = []
  const otherDetails = new Map<string, number>()
  let otherTotal = 0

  // 合併「實境」和「實境秀」
  const realityCount = (counts.get('實境') ?? 0) + (counts.get('實境秀') ?? 0)
  if (realityCount > 0) counts.set('實境秀', realityCount)
  counts.delete('實境')

  for (const [genre, count] of counts) {
    if (WEEKLY_MAJOR_GENRES.has(genre)) {
      major.push({ genre: genre === '實境' ? '實境秀' : genre, totalScore: count, count })
    } else {
      otherDetails.set(genre, count)
      otherTotal += count
    }
  }

  if (otherTotal > 0) {
    const detail = [...otherDetails.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([g, n]) => `${g} ${n} 次`)
      .join('、')
    major.push({ genre: '其他', totalScore: otherTotal, count: otherTotal, detail })
  }

  return major.sort((a, b) => b.totalScore - a.totalScore)
}

// ── 每日走勢（上架天數為 X 軸）────────────────────────────────────────────────

interface DailyPoint {
  dayIndex: number
  rank: number | null
}

interface DailyTrendSeries {
  name: string
  data: DailyPoint[]
}

/** 取得台劇每日排名走勢（以上架天數為 X 軸）*/
export function getDailyTrendSeries(
  data: RankingsData,
  selectedTitles: string[]
): { indices: number[]; series: DailyTrendSeries[] } {
  const relevant = data.dailyRankings.filter(r => selectedTitles.includes(r.title))

  const allIndices = [...new Set(relevant.map(r => r.dayIndex))].sort((a, b) => a - b)

  const series: DailyTrendSeries[] = selectedTitles
    .filter(t => relevant.some(r => r.title === t))
    .map(title => {
      const byDay = new Map(
        relevant.filter(r => r.title === title).map(r => [r.dayIndex, r.rank])
      )
      return {
        name: title,
        data: allIndices.map(i => ({ dayIndex: i, rank: byDay.get(i) ?? null })),
      }
    })

  return { indices: allIndices, series }
}

/** 所有有每日資料的台劇節目名稱 */
export function getDailyShowTitles(data: RankingsData): string[] {
  return [...new Set(data.dailyRankings.map(r => r.title))].sort()
}

// ──────────────────────────────────────────────
// 年度類型河流圖（ThemeRiver）資料轉換
// ──────────────────────────────────────────────

// ThemeRiver 用 weekNumber (1-57) 做 x 值（value 型 singleAxis）
type ThemeRiverTuple = [number, number, string]  // [weekNumber, count, genreName]
type WeekGenreTitles = Record<number, Record<string, string[]>>

export interface WeeklyGenreFlowResult {
  data: ThemeRiverTuple[]
  weekNumbers: number[]
  weekDateRanges: Record<number, string>
  titlesByWeekGenre: WeekGenreTitles
  genreOrder: string[]
}

export function getWeeklyGenreFlow(data: RankingsData): WeeklyGenreFlowResult {
  const tuples: ThemeRiverTuple[] = []
  const weekNumbers: number[] = []
  const weekDateRanges: Record<number, string> = {}
  const titlesByWeekGenre: WeekGenreTitles = {}

  for (const week of data.weeklyRankings) {
    const wn = week.weekNumber
    weekNumbers.push(wn)
    weekDateRanges[wn] = week.dateRange

    const counts: Record<string, number> = {}
    const titles: Record<string, string[]> = {}
    for (const g of FLOW_DISPLAY_GENRES) { counts[g] = 0; titles[g] = [] }

    for (const item of week.rankings) {
      const raw = item.genre === '實境' ? '實境秀' : item.genre
      const g = FLOW_DISPLAY_GENRES.includes(raw) ? raw : '其他'
      counts[g]++
      titles[g].push(item.title)
    }
    titlesByWeekGenre[wn] = titles
    for (const g of FLOW_DISPLAY_GENRES) tuples.push([wn, counts[g], g])
  }

  return { data: tuples, weekNumbers, weekDateRanges, titlesByWeekGenre, genreOrder: [...FLOW_DISPLAY_GENRES] }
}

// ── 快速查詢 ─────────────────────────────────────────────────────────────────

/** 所有曾在週榜出現的節目名稱（排序） */
export function getAllWeeklyTitles(data: RankingsData): string[] {
  const set = new Set<string>()
  for (const week of data.weeklyRankings)
    for (const item of week.rankings)
      if (item.title) set.add(item.title)
  return [...set].sort()
}

/** 取得單一節目的完整查詢資料 */
export function getShowLookupEntry(data: RankingsData, title: string): ShowLookupEntry | null {
  const appearances: ShowLookupEntry['weekAppearances'] = []
  let totalScore = 0
  let peakRank = 99
  let genre: Genre = '其他'
  let isNetflixOriginal = false

  for (const week of data.weeklyRankings) {
    const item = week.rankings.find(r => r.title === title)
    if (!item) continue
    const score = item.score ?? (11 - item.position)
    totalScore += score
    if (item.position < peakRank) peakRank = item.position
    genre = (WEEKLY_GENRE_MAP[item.genre] ?? '其他') as Genre
    if (item.isNetflixOriginal) isNetflixOriginal = true
    appearances.push({ weekNumber: week.weekNumber, dateRange: week.dateRange, position: item.position })
  }

  if (appearances.length === 0) return null

  const avgRank = Math.round(appearances.reduce((s, a) => s + a.position, 0) / appearances.length * 10) / 10
  const firstWeekDate = appearances[0].dateRange.split(' ~ ')[0]
  const lastWeekDate = appearances[appearances.length - 1].dateRange.split(' ~ ')[0]

  return {
    title, genre, isNetflixOriginal,
    totalScore: Math.round(totalScore * 10) / 10,
    weeksOnChart: appearances.length,
    avgRank, peakRank, firstWeekDate, lastWeekDate,
    weekAppearances: appearances,
  }
}
