# 電影頁設計規格

**日期：** 2026-08-14
**建議分支：** `feat/movie-page`
**影響範圍：**
新增 — `scripts/language_rules.py`、`src/constants/languages.ts`、`src/utils/boardTransforms.ts`、`src/hooks/{useTimeFilters,useShowFilters,useMovieFilters}.ts`、`src/components/charts/Movie*.tsx`（四支）
修改 — `scripts/convert_excel.py`、`src/types/index.ts`、`src/App.tsx`、`src/components/layout/Sidebar.tsx`
刪除 — `scripts/excel-to-rankings.cjs`、`package.json` 的 `xlsx` 依賴、`.claude/settings.local.json` 中對應的兩條 Bash 權限

---

## 背景

爬蟲從 2021-04 起就在抓 Netflix 台灣的電影榜，資料完整躺在 `爬蟲臉書/output/export.xlsx` 的兩張工作表裡，但儀表板從未使用 —— `convert_excel.py` 的檔頭註解直接寫著「Netflix 每週電影排名 — 電影週榜（目前未使用）」。

| 工作表 | 筆數 | 涵蓋範圍 |
|---|---|---|
| `Netflix 每週電影排名` | 1,699（170 週） | 2022-01 ～ 2026-07 |
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
3. **75 個片名的「類型」欄前後不一致**，例如「關於我和鬼變成家人的那件事」同時被標成 `台` 與 `美`、「露西」被標成 `美` 與 `法`。

4. **週榜在 2025 之後嚴重殘缺**，而且這是電影獨有的問題：

   | 年 | 2022 | 2023 | 2024 | 2025 | 2026 |
   |---|---|---|---|---|---|
   | 電影週榜 | 48 週 | 38 週 | 52 週 | **15 週** | **17 週** |
   | 劇集週榜 | 48 週 | 38 週 | 53 週 | 52 週 | 28 週 |

   同一份爬蟲、同一段期間，劇集週榜 2025 有 52 週而電影只有 15 週。所以這不是爬蟲斷線，是電影週榜本身沒被完整發布或收錄。後果是：使用者切到週榜看 2025，會拿到一個用 15 週算出來的積分榜 —— 這個榜本身沒錯，但若不告知涵蓋範圍就會被誤讀成全年。

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
| 時間範圍 | 日榜開放至 2021，週榜至 2022（各自依實際資料決定） | 資料既然有就該用；之後劇集也會比照開放 |
| 覆蓋率提示 | 日榜與週榜**都要**顯示 | 電影週榜 2025 只有 15 週，不提示就會被誤讀成全年 |
| 缺漏日 | 一律不內插，線在缺漏處中斷；顯示實際覆蓋率 | 內插會畫出不存在的資料 |
| 資料檔 | 新開 `public/data/movies.json` | 不動 `rankings.json`；切到電影模式才 fetch |
| 管線歸屬 | 新增獨立的 `convert_movies.py`（不動 `convert_excel.py`），刪除重複的 `excel-to-rankings.cjs` | 兩份管線寫同一個輸出檔，跑錯就讓資料退版 |
| 與劇集的關係 | 結構泛型化，作為劇集之後收斂的目標形狀 | 電影自成一套的話，劇集重構時就得再寫第三套 |

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

