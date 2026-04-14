import { useMemo, useRef, useState, useEffect } from 'react'
// Note: useState kept for visibleRange; netflixFilter is now a prop
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import { ThemeRiverChart } from 'echarts/charts'
import {
  TooltipComponent,
  LegendComponent,
  SingleAxisComponent,
  DataZoomComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { RankingsData } from '../../types'
import { getWeeklyGenreFlow, FLOW_DISPLAY_GENRES } from '../../utils/dataTransforms'
import { GENRE_COLORS } from '../../constants/genres'
import type { Genre } from '../../types'

echarts.use([
  ThemeRiverChart,
  TooltipComponent,
  LegendComponent,
  SingleAxisComponent,
  DataZoomComponent,
  CanvasRenderer,
])

const BASE_COLORS = FLOW_DISPLAY_GENRES.map(g => GENRE_COLORS[g as Genre] ?? '#95a5a6')

type NetflixFilter = 'all' | 'original' | 'nonOriginal'

export default function WeeklyGenreFlow({ data, netflixFilter }: { data: RankingsData; netflixFilter: NetflixFilter }) {
  const chartRef = useRef<any>(null)

  // 依 Netflix 原創篩選週榜資料
  const filteredData = useMemo(() => {
    if (netflixFilter === 'all') return data
    return {
      ...data,
      weeklyRankings: data.weeklyRankings.map(week => ({
        ...week,
        rankings: week.rankings.filter(item =>
          netflixFilter === 'original' ? item.isNetflixOriginal : !item.isNetflixOriginal
        ),
      })),
    }
  }, [data, netflixFilter])

  const { data: flowData, weekNumbers, weekDateRanges, titlesByWeekGenre } =
    useMemo(() => getWeeklyGenreFlow(filteredData), [filteredData])

  const TOTAL = weekNumbers.length
  const zoomStartWN = weekNumbers[Math.max(0, TOTAL - 12)] ?? weekNumbers[0]
  const zoomEndWN   = weekNumbers[TOTAL - 1]

  // 目前可見週次範圍（跟隨 dataZoom 更新）
  const [visibleRange, setVisibleRange] = useState({ start: zoomStartWN, end: zoomEndWN })
  useEffect(() => {
    setVisibleRange({ start: zoomStartWN, end: zoomEndWN })
  }, [zoomStartWN, zoomEndWN])

  // 計算每個月份首次出現的週次，做為 x 軸月份標記
  const monthStartWeeks = useMemo(() => {
    const result = new Map<number, string>()
    let prevYM = ''
    for (const wn of weekNumbers) {
      const dr = weekDateRanges[wn]
      if (!dr) continue
      const date = dr.split(' ~ ')[0]
      const ym = date.substring(0, 7)
      if (ym !== prevYM) {
        result.set(wn, `${date.substring(0, 4)}/${date.substring(5, 7)}`)
        prevYM = ym
      }
    }
    return result
  }, [weekNumbers, weekDateRanges])

  // 可見範圍統計（max / min / avg 上榜部數）
  const genreStats = useMemo(() => {
    const visibleWeeks = weekNumbers.filter(
      wn => wn >= visibleRange.start && wn <= visibleRange.end
    )
    return FLOW_DISPLAY_GENRES.map(genre => {
      const counts = visibleWeeks.map(wn => (titlesByWeekGenre[wn]?.[genre] ?? []).length)
      if (!counts.length) return { genre, max: 0, min: 0, avg: 0 }
      const max = Math.max(...counts)
      const min = Math.min(...counts)
      const avg = Math.round(counts.reduce((a, b) => a + b, 0) / counts.length * 10) / 10
      return { genre, max, min, avg }
    })
  }, [visibleRange, weekNumbers, titlesByWeekGenre])

  // ECharts option（不依賴 visibleRange，避免 dataZoom 被重置）
  const option = useMemo(() => {
    function buildTooltipHtml(params: any): string {
      const arr: any[] = Array.isArray(params) ? params : [params]
      if (!arr.length || !arr[0]?.data) return ''
      const wn: number = Math.round(arr[0].data[0])
      const dr = weekDateRanges[wn] ?? ('W' + String(wn).padStart(2, '0'))
      const titles = titlesByWeekGenre[wn] ?? {}
      const genreRows = FLOW_DISPLAY_GENRES
        .map(g => ({ genre: g, count: (titles[g] ?? []).length, color: GENRE_COLORS[g as Genre] ?? '#95a5a6' }))
        .filter(r => r.count > 0)
        .sort((a, b) => b.count - a.count)
      let html = '<div style="font-weight:700;margin-bottom:8px;font-size:14px">W'
        + String(wn).padStart(2, '0')
        + ' &nbsp;<span style="color:#aaa;font-size:12px">' + dr + '</span></div>'
      for (const row of genreRows) {
        const shows = (titles[row.genre] ?? []).map((t: string) => '• ' + t).join('<br/>')
        html += '<div style="margin:5px 0">'
          + '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + row.color + ';margin-right:6px;vertical-align:middle"></span>'
          + '<strong>' + row.genre + '</strong>: ' + row.count + ' 部'
          + (shows ? '<div style="margin-left:16px;margin-top:3px;color:#bbb;font-size:11px;line-height:1.6">' + shows + '</div>' : '')
          + '</div>'
      }
      return html
    }

    return {
      backgroundColor: 'transparent',
      color: BASE_COLORS,
      legend: {
        data: FLOW_DISPLAY_GENRES,
        top: 4,
        textStyle: { color: '#ccc', fontSize: 12 },
        inactiveColor: '#444',
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1a1a2e',
        borderColor: '#333',
        borderWidth: 1,
        padding: [10, 14],
        textStyle: { color: '#eee', fontSize: 13 },
        formatter: buildTooltipHtml,
      },
      singleAxis: {
        type: 'value',
        min: weekNumbers[0],
        max: weekNumbers[TOTAL - 1],
        interval: 1,
        bottom: 80,
        top: 44,
        axisLine: { lineStyle: { color: '#444' } },
        axisTick: { show: false },
        axisLabel: {
          color: '#aaa',
          fontSize: 10,
          interval: 0,
          formatter: (v: number) => monthStartWeeks.get(Math.round(v)) ?? '',
        },
        splitLine: { show: true, lineStyle: { color: '#222', type: 'dashed' } },
      },
      dataZoom: [
        {
          type: 'slider',
          singleAxisIndex: 0,
          bottom: 10,
          height: 22,
          startValue: zoomStartWN,
          endValue: zoomEndWN,
          borderColor: '#444',
          fillerColor: 'rgba(255,255,255,0.06)',
          handleStyle: { color: '#666' },
          textStyle: { color: '#aaa', fontSize: 10 },
          labelFormatter: (v: number) => {
            const wn = Math.round(v)
            const dr = weekDateRanges[wn]
            if (!dr) return 'W' + String(wn).padStart(2, '0')
            return dr.split(' ~ ')[0].substring(0, 7).replace('-', '/')
          },
        },
        {
          type: 'inside',
          singleAxisIndex: 0,
          startValue: zoomStartWN,
          endValue: zoomEndWN,
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
        },
      ],
      series: [{
        type: 'themeRiver',
        data: flowData,
        label: { show: false },
        boundaryGap: ['5%', '5%'],
      }],
    }
  }, [flowData, weekNumbers, weekDateRanges, titlesByWeekGenre, monthStartWeeks, zoomStartWN, zoomEndWN, TOTAL])

  // hover 淡出 + dataZoom 監聽
  const onEvents = useMemo(() => ({
    datazoom: () => {
      const chart = chartRef.current?.getEchartsInstance()
      if (!chart) return
      const opt = chart.getOption()
      const dz = opt.dataZoom?.[0]
      if (dz?.startValue != null && dz?.endValue != null) {
        setVisibleRange({
          start: Math.round(Number(dz.startValue)),
          end:   Math.round(Number(dz.endValue)),
        })
      }
    },
    mouseover: (params: any) => {
      if (params.componentSubType !== 'themeRiver') return
      const hovered: string = params.data[2]
      const chart = chartRef.current?.getEchartsInstance()
      if (!chart) return
      const dimmed = FLOW_DISPLAY_GENRES.map(g =>
        g === hovered
          ? (GENRE_COLORS[g as Genre] ?? '#95a5a6')
          : 'rgba(40, 40, 55, 0.25)'
      )
      chart.setOption({ color: dimmed }, false)
    },
    mouseout: (params: any) => {
      if (params.componentSubType !== 'themeRiver') return
      const chart = chartRef.current?.getEchartsInstance()
      if (!chart) return
      chart.setOption({ color: BASE_COLORS }, false)
    },
  }), [setVisibleRange])

  if (!data.weeklyRankings.length) {
    return <div style={{ textAlign: 'center', color: '#444', padding: '40px 0', fontSize: 14 }}>尚無資料</div>
  }

  const visibleWeekCount = weekNumbers.filter(
    wn => wn >= visibleRange.start && wn <= visibleRange.end
  ).length

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '16px 20px' }}>
      <ReactEChartsCore
        ref={chartRef}
        echarts={echarts}
        option={option}
        onEvents={onEvents}
        style={{ height: 420, width: '100%' }}
        opts={{ renderer: 'canvas' }}
      />

      {/* 可見範圍統計表 */}
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, color: '#555', marginBottom: 8 }}>
          目前顯示範圍統計（{visibleWeekCount} 週）· 各類型每週上榜部數
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, color: '#ccc' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #2a2a3a' }}>
                <th style={{ textAlign: 'left', padding: '5px 10px', color: '#666', fontWeight: 400, width: 120 }}>類型</th>
                <th style={{ textAlign: 'center', padding: '5px 10px', color: '#666', fontWeight: 400 }}>最多</th>
                <th style={{ textAlign: 'center', padding: '5px 10px', color: '#666', fontWeight: 400 }}>最少</th>
                <th style={{ textAlign: 'center', padding: '5px 10px', color: '#666', fontWeight: 400 }}>平均</th>
                <th style={{ textAlign: 'left', padding: '5px 10px', color: '#555', fontWeight: 400, minWidth: 120 }}>分布參考</th>
              </tr>
            </thead>
            <tbody>
              {genreStats.map(({ genre, max, min, avg }) => {
                const color = GENRE_COLORS[genre as Genre] ?? '#95a5a6'
                const barMin = (min / 10) * 100
                const barMax = (max / 10) * 100
                const barAvg = (avg / 10) * 100
                return (
                  <tr key={genre} style={{ borderBottom: '1px solid #1a1a28' }}>
                    <td style={{ padding: '6px 10px' }}>
                      <span style={{
                        display: 'inline-block', width: 8, height: 8,
                        borderRadius: '50%', background: color,
                        marginRight: 6, verticalAlign: 'middle',
                      }} />
                      {genre}
                    </td>
                    <td style={{ textAlign: 'center', padding: '6px 10px', color: '#eee', fontWeight: 600 }}>{max}</td>
                    <td style={{ textAlign: 'center', padding: '6px 10px', color: '#888' }}>{min}</td>
                    <td style={{ textAlign: 'center', padding: '6px 10px', color: color }}>{avg}</td>
                    <td style={{ padding: '6px 10px' }}>
                      <div style={{ position: 'relative', height: 6, background: '#1e1e2e', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{
                          position: 'absolute', top: 0, bottom: 0,
                          left: barMin + '%',
                          width: Math.max(barMax - barMin, 1) + '%',
                          background: color, opacity: 0.25, borderRadius: 3,
                        }} />
                        <div style={{
                          position: 'absolute', top: 0, bottom: 0,
                          left: barAvg + '%',
                          width: 2,
                          background: color, opacity: 0.9, borderRadius: 1,
                        }} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
