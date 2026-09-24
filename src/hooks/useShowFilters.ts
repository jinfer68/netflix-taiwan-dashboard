import { useState } from 'react'
import type { YearFilter } from '../components/layout/Sidebar'

export type ReleaseFilter = 'all' | 'weekly' | 'allAtOnce' | 'split'
export type NetflixFilter = 'all' | 'original' | 'nonOriginal'

export interface ShowFilters {
  yearFilter: YearFilter
  setYearFilter: (v: YearFilter) => void
  rankingMode: 'weekly' | 'daily'
  setRankingMode: (v: 'weekly' | 'daily') => void
  activeGenres: Set<string>
  setActiveGenres: (v: Set<string>) => void
  netflixOnly: boolean
  setNetflixOnly: (v: boolean) => void
  selectedQuarter: string
  setSelectedQuarter: (v: string) => void
  selectedMonth: string | null
  setSelectedMonth: (v: string | null) => void
  selectedDailyWeek: number | null
  setSelectedDailyWeek: (v: number | null) => void
  sortMode: 'weekly' | 'daily'
  setSortMode: (v: 'weekly' | 'daily') => void
  filterRelease: ReleaseFilter
  setFilterRelease: (v: ReleaseFilter) => void
  filterNetflix: NetflixFilter
  setFilterNetflix: (v: NetflixFilter) => void
  selectedTitles: string[]
  setSelectedTitles: (v: string[]) => void
  search: string
  setSearch: (v: string) => void
  flowNetflixFilter: NetflixFilter
  setFlowNetflixFilter: (v: NetflixFilter) => void
}

export function useShowFilters(): ShowFilters {
  const [yearFilter, setYearFilter] = useState<YearFilter>('2026')
  const [rankingMode, setRankingMode] = useState<'weekly' | 'daily'>('weekly')
  const [activeGenres, setActiveGenres] = useState<Set<string>>(new Set())
  const [netflixOnly, setNetflixOnly] = useState(false)
  const [selectedQuarter, setSelectedQuarter] = useState<string>('all')
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [selectedDailyWeek, setSelectedDailyWeek] = useState<number | null>(null)
  const [sortMode, setSortMode] = useState<'weekly' | 'daily'>('weekly')
  const [filterRelease, setFilterRelease] = useState<ReleaseFilter>('all')
  const [filterNetflix, setFilterNetflix] = useState<NetflixFilter>('all')
  const [selectedTitles, setSelectedTitles] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [flowNetflixFilter, setFlowNetflixFilter] = useState<NetflixFilter>('all')

  return {
    yearFilter, setYearFilter,
    rankingMode, setRankingMode,
    activeGenres, setActiveGenres,
    netflixOnly, setNetflixOnly,
    selectedQuarter, setSelectedQuarter,
    selectedMonth, setSelectedMonth,
    selectedDailyWeek, setSelectedDailyWeek,
    sortMode, setSortMode,
    filterRelease, setFilterRelease,
    filterNetflix, setFilterNetflix,
    selectedTitles, setSelectedTitles,
    search, setSearch,
    flowNetflixFilter, setFlowNetflixFilter,
  }
}
