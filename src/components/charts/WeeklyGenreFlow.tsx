import { useMemo, useRef, useState, useEffect } from 'react'
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
import {
  INK, INK_MUTED, INK_SECONDARY, PAPER, RULE, RULE_STRONG, NUM,
} from '../../constants/styles'
import type { Genre } from '../../types'

echarts.use([
  ThemeRiverChart,
  TooltipComponent,
  LegendComponent,
  SingleAxisComponent,
  DataZoomComponent,
  CanvasRenderer,
])

const BASE_COLORS = FLOW_DISPLAY_GENRES.map(g => GENRE_COLORS[g as Genre] ?? '#9a9a94')
const DIMMED = 'rgba(26,26,24,0.10)'

type NetflixFilter = 'all' | 'original' | 'nonOriginal'

export default function WeeklyGenreFlow({ data, netflixFilter }: { data: RankingsData; netflixFilter: NetflixFilter }) {
  const chartRef = useRef<any>(null)

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

  const [visibleRange, setVisibleRange] = useState({ start: zoomStartWN, end: zoomEndWN })
  useEffect(() => {
    setVisibleRange({ start: zoomStartWN, end: zoomEndWN })
  }, [zoomStartWN, zoomEndWN])

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

  const option = useMemo(() => {
    function buildTooltipHtml(params: any): string {
      const arr: any[] = Array.isArray(params) ? params : [params]
      if (!arr.length || !arr[0]?.data) return ''
      const wn: number = Math.round(arr[0].data[0])
      const dr = weekDateRanges[wn] ?? ''
      const titles = titlesByWeekGenre[wn] ?? {}
      const genreRows = FLOW_DISPLAY_GENRES
        .map(g => ({ genre: g, count: (titles[g] ?? []).length, color: GENRE_COLORS[g as Genre] ?? '#9a9a94' }))
        .filter(r => r.count > 0)
      let html = '<div style="font-weight:700;margin-bottom:6px;font-size:13px;color:' + INK + '">' + dr + '</div>'
      for (const row of genreRows) {
        const shows = (titles[row.genre] ?? []).map((t: string) => t).join('、')
        html += '<div style="margin:4px 0">'
          + '<span style="display:inline-block;width:8px;height:8px;background:' + row.color + ';margin-right:6px;vertical-align:middle"></span>'
          + '<strong style="color:' + INK + '">' + row.genre + '</strong>'
          + '<span style="color:' + INK_SECONDARY + '"> ' + row.count + ' 部</span>'
          + (shows ? '<div style="margin-left:14px;margin-top:2px;color:' + INK_MUTED + ';font-size:11px;line-height:1.6">' + shows + '</div>' : '')
          + '</div>'
      }
      return html
    }

    return {
      backgroundColor: 'transparent',
      color: BASE_COLORS,
      legend: {
        data: FLOW_DISPLAY_GENRES,
        top: 0,
        itemWidth: 10,
        itemHeight: 10,
        icon: 'rect',
        textStyle: { color: INK_SECONDARY, fontSize: 11 },
        inactiveColor: RULE_STRONG,
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#ffffff',
        borderColor: RULE_STRONG,
        borderWidth: 1,
        borderRadius: 2,
        padding: [8, 12],
        extraCssText: 'box-shadow:0 2px 8px rgba(26,26,24,0.10)',
        textStyle: { color: INK, fontSize: 12 },
        formatter: buildTooltipHtml,
      },
      singleAxis: {
        type: 'value',
        min: weekNumbers[0],
        max: weekNumbers[TOTAL - 1],
        interval: 1,
        bottom: 76,
        top: 34,
        axisLine: { lineStyle: { color: RULE_STRONG } },
        axisTick: { show: false },
        axisLabel: {
          color: INK_SECONDARY,
          fontSize: 10,
          interval: 0,
          formatter: (v: number) => monthStartWeeks.get(Math.round(v)) ?? '',
        },
        splitLine: { show: true, lineStyle: { color: RULE } },
      },
      dataZoom: [
        {
          type: 'slider',
          singleAxisIndex: 0,
          bottom: 10,
          height: 20,
          startValue: zoomStartWN,
          endValue: zoomEndWN,
          borderColor: RULE_STRONG,
          backgroundColor: PAPER,
          fillerColor: 'rgba(26,26,24,0.06)',
          handleStyle: { color: '#fff', borderColor: RULE_STRONG },
          moveHandleStyle: { color: RULE_STRONG },
          textStyle: { color: INK_MUTED, fontSize: 10 },
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
        itemStyle: { borderColor: PAPER, borderWidth: 1 },
      }],
    }
  }, [flowData, weekNumbers, weekDateRanges, titlesByWeekGenre, monthStartWeeks, zoomStartWN, zoomEndWN, TOTAL])

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
        g === hovered ? (GENRE_COLORS[g as Genre] ?? '#9a9a94') : DIMMED
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
    return <div style={{ textAlign: 'center', color: INK_MUTED, padding: '40px 0', fontSize: 13 }}>尚無資料</div>
  }

  const visibleWeekCount = weekNumbers.filter(
    wn => wn >= visibleRange.start && wn <= visibleRange.end
  ).length

  const cell: React.CSSProperties = {
    ...NUM, textAlign: 'right', padding: '5px 10px', color: INK,
    borderBottom: `1px solid ${RULE}`,
  }
  const head: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: INK_SECONDARY, padding: '5px 10px',
    borderBottom: `1px solid ${RULE_STRONG}`, background: PAPER,
  }

  return (
    <div style={{ padding: '14px 20px 16px' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: INK_SECONDARY, letterSpacing: 1, marginBottom: 6 }}>
        每週各類型上榜部數變化
      </div>

      <ReactEChartsCore
        ref={chartRef}
        echarts={echarts}
        option={option}
        onEvents={onEvents}
        style={{ height: 400, width: '100%' }}
        opts={{ renderer: 'canvas' }}
      />

      <div style={{ marginTop: 14 }}>
        <div style={{ ...NUM, fontSize: 12, fontWeight: 700, color: INK_SECONDARY, letterSpacing: 1, marginBottom: 6 }}>
          顯示範圍統計　{visibleWeekCount} 週
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ ...head, textAlign: 'left', width: 130 }}>類型</th>
                <th style={{ ...head, textAlign: 'right', width: 60 }}>最多</th>
                <th style={{ ...head, textAlign: 'right', width: 60 }}>最少</th>
                <th style={{ ...head, textAlign: 'right', width: 60 }}>平均</th>
                <th style={{ ...head, textAlign: 'left', minWidth: 120 }}>每週部數分布</th>
              </tr>
            </thead>
            <tbody>
              {genreStats.map(({ genre, max, min, avg }) => {
                const color = GENRE_COLORS[genre as Genre] ?? '#9a9a94'
                return (
                  <tr key={genre}>
                    <td style={{ ...cell, textAlign: 'left' }}>
                      <span style={{
                        display: 'inline-block', width: 8, height: 8,
                        background: color, marginRight: 6, verticalAlign: 'middle',
                      }} />
                      {genre}
                    </td>
                    <td style={{ ...cell, fontWeight: 700 }}>{max}</td>
                    <td style={{ ...cell, color: INK_SECONDARY }}>{min}</td>
                    <td style={cell}>{avg}</td>
                    <td style={{ ...cell, padding: '5px 10px' }}>
                      <div style={{ position: 'relative', height: 6, background: RULE }}>
                        <div style={{
                          position: 'absolute', top: 0, bottom: 0,
                          left: `${(min / 10) * 100}%`,
                          width: `${Math.max((max - min) / 10 * 100, 1)}%`,
                          background: color, opacity: 0.3,
                        }} />
                        <div style={{
                          position: 'absolute', top: -2, bottom: -2,
                          left: `${(avg / 10) * 100}%`,
                          width: 2, background: color,
                        }} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: 11, color: INK_MUTED, marginTop: 6 }}>
          分布條以每週 Top 10 為滿格；淺色區間為最少至最多，直線為平均
        </div>
      </div>
    </div>
  )
}
