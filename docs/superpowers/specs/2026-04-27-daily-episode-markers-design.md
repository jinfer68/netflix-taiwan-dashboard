# 台劇每日走勢：新集上線標記設計規格

**日期：** 2026-04-27  
**分支：** feature/excel-data-source  
**影響範圍：** `src/utils/dataTransforms.ts`、`src/components/charts/RankTrendChart.tsx`

---

## 背景與目標

台劇每日排名資料已有每日粒度（dayIndex 0 起算）。週播劇因每 7 天有新集上線，排名曲線呈現「爬升→衰退→新集爆衝」的鋸齒模式；第 6 天通常是周期低谷，第 7 天（EP2 上線日）排名回升。

目前圖表缺乏標記，無法直觀看出這個模式。

**對齊原則：** X 軸以 `dayIndex`（各劇上架後第 N 天）為基準，所有劇集 EP1 均在 day 0、EP2 在 day 7，保證多劇同框時七天低谷自然對齊。

---

## 功能設計

### 1. 垂直集數參考線

- **觸發條件：** 選中節目中至少一部 `releaseType === 'weekly'` 或 `releaseType === 'split'`
- **位置：** `dayIndex = 0, 7, 14, 21, …` 直到圖表最大 dayIndex
- **樣式：**
  - 顏色：`#f5c518`（黃色），與線條顏色明確區隔
  - 線型：`strokeDasharray="4 3"`
  - 寬度：`strokeWidth={1}`（細，不搶走視覺焦點）
- **標籤：**
  - 位置：線頂端（圖表上方）
  - 文字：`EP1`（day 0）、`EP2`（day 7）、`EP3`（day 14）…
  - 顏色：同線色 `#f5c518`，字體大小 10px
- **一次上架劇全選時：** 不顯示任何 EP 參考線

### 2. 圖例上架方式標示

- 週播或拆分：節目名稱後加 `(週播)`，字色 `#46d369`（綠）
- 一次上架：加 `(一次)`，字色 `#888`（灰）
- 無 showAttributes 資料者：不加標示

### 3. Tooltip 增強

- Hover 在 EP 線附近（即 dayIndex 為 7 的倍數）時，Tooltip 額外顯示一行：
  - 若該天為 EP 日：`🎬 EPn 上線日`

---

## 資料流變更

### `getDailyTrendSeries`（dataTransforms.ts）

新增回傳欄位：
```ts
releaseTypes: Record<string, 'weekly' | 'allAtOnce' | 'split'>
// key = title，從 data.showAttributes 查詢
// 查無者不加後綴，EP 線顯示判斷也排除此劇
```

`RankTrendChart` 以此決定：
- 是否顯示 EP 參考線（任一為 weekly/split）
- 每個 series 的圖例後綴

---

## 邊界條件

| 情況 | 行為 |
|------|------|
| 全選一次上架劇 | 不顯示 EP 線，圖例標 `(一次)` |
| 混搭一次+週播 | 顯示 EP 線（按 7 天間隔），各劇圖例標示各自類型 |
| showAttributes 查無該劇 | 不加圖例後綴，不影響 EP 線顯示判斷 |
| 僅一天資料的劇 | EP1 線在 day 0，其餘不顯示 |
| dayIndex 不連續（中間有天無上榜） | 只標到最大 dayIndex 為止，EP 線仍按 7 倍數 |

---

## 不在範圍內

- 每集「實際」上線時間（非整數天）的處理
- 電影（週排行）的類似功能
- 動態調整集數週期（假設固定 7 天）
