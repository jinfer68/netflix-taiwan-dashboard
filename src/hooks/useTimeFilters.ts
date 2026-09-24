import { useCallback, useMemo, useState } from 'react'
import type { DateRange } from '../types'

export type BoardMode = 'weekly' | 'daily'

/** 該模式下可選的年份。日榜可回溯到 2021，週榜只有 2022 起 */
export interface TimeFilterOptions {
  dailyYears: string[]
  weeklyYears: string[]
}

export interface TimeFilters {
  boardMode: BoardMode
  setBoardMode: (v: BoardMode) => void
  year: string
  setYear: (v: string) => void
  quarter: number | null
  setQuarter: (v: number | null) => void
  month: number | null
  setMonth: (v: number | null) => void
  years: string[]
  range: DateRange | null
}

const pad = (n: number) => String(n).padStart(2, '0')
const lastDayOf = (year: number, month: number) => new Date(year, month, 0).getDate()

/** 收斂到可選清單中「大於目前年份的最小者」；若無更大的則取最大者 */
function convergeYear(current: string, available: string[]): string {
  if (current === 'all' || available.includes(current)) return current
  const years = available.filter(y => y !== 'all').sort()
  if (years.length === 0) return current
  return years.find(y => y > current) ?? years[years.length - 1]
}

export function useTimeFilters(options: TimeFilterOptions): TimeFilters {
  const [boardMode, setBoardModeRaw] = useState<BoardMode>('daily')
  const [year, setYearRaw] = useState<string>('all')
  const [quarter, setQuarter] = useState<number | null>(null)
  const [month, setMonth] = useState<number | null>(null)

  const years = boardMode === 'daily' ? options.dailyYears : options.weeklyYears

  // 資料載入前 years 是空的，載入後選中的年份可能不在清單裡；
  // 一律以收斂後的值對外，避免畫面停在一個沒有資料的年份
  const effectiveYear = convergeYear(year, years)

  const setYear = useCallback((v: string) => {
    setYearRaw(v)
    setQuarter(null)
    setMonth(null)
  }, [])

  const setBoardMode = useCallback((next: BoardMode) => {
    setBoardModeRaw(next)
    setQuarter(null)
    setMonth(null)
  }, [])

  const range = useMemo((): DateRange | null => {
    if (effectiveYear === 'all') return null
    const y = Number(effectiveYear)

    if (month !== null) {
      return { from: `${y}-${pad(month)}-01`, to: `${y}-${pad(month)}-${pad(lastDayOf(y, month))}` }
    }
    if (quarter !== null) {
      const startMonth = (quarter - 1) * 3 + 1
      const endMonth = startMonth + 2
      return {
        from: `${y}-${pad(startMonth)}-01`,
        to: `${y}-${pad(endMonth)}-${pad(lastDayOf(y, endMonth))}`,
      }
    }
    return { from: `${y}-01-01`, to: `${y}-12-31` }
  }, [effectiveYear, quarter, month])

  return {
    boardMode, setBoardMode,
    year: effectiveYear, setYear,
    quarter, setQuarter,
    month, setMonth,
    years, range,
  }
}
