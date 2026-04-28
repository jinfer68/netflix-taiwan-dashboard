// ⚠ 此檔案由 convert_excel.py 自動產生，請勿手動編輯
// 產生時間：2026-04-12T01:13:28.265238
//
// 用途：開發時驗證 rankings.json 的欄位是否與 TypeScript 型別一致
// 若 Python 輸出了新欄位但 types/index.ts 未宣告，validateSchema() 會在 console 警告

type FieldDef = { key: string; type: string }

export const OverallRankingEntry_FIELDS: FieldDef[] = [
  { key: 'rank', type: 'number' },
  { key: 'title', type: 'string' },
  { key: 'totalScore', type: 'number' },
  { key: 'genre', type: 'string' },
  { key: 'weeksOnChart', type: 'number' },
  { key: 'avgRank', type: 'number' },
  { key: 'isNetflixOriginal', type: 'boolean' },
  { key: 'releaseType', type: 'string' },
  { key: 'totalEpisodes', type: 'string' },
  { key: 'firstWeekDate', type: 'string' },
  { key: 'lastWeekDate', type: 'string' },
]

export const TaiwanDramaRanking_FIELDS: FieldDef[] = [
  { key: 'rank', type: 'number' },
  { key: 'title', type: 'string' },
  { key: 'weeklyRank', type: 'number' },
  { key: 'weeklyScore', type: 'number' },
  { key: 'weeksOnChart', type: 'number' },
  { key: 'weeklyAvgRank', type: 'number' },
  { key: 'dailyRank', type: 'number' },
  { key: 'dailyScore', type: 'number' },
  { key: 'daysOnChart', type: 'number' },
  { key: 'dailyAvgRank', type: 'number' },
  { key: 'totalScore', type: 'number' },
  { key: 'isNetflixOriginal', type: 'boolean' },
  { key: 'isAllAtOnce', type: 'boolean' },
  { key: 'releaseType', type: 'string' },
]

export const DailyRankingEntry_FIELDS: FieldDef[] = [
  { key: 'dayIndex', type: 'number' },
  { key: 'title', type: 'string' },
  { key: 'rank', type: 'number' },
  { key: 'score', type: 'number' },
  { key: 'isAllAtOnce', type: 'boolean' },
]

export const WeeklyRankingWeek_FIELDS: FieldDef[] = [
  { key: 'weekNumber', type: 'number' },
  { key: 'dateRange', type: 'string' },
  { key: 'rankings', type: '(object)[]' },
]

export const ShowAttributes_FIELDS: FieldDef[] = [
  { key: 'isNetflixOriginal', type: 'boolean' },
  { key: 'releaseType', type: 'string' },
  { key: 'releaseWeeks', type: 'number' },
  { key: 'totalEpisodes', type: 'string' },
]

function checkFields(typeName: string, expected: FieldDef[], actual: Record<string, unknown>) {
  const actualKeys = new Set(Object.keys(actual))
  const expectedKeys = new Set(expected.map(f => f.key))
  for (const key of actualKeys) {
    if (!expectedKeys.has(key)) {
      console.warn(`[Schema] ${typeName}: JSON 有欄位 "${key}" 但 TypeScript 未宣告`)
    }
  }
  for (const f of expected) {
    if (!actualKeys.has(f.key)) {
      console.warn(`[Schema] ${typeName}: TypeScript 宣告了 "${f.key}" 但 JSON 中不存在`)
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function validateSchema(data: any) {
  if (!data) return
  if (data.overallRankings?.[0])
    checkFields('OverallRankingEntry', OverallRankingEntry_FIELDS, data.overallRankings[0])
  if (data.taiwanDramaRankings?.[0])
    checkFields('TaiwanDramaRanking', TaiwanDramaRanking_FIELDS, data.taiwanDramaRankings[0])
  if (data.dailyRankings?.[0])
    checkFields('DailyRankingEntry', DailyRankingEntry_FIELDS, data.dailyRankings[0])
  if (data.weeklyRankings?.[0])
    checkFields('WeeklyRankingWeek', WeeklyRankingWeek_FIELDS, data.weeklyRankings[0])
  const attrKeys = Object.keys(data.showAttributes ?? {})
  if (attrKeys.length > 0)
    checkFields('ShowAttributes', ShowAttributes_FIELDS, data.showAttributes[attrKeys[0]])
}
