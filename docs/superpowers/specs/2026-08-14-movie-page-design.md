# 電影頁設計規格

**日期：** 2026-08-14
**建議分支：** `feat/movie-page`
**影響範圍：** `scripts/convert_excel.py`、`scripts/language_rules.py`（新增）、`src/types/index.ts`、`src/constants/languages.ts`（新增）、`src/utils/movieTransforms.ts`（新增）、`src/hooks/useShowFilters.ts` 與 `useMovieFilters.ts`（新增）、`src/components/layout/Sidebar.tsx`、`src/App.tsx`、`src/components/charts/Movie*.tsx`（新增四支）

---

## 背景

爬蟲從 2021-04 起就在抓 Netflix 台灣的電影榜，資料完整躺在 `爬蟲臉書/output/export.xlsx` 的兩張工作表裡，但儀表板從未使用 —— `convert_excel.py` 的檔頭註解直接寫著「Netflix 每週電影排名 — 電影週榜（目前未使用）」。

| 工作表 | 筆數 | 涵蓋範圍 |
|---|---|---|
| `Netflix 每週電影排名` | 1,699（170 週） | 2024-01 ～ 2026-08 |
| `每天電影排名資料` | 16,991（1,702 天） | 2021-04 ～ 2026-08 |

共 1,410 部不重複電影。

### 電影與劇集的體質差異

這決定了電影頁不能是劇集頁的鏡像複製：

| | 電影 | 劇集 |
|---|---|---|
| 不重複片名 | 1,410 | 806 |
| 在榜天數中位數 | 9 天 | 14 天 |
| p90 | 25 天 | 50 天 |
| 最長 | 269 天 | 122 天 |
| Netflix 獨家 | 37.4% | 47.6% |

電影汰換速度是劇集兩倍，但長尾更極端。另外電影**沒有「上架方式」與「集數」**，劇集頁那組「週播／一次／拆分」篩選器完全不適用；電影則多了「劇情片／動畫／紀錄片」這個劇集沒有的維度。

### 資料完整性問題

探索階段確認三項，全部需要明確規則，不能靠預設行為蒙混：

1. **日榜有 247 天缺漏**，集中在早期：2021 缺 102 天（38%）、2023 缺 110 天（30%）、2022 缺 34 天。2024 起僅 2026 缺 1 天。
2. **25 天的榜單不足 10 筆**（4 天只有 8 筆、21 天只有 9 筆）。
3. **77 個片名的「類型」欄前後不一致**，例如「關於我和鬼變成家人的那件事」同時被標成 `台` 與 `美`、「露西」被標成 `美` 與 `法`。

### 分類法問題

