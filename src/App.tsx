import { useEffect, useMemo, useState } from 'react'
import type { RankingsData } from './types'
import Header from './components/layout/Header'
import Sidebar from './components/layout/Sidebar'
import type { TabType, YearFilter } from './components/layout/Sidebar'
import Top20Chart from './components/charts/Top20Chart'
import TaiwanDramaChart from './components/charts/TaiwanDramaChart'
import GenreDistribution from './components/charts/GenreDistribution'
import RankTrendChart from './components/charts/RankTrendChart'
import WeeklyGenreFlow from './components/charts/WeeklyGenreFlow'
import QuickLookup from './components/charts/QuickLookup'
import {
  getTaiwanDramaComparison,
  getWeeklyGenreDistribution,
  getTop50GenreDistribution,
} from './utils/dataTransforms'

const EMPTY_DATA: RankingsData = {
  meta: { generatedAt: '', dataThrough: '' },
  showAttributes: {},
  overallRankings: [],
  taiwanDramaRankings: [],
  dailyRankings: [],
  weeklyRankings: [],
}

type ReleaseFilter = 'all' | 'weekly' | 'allAtOnce' | 'split'
type NetflixFilter = 'all' | 'original' | 'nonOriginal'

export default function App() {
  const [rankingsData, setRankingsData] = useState<RankingsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/rankings.json`)
      .then(res => res.json())
      .then((json: RankingsData) => {
        if (import.meta.env.DEV) {
          import('./utils/schemaValidator.generated').then(m => m.validateSchema(json)).catch(() => {})
        }
        setRankingsData(json?.overallRankings ? json : null)
      })
      .catch(() => setRankingsData(null))
      .finally(() => setLoading(false))
  }, [])

  const data: RankingsData = rankingsData ?? EMPTY_DATA

  // ── 全域狀態 ─────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabType>('rankings')
  const [yearFilter, setYearFilter] = useState<YearFilter>('2026')
  const [selectedShow, setSelectedShow] = useState<string | null>(null)

  // ── TOP 20 篩選狀態 ──────────────────────────────────────────
  const [activeGenres, setActiveGenres] = useState<Set<string>>(new Set())
  const [netflixOnly, setNetflixOnly] = useState(false)
  const [selectedQuarter, setSelectedQuarter] = useState<string>('all')
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)

  // ── 台劇分析篩選狀態 ─────────────────────────────────────────
  const [sortMode, setSortMode] = useState<'weekly' | 'daily'>('weekly')
  const [filterRelease, setFilterRelease] = useState<ReleaseFilter>('all')
  const [filterNetflix, setFilterNetflix] = useState<NetflixFilter>('all')

  // ── 走勢分析篩選狀態 ─────────────────────────────────────────
  const [selectedTitles, setSelectedTitles] = useState<string[]>([])
  const [search, setSearch] = useState('')

  // ── 流向圖篩選狀態 ───────────────────────────────────────────
  const [flowNetflixFilter, setFlowNetflixFilter] = useState<NetflixFilter>('all')

  // ── 年份篩選資料 ─────────────────────────────────────────────
  const filteredData = useMemo((): RankingsData => {
    if (yearFilter === 'all') return data
    return {
      ...data,
      weeklyRankings: data.weeklyRankings.filter(w => w.dateRange.startsWith(yearFilter)),
    }
  }, [data, yearFilter])

  const taiwanDramas = useMemo(() => getTaiwanDramaComparison(filteredData), [filteredData])
  const genreDistribution = useMemo(() => getWeeklyGenreDistribution(filteredData), [filteredData])
  const top50GenreDistribution = useMemo(() => getTop50GenreDistribution(filteredData), [filteredData])

  if (loading) {
    return (
      <div style={{ background: '#0a0a16', height: '100vh', color: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, marginBottom: 8 }}>載入資料中…</div>
          <div style={{ fontSize: 13, color: '#666' }}>正在讀取 rankings.json</div>
        </div>
      </div>
    )
  }

  // 固定高度讓 Recharts ResponsiveContainer 可正確量測
  const CHART_H = 'calc(100vh - 60px)'

  return (
    <div style={{ background: '#0a0a16', height: '100vh', overflow: 'hidden', color: '#eee' }}>
      <Header
        dataFrom={data.weeklyRankings[0]?.dateRange.split(' ~ ')[0]}
        dataThrough={data.meta.dataThrough || undefined}
      />

      <div style={{ display: 'flex', height: CHART_H }}>
        {/* ── 左側 Sidebar ── */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          data={filteredData}
          yearFilter={yearFilter}
          setYearFilter={setYearFilter}
          activeGenres={activeGenres}
          setActiveGenres={setActiveGenres}
          netflixOnly={netflixOnly}
          setNetflixOnly={setNetflixOnly}
          selectedQuarter={selectedQuarter}
          setSelectedQuarter={setSelectedQuarter}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          sortMode={sortMode}
          setSortMode={setSortMode}
          filterRelease={filterRelease}
          setFilterRelease={setFilterRelease}
          filterNetflix={filterNetflix}
          setFilterNetflix={setFilterNetflix}
          selectedTitles={selectedTitles}
          setSelectedTitles={setSelectedTitles}
          search={search}
          setSearch={setSearch}
          flowNetflixFilter={flowNetflixFilter}
          setFlowNetflixFilter={setFlowNetflixFilter}
        />

        {/* ── 右側圖表區域 ── */}
        <main style={{ flex: 1, height: CHART_H, overflow: 'hidden', minWidth: 0 }}>

          {/* ══ 排行榜頁：TOP 20（左）＋ 快速查詢（右）══ */}
          {activeTab === 'rankings' && (
            <div style={{ display: 'flex', height: CHART_H, gap: 0 }}>
              {/* TOP 20 約佔 58% */}
              <div style={{ flex: '0 0 58%', height: CHART_H, borderRight: '1px solid #1e1e30' }}>
                <Top20Chart
                  data={filteredData}
                  activeGenres={activeGenres}
                  netflixOnly={netflixOnly}
                  selectedQuarter={selectedQuarter}
                  selectedMonth={selectedMonth}
                  selectedShow={selectedShow}
                  onSelectShow={setSelectedShow}
                />
              </div>
              {/* 快速查詢約佔 42% */}
              <div style={{ flex: 1, height: CHART_H, overflow: 'auto', padding: '16px 20px' }}>
                <QuickLookup
                  data={filteredData}
                  selectedShow={selectedShow}
                  onSelectShow={setSelectedShow}
                />
              </div>
            </div>
          )}

          {/* ══ 類型分析頁：圓餅圖（上）＋ 河流圖（下）══ */}
          {activeTab === 'genre' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: CHART_H }}>
              {/* 圓餅圖區，約佔 42% */}
              <div style={{ flex: '0 0 42%', minHeight: 0, borderBottom: '1px solid #1e1e30', padding: '12px 20px 8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, height: '100%' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#aaa', textAlign: 'center', marginBottom: 6 }}>
                      週榜 Top 10 出現次數
                    </div>
                    <div style={{ flex: 1, minHeight: 0 }}>
                      <GenreDistribution data={genreDistribution} countLabel="上榜次數" />
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#aaa', textAlign: 'center', marginBottom: 6 }}>
                      Top 50 積分榜部數
                    </div>
                    <div style={{ flex: 1, minHeight: 0 }}>
                      <GenreDistribution data={top50GenreDistribution} countLabel="部數" />
                    </div>
                  </div>
                </div>
              </div>
              {/* 河流圖區，約佔 58% */}
              <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                <WeeklyGenreFlow data={filteredData} netflixFilter={flowNetflixFilter} />
              </div>
            </div>
          )}

          {/* ══ 台劇頁：台劇分析（上）＋ 走勢分析（下）══ */}
          {activeTab === 'taiwan' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: CHART_H }}>
              {/* 台劇分析約佔上半 */}
              <div style={{ flex: 1, minHeight: 0, borderBottom: '1px solid #1e1e30' }}>
                <TaiwanDramaChart
                  data={taiwanDramas}
                  showAttributes={data.showAttributes}
                  sortMode={sortMode}
                  filterRelease={filterRelease}
                  filterNetflix={filterNetflix}
                />
              </div>
              {/* 走勢分析約佔下半 */}
              <div style={{ flex: 1, minHeight: 0 }}>
                <RankTrendChart
                  data={filteredData}
                  selectedTitles={selectedTitles}
                />
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}
