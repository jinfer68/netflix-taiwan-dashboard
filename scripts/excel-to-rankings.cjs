#!/usr/bin/env node
/**
 * 從 export.xlsx 產生 public/data/rankings.json
 * 使用方式: node scripts/excel-to-rankings.js
 */

const XLSX = require('xlsx')
const fs = require('fs')
const path = require('path')

const EXCEL_PATH = 'C:/Users/User/Desktop/爬蟲臉書/output/export.xlsx'
const OUT_PATH = path.join(__dirname, '../public/data/rankings.json')

// ── 工具函式 ─────────────────────────────────────────────────────────────────

function serialToDateStr(serial) {
  const d = new Date((serial - 25569) * 86400 * 1000)
  return d.toISOString().split('T')[0]
}

function mapGenre(raw) {
  const g = (raw || '').trim()
  if (g === '韓劇') return '韓劇'
  if (g === '台劇' || g === '台/新' || g === '台') return '台劇'
  if (g === '陸劇') return '陸劇'
  if (g.includes('動畫劇') && g.includes('日')) return '動畫劇 (日)'
  if (g === '日劇' || g === '日') return '日劇'
  if (g === '美劇') return '美劇'
  if (g === '英劇') return '英劇'
  if (g === '實境' || g.includes('實境') || g === '韓綜' || g === '紀實') return '實境秀'
  return '其他'
}

function mapReleaseType(raw) {
  if (raw === '一次上架') return 'allAtOnce'
  if (raw === '拆分上架') return 'split'
  return 'weekly'
}

// ── 讀取 Excel ────────────────────────────────────────────────────────────────

console.log('讀取 Excel:', EXCEL_PATH)
const wb = XLSX.readFile(EXCEL_PATH)

const weeklyTVRows  = XLSX.utils.sheet_to_json(wb.Sheets['Netflix 每週節目排名'] || wb.Sheets['Netflix 每週電排名'],  { defval: '' })
const weeklyMovRows = XLSX.utils.sheet_to_json(wb.Sheets['Netflix 每週電影排名'], { defval: '' })
const dailyTVRows   = XLSX.utils.sheet_to_json(wb.Sheets['每天節目排名資料'],    { defval: '' })
const taiwanRows    = XLSX.utils.sheet_to_json(wb.Sheets['Clean Data - 台劇每日排名'], { defval: '' })
const attrRows      = XLSX.utils.sheet_to_json(wb.Sheets['劇集屬性資料庫'],      { defval: '' })

// ── showAttributes ────────────────────────────────────────────────────────────

const showAttributes = {}
for (const r of attrRows) {
  const title = r['節目名稱']
  if (!title) continue
  showAttributes[title] = {
    isNetflixOriginal: r['是否Netflix Original'] === 1,
    releaseType: mapReleaseType(r['上架方式']),
    releaseWeeks: r['上架周數'] || 1,
    totalEpisodes: r['總集數'] || '',
  }
}

// ── weeklyRankings（節目排名，每週 Top10）────────────────────────────────────

// 以日期起做分組，排序後指派 weekNumber
const weekMap = new Map() // key = "start-end"
for (const r of weeklyTVRows) {
  const start = r['日期起']
  const end   = r['日期迄']
  if (!start) continue
  const key = `${start}-${end}`
  if (!weekMap.has(key)) weekMap.set(key, [])
  weekMap.get(key).push(r)
}

// 依日期起排序（數字越小越早）
const sortedWeekKeys = [...weekMap.keys()].sort((a, b) => {
  const [as] = a.split('-').map(Number)
  const [bs] = b.split('-').map(Number)
  return as - bs
})

// 建立前一週查找表（用來計算 trend）
const prevRankMap = new Map() // title → rank in prev week

const weeklyRankings = sortedWeekKeys.map((key, i) => {
  const [startSerial, endSerial] = key.split('-').map(Number)
  const rows = weekMap.get(key)
    .filter(r => r['排名'] >= 1 && r['排名'] <= 10)
    .sort((a, b) => a['排名'] - b['排名'])

  const currentRankMap = new Map()
  const rankings = rows.map(r => {
    const rank = r['排名']
    const title = r['節目名稱']
    currentRankMap.set(title, rank)

    let trend = ''
    if (i > 0 && prevRankMap.has(title)) {
      const prev = prevRankMap.get(title)
      if (prev > rank)      trend = '▲'
      else if (prev < rank) trend = '▼'
      else                  trend = '─'
    }

    return {
      position: rank,
      rank,
      title,
      genre: r['類型'] || '其他',
      trend,
      isExclusive: false,
      isNetflixOriginal: r['是否Netflix Original'] === 1,
      score: r['積分'] || 0,
    }
  })

  // 更新前一週 Map
  prevRankMap.clear()
  for (const [t, rk] of currentRankMap) prevRankMap.set(t, rk)

  return {
    weekNumber: i + 1,
    dateRange: `${serialToDateStr(startSerial)} ~ ${serialToDateStr(endSerial)}`,
    rankings,
  }
})