電影的「類型」欄與劇集是兩套語言。劇集是九種正規類型；電影實際上是**產地國別＋形式**的自由文字，日榜出現 150 種以上寫法：`美`、`動畫 (美)`、`紀錄片 (英)`、`美/南非/冰島`、`德/日/英/美/法/加/中`、`電影 (美)`，以及純髒資料如 `(2020) 9900萬戶`、`》動畫 (日)`、`美\`、`英Netflix Original`。現有的 `genre_rules.py` 只認得單一國別縮寫，直接套用會有大量落入「其他」。

---

## 決策摘要

| 議題 | 決策 | 理由 |
|---|---|---|
| 電影在儀表板的定位 | 頂層「影集／電影」模式切換，非第四個分頁 | 對稱、可擴充；分頁留給各模式自己的子頁 |
| 分類維度 | 拆成 `language`（語言）與 `format`（形式）兩個獨立欄位 | 原始資料本就同時編碼兩者；髒資料只污染其中一維 |
| 語言分組 | 六格：英語／其他語言／台灣／日語／韓語／華語 | 港片必須與中國、星馬華語同組，不能落入「其他」 |
| 台灣獨立成格 | 是，即使它也是華語 | 儀表板主題就是台灣市場；這是刻意的例外 |
| 顏色上限 | 六格用既有已驗證色，不新增 hex | 類別色可靠辨識上限約 7–8；限制在眼睛不在檔案 |
| 資料粒度 | 資料層保留完整原始國別，視覺層才收斂成六格 | 篩選與 tooltip 可用完整粒度，圖表保持可讀 |
| 第一階段頁數 | 只做「總排行榜」一頁 | 風險集中在資料層，先讓一頁跑通真實資料 |
| 主要圖表 | 當日榜單表（含迷你走勢）＋ 近 14 天名次競逐圖 | 回答「現在誰在榜、走勢如何」與「他們怎麼打到今天」 |
| 走勢圖 X 軸 | 日期軸，視窗 14 天，並補上期間內落榜者 | 競爭必須包含輸家；短視窗讓新片的短線填滿畫面 |
| 時間範圍 | 日榜開放至 2021，週榜維持 2024 起 | 資料既然有就該用；之後劇集也會比照開放 |
| 缺漏日 | 一律不內插，線在缺漏處中斷；顯示實際覆蓋率 | 內插會畫出不存在的資料 |
| 資料檔 | 新開 `public/data/movies.json` | 不動 `rankings.json`；切到電影模式才 fetch |
| 管線歸屬 | 擴充 `convert_excel.py` | 它才是正牌管線（同時產生 schema validator） |

### 明確不做（YAGNI）

以下在腦力激盪過程中提出並被否決或延後，記錄在此避免日後重新發明：

- **榜單日曆矩陣**（365 天 × 10 名次的密集格點）— 已否決。把全期攤開，但使用者要的是「此刻」，其餘都是雜訊。
- **續航力象限圖**（在榜天數 × 平均名次散點）— 延後。全期視角，與「當下」兩個元件不同層次，且三個元件中最需要學習成本。
- **生命週期小倍數**（每片一個迷你走勢，網格排列）— 延後。工程量最大，需先確定篩選器設計。
- **電影的類型分析頁、台片分析頁** — 延後至第二階段，等第一頁跑過真實資料再定。
- **點大小編碼積分** — 已否決。總積分 ≈ 在榜天數 × 名次高度，與 X／Y 軸重複。

---

## 資料層設計

### 1. 語言與形式正規化（`scripts/language_rules.py`，新增）

與 `genre_rules.py` 平行的獨立模組，沿用其核心原則：**規則沒命中就進「其他」並列入 pending 待審清單，不維護手工隱藏對照表。**

處理流程：`clean(raw)` → 拆出 `base`（形式）與 `loc`（產地）→ 分別正規化。

**清理（沿用 `genre_rules.clean` 的實作）**：全形括號轉半形、移除尾注與尾標點、補正不對稱括號、正規化括號前空白。

**形式判定**（`base` 部分）：

| 規則 | 結果 |
|---|---|
| `base` 含「動畫」 | `動畫` |
| `base` 含「紀錄」或「紀實」 | `紀錄片` |
| 其餘 | `劇情片` |

實際分佈：劇情片 87.8%、動畫 10.1%、紀錄片 2.1%。

**產地擷取**（`loc` 部分）：取括號內內容；無括號則取整串。合製取第一個國別（以 `/`、`,`、`、`、`&`、`＆`、`\` 分隔），沿用 `genre_rules` 既有的「合製-主國別」原則。

**別名表**（資料本身的髒寫法，必須清理）：

```
美劇→美  台劇→台  韓劇→韓  日劇→日  英劇→英  法劇→法  荷蘭劇→荷蘭
日本→日  西→西班牙  印→印度  義→義大利  俄→俄羅斯  澳洲→澳大利亞
```

「美劇」「台劇」等出現在電影表是爬蟲的錯標，不是真的劇集。

**語言分組**：

| 語言 | 涵蓋產地 | 色票 | 佔比 |
|---|---|---|---|
| 英語 | 美、英、澳大利亞、加拿大、紐西蘭、愛爾蘭、南非 | `#3568b0` | 53.9% |
| 其他語言 | 法、泰、印度、德、西班牙、波蘭、北歐、拉美… | `#9a9a94` | 13.9% |
| 台灣 | 台 | `#1f6f3f` | 11.2% |
| 日語 | 日 | `#c4527e` | 8.8% |
| 韓語 | 韓 | `#b3302b` | 6.1% |
| 華語 | 中、港、新加坡、馬來西亞 | `#b07d10` | 6.1% |

