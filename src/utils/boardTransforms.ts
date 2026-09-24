import type { DailyBoard, DateRange, TrendPoint, WeeklyBoard } from '../types'

/** 積分 = 11 - 名次。資料層已確認此關係恆成立 */
export function scoreOf(rank: number): number {
  return 11 - rank
}

export function filterDailyByRange(boards: DailyBoard[], range: DateRange | null): DailyBoard[] {
  if (!range) return boards
  return boards.filter(b => b.date >= range.from && b.date <= range.to)
}

export function filterWeeklyByRange(weeks: WeeklyBoard[], range: DateRange | null): WeeklyBoard[] {
  if (!range) return weeks
  return weeks.filter(w => {
    const start = w.dateRange.split(' ~ ')[0]
    return start >= range.from && start <= range.to
  })
}

export interface TitleAggregate {
  title: string
  totalScore: number
  onChartCount: number
  bestRank: number
  avgRank: number
}

/** 把一段期間的日榜彙總成每個片名一筆 */
export function aggregateDaily(boards: DailyBoard[]): TitleAggregate[] {
  const acc = new Map<string, { score: number; count: number; best: number; sum: number }>()

  for (const board of boards) {
    for (const entry of board.entries) {
      const prev = acc.get(entry.title) ?? { score: 0, count: 0, best: 99, sum: 0 }
      prev.score += scoreOf(entry.rank)
      prev.count += 1
      prev.best = Math.min(prev.best, entry.rank)
      prev.sum += entry.rank
      acc.set(entry.title, prev)
    }
  }

  return [...acc].map(([title, v]) => ({
    title,
    totalScore: v.score,
    onChartCount: v.count,
    bestRank: v.best,
    avgRank: v.sum / v.count,
  }))
}

/** 把一段期間的週榜彙總成每個片名一筆 */
export function aggregateWeekly(weeks: WeeklyBoard[]): TitleAggregate[] {
  const acc = new Map<string, { score: number; count: number; best: number; sum: number }>()

  for (const week of weeks) {
    for (const item of week.rankings) {
      const prev = acc.get(item.title) ?? { score: 0, count: 0, best: 99, sum: 0 }
      prev.score += item.score
      prev.count += 1
      prev.best = Math.min(prev.best, item.rank)
      prev.sum += item.rank
      acc.set(item.title, prev)
    }
  }

  return [...acc].map(([title, v]) => ({
    title,
    totalScore: v.score,
    onChartCount: v.count,
    bestRank: v.best,
    avgRank: v.sum / v.count,
  }))
}

/**
 * 取某片在指定日期序列上的名次，未上榜為 null。
 * 回傳長度與 dates 相同，供折線圖直接對位。
 */
export function rankSeries(boards: DailyBoard[], title: string, dates: string[]): (number | null)[] {
  const byDate = new Map<string, number>()
  for (const board of boards) {
    const hit = board.entries.find(e => e.title === title)
    if (hit) byDate.set(board.date, hit.rank)
  }
  return dates.map(d => byDate.get(d) ?? null)
}

/** 取最後 n 天的日榜（不足則全取） */
export function lastDays(boards: DailyBoard[], n: number): DailyBoard[] {
  return boards.slice(Math.max(0, boards.length - n))
}

/** 一段期間內曾經上榜過的所有片名 */
export function titlesIn(boards: DailyBoard[]): string[] {
  const seen = new Set<string>()
  for (const board of boards) for (const e of board.entries) seen.add(e.title)
  return [...seen]
}

const DAY_MS = 86400000
const dayCount = (from: string, to: string) =>
  Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS) + 1

/**
 * 覆蓋率：該期間實際有幾筆，以及應該有幾筆。
 *
 * 分母來自「使用者選的期間」而非「資料自己的首末」—— 後者會讓缺漏
 * 自己消失：若 2025 年的 15 週全集中在上半年，用資料首末當分母會
 * 算出 15/15 完全覆蓋，但實際上缺了 71%。
 *
 * 選取期間會先被夾在整份資料的邊界內，否則選「2021 全年」會把
 * 資料開始之前的 1–3 月也算成缺漏。
 */
export function coverageIn(
  presentDates: string[],
  range: DateRange | null,
  bounds: DateRange,
  unit: 'day' | 'week',
): { have: number; expected: number } {
  const from = range && range.from > bounds.from ? range.from : bounds.from
  const to = range && range.to < bounds.to ? range.to : bounds.to
  if (from > to) return { have: 0, expected: 0 }

  const have = presentDates.filter(d => d >= from && d <= to).length
  const days = dayCount(from, to)
  const expected = unit === 'week' ? Math.round(days / 7) : days
  return { have, expected: Math.max(expected, have) }
}

/** 整份資料的首末日，供 coverageIn 夾住選取期間 */
export function boundsOf(dates: string[]): DateRange | null {
  if (dates.length === 0) return null
  const sorted = [...dates].sort()
  return { from: sorted[0], to: sorted[sorted.length - 1] }
}

/**
 * 指定日期在日榜中的位置；該日無資料時退回之前最近的一天，
 * 早於資料起點則取第一天。空陣列回傳 -1。
 */
export function boardIndexAt(boards: DailyBoard[], date: string): number {
  if (boards.length === 0) return -1
  let found = 0
  for (let i = 0; i < boards.length; i++) {
    if (boards[i].date > date) break
    found = i
  }
  return found
}

export interface WeekAppearance {
  weekNumber: number
  dateRange: string
  position: number
}

/** 某片在每一週週榜的名次，依週次排序 */
export function weeklyAppearances(weeks: WeeklyBoard[], title: string): WeekAppearance[] {
  const out: WeekAppearance[] = []
  for (const w of weeks) {
    const hit = w.rankings.find(r => r.title === title)
    if (hit) out.push({ weekNumber: w.weekNumber, dateRange: w.dateRange, position: hit.rank })
  }
  return out
}

/** 某片從第一次到最後一次上榜之間，每個有資料日期的名次 */
export function dailyTrendOf(boards: DailyBoard[], title: string): TrendPoint[] {
  const ranks = boards.map(b => b.entries.find(e => e.title === title)?.rank ?? null)
  const first = ranks.findIndex(r => r !== null)
  if (first < 0) return []
  let last = ranks.length - 1
  while (ranks[last] === null) last--
  return boards.slice(first, last + 1).map((b, i) => ({ date: b.date, rank: ranks[first + i] }))
}
