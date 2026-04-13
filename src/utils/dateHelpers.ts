export function getQuarter(month: number): string {
  return `Q${Math.ceil(month / 3)}`
}

/** "2025-03-10 ~ 2025-03-16" → "2025-Q1" */
export function weekToYearQuarter(dateRange: string): string {
  const date = dateRange.split(' ~ ')[0]
  const year = date.substring(0, 4)
  const month = parseInt(date.substring(5, 7))
  return `${year}-${getQuarter(month)}`
}

/** "2025-03-10 ~ 2025-03-16" → "2025-03" */
export function weekToYearMonth(dateRange: string): string {
  return dateRange.split(' ~ ')[0].substring(0, 7)
}