console.log(`週排行: ${weeklyRankings.length} 週`)

// ── overallRankings（從週排行積分匯總）──────────────────────────────────────

const showScoreMap = new Map() // title → { totalScore, weeks[], genre, isNetflixOriginal }

for (const week of weeklyRankings) {
  for (const item of week.rankings) {
    if (!showScoreMap.has(item.title)) {
      showScoreMap.set(item.title, {
        totalScore: 0,
        rankSum: 0,
        weeksOnChart: 0,
        genre: mapGenre(item.genre),
        isNetflixOriginal: item.isNetflixOriginal,
        firstWeekDate: week.dateRange.split(' ~ ')[0],
        lastWeekDate: week.dateRange.split(' ~ ')[0],
        peakRank: item.rank,
      })
    }
    const entry = showScoreMap.get(item.title)
    entry.totalScore += item.score || 0
    entry.rankSum    += item.rank
    entry.weeksOnChart++
    entry.lastWeekDate = week.dateRange.split(' ~ ')[0]
    if (item.rank < entry.peakRank) entry.peakRank = item.rank
  }
}

const overallRankings = [...showScoreMap.entries()]
  .map(([title, e]) => ({
    title,
    totalScore: e.totalScore,
    genre: e.genre,
    weeksOnChart: e.weeksOnChart,
    avgRank: Math.round((e.rankSum / e.weeksOnChart) * 100) / 100,
    isNetflixOriginal: e.isNetflixOriginal,
    releaseType: showAttributes[title]?.releaseType || 'weekly',
    totalEpisodes: showAttributes[title]?.totalEpisodes || '',
    firstWeekDate: e.firstWeekDate,
    lastWeekDate: e.lastWeekDate,
  }))
  .sort((a, b) => b.totalScore - a.totalScore)
  .map((item, i) => ({ rank: i + 1, ...item }))

console.log(`總積分榜: ${overallRankings.length} 部`)

// ── taiwanDramaRankings（台劇積分榜）────────────────────────────────────────

// 每週節目榜中的台劇
const twWeeklyMap = new Map() // title → { weeklyScore, weeksOnChart, rankSum }
for (const week of weeklyRankings) {
  for (const item of week.rankings) {
    const genre = (item.genre || '').trim()
    if (genre !== '台劇' && genre !== '台/新' && genre !== '台') continue
    if (!twWeeklyMap.has(item.title)) {
      twWeeklyMap.set(item.title, { weeklyScore: 0, weeksOnChart: 0, rankSum: 0 })
    }
    const e = twWeeklyMap.get(item.title)
    e.weeklyScore += item.score || 0
    e.weeksOnChart++
    e.rankSum += item.rank
  }
}

// 每日台劇排名匯總
const twDailyMap = new Map() // title → { dailyScore, daysOnChart, rankSum, isAllAtOnce }
for (const r of taiwanRows) {
  const title = r['節目名稱']
  if (!title) continue
  if (!twDailyMap.has(title)) {
    twDailyMap.set(title, { dailyScore: 0, daysOnChart: 0, rankSum: 0, isAllAtOnce: r['是否單次上架'] === 1 })
  }
  const e = twDailyMap.get(title)
  const score = r['積分'] || 0
  const rank  = r['排名']  || 0
  if (rank > 0) {
    e.dailyScore += score
    e.daysOnChart++
    e.rankSum += rank
  }
}

// 合併所有台劇（取自 showAttributes）
const twTitles = new Set([
  ...Object.keys(showAttributes),
  ...twWeeklyMap.keys(),
  ...twDailyMap.keys(),
])

const rawTWRankings = [...twTitles].map(title => {
  const wk = twWeeklyMap.get(title) || { weeklyScore: 0, weeksOnChart: 0, rankSum: 0 }
  const dy = twDailyMap.get(title)  || { dailyScore: 0, daysOnChart: 0, rankSum: 0, isAllAtOnce: false }
  const attr = showAttributes[title]

  return {
    title,
    weeklyScore:   wk.weeklyScore,
    weeksOnChart:  wk.weeksOnChart,
    weeklyAvgRank: wk.weeksOnChart > 0 ? Math.round((wk.rankSum / wk.weeksOnChart) * 100) / 100 : 0,
    dailyScore:   dy.dailyScore,
    daysOnChart:  dy.daysOnChart,
    dailyAvgRank: dy.daysOnChart > 0 ? Math.round((dy.rankSum / dy.daysOnChart) * 100) / 100 : 0,
    totalScore: wk.weeklyScore + dy.dailyScore,
    isNetflixOriginal: attr?.isNetflixOriginal ?? false,
    isAllAtOnce: attr ? attr.releaseType === 'allAtOnce' : dy.isAllAtOnce,
    releaseType: attr?.releaseType || 'weekly',
  }
}).filter(t => t.weeklyScore > 0 || t.daysOnChart > 0)

