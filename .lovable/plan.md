# 午夜故事宇宙 — 改造計劃

你列出的需求非常完整，但一次過做完會變成一個失控的大改版。我建議分 **3 個階段**，每階段都係一個可用、可玩、可睇到效果嘅版本，逐步加深沉浸感同遊戲化。

---

## 階段 1（今次做）：視覺與核心體驗大改造

呢個階段重做「外殼」同最核心嘅接龍流程，令 app 一打開就有 Netflix × 互動小說 嘅感覺。

### 1.1 設計系統重寫（`src/styles.css`）
- 全部換成深色 OKLCH tokens：深黑底 `#0A0A0F`、炭灰卡片、霓虹藍 `#5B8DEF` accent、暗紫光暈 `#8B5CF6`、暖琥珀點綴
- 新增 tokens：`--glow-primary`、`--gradient-cinematic`、`--shadow-neon`、`--surface-glass`
- 字體換成有戲劇感嘅組合：標題用 `Cinzel` 或 `Fraunces`（電影感襯線），內文用 `Inter`，繁中用 `Noto Serif TC`
- 移除所有 `paper-card` / 米白色 / 手寫字風格

### 1.2 首頁重做（`src/routes/index.tsx`）
- **Hero**：全螢幕深色漸層 + 一個「特色故事」大卡片（標題、開場第一句、N 人正在接龍、類型 tag）
- **趨勢列**：橫向 scroll 嘅故事卡（Netflix row 風格），每張卡顯示標題、首句、接龍人數、🔥 熱門 / ✨ 新分支 標記
- **分類 chips**：懸疑 / 恐怖 / 戀愛 / 科幻 / 都市傳說
- 卡片 hover / tap 有發光動畫，rotate 0.4deg 嘅手寫風移除

### 1.3 故事頁重做（`src/routes/story.$storyId.tsx`）
- 卡片式時間線：每段接龍係獨立深色卡（作者頭像 placeholder、暱稱、相對時間、段落內容、❤ Like、🌿 開分支、💬 接龍 按鈕）
- 開場段加大字、襯線、發光首字
- 接龍輸入框：**80–150 字限制**，即時字數顯示，超出/不足都會變色提示
- 浮動 FAB：「接落去 ↓」mobile 一直浮喺底
- 懸疑式入場動畫（每段 fade-in + 微 slide）

### 1.4 Header / 導航
- 深色 sticky header，logo 換成「午夜故事宇宙」字樣
- mobile 底部 tab bar：🏠 探索 / 🔥 熱門 / ➕ 開故事 / 👤 我

### 1.5 Like 功能（最低限度遊戲化）
- 新增 `segment_likes` table（user_id, segment_id, RLS）
- 每段顯示 like 數，登入用戶可 toggle
- 首頁排序可選「熱門」= 過去 7 日 like 加權

**階段 1 交付後你會睇到**：完全唔同嘅深色電影感首頁、流暢嘅手機接龍體驗、每段可 like。

---

## 階段 2（下一輪）：分支宇宙 + AI 前情提要

- **分支系統**：`stories.parent_story_id` + `stories.branch_from_segment_id`，喺任何一段㩒「🌿 開分支」就 fork 出一條新時間線；故事頁顯示「呢個故事有 N 條平行宇宙」+ 簡單樹狀圖
- **AI 前情提要**：edge function 用 Lovable AI Gateway（`google/gemini-3-flash-preview`），每 5 段自動生成一段 Netflix-style recap，顯示喺故事頂
- **角色資料庫**：AI 從段落提取角色名 + 狀態，顯示喺側邊抽屜

## 階段 3（再下一輪）：限時模式 + 社群遊戲化

- 限時接龍房間（5/10 分鐘倒數，即時 realtime 推進）
- 徽章系統（劇情反轉大師、恐怖建築師…）+ streak
- 創作者排行榜、驚悚榜、反轉榜
- 推薦演算法

---

## 技術細節（階段 1）

**新檔案**
- `src/components/StoryCard.tsx` — 通用故事卡（hero / row / grid 三個 variant）
- `src/components/SegmentCard.tsx` — 接龍段卡片
- `src/components/MobileTabBar.tsx` — 底部 nav
- `src/components/ComposeSegment.tsx` — 接龍輸入（含字數限制、FAB 模式）
- `src/lib/genres.ts` — 類型常數 + 顏色

**修改**
- `src/styles.css` — 全部深色 tokens、字體、glow utilities
- `src/routes/__root.tsx` — 換背景、加 MobileTabBar
- `src/routes/index.tsx`、`src/routes/story.$storyId.tsx`、`src/routes/new.tsx`、`src/components/Header.tsx`

**Migration**
- `stories` 加 `genre text`、`cover_emoji text`、`is_featured bool`
- 新 `segment_likes` table + RLS
- 新增 SQL view 計算每個 story 嘅 like 總數同熱度

**約束**
- 接龍字數：DB CHECK 80–150（用 trigger 不用 CHECK constraint）
- Realtime 繼續用 segments；新加 likes 都開 realtime
- 移除舊 hero 圖；之後生成一張新嘅深色電影感封面

---

確認呢個分階段方向 OK 就開始做階段 1。如果想調整（例如想第一階段就一齊做分支系統，或者唔要 like），話我知。
