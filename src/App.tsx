import { useEffect, useMemo, useRef, useState } from 'react'
import type { RankingsData, MoviesData } from './types'
import Header from './components/layout/Header'
import Sidebar from './components/layout/Sidebar'
import type { AppMode, TabType } from './components/layout/Sidebar'
import Top20Chart from './components/charts/Top20Chart'
import TaiwanDramaChart from './components/charts/TaiwanDramaChart'
import GenreDistribution from './components/charts/GenreDistribution'
import RankTrendChart from './components/charts/RankTrendChart'
import WeeklyGenreFlow from './components/charts/WeeklyGenreFlow'
import QuickLookup from './components/charts/QuickLookup'
import MovieBoardTable from './components/charts/MovieBoardTable'
import MovieRaceChart from './components/charts/MovieRaceChart'
import MovieTop20Chart from './components/charts/MovieTop20Chart'
import MovieQuickLookup from './components/charts/MovieQuickLookup'
import {
  getTaiwanDramaComparison,
  getWeeklyGenreDistribution,
  getTop50GenreDistribution,
  getDailyOverallRankings,
} from './utils/dataTransforms'
import { boundsOf, coverageIn, filterDailyByRange, filterWeeklyByRange } from './utils/boardTransforms'
import { useMovieFilters } from './hooks/useMovieFilters'
import { useShowFilters } from './hooks/useShowFilters'
import { MAX_SERIES } from './constants/genres'
import { INK, INK_MUTED, INK_SECONDARY, PAPER, RULE_STRONG } from './constants/styles'