// 依 weeklyScore 排名
const twByWeekly = [...rawTWRankings].sort((a, b) => b.weeklyScore - a.weeklyScore)
const twByDaily  = [...rawTWRankings].sort((a, b) => b.dailyScore  - a.dailyScore)

const weeklyRankLookup = new Map(twByWeekly.map((t, i) => [t.title, i + 1]))
const dailyRankLookup  = new Map(twByDaily.map((t, i)  => [t.title, i + 1]))

const taiwanDramaRankings = rawTWRankings
  .sort((a, b) => b.weeklyScore - a.weeklyScore)
  .map((t, i) => ({
    rank: i + 1,
    title: t.title,
    weeklyRank: weeklyRankLookup.get(t.title) || 0,
    weeklyScore: t.weeklyScore,
    weeksOnChart: t.weeksOnChart,
    weeklyAvgRank: t.weeklyAvgRank,
    dailyRank: dailyRankLookup.get(t.title) || 0,
    dailyScore: t.dailyScore,
    daysOnChart: t.daysOnChart,
    dailyAvgRank: t.dailyAvgRank,
    totalScore: t.totalScore,
    isNetflixOriginal: t.isNetflixOriginal,
    isAllAtOnce: t.isAllAtOnce,
    releaseType: t.releaseType,
  }))

console.log(`台劇積分榜: ${taiwanDramaRankings.length} 部`)

// ── dailyRankings（台劇每日排名，dayIndex 從 0 起，供走勢圖使用）─────────────

const dailyRankings = taiwanRows
  .filter(r => r['節目名稱'] && r['上線天數'] !== '' && r['排名'] > 0)
  .map(r => {
    const title = r['節目名稱']
    const attr = showAttributes[title]
    return {
      dayIndex: (r['上線天數'] || 1) - 1,
      title,
      rank: r['排名'],
      score: r['積分'] || 0,
      isAllAtOnce: attr ? attr.releaseType === 'allAtOnce' : r['是否單次上架'] === 1,
    }
  })

console.log(`每日排名(台劇): ${dailyRankings.length} 筆`)

// ── dailyOverallRankings（所有節目日榜積分總排行）────────────────────────────
// 來源：「每天節目排名資料」工作表，包含所有類型節目的每日 Top 10

const allDailyMap = new Map() // title → { totalScore, days, rankSum, genre, isNetflixOriginal }

for (const r of dailyTVRows) {
  const title = r['節目名稱']
  const rank  = r['排名']
  const score = r['積分']
  if (!title || !rank || rank < 1 || rank > 10) continue

  if (!allDailyMap.has(title)) {
    allDailyMap.set(title, {
      totalScore: 0,
      days: 0,
      rankSum: 0,
      genre: mapGenre(r['類型']),
      isNetflixOriginal: r['是否Netflix Original'] === 1,
    })
  }
  const e = allDailyMap.get(title)
  e.totalScore += score || 0
  e.days++
  e.rankSum += rank
}

const dailyOverallRankings = [...allDailyMap.entries()]
  .filter(([, e]) => e.totalScore > 0)
  .map(([title, e]) => ({
    title,
    totalScore: e.totalScore,
    genre: e.genre,
    weeksOnChart: e.days,    // 日榜模式下代表「上榜天數」
    avgRank: Math.round((e.rankSum / e.days) * 10) / 10,
    isNetflixOriginal: e.isNetflixOriginal,
  }))
  .sort((a, b) => b.totalScore - a.totalScore)
  .map((item, i) => ({ rank: i + 1, ...item }))

console.log(`全節目日榜積分排行: ${dailyOverallRankings.length} 部`)

// ── meta ──────────────────────────────────────────────────────────────────────

const lastWeek = weeklyRankings[weeklyRankings.length - 1]
const dataThrough = lastWeek?.dateRange.split(' ~ ')[1] || ''

const output = {
  meta: {
    generatedAt: new Date().toISOString(),
    dataThrough,
  },
  showAttributes,
  overallRankings,
  dailyOverallRankings,
  taiwanDramaRankings,
  dailyRankings,
  weeklyRankings,
}

// ── 寫出 JSON ─────────────────────────────────────────────────────────────────

fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2), 'utf8')
console.log(`✓ 已寫出 ${OUT_PATH}`)
console.log(`  最新資料至: ${dataThrough}`)