佔比是**榜位天數**（即日榜 16,991 筆列的分佈），不是部數。兩者不同：一部撐 269 天的片佔 269 個榜位。驗收時以此定義比對。

六色直接取自 `GENRE_COLORS` 既有的已驗證色（台劇綠、陸劇琥珀、韓劇紅、日劇粉、美劇藍、其他灰），不需重新驗證色盲可辨性與對紙白底對比。

**未命中處理**：產地不在對照表內 → `其他語言`，並將原始寫法寫入 pending 清單輸出到 console，比照 `genre_rules` 的既有行為。`origin` 欄位仍保留清理後的原始國別字串（如 `波蘭`、`泰`），供 tooltip 與未來的細粒度篩選使用。

### 2. 片名的語言歸屬：多數決

77 個片名在不同列被標成不同類型。規則：**以該片名出現次數最多的原始類型決定其語言與形式；平手時取最早出現的那筆。** 一部電影的語言在整份資料中唯一，不隨列變動。

衝突清單須輸出到 console 供人工檢視（格式比照 pending 清單），但不阻斷產出。

### 3. 積分

沿用來源表的「積分」欄（第 1 名 10 分 … 第 10 名 1 分）。若該欄為空，以 `11 - rank` 補。與劇集管線的既有處理一致。

### 4. 缺漏與不足 10 筆

- **缺漏日不補**：`dailyBoard` 只收錄實際存在的日期。前端據此讓折線在缺漏處中斷。
- **不足 10 筆的日期照實收錄**，不補空位。
- `meta.coverage` 逐年記錄實際天數與缺漏天數，供前端顯示覆蓋率提示。

### 5. 輸出：`public/data/movies.json`

```jsonc
{
  "meta": {
    "generatedAt": "2026-08-14T...",
    "dataThrough": "2026-08-05",
    "coverage": [
      { "year": "2021", "haveDays": 169, "missingDays": 102 },
      { "year": "2022", "haveDays": 331, "missingDays": 34 }
      // …
    ]
  },
  "movies": {
    "雙囍": {
      "language": "台灣",
      "format": "劇情片",
      "origin": "台",
      "isNetflixOriginal": false,
      "firstDate": "2026-06-11",
      "lastDate": "2026-08-05",
      "daysOnChart": 56,
      "bestRank": 1,
      "avgRank": 6.2,
      "totalScore": 445
    }
  },
  "dailyBoard": [
    { "date": "2026-08-05", "entries": [ { "rank": 1, "title": "劇場版「鬼滅之刃」…" } ] }
  ],
  "weeklyRankings": [
    { "weekNumber": 1, "dateRange": "2026-08-03 ~ 2026-08-09", "rankings": [ /* … */ ] }
  ]
}
```

**檔案只存原始事實，不存任何可推導的聚合。** `dailyBoard` 是唯一的每日資料來源，`weeklyRankings` 是唯一的每週資料來源；積分總排行、季／月／週的期間排行、每片的名次序列，全部由前端在 `src/utils/movieTransforms.ts` 以純函式衍生，比照既有 `dataTransforms.ts` 的作法並以 `useMemo` 快取。

這與劇集的 `rankings.json` 不同 —— 後者存了 `dailyOverallRankings`、`dailyOverallByQuarter`、`dailyOverallByWeek` 三份預先聚合。那些是既有包袱，不在本次重構範圍，但新檔案不重蹈覆轍：同一份資料存兩遍必然會不同步。

`movies` 是例外，它必須留在檔案裡 —— 語言歸屬的多數決是管線的判斷結果，不是前端能推導的事實。

**體積預算**：17k 筆日榜項目，估計 600KB–900KB。若超過 1MB，改用字串池（`titles: string[]` + `entries` 存索引）壓縮，可省約一半。此優化在超過門檻前不做。

### 6. Schema validator

