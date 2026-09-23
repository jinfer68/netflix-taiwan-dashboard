import { useCallback, useState } from 'react'
import type { MovieFormat, MovieLanguage } from '../types'
import { useTimeFilters } from './useTimeFilters'
import type { TimeFilterOptions, TimeFilters } from './useTimeFilters'

export interface MovieFilters {
  time: TimeFilters
  languages: Set<MovieLanguage>
  toggleLanguage: (v: MovieLanguage) => void
  clearLanguages: () => void
  format: MovieFormat | 'all'
  setFormat: (v: MovieFormat | 'all') => void
  originalOnly: boolean
  setOriginalOnly: (v: boolean) => void
}

export function useMovieFilters(options: TimeFilterOptions): MovieFilters {
  const time = useTimeFilters(options)
  const [languages, setLanguages] = useState<Set<MovieLanguage>>(new Set())
  const [format, setFormat] = useState<MovieFormat | 'all'>('all')
  const [originalOnly, setOriginalOnly] = useState(false)

  const toggleLanguage = useCallback((v: MovieLanguage) => {
    setLanguages(prev => {
      const next = new Set(prev)
      if (next.has(v)) next.delete(v)
      else next.add(v)
      return next
    })
  }, [])

  const clearLanguages = useCallback(() => setLanguages(new Set()), [])

  return {
    time,
    languages,
    toggleLanguage,
    clearLanguages,
    format, setFormat,
    originalOnly, setOriginalOnly,
  }
}
