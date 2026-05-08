import { useEffect, useMemo, useState } from 'react'
import type { RankingsData } from './types'
import Header from './components/layout/Header'
import GenreDistribution from './components/charts/GenreDistribution'
import { getWeeklyDerivedRankings, getWeeklyGenreDistribution } from './utils/dataTransforms'
import { GENRE_COLORS, GENRE_ICONS } from './constants/genres'

const EMPTY_DATA: RankingsData = {
  meta: { generatedAt: '', dataThrough: '' },
  showAttributes: {},
  overallRankings: [],
  dailyOverallRankings: [],
  dailyOverallByQuarter: {},
  dailyOverallByWeek: {},
  taiwanDramaRankings: [],
  dailyRankings: [],
  weeklyRankings: [],
}

type ViewMode = 'overview' | 'momentum' | 'catalog'

export default function App() {
  const [rankingsData, setRankingsData] = useState<RankingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<ViewMode>('overview')

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/rankings.json`)
      .then(res => res.json())
      .then((json: RankingsData) => setRankingsData(json?.overallRankings ? json : null))
      .catch(() => setRankingsData(null))
      .finally(() => setLoading(false))
  }, [])

  const data: RankingsData = rankingsData ?? EMPTY_DATA

  const weeklyTop = useMemo(() => getWeeklyDerivedRankings(data).slice(0, 20), [data])
  const genreDistribution = useMemo(() => getWeeklyGenreDistribution(data), [data])

  const kpis = useMemo(() => {
    const titles = new Set(data.weeklyRankings.flatMap(w => w.rankings.map(r => r.title).filter(Boolean)))
    const originals = weeklyTop.filter(r => r.isNetflixOriginal).length
    const avgWeeks = weeklyTop.length > 0
      ? (weeklyTop.reduce((sum, row) => sum + row.weeksOnChart, 0) / weeklyTop.length)
      : 0
    return {
      totalWeeks: data.weeklyRankings.length,
      uniqueTitles: titles.size,
      originals,
      avgWeeks: Math.round(avgWeeks * 10) / 10,
    }
  }, [data, weeklyTop])

  const recentWeeks = useMemo(() => data.weeklyRankings.slice(0, 8), [data])

  if (loading) {
    return (
      <div style={{ background: '#0a0a16', height: '100vh', color: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        載入中…
      </div>
    )
  }

  return (
    <div style={{ background: '#0a0a16', minHeight: '100vh', color: '#eee' }}>
      <Header dataFrom={data.weeklyRankings[0]?.dateRange.split(' ~ ')[0]} dataThrough={data.meta.dataThrough || undefined} />

      <div style={{ padding: '16px 20px 24px', maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {([
            ['overview', '總覽敘事'],
            ['momentum', '近期動能'],
            ['catalog', '片庫結構'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              style={{
                borderRadius: 20,
                border: mode === key ? '1px solid #7c6fff' : '1px solid #2a2a3e',
                background: mode === key ? '#2a2060' : 'transparent',
                color: mode === key ? '#c9bbff' : '#aaa',
                padding: '6px 12px',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginBottom: 18 }}>
          {[
            ['追蹤週數', `${kpis.totalWeeks}`],
            ['上榜節目數', `${kpis.uniqueTitles}`],
            ['Top20 原創數', `${kpis.originals}`],
            ['Top20 平均在榜', `${kpis.avgWeeks} 週`],
          ].map(([label, value]) => (
            <div key={label} style={{ background: '#111124', border: '1px solid #2a2a3e', borderRadius: 12, padding: 14 }}>
              <div style={{ color: '#888', fontSize: 12, marginBottom: 6 }}>{label}</div>
              <div style={{ fontWeight: 700, fontSize: 22 }}>{value}</div>
            </div>
          ))}
        </div>

        {mode === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16 }}>
            <div style={{ background: '#111124', border: '1px solid #2a2a3e', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid #2a2a3e', fontWeight: 700 }}>我的版本：Top 20 積分榜</div>
              <div style={{ maxHeight: 540, overflow: 'auto' }}>
                {weeklyTop.map(row => (
                  <div key={row.title} style={{ display: 'grid', gridTemplateColumns: '48px 1fr 90px 86px', gap: 8, padding: '10px 14px', borderBottom: '1px solid #1e1e30' }}>
                    <div style={{ color: '#aaa' }}>#{row.rank}</div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{row.title}</div>
                      <div style={{ color: GENRE_COLORS[row.genre], fontSize: 12 }}>{GENRE_ICONS[row.genre]} {row.genre}</div>
                    </div>
                    <div style={{ color: '#f5c518', fontWeight: 700 }}>{row.totalScore}</div>
                    <div style={{ color: '#aaa' }}>{row.weeksOnChart} 週</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: '#111124', border: '1px solid #2a2a3e', borderRadius: 12, padding: 10 }}>
              <div style={{ padding: '6px 8px 12px', fontWeight: 700 }}>類型結構</div>
              <GenreDistribution data={genreDistribution} countLabel="上榜次數" />
            </div>
          </div>
        )}

        {mode === 'momentum' && (
          <div style={{ background: '#111124', border: '1px solid #2a2a3e', borderRadius: 12, padding: 14 }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>近期 8 週冠軍動能</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              {recentWeeks.map(week => {
                const champion = week.rankings.find(r => r.position === 1)
                return (
                  <div key={week.weekNumber} style={{ background: '#16162a', border: '1px solid #2a2a3e', borderRadius: 10, padding: 10 }}>
                    <div style={{ color: '#888', fontSize: 12 }}>Week {week.weekNumber} · {week.dateRange}</div>
                    <div style={{ marginTop: 6, fontWeight: 700, fontSize: 16 }}>{champion?.title || '—'}</div>
                    <div style={{ marginTop: 4, color: '#aaa', fontSize: 13 }}>#{champion?.position ?? '-'} · {champion?.genre ?? '未知類型'}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {mode === 'catalog' && (
          <div style={{ background: '#111124', border: '1px solid #2a2a3e', borderRadius: 12, padding: 14 }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>Top 20 片庫組成</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              {weeklyTop.map(row => (
                <div key={row.title} style={{ background: '#16162a', border: '1px solid #2a2a3e', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontWeight: 600 }}>{row.title}</span>
                    {row.isNetflixOriginal && <span style={{ color: '#e50914', fontSize: 12, fontWeight: 700 }}>N 原創</span>}
                  </div>
                  <div style={{ marginTop: 4, color: GENRE_COLORS[row.genre], fontSize: 12 }}>{GENRE_ICONS[row.genre]} {row.genre}</div>
                  <div style={{ marginTop: 4, color: '#aaa', fontSize: 12 }}>平均名次 {row.avgRank} · 在榜 {row.weeksOnChart} 週</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