比照既有作法，在 `generate_schema_validator` 加入電影型別的樣本，涵蓋 json 中實際存在的三種結構：`MovieAttributes`、`MovieDailyBoard`、`MovieWeeklyWeek`。衍生型別（`MovieOverallEntry`）不進驗證器 —— 它不存在於檔案中，由 TypeScript 編譯期把關。

---

## 型別設計（`src/types/index.ts`）

```typescript
export type MovieLanguage = '英語' | '其他語言' | '台灣' | '日語' | '韓語' | '華語'
export type MovieFormat = '劇情片' | '動畫' | '紀錄片'

export interface MovieAttributes {
  language: MovieLanguage
  format: MovieFormat
  origin: string            // 清理後的原始國別，如「波蘭」「泰」
  isNetflixOriginal: boolean
  firstDate: string         // "YYYY-MM-DD"
  lastDate: string
  daysOnChart: number
  bestRank: number
  avgRank: number
  totalScore: number
}

export interface MovieDailyBoard {
  date: string
  entries: { rank: number; title: string }[]
}

export interface MovieWeeklyItem {
  rank: number
  title: string
  score: number
}

export interface MovieWeeklyWeek {
  weekNumber: number
  dateRange: string         // "YYYY-MM-DD ~ YYYY-MM-DD"
  rankings: MovieWeeklyItem[]
}

export interface MovieYearCoverage {
  year: string
  haveDays: number
  missingDays: number
}

export interface MoviesData {
  meta: { generatedAt: string; dataThrough: string; coverage: MovieYearCoverage[] }
  movies: Record<string, MovieAttributes>
  dailyBoard: MovieDailyBoard[]
  weeklyRankings: MovieWeeklyWeek[]
}
```

衍生型別（`movieTransforms.ts` 的回傳值，不出現在 json）：

```typescript
export interface MovieOverallEntry {
  rank: number
  title: string
  totalScore: number
  language: MovieLanguage
  format: MovieFormat
  isNetflixOriginal: boolean
  onChartCount: number      // 日榜榜單為天數，週榜榜單為週數
  avgRank: number
  bestRank: number
}
```

`onChartCount` 刻意不叫 `daysOnChart` —— 同一個欄位在兩種榜單下是不同單位，用中性名稱迫使呼叫端明確標示單位，避免週榜畫面出現「在榜 12 天」這種錯誤標籤。語言與形式在 `MovieAttributes` 已有，此處重複攜帶是為了讓排行榜元件不必二次查表。

---

## 前端設計

### 1. 狀態管理重構（先決條件）

`App.tsx` 目前有 20 個以上的 `useState` 平鋪在單一元件裡，`Sidebar` 的 props 介面已達 30 個欄位。再加一組電影狀態會失控。

**在動電影功能之前**，先把既有狀態抽成 hook：

- `src/hooks/useShowFilters.ts` — 既有的劇集篩選狀態（年份、季月週、類型、片源、走勢選片…），回傳一個物件
- `src/hooks/useMovieFilters.ts` — 電影篩選狀態（年份、季月週、語言、形式、片源）

`Sidebar` 改成接收兩個 filter 物件與當前 mode，而非 30 個獨立 prop。這是為了本次工作而做的必要整理，不是無關重構。

### 2. 頂層模式切換

```typescript
export type AppMode = 'shows' | 'movies'
```

位置在 `Sidebar` 最上方、分頁導覽之上，以 `SEGMENT_BTN` 呈現「影集／電影」，下方以 1px `RULE_STRONG` 與分頁導覽分隔。

切換行為：
- 各模式**保留自己的篩選狀態**，切回去時維持原樣
- `movies.json` 首次切到電影模式才 fetch，之後快取在 state
- 載入中沿用現有的「載入資料中…」樣式，只換檔名文字

### 3. 年份選項隨榜單類型變動

因為週榜只到 2024，日榜到 2021，年份選項必須動態：

| 榜單類型 | 年份選項 |
|---|---|
| 日榜 | 2021 / 2022 / 2023 / 2024 / 2025 / 2026 / 全部 |
| 週榜 | 2024 / 2025 / 2026 / 全部 |

