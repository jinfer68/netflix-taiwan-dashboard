# 台劇每日走勢：新集上線標記 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在台劇每日走勢圖中，對週播劇每隔 7 天（EP1=day0, EP2=day7…）加黃色垂直虛線與標籤，讓「新集爆衝」模式清晰可見；圖例同時標示各劇的上架方式。

**Architecture:** 在 `getDailyTrendSeries` 回傳 `releaseTypes` map（查自 `showAttributes`），`RankTrendChart` 據此生成 `<ReferenceLine>` 群組、在每條 `<Line>` 加上 `name` 後綴、在 `RankTooltip` 檢測 EP 日。

**Tech Stack:** React 18、TypeScript、Recharts 2.x（LineChart / ReferenceLine / Line / Legend / Tooltip）

---

## File Map

| 檔案 | 動作 | 說明 |
|------|------|------|
| `src/utils/dataTransforms.ts` | Modify（line 172–193） | 擴充 `getDailyTrendSeries` 回傳值加 `releaseTypes` |
| `src/components/charts/RankTrendChart.tsx` | Modify（全檔） | EP 參考線、圖例後綴、Tooltip EP 行 |

---

## Task 1：擴充 `getDailyTrendSeries` 的回傳型別

**Files:**
- Modify: `src/utils/dataTransforms.ts`（line 172–193）

- [ ] **Step 1：更新函式實作**

在 `src/utils/dataTransforms.ts` 找到 `getDailyTrendSeries`（line 172），以下列程式碼取代整個函式：

```ts
/** 取得台劇每日排名走勢（以上架天數為 X 軸）*/
export function getDailyTrendSeries(
  data: RankingsData,
  selectedTitles: string[]
): {
  indices: number[]
  series: DailyTrendSeries[]
  releaseTypes: Record<string, 'weekly' | 'allAtOnce' | 'split'>
} {
  const relevant = data.dailyRankings.filter(r => selectedTitles.includes(r.title))

  const allIndices = [...new Set(relevant.map(r => r.dayIndex))].sort((a, b) => a - b)

  const series: DailyTrendSeries[] = selectedTitles
    .filter(t => relevant.some(r => r.title === t))
    .map(title => {
      const byDay = new Map(
        relevant.filter(r => r.title === title).map(r => [r.dayIndex, r.rank])
      )
      return {
        name: title,
        data: allIndices.map(i => ({ dayIndex: i, rank: byDay.get(i) ?? null })),
      }
    })

  const releaseTypes: Record<string, 'weekly' | 'allAtOnce' | 'split'> = {}
  for (const title of selectedTitles) {
    const attr = data.showAttributes[title]
    if (attr?.releaseType) releaseTypes[title] = attr.releaseType
  }

  return { indices: allIndices, series, releaseTypes }
}
```

- [ ] **Step 2：TypeScript 型別檢查**

```bash
cd "C:\Users\User\Desktop\影視數據儀表板"
npx tsc --noEmit
```

期待：無錯誤（多出 `releaseTypes` 欄位不影響現有解構）。

- [ ] **Step 3：Commit**

```bash
git add src/utils/dataTransforms.ts
git commit -m "feat: getDailyTrendSeries 回傳 releaseTypes map"
```

---

## Task 2：RankTrendChart — EP 參考線、圖例後綴、Tooltip EP 行

**Files:**
- Modify: `src/components/charts/RankTrendChart.tsx`

- [ ] **Step 1：更新解構與衍生變數（line 60–75 區域）**

找到現有的 useMemo：
```ts
const { indices, series } = useMemo(
  () => getDailyTrendSeries(data, selectedTitles),
  [data, selectedTitles]
)
```

替換為：

```ts
const { indices, series, releaseTypes } = useMemo(
  () => getDailyTrendSeries(data, selectedTitles),
  [data, selectedTitles]
)

const hasWeeklyShow = Object.values(releaseTypes).some(
  t => t === 'weekly' || t === 'split'
)

const maxDayIndex = indices.length > 0 ? indices[indices.length - 1] : 0

const epDays = hasWeeklyShow
  ? Array.from({ length: Math.floor(maxDayIndex / 7) + 1 }, (_, i) => i * 7)
  : []
```

- [ ] **Step 2：更新 `RankTooltip`（line 29–45 區域）**

找到現有 `function RankTooltip`，以下列版本完整取代：

```tsx
function RankTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  const dayIndex = label as number
  const epNum = dayIndex % 7 === 0 ? dayIndex / 7 + 1 : null
  return (
    <div style={TOOLTIP_STYLE}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>上架第 {dayIndex} 天</div>
      {epNum != null && (
        <div style={{ color: '#f5c518', fontSize: 11, marginBottom: 4 }}>
          🎬 EP{epNum} 上線日
        </div>
      )}
      {payload.map((entry, i) => {
        const v = entry.value as number | null | undefined
        const display = v == null ? '無資料' : v >= 11 ? '榜外（未進 Top 10）' : `第 ${v} 名`
        return (
          <div key={i} style={{ color: entry.color, fontSize: 12 }}>
            {entry.name}：{display}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3：在 `<LineChart>` 內加入 EP ReferenceLine 群組**

找到現有的 `<ReferenceLine y={10.5} …/>` 行（約 line 91），在其**後方**緊接插入：

```tsx
{epDays.map(day => (
  <ReferenceLine
    key={`ep-${day}`}
    x={day}
    stroke="#f5c518"
    strokeWidth={1}
    strokeDasharray="4 3"
    label={{
      value: `EP${day / 7 + 1}`,
      fill: '#f5c518',
      fontSize: 10,
      position: 'insideTopRight',
    }}
  />
))}
```

- [ ] **Step 4：為各 `<Line>` 加圖例後綴**

找到 `{series.map((s, i) => (` 區塊（約 line 107），以下列版本取代整個 map：

```tsx
{series.map((s, i) => {
  const rt = releaseTypes[s.name]
  const suffix = rt === 'weekly' || rt === 'split'
    ? ' (週播)'
    : rt === 'allAtOnce'
    ? ' (一次)'
    : ''
  return (
    <Line
      key={s.name}
      type="monotone"
      dataKey={s.name}
      name={s.name + suffix}
      stroke={COLORS[i % COLORS.length]}
      strokeWidth={2}
      dot={<CustomDot cx={0} cy={0} value={null} stroke={COLORS[i % COLORS.length]} index={0} />}
      connectNulls={false}
    />
  )
})}
```

- [ ] **Step 5：型別檢查**

```bash
npx tsc --noEmit
```

期待：無錯誤。

- [ ] **Step 6：瀏覽器驗證**

前往台劇分析頁，從左側清單點選 1 部**週播劇**（例如「幸福房屋事件簿」）：

- ✓ 走勢圖上出現黃色垂直虛線，每 7 格一條
- ✓ 每條線上方標 EP1、EP2…
- ✓ 圖例顯示「幸福房屋事件簿 (週播)」
- ✓ 滑鼠移到 day 7 資料點，Tooltip 顯示「🎬 EP2 上線日」

再加選 1 部**一次上架劇**（例如「影后」）：
- ✓ EP 線仍在（有週播劇存在）
- ✓ 「影后」圖例標 `(一次)`

取消週播劇、只保留一次上架劇：
- ✓ EP 參考線全數消失

- [ ] **Step 7：Commit**

```bash
git add src/components/charts/RankTrendChart.tsx
git commit -m "feat: 台劇走勢圖加 EP 垂直標記與圖例上架方式標示"
```