const EMPTY_DATA: RankingsData = {
  meta: { generatedAt: '', dataThrough: '' },
  showAttributes: {},
  overallRankings: [],
  dailyBoard: [],
  dailyAttributes: {},
  taiwanDramaRankings: [],
  dailyRankings: [],
  weeklyRankings: [],
}

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
  const show = useShowFilters()
  const [selectedShow, setSelectedShow] = useState<string | null>(null)

  const [appMode, setAppMode] = useState<AppMode>('shows')
  const [moviesData, setMoviesData] = useState<MoviesData | null>(null)
  const [moviesLoading, setMoviesLoading] = useState(false)
  const [moviesFailed, setMoviesFailed] = useState(false)
  const [selectedMovie, setSelectedMovie] = useState<string | null>(null)
  const [movieFocusDate, setMovieFocusDate] = useState<string | null>(null)

  // state 更新非同步，StrictMode 的雙重呼叫會同時讀到舊值而重複抓取；ref 是同步的
  const moviesRequested = useRef(false)

  useEffect(() => {
    if (appMode !== 'movies' || moviesRequested.current) return
    moviesRequested.current = true
    setMoviesLoading(true)
    fetch(`${import.meta.env.BASE_URL}data/movies.json`)
      .then(res => res.json())
      .then((json: MoviesData) => {
        if (json?.dailyBoard) setMoviesData(json)
        else setMoviesFailed(true)
      })
      .catch(() => setMoviesFailed(true))
      .finally(() => setMoviesLoading(false))
  }, [appMode])

  const movieYears = useMemo(() => {
    if (!moviesData) return { dailyYears: [], weeklyYears: [] }
    const daily = new Set(moviesData.dailyBoard.map(b => b.date.slice(0, 4)))
    const weekly = new Set(moviesData.weeklyRankings.map(w => w.dateRange.slice(0, 4)))
    return {
      dailyYears: [...daily].sort(),
      weeklyYears: [...weekly].sort(),
    }
  }, [moviesData])

  const movieFilters = useMovieFilters(movieYears)

  const movieDailyInRange = useMemo(
    () => filterDailyByRange(moviesData?.dailyBoard ?? [], movieFilters.time.range),
    [moviesData, movieFilters.time.range],
  )

  const movieWeeksInRange = useMemo(
    () => filterWeeklyByRange(moviesData?.weeklyRankings ?? [], movieFilters.time.range),
    [moviesData, movieFilters.time.range],
  )

  // 側欄換期間時，當日榜單回到新期間的最後一天
  useEffect(() => setMovieFocusDate(null), [movieFilters.time.range])
  const movieBoardDate = movieFocusDate ?? movieDailyInRange[movieDailyInRange.length - 1]?.date ?? null

  const movieDates = useMemo(() => {
    if (!moviesData) return []
    return movieFilters.time.boardMode === 'daily'
      ? moviesData.dailyBoard.map(b => b.date)
      : moviesData.weeklyRankings.map(w => w.dateRange.split(' ~ ')[0])
  }, [moviesData, movieFilters.time.boardMode])

  const movieCoverage = useMemo(() => {
    const bounds = boundsOf(movieDates)
    if (!bounds) return { have: 0, expected: 0 }
    return coverageIn(
      movieDates,
      movieFilters.time.range,
      bounds,
      movieFilters.time.boardMode === 'daily' ? 'day' : 'week',
    )
  }, [movieDates, movieFilters.time.range, movieFilters.time.boardMode])

  // ── 年份篩選資料 ─────────────────────────────────────────────
  const filteredData = useMemo((): RankingsData => {
    if (show.yearFilter === 'all') return data
    return {
      ...data,
      weeklyRankings: data.weeklyRankings.filter(w => w.dateRange.startsWith(show.yearFilter)),
    }
  }, [data, show.yearFilter])

  const taiwanDramas = useMemo(() => getTaiwanDramaComparison(filteredData), [filteredData])
  const genreDistribution = useMemo(() => getWeeklyGenreDistribution(filteredData), [filteredData])
  const top50GenreDistribution = useMemo(() => getTop50GenreDistribution(filteredData), [filteredData])
  // 日榜總排行：週次 > 月份 > 季度 > 年度 > 全期
  const dailyOverallRankings = useMemo(
    () => getDailyOverallRankings(
      data,
      show.rankingMode === 'daily' ? show.selectedQuarter : 'all',
      show.rankingMode === 'daily' ? show.selectedDailyWeek : null,
      show.rankingMode === 'daily' ? show.yearFilter : null,
      show.rankingMode === 'daily' ? show.selectedMonth : null,
    ),
    [data, show.rankingMode, show.selectedQuarter, show.selectedDailyWeek, show.yearFilter, show.selectedMonth],
  )

  if (loading) {
    return (
      <div style={{ background: PAPER, height: '100vh', color: INK, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, marginBottom: 6 }}>載入資料中…</div>
          <div style={{ fontSize: 12, color: INK_MUTED }}>正在讀取 rankings.json</div>
        </div>
      </div>
    )
  }

  // 固定高度讓 Recharts ResponsiveContainer 可正確量測
  const CHART_H = 'calc(100vh - 60px)'

  return (
    <div style={{ background: PAPER, height: '100vh', overflow: 'hidden', color: INK }}>
      <Header
        dataFrom={data.weeklyRankings[0]?.dateRange.split(' ~ ')[0]}
        dataThrough={data.meta.dataThrough || undefined}
      />

      <div style={{ display: 'flex', height: CHART_H }}>
        {/* ── 左側 Sidebar ── */}
        <Sidebar
          appMode={appMode}
          onModeChange={setAppMode}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          data={filteredData}
          yearFilter={show.yearFilter}
          setYearFilter={show.setYearFilter}
          rankingMode={show.rankingMode}
          setRankingMode={show.setRankingMode}
          activeGenres={show.activeGenres}
          setActiveGenres={show.setActiveGenres}
          netflixOnly={show.netflixOnly}
          setNetflixOnly={show.setNetflixOnly}
          selectedQuarter={show.selectedQuarter}
          setSelectedQuarter={show.setSelectedQuarter}
          selectedMonth={show.selectedMonth}
          setSelectedMonth={show.setSelectedMonth}
          selectedDailyWeek={show.selectedDailyWeek}
          setSelectedDailyWeek={show.setSelectedDailyWeek}
          sortMode={show.sortMode}
          setSortMode={show.setSortMode}
          filterRelease={show.filterRelease}
          setFilterRelease={show.setFilterRelease}
          filterNetflix={show.filterNetflix}
          setFilterNetflix={show.setFilterNetflix}
          selectedTitles={show.selectedTitles}
          setSelectedTitles={show.setSelectedTitles}
          search={show.search}
          setSearch={show.setSearch}
          flowNetflixFilter={show.flowNetflixFilter}
          setFlowNetflixFilter={show.setFlowNetflixFilter}
          movieFilters={movieFilters}
          movieCoverage={movieCoverage}
          movieDates={movieDates}
        />

        {/* ── 右側圖表區域 ── */}
        <main style={{ flex: 1, height: CHART_H, overflow: 'hidden', minWidth: 0 }}>

          {/* ══ 總排行榜頁：TOP 20（左）＋ 快速查詢（右）══ */}
          {appMode === 'shows' && activeTab === 'rankings' && (
            <div style={{ display: 'flex', height: CHART_H, gap: 0 }}>
              {/* TOP 20 約佔 60% */}
              <div style={{ flex: '0 0 60%', height: CHART_H }}>
                <Top20Chart
                  data={filteredData}
                  rankingMode={show.rankingMode}
                  dailyRankings={dailyOverallRankings}
                  activeGenres={show.activeGenres}
                  netflixOnly={show.netflixOnly}
                  selectedQuarter={show.selectedQuarter}
                  selectedMonth={show.selectedMonth}
                  selectedShow={selectedShow}
                  onSelectShow={setSelectedShow}
                />
              </div>
              {/* 快速查詢直式面板約佔 40% */}
              <div style={{ flex: 1, height: CHART_H, overflow: 'hidden' }}>
                <QuickLookup
                  data={filteredData}
                  fullData={data}
                  dailyOverallRankings={dailyOverallRankings}
                  rankingMode={show.rankingMode}
                  selectedShow={selectedShow}
                  onSelectShow={setSelectedShow}
                />
              </div>
            </div>
          )}

          {/* ══ 類型分析頁：圓餅圖（上固定高）＋ 河流圖（下）══ */}
          {appMode === 'shows' && activeTab === 'genre' && (
            <div style={{ height: CHART_H, overflow: 'auto' }}>
              {/* 圓餅圖：固定 370px，確保小螢幕也能正確渲染 */}
              <div style={{
                height: 370, flexShrink: 0,
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24,
                padding: '14px 20px 12px',
                borderBottom: `1px solid ${RULE_STRONG}`,
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: INK_SECONDARY, letterSpacing: 1, marginBottom: 4 }}>
                    週榜 Top 10 出現次數
                  </div>
                  <GenreDistribution data={genreDistribution} countLabel="上榜次數" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: INK_SECONDARY, letterSpacing: 1, marginBottom: 4 }}>
                    Top 50 積分榜部數
                  </div>
                  <GenreDistribution data={top50GenreDistribution} countLabel="部數" />
                </div>
              </div>
              {/* 河流圖：自然高度（EChart 420px + 統計表），小螢幕可向下捲動 */}
              <WeeklyGenreFlow data={filteredData} netflixFilter={show.flowNetflixFilter} />
            </div>
          )}

          {/* ══ 台劇分析頁：台劇積分榜（上 58%）＋ 走勢圖（下 42%）══ */}
          {appMode === 'shows' && activeTab === 'taiwan' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: CHART_H }}>
              {/* 台劇積分榜：佔較多空間（節目多，需要高度）*/}
              <div style={{ flex: '0 0 58%', minHeight: 0, borderBottom: `1px solid ${RULE_STRONG}`, overflow: 'auto' }}>
                <TaiwanDramaChart
                  data={taiwanDramas}
                  showAttributes={data.showAttributes}
                  sortMode={show.sortMode}
                  filterRelease={show.filterRelease}
                  filterNetflix={show.filterNetflix}
                  selectedTitles={show.selectedTitles}
                  onToggleTitle={title => show.setSelectedTitles(prev =>
                    prev.includes(title)
                      ? prev.filter(t => t !== title)
                      : prev.length >= MAX_SERIES ? prev : [...prev, title]
                  )}
                />
              </div>
              {/* 走勢分析：固定下方 42% */}
              <div style={{ flex: 1, minHeight: 0 }}>
                <RankTrendChart
                  data={filteredData}
                  selectedTitles={show.selectedTitles}
                />
              </div>
            </div>
          )}

          {appMode === 'movies' && (moviesLoading || moviesFailed) && (
            <div style={{ padding: '16px 20px', fontSize: 13, color: INK_SECONDARY }}>
              {moviesLoading && '載入電影資料中…'}
              {!moviesLoading && moviesFailed && '電影資料載入失敗'}
            </div>
          )}

          {appMode === 'movies' && moviesData && (
            <div style={{ display: 'flex', flexDirection: 'column', height: CHART_H }}>
              <div style={{ flex: '0 0 55%', minHeight: 0, display: 'flex', borderBottom: `1px solid ${RULE_STRONG}` }}>
                <div style={{ flex: '0 0 60%', minHeight: 0, borderRight: `1px solid ${RULE_STRONG}` }}>
                  <MovieTop20Chart
                    boards={movieDailyInRange}
                    weeks={movieWeeksInRange}
                    entities={moviesData.entities}
                    filters={movieFilters}
                    selectedTitle={selectedMovie}
                    onSelectTitle={setSelectedMovie}
                  />
                </div>
                <div style={{ flex: 1, minHeight: 0 }}>
                  <MovieQuickLookup
                    entities={moviesData.entities}
                    boards={moviesData.dailyBoard}
                    weeks={moviesData.weeklyRankings}
                    weeksInRange={movieWeeksInRange}
                    focusDate={movieBoardDate}
                    onFocusDate={setMovieFocusDate}
                    selectedTitle={selectedMovie}
                    onSelectTitle={setSelectedMovie}
                  />
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
                <div style={{ flex: '0 0 44%', minHeight: 0, borderRight: `1px solid ${RULE_STRONG}` }}>
                  <MovieBoardTable
                    boards={moviesData.dailyBoard}
                    date={movieBoardDate}
                    onChangeDate={setMovieFocusDate}
                    entities={moviesData.entities}
                    selectedTitle={selectedMovie}
                    onSelectTitle={setSelectedMovie}
                  />
                </div>
                <div style={{ flex: 1, minHeight: 0 }}>
                  <MovieRaceChart
                    boards={moviesData.dailyBoard}
                    endDate={movieBoardDate}
                    entities={moviesData.entities}
                    selectedTitle={selectedMovie}
                  />
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}