**切換收斂規則**：若切換後目前選中的年份不在新選項中，收斂到新選項中「大於目前年份的最小者」；若無則取最大者。例如日榜 2022 切到週榜 → 2024。收斂發生時不另外提示，但季／月／週的下鑽選擇一併清空（比照既有 `handleYearChange` 的行為）。

### 4. 覆蓋率提示

當所選期間的資料覆蓋率低於 90%，在該區塊標題右側以 `INK_MUTED` 11px 顯示：

```
※ 資料涵蓋 169 / 271 天
```

使用專案既有的文字符號 `※`（見 CLAUDE.md 圖示系統），不加圖示。

### 5. 頁面組成（電影 · 總排行榜）

四個元件，兩列各二：

```
┌──────────────────────────────┬───────────────────┐
│ MovieTop20Chart      (60%)   │ MovieQuickLookup  │  上列 55%
│ 積分榜，語言色長條             │       (40%)       │
├──────────────────────────────┼───────────────────┤
│ MovieDailyBoard      (44%)   │ MovieRaceChart    │  下列 45%
│ 當日榜單 + 迷你走勢            │      (56%)        │
└──────────────────────────────┴───────────────────┘
```

上列與劇集頁對稱（基本查詢能力），下列是電影專屬的「當下」視角。

依 CLAUDE.md 規定，四支元件都放 `src/components/charts/`，檔名加 `Movie` 前綴。若第二階段元件數再增加，屆時再議是否開子目錄（連同 CLAUDE.md 一併更新）。

### 6. `MovieDailyBoard` — 當日榜單 + 迷你走勢

表格，每列一部片：

| 欄 | 內容 |
|---|---|
| # | 名次，15px/700，`NUM` |
| 近 14 天走勢 | 78×20px SVG 迷你折線 |
| 片名 | 8px 語言色點 + 片名；獨家者加 11px `ACCENT` 的「獨家」標 |
| 語言 | 12px `INK_SECONDARY` |
| 在榜 | 天數，`NUM` |
| 升降 | 與前一天比：`↑n` / `↓n` / `—` / 新進榜標 `新`（`ACCENT`） |

迷你折線規格：
- 線寬 1.6px，`INK_SECONDARY`，`stroke-linejoin: round`
- Y 軸為名次，上方＝名次高（1 在頂），固定 1–10 不隨資料縮放，否則各列的形狀無法互相比較
- 端點（今天）實心圓 2.2px `INK`
- **前後都不在榜的孤立單日必須補一個 1.6px 圓點** —— 單點的 SVG path 不會渲染任何東西，不補就會出現空白的走勢欄
- 期間內才進榜者，於進榜日畫一條 1px `RULE_STRONG` 垂直線
- 缺漏日與掉出榜的日子一律斷線，不連接

表格沿用 CLAUDE.md 的排行榜規範：`PAPER_RAISED` 表頭、1px `RULE` 列間隔、`PAPER_RAISED` hover。

### 7. `MovieRaceChart` — 近 14 天名次競逐

- X 軸日期（14 天），Y 軸名次 1–10 反轉
- **納入這 14 天內上榜過的所有電影**，不只今天在榜的
- 今天仍在榜：2px 語言色實線，右端直接標片名與在榜天數
- 今天已掉出：1.2px `RULE_STRONG` 灰線、透明度 0.7、不標名 —— 這些是被擠下去的競爭者，少了它們就只剩贏家
- 線中斷代表那幾天掉出 Top 10；缺漏日同樣中斷
- 右端標籤採貪婪防重疊：由名次高者依序排放，與已放置標籤距離小於 13px 時往下推
- 依 CLAUDE.md，`isAnimationActive={false}`；格線只畫水平（垂直於閱讀方向）；不畫圖表外框
- 因為片名直接標在線端，**不畫圖例**

技術選型：純 SVG 手繪，不引入新套件。Recharts 的 `LineChart` 無法乾淨處理「同一張圖上兩種線樣式 + 端點標籤防重疊」，硬套會比手寫更複雜。這符合 CLAUDE.md「不得再安裝圖表套件」的規定。

