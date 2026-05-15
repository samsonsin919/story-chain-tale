
# 沉浸式續寫體驗 v2

把原本的「彈出 Drawer 寫作框」升級成一個專注的全螢幕創作空間，讓玩家一邊看故事、一邊寫，永遠不離開世界。

---

## 1. 新介面：`/story/$storyId/write` 沉浸寫作模式

不再用 modal drawer。按「接落去」會 push 一條新路由 `/story/$storyId/write`，全螢幕沉浸式版面。

**手機版（直向，主要場景）**
```text
┌─────────────────────────────┐
│ ← 返回    《九龍城寨2077》  │  頂列：返回 + 標題 + 設定齒輪
├─────────────────────────────┤
│  📌 30秒追劇 (AI 摘要)       │  可摺疊
├─────────────────────────────┤
│                             │
│  故事內容區（可捲動）        │  上半部 ~50vh
│  · 開場                     │  最近 5 段預設展開
│  · …                        │  舊段落淡化處理
│  · 第 N-1 段                │
│  · 第 N 段（最後一段，高亮）│  ←自動捲到底
│                             │
├─────────────────────────────┤  分隔光線
│  續寫輸入區（吸底）          │  下半部 ~45vh
│  [textarea，紅線錯字]        │
│  字數 / 自動修正 / 送出      │
└─────────────────────────────┘
   浮動世界觀卡 📖（右下角）
```

**桌面版**：左右分欄（左 60% 故事 / 右 40% 寫作），世界觀卡固定右側欄上方。

兩區可拖動分隔線（手機版用 swipe handle）。

---

## 2. 故事內容區：活著的時間線

- 自動捲到最新段落，新段落 fade-in
- 舊段落字色更淡、字級更小（漸進淡化），最近 3 段保持完整對比
- 段落 hover/tap 顯示「📌 釘住」按鈕——釘住的段落會永遠浮在內容區頂端，方便寫作時對照（例如釘住關鍵伏線）
- 頂部一條 sticky 「📌 30秒追劇」摺疊條，用現有 `StoryRecap` 的內容；點開展開最新 AI 摘要

---

## 3. 浮動世界觀資訊卡 📖

右下角小型 FAB（書本 icon），點擊展開為玻璃浮層。內容分四 tab：

- **世界** — 類型（懸疑/恐怖…）+ 故事題目 + 開場精華
- **角色** — 從段落自動抽取的人物名單（見 §6 字典）
- **大事** — 最近 5 個關鍵節點 = 最新 5 段第一句（短摘要）
- **規則** — 開場最後一段 + 字數規則 80–150 + 「不要劇透未發生」提醒

實作：手機版改為從底部滑上的 sheet（半透明，背景仍可見故事）。

---

## 4. 續寫前「聚焦模式」

進入 `/write` 路由時，先顯示一個 3 秒可跳過的 overlay：

```text
   ✦ 進入故事 ✦
   《九龍城寨2077》
   
   📌 你將接的是第 12 段
   📌 上一段：李霧消失喺地下街……（截前 60 字）
   📌 主要角色：李霧、阿修、賣面婆婆
   📌 最新事件：黑暗中傳來廣播
   
   [ 開始寫 →  (3) ]   [ 略過 ]
```

倒數結束或點擊後淡出，露出正式寫作介面。可在設定齒輪關閉。

「主要角色 / 最新事件」由 §6 字典 + 最後一段提取。

---

## 5. 紅線拼字檢查（取代強制 auto-correct）

把現有的 `autocorrect.ts` 從「自動改字」改成「建議式」：

- textarea 改成 `contentEditable` 包一層（保留純文字行為），或用 overlay 技巧：底層放 `<div>` 鋪同字體渲染、把錯字 wrap 成 `<span class="typo">` 加波浪紅線，上層放透明 `<textarea>`
- 偵測到 `EN`/`ZH` 字典命中或標點問題 → 標紅線
- Tap/click 紅線 → 顯示小 popover：「建議：因該 → 應該」「採用 / 忽略 / 加入字典」
- 不再自動 mutate 玩家輸入；保留現有「自動修正 開/關」toggle 但預設關，改名為「智能建議」
- 標點 `,, → ，` 之類仍可用「採用全部」一鍵套用

新檔案：`src/lib/spellcheck.ts`（從 `autocorrect.ts` 改寫，輸出 `Issue[] = { start, end, word, suggestion }`）+ `src/components/SpellcheckEditor.tsx`（textarea + overlay）。

---

## 6. 故事專屬字典（避免誤標）

新表 `story_dictionary`：

```text
story_dictionary
  id, story_id (FK), term (text), kind ('character'|'place'|'thing'|'word'), 
  added_by (uuid), created_at
  unique (story_id, term)
```

RLS：所有人可讀；登入用戶可 insert（任何人都能擴充宇宙詞典）；只有 `added_by` 可刪。

**自動填入**：每次 AI recap 觸發時（每 5 段），同一個 server function 順手抽取 3–8 個專有名詞回傳寫入字典。擴充 `recap.functions.ts`，prompt 多要一段 JSON `{ terms: [{term, kind}] }`。

**手動加入**：紅線 popover「加入字典」。

**用途**：拼字檢查時，先 match 字典 → 永不標紅。世界觀卡「角色」/「大事」tab 直接用字典資料。

---

## 7. 不影響的現有功能

- 接龍規則（80–150、不能連續兩段）、Realtime 同步、likes、分支、AI recap：全部維持。
- 分支按鈕仍可用，從寫作區頂列入口。
- `ComposeSegment.tsx` 變成 fallback / 桌面快寫場景，主要入口改為新路由。

---

## 技術細節

**新檔**
- `src/routes/story.$storyId.write.tsx` — 沉浸寫作頁
- `src/components/WorldCard.tsx` — 浮動世界觀卡
- `src/components/FocusIntro.tsx` — 聚焦模式 overlay
- `src/components/SpellcheckEditor.tsx` — textarea + 紅線 overlay + 建議 popover
- `src/components/StoryTimelineLive.tsx` — 寫作頁專用、自動捲底、釘段、淡化的時間線
- `src/lib/spellcheck.ts` — 取代 `autocorrect.ts` 的非破壞性版本（保留舊檔以免破壞 import）
- `src/lib/dictionary.functions.ts` — `extractTerms` server fn（呼叫 LLM 抽取）+ `addTerm` server fn

**改檔**
- `src/components/SegmentCard.tsx` — 新增 釘住 / 已釘 視覺
- `src/routes/story.$storyId.tsx` — 「接落去」按鈕改成 `<Link to="/story/$storyId/write">`
- `src/lib/recap.functions.ts` — recap 生成時順帶抽取詞典條目寫入

**Migration**（一條 SQL）
- 建 `story_dictionary` + 4 條 RLS policy + index `(story_id)`

**步驟**
1. 跑 migration 建字典表
2. 寫新路由 + 三大區塊（時間線 / 寫作 / 世界觀卡）
3. 寫 SpellcheckEditor 與字典 server fn
4. 改造 recap fn 加詞典抽取
5. 把現有 story 頁的「接落去」入口改路由
6. 在沉浸頁實機測試 400×727 viewport

完成後玩家就由「在 modal 打字」變成「進入一個活著的故事房間」。
