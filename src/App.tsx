import { useEffect, useMemo, useState } from 'react'
import type { RankingsData } from './types'
import Header from './components/layout/Header'
import Top20Chart from './components/charts/Top20Chart'
import TaiwanDramaChart from './components/charts/TaiwanDramaChart'
import GenreDistribution from './components/charts/GenreDistribution'
import RankTrendChart from './components/charts/RankTrendChart'
import WeeklyGenreFlow from './components/charts/WeeklyGenreFlow'
import QuickLookup from './components/charts/QuickLookup'
import {
  getTop20,
  getTaiwanDramaComparison,
  getWeeklyGenreDistribution,
  getTop50GenreDistribution,
} from './utils/dataTransforms'
import { SECTION_STYLE, SECTION_TITLE } from './constants/styles'

const EMPTY_DATA: RankingsData = {
  meta: { generatedAt: '', dataThrough: '' },
  showAttributes: {},
  overallRankings: [],
  taiwanDramaRankings: [],
  dailyRankings: [],
  weeklyRankings: [],
}

type YearFilter = '2024' | '2025' | '2026' | 'all'

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

  const [yearFilter, setYearFilter] = useState<YearFilter>('2026')
  const [selectedShow, setSelectedShow] = useState<string | null>(null)

  const filteredData = useMemo((): RankingsData => {
    if (yearFilter === 'all') return data
    return {
      ...data,
      weeklyRankings: data.weeklyRankings.filter(w => w.dateRange.startsWith(yearFilter)),
    }
  }, [data, yearFilter])

  const top20 = useMemo(() => getTop20(filteredData), [filteredData])
  const taiwanDramas = useMemo(() => getTaiwanDramaComparison(filteredData), [filteredData])
  const genreDistribution = useMemo(() => getWeeklyGenreDistribution(filteredData), [filteredData])
  const top50GenreDistribution = useMemo(() => getTop50GenreDistribution(filteredData), [filteredData])

  const hasData = data.overallRankings.length > 0
  const weekCount = filteredData.weeklyRankings.length

  if (loading) {
    return (
      <div style={{ background: '#0a0a16', minHeight: '100vh', color: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, marginBottom: 8 }}>載入資料中…</div>
          <div style={{ fontSize: 13, color: '#666' }}>正在讀取 rankings.json</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: '#0a0a16', minHeight: '100vh', color: '#eee' }}>
      <Header
        dataFrom={data.weeklyRankings[0]?.dateRange.split(' ~ ')[0]}
        dataThrough={data.meta.dataThrough || undefined}
      />

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>
        {!hasData && (
          <div style={{
            background: '#1a1a0a', border: '1px solid #555a00', borderRadius: 10,
            padding: '16px 20px', marginBottom: 24, color: '#f5c518', fontSize: 14,
          }}>
            尚無資料。請先執行：<code style={{ background: '#222', padding: '2px 6px', borderRadius: 4 }}>
              python scripts/convert_excel.py
            </code>
          </div>
        )}

        {/* 年份篩選 */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginBottom: 24,
        }}>
          <span style={{ fontSize: 13, color: '#888', marginRight: 4 }}>資料範圍</span>
          {(['2024', '2025', '2026', 'all'] as YearFilter[]).map(opt => (
            <button
              key={opt}
              onClick={() => setYearFilter(opt)}
              style={{
                padding: '6px 18px',
                borderRadius: 20,
                border: yearFilter === opt ? '1px solid #7c6fff' : '1px solid #333',
                background: yearFilter === opt ? '#2a2060' : '#1a1a2e',
                color: yearFilter === opt ? '#b9aaff' : '#666',
                fontSize: 13,
                fontWeight: yearFilter === opt ? 700 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {opt === 'all' ? '全部資料' : `${opt} 年`}
            </button>
          ))}
          <span style={{ fontSize: 12, color: '#555', marginLeft: 4 }}>
            {weekCount} 週
          </span>
        </div>

        <div style={SECTION_STYLE}>
          <div style={SECTION_TITLE}>整體 TOP 20 積分榜</div>
          {top20.length > 0
            ? <Top20Chart
                data={filteredData}
                selectedShow={selectedShow}
                onSelectShow={setSelectedShow}
              />
            : <EmptyState />
          }
        </div>

        <QuickLookup
          data={filteredData}
          selectedShow={selectedShow}
          onSelectShow={setSelectedShow}
        />

        <div style={SECTION_STYLE}>
          <div style={SECTION_TITLE}>類型分布</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#aaa', textAlign: 'center', marginBottom: 8 }}>
                週榜 Top 10 出現次數
              </div>
              {genreDistribution.length > 0
                ? <GenreDistribution data={genreDistribution} countLabel="上榜次數" />
                : <EmptyState />
              }
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#aaa', textAlign: 'center', marginBottom: 8 }}>
                Top 50 積分榜部數
              </div>
              {top50GenreDistribution.length > 0
                ? <GenreDistribution data={top50GenreDistribution} countLabel="部數" />
                : <EmptyState />
              }
            </div>
          </div>
        </div>

        <div style={SECTION_STYLE}>
          <div style={SECTION_TITLE}>年度類型河流圖（{weekCount} 週）</div>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
            每週 Top 10 各類型占比 · 滾輪縮放 · 預設顯示最近 12 週
          </div>
          {filteredData.weeklyRankings.length > 0
            ? <WeeklyGenreFlow data={filteredData} />
            : <EmptyState />
          }
        </div>

        <div style={SECTION_STYLE}>
          <div style={SECTION_TITLE}>台劇分析專區</div>
          {taiwanDramas.length > 0
            ? <TaiwanDramaChart data={taiwanDramas} showAttributes={data.showAttributes} />
            : <EmptyState />
          }
        </div>

        <div style={SECTION_STYLE}>
          <div style={SECTION_TITLE}>台劇每日排名走勢</div>
          <RankTrendChart data={filteredData} />
        </div>

      </main>
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{ textAlign: 'center', color: '#444', padding: '40px 0', fontSize: 14 }}>
      尚無資料
    </div>
  )
}