### 8. `MovieTop20Chart` 與 `MovieQuickLookup`

比照既有 `Top20Chart` / `QuickLookup` 的結構與互動（選取列以 `ACCENT_WASH` + 2px 左框標示，兩者以 `selectedMovie` 連動），欄位換成電影的：語言、形式、在榜天數、最佳名次、總積分。長條 `barSize` 14、`radius` ≤ 2、值標在長條末端。

### 9. Sidebar 電影模式的篩選群組

| 群組 | 控制項 |
|---|---|
| 榜單類型 | 週榜／日榜（`SEGMENT_BTN`） |
| 時間範圍 | 年 → 季 → 月 → 週 下鑽，沿用既有階層樣式 |
| 語言篩選 | 六個 `GENRE_TOGGLE`，前置 `DOT` 為語言色 |
| 形式 | 全部／劇情片／動畫／紀錄片（`SEGMENT_BTN`） |
| 片源 | 僅 Netflix 獨家（`GENRE_TOGGLE` + `DOT(ACCENT)`） |

**沒有「上架方式」群組** —— 電影不適用。

### 10. 常數（`src/constants/languages.ts`，新增）

```typescript
export const LANGUAGE_COLORS: Record<MovieLanguage, string>
export const LANGUAGE_LABELS: MovieLanguage[]   // 固定順序，永不依數值重排
export const FORMAT_LABELS: MovieFormat[]
```

固定順序即圖例與堆疊順序，比照 `GENRE_LABELS` 的既有約定。

---

## 邊界情況

| 情況 | 處理 |
|---|---|
| 缺漏日（247 天） | 不內插；折線中斷；覆蓋率低於 90% 時顯示 `※` 提示 |
| 單日榜不足 10 筆（25 天） | 照實呈現，不補空位 |
| 孤立單日在榜 | 迷你走勢與競逐圖都補圓點，否則畫不出來 |
| 同片名類型不一致（77 筆） | 多數決；平手取最早出現者；衝突清單輸出 console |
| 同名不同片（如「蜘蛛人 (2002)」） | 片名已含年份區隔，視為不同實體，不特別處理 |
| 最新一日無資料 | 「當日榜單」以 `dailyBoard` 的最後一筆為準，標題顯示該日期，不假設是今天 |
| 選取的電影不在當前篩選結果中 | 沿用既有作法，清除選取 |
| 週榜模式下選了日榜才有的年份 | 依收斂規則調整（見前述） |
| `movies.json` 載入失敗 | 沿用既有的靜默降級，顯示空狀態，不阻斷劇集模式 |

---

## 驗收條件

1. `python scripts/convert_excel.py` 產出 `public/data/movies.json`，且 console 列出 pending 類型清單與 77 筆片名衝突清單
2. `npm run build` 通過（TypeScript strict，`noUnusedLocals` / `noUnusedParameters`）
3. 開發模式下 schema validator 對 `movies.json` 無警告
4. 六種語言的佔比與規格表一致（英語 53.9%、其他語言 13.9%、台灣 11.2%、日語 8.8%、韓語 6.1%、華語 6.1%），誤差在四捨五入範圍內
5. 切換影集／電影模式時，各自的篩選狀態保留
6. 日榜切週榜時年份依收斂規則調整，且不出現空白畫面
7. 2021 年（缺 102 天）的競逐圖在缺漏處確實斷線，未出現橫跨缺口的直線
8. 在榜 1 天的電影（如「驚天凍地」）在迷你走勢欄可見一個圓點，非空白
9. 全站無新增 `className`、無新增 hex 色值、無新增 npm 套件

---

## 後續階段（不在本次範圍）

第一頁跑過真實資料後再評估：

- 續航力象限圖 + Netflix 獨家片單，組成「電影動態」第二頁
- 電影版的多片走勢比較（勾選數部片，X 軸對齊上架天數，比照既有 `RankTrendChart` 的模式）
- 劇集日榜比照開放至 2021
- 電影的類型／語言分佈分析頁