75 個片名在不同列被標成不同類型。規則：**以該片名出現次數最多的原始類型決定其語言與形式；平手時取最早出現的那筆。** 一部電影的語言在整份資料中唯一，不隨列變動。

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
  "entities": {
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

**檔案只存原始事實，不存任何可推導的聚合。** `dailyBoard` 是唯一的每日資料來源，`weeklyRankings` 是唯一的每週資料來源；積分總排行、季／月／週的期間排行、每片的名次序列，全部由 `src/utils/boardTransforms.ts` 的純函式衍生，以 `useMemo` 快取。

`entities` 是唯一的例外，它必須留在檔案裡 —— 語言歸屬的多數決是管線的判斷結果，不是前端能推導的事實。

劇集的 `rankings.json` 目前存了 `dailyOverallRankings`、`dailyOverallByQuarter`、`dailyOverallByWeek` 三份預先聚合，是同一份資料存四遍。本規格的結構就是劇集之後要收斂過去的目標形狀 —— 見〈與劇集程式的收斂路徑〉。

**體積**：實測原始 1,101 KB、**gzip 後 109 KB**（`dailyBoard` 708 KB、`entities` 296 KB、`weeklyRankings` 96 KB）。

門檻訂在 gzip 後的大小，因為那才是使用者實際付出的成本 —— 原始位元組數對靜態網站沒有意義。作為對照，專案現在已經在傳的 `rankings.json` 是原始 2,221 KB／gzip 134 KB，也就是電影檔比既有檔案**更輕**。

因此**不實作字串池壓縮**。它能省下的是原始體積，而原始體積不是問題；代價卻是前端要在載入後還原索引，把一個沒有症狀的問題換成真實的複雜度。若日後 gzip 後超過 300 KB 再重新評估。

### 6. Schema validator

比照既有作法，在 `generate_schema_validator` 加入電影型別的樣本，涵蓋 json 中實際存在的三種結構：`MovieAttributes`、`DailyBoard`、`WeeklyBoard`。衍生型別（`MovieOverallEntry`）不進驗證器 —— 它不存在於檔案中，由 TypeScript 編譯期把關。

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

export interface DailyBoard {
  date: string
  entries: { rank: number; title: string }[]
}

export interface WeeklyBoardItem {
  rank: number
  title: string
  score: number
}

export interface WeeklyBoard {
  weekNumber: number
  dateRange: string         // "YYYY-MM-DD ~ YYYY-MM-DD"
  rankings: WeeklyBoardItem[]
}

export interface YearCoverage {
  year: string
  haveDays: number
  missingDays: number
}
```

資料集本身**設計成泛型**，因為劇集之後要收斂到同一個形狀（見〈與劇集程式的收斂路徑〉）。電影只是第一個使用者，不是特例：

```typescript
export interface BoardDataset<TAttrs> {
  meta: { generatedAt: string; dataThrough: string; coverage: YearCoverage[] }
  entities: Record<string, TAttrs>      // 片名／劇名 → 屬性
  dailyBoard: DailyBoard[]
  weeklyRankings: WeeklyBoard[]
}

export type MoviesData = BoardDataset<MovieAttributes>
```

`entities` 刻意不叫 `movies` —— 同一個欄位之後要裝劇集屬性。`dailyBoard` 與 `weeklyRankings` 兩種榜單結構對電影和劇集完全相同（都是「某日／某週的名次與片名」），因此不泛型化。

衍生型別（`boardTransforms.ts` 的回傳值，不出現在 json）：

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

**在動電影功能之前**，先抽出三個 hook：

```
useTimeFilters()    ← 年 / 季 / 月 / 週下鑽 + 榜單類型（週榜／日榜）
                       兩種模式完全共用，含年份收斂規則
useShowFilters()    ← useTimeFilters() + 類型、上架方式、片源、走勢選片
useMovieFilters()   ← useTimeFilters() + 語言、形式、片源
```

時間下鑽是兩者一模一樣的邏輯（現在寫在 `App.tsx` 與 `Sidebar` 裡各一份），必須共用 —— 否則之後修一個下鑽的 bug 要改兩個地方。模式專屬的只有各自的分類篩選。

`Sidebar` 改成接收「當前 mode + 該 mode 的 filter 物件」，而非 30 個獨立 prop。這是本次工作的必要整理，不是無關重構。

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

兩種榜單的資料涵蓋年份不同（日榜 2021 起、週榜 2022 起），年份選項必須動態：

| 榜單類型 | 年份選項 |
|---|---|
| 日榜 | 2021 / 2022 / 2023 / 2024 / 2025 / 2026 / 全部 |
| 週榜 | 2022 / 2023 / 2024 / 2025 / 2026 / 全部 |

**年份選項一律從實際資料推導，不寫死。** 上表是目前資料的樣子，不是常數 —— 爬蟲補上新資料後選項要自動跟著變。

**切換收斂規則**：若切換後目前選中的年份不在新選項中，收斂到新選項中「大於目前年份的最小者」；若無則取最大者。例如日榜 2021 切到週榜 → 2022。收斂發生時不另外提示，但季／月／週的下鑽選擇一併清空（比照既有 `handleYearChange` 的行為）。

### 4. 覆蓋率提示

當所選期間的資料覆蓋率低於 90%，在該區塊標題右側以 `INK_MUTED` 11px 顯示：

```
日榜　※ 資料涵蓋 169 / 271 天
週榜　※ 資料涵蓋 15 / 52 週
```

使用專案既有的文字符號 `※`（見 CLAUDE.md 圖示系統），不加圖示。

**兩種榜單都要提示。** 日榜的缺漏集中在 2021–2023（最多缺 38%），週榜的缺漏集中在 2025–2026（2025 只有 15/52 週，缺 71%）—— 週榜其實是問題比較嚴重的那個。分母的算法：日榜是「該期間首末日之間的天數」，週榜是「該期間應有的週數」（以該年 52 週為基準，跨年或部分期間依比例計算）。

### 5. 頁面組成（電影 · 總排行榜）

四個元件，兩列各二：

```
┌──────────────────────────────┬───────────────────┐
│ MovieTop20Chart      (60%)   │ MovieQuickLookup  │  上列 55%
│ 積分榜，語言色長條             │       (40%)       │
├──────────────────────────────┼───────────────────┤
│ MovieBoardTable      (44%)   │ MovieRaceChart    │  下列 45%
│ 當日榜單 + 迷你走勢            │      (56%)        │
└──────────────────────────────┴───────────────────┘
```

上列與劇集頁對稱（基本查詢能力），下列是電影專屬的「當下」視角。

依 CLAUDE.md 規定，四支元件都放 `src/components/charts/`，檔名加 `Movie` 前綴。若第二階段元件數再增加，屆時再議是否開子目錄（連同 CLAUDE.md 一併更新）。

### 6. `MovieBoardTable` — 當日榜單 + 迷你走勢

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
| 同片名類型不一致（75 筆） | 多數決；平手取最早出現者；衝突清單輸出 console |
| 同名不同片（如「蜘蛛人 (2002)」） | 片名已含年份區隔，視為不同實體，不特別處理 |
| 最新一日無資料 | 「當日榜單」以 `dailyBoard` 的最後一筆為準，標題顯示該日期，不假設是今天 |
| 選取的電影不在當前篩選結果中 | 沿用既有作法，清除選取 |
| 週榜模式下選了日榜才有的年份 | 依收斂規則調整（見前述） |
| `movies.json` 載入失敗 | 沿用既有的靜默降級，顯示空狀態，不阻斷劇集模式 |

---

## 驗收條件

1. `python scripts/convert_movies.py` 產出 `public/data/movies.json`，且 console 列出 pending 類型清單與 75 筆片名衝突清單
2. `npm run build` 通過（TypeScript strict，`noUnusedLocals` / `noUnusedParameters`）
3. 開發模式下 schema validator 對 `movies.json` 無警告
4. **2021–2025（已封閉期間）**的六種語言佔比為 英語 53.3%、其他語言 14.5%、台灣 10.4%、日語 9.2%、華語 6.7%、韓語 6.0%，誤差 0.3 個百分點內

   **刻意不鎖全期佔比。** 爬蟲每次更新都會加入新的日子，全期佔比必然跟著漂移；若拿它當驗收標準，每次更新都會失敗，而唯一的修法就是把期望值改成新輸出 —— 那等於每次都把這條驗收的意義刪掉一次。這件事在 2026-09 的資料更新時實際發生過。

   已封閉期間不同：2021–2025 已經結束，新資料只會加在 2026 之後，所以那段的佔比是固定的。它變動就只有一個原因 —— `language_rules` 的分類規則被改壞了，而那正是這條要守住的東西。已用突變測試驗證：把 `港 → 華語` 改成 `港 → 日語` 後，此條確實失敗。
5. 切換影集／電影模式時，各自的篩選狀態保留
6. 日榜切週榜時年份依收斂規則調整，且不出現空白畫面
7. 2021 年（缺 102 天）的競逐圖在缺漏處確實斷線，未出現橫跨缺口的直線
8. 在榜 1 天的電影（如「驚天凍地」）在迷你走勢欄可見一個圓點，非空白
9. 全站無新增 `className`、無新增 hex 色值、無新增 npm 套件
10. `scripts/excel-to-rankings.cjs` 已刪除，`npm ci && npm run build` 在移除 `xlsx` 依賴後仍通過
11. 劇集與電影的篩選狀態各自隔離在 hook 中（`useShowFilters` / `useMovieFilters`），`App.tsx` 不再平鋪 13 個劇集 `useState`

    **原本這條寫的是「時間下鑽只有一份，劇集與電影共用 `useTimeFilters`」，那是規格自身的矛盾，2026-09-24 驗收時修正。**

    兩邊的時間模型根本不同：劇集是 `selectedQuarter: string`（`'2026-Q1'`）、`selectedMonth: string`（`'2026-03'`）、`selectedDailyWeek: number`，還多了電影沒有的「週次」下鑽；電影是 `quarter: number | null`、`month: number | null`。要共用就得改劇集的資料形狀與 `Sidebar` 的推導邏輯 —— 那會改變劇集行為，與本規格「劇集圖表元件一律不動」的邊界衝突。

    真正的收斂列為後續階段（見〈與劇集程式的收斂路徑〉），屆時要連同劇集的時間模型一起改，不是單純抽 hook 就能達成。

---

## 與劇集程式的收斂路徑

本規格的每一項結構選擇，都是為了讓劇集之後**搬過來而不是重寫**。以下記錄目標形狀與差距，讓後續的劇集重構有依據。

### 共用而非複製

| 元件 | 本次建立 | 劇集現況 | 收斂方式 |
|---|---|---|---|
| 時間下鑽狀態 | `useTimeFilters()` | 狀態已收進 `useShowFilters()`，但推導邏輯仍在 `Sidebar.tsx` | 劇集的季／月／週改成與電影同一個資料形狀（`number` 而非 `'2026-Q1'` 字串），再改用同一個 hook。**這會改變劇集行為，不是單純抽 hook** |
| 榜單衍生函式 | `boardTransforms.ts`（泛型，吃 `DailyBoard[]`） | `dataTransforms.ts` 讀預聚合欄位 | 劇集資料改成 `DailyBoard[]` 後直接套用同一批函式 |
| 資料集型別 | `BoardDataset<TAttrs>` | `RankingsData`，欄位平鋪 | `RankingsData` 收斂為 `BoardDataset<ShowAttributes>` |
| 語言／類型常數 | `languages.ts` 的 `LANGUAGE_COLORS` + 固定順序 | `genres.ts` 同樣模式 | 兩者已同構，不需改動 |

**本次做到哪裡**：劇集的**狀態**改用 `useTimeFilters` / `useShowFilters`（這是兩種模式共用時間下鑽的前提，無法迴避）；劇集的**資料與圖表元件一律不動** —— 不改 `rankings.json`、不改 `convert_excel.py` 既有的劇集輸出、不改 `Top20Chart`／`TaiwanDramaChart`／`GenreDistribution`／`RankTrendChart`／`WeeklyGenreFlow`／`QuickLookup`。上表第二、三列是路線圖，不是本次工作項目。

### 劇集之後要拆掉的三份預聚合

`rankings.json` 的 `dailyOverallRankings`、`dailyOverallByQuarter`、`dailyOverallByWeek` 是同一份日榜資料的三種切法，三份都由 `convert_excel.py` 預先算好寫進檔案。問題有二：檔案膨脹；任何一個聚合邏輯改動都要重跑管線，前端無法自己修正。

收斂後劇集只需存 `dailyBoard`，三份聚合改由 `boardTransforms.ts` 衍生 —— 也就是本次電影已經在做的事。屆時 `getDailyOverallRankings()` 那組簽章會被泛型版本取代。

### 舊管線

`scripts/excel-to-rankings.cjs` 是 `convert_excel.py` 的重複實作，同樣讀 `export.xlsx`、同樣寫 `public/data/rankings.json`，但沒有類型正規化、也不產生 schema validator。兩份管線寫同一個輸出檔，跑錯一個就讓資料悄悄退版。

**本次一併刪除**，連同 `package.json` 中僅供它使用的 `xlsx` 依賴（`convert_excel.py` 走 Python 的 openpyxl）。

已確認的引用狀況：`package.json` scripts、`.github/workflows/`、README、任何 `.ts`／`.tsx` 皆無引用；唯一提及處是 `.claude/settings.local.json` 的兩條 Bash 執行權限（`scripts/excel-to-rankings.js` 與 `.cjs`），一併移除。

---

## 已知問題：「語言」維度實際上是「產地」

**2026-09-24 使用者實際操作後回報，已確認為設計層的錯誤，決定之後處理。**

來源資料的「類型」欄只有**產地國別**，沒有語言欄位。本規格在它上面建立了一套叫「語言」的六分類，等於用產地推論語言 —— 這個推論對合製片與跨國製作一律失效。

### 證據

其他語言共 2,357 列（13.5%）、259 部。逐列追查後：

| 成因 | 列數 | 佔其他語言 |
|---|---|---|
| 合製取到第一個國別，但成員含已知語系（`德/英/美` → 德） | 76 | 3% |
| 多數決把有標籤的片判進其他 | 3 部 | — |
| 原始標籤本來就是印度／法／泰／德／西班牙／波蘭… | 2,281 | 97% |

所以**解析邏輯沒有 bug**，2,281 列忠實反映了標籤。問題在標籤語義與欄位命名的落差。

最清楚的反例是**「露西」**：標籤 9 次「法」、2 次「美」，多數決判「法」→ 其他語言。但那是英語發音的片，只是法國出品。同類還有「域外營救」（德）、「磚牆謎攻」（德）、「劫後難逃」（波蘭 15 次、美 1 次）。

反過來說，「孟買女帝」（印度）、「金孫爆富攻略」（泰）、「西線無戰事」（德）、「山怪巨魔」（挪威）、「SISU」（芬蘭）確實就是非英語片 —— 多數情況沒有被錯置。

### 三個修法

**A. 正名，不動資料。** 把維度從「語言」改為「產地」，六格改為 `台灣／華語圈／韓國／日本／英語圈／其他`。零資料工作，立刻誠實。代價：「英語圈」實為美英澳加紐這個國家群而非語言；「露西」仍會落在「其他」。

**B. 補真正的語言資料。** 從 TMDB 之類的來源取每部片的原始語言（`original_language`）。這才真正解決「露西是英語片」。代價：要接外部 API、處理 1,455 部片的片名比對與對不上的情況 —— 是獨立的專案規模，不是一次修改。

**C. 只修合製那 76 列**（規則改成「合製中若含已知語系就優先取它」）。**不建議** —— 用一個更複雜的猜測去修 3% 的偏差，卻讓模型離真相更遠（憑什麼美國優先於德國？）。

### 附帶：資料不完整

日榜缺 247 天、電影週榜 2025 只有 15 週 —— 都是爬蟲來源就缺的。儀表板端只能誠實標示（覆蓋率提示已在做）。要補是回去補爬那些日期的貼文，屬爬蟲專案的工作。

---

## 後續階段（不在本次範圍）

第一頁跑過真實資料後再評估：

- 續航力象限圖 + Netflix 獨家片單，組成「電影動態」第二頁
- 電影版的多片走勢比較（勾選數部片，X 軸對齊上架天數，比照既有 `RankTrendChart` 的模式）
- 劇集日榜比照開放至 2021
- 電影的類型／語言分佈分析頁
