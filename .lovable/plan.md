# 完全重置《故事接龍》+ AI 自動接龍

## 範圍
- 清空所有故事相關資料表（保留 profiles 同 auth.users）
- 重新設計簡化嘅 schema
- 重寫前端（index / new / story 三頁 + auth）
- 加入 AI 自動接龍：15 分鐘無人接 → AI 接一段，直到第 50 段

## 一、資料庫重建

### 刪除 + 重建
DROP 以下 table：`stories`, `story_segments`, `segment_likes`, `story_dictionary`, `story_recaps`

### 新 schema
**stories**
- id, title, opening, genre, cover_emoji
- created_by (uuid)
- created_at
- max_segments (int, default 50)
- last_activity_at (timestamptz, default now) — 用嚟判斷 15 分鐘無人接

**story_segments**
- id, story_id, position, content
- author_id (uuid, nullable — null = AI 寫嘅)
- is_ai (boolean, default false)
- created_at

**segment_likes**
- id, segment_id, user_id, created_at

### Trigger
新 segment INSERT 後自動 UPDATE `stories.last_activity_at = now()`

### RLS
- stories / segments / likes：所有人可讀
- 登入用戶可建立
- 作者可刪除自己嘅
- AI 接龍由 service role 寫入（繞過 RLS）

## 二、AI 自動接龍

### Server route：`/api/public/hooks/ai-continue`
- 由 pg_cron 每 5 分鐘 call 一次
- 揾出符合條件嘅故事：`now() - last_activity_at > interval '15 minutes'` AND segment 數 < `max_segments` AND 至少有 1 個用戶寫過
- 對每個故事：
  - 攞最近 5 段內容
  - 用 Lovable AI（google/gemini-3-flash-preview）生成下一段（80–200 字，廣東話）
  - 用 supabaseAdmin 插入 segment（is_ai=true, author_id=null）
- 用 `apikey` header 驗證

### pg_cron
每 5 分鐘 trigger 一次 `/api/public/hooks/ai-continue`

## 三、前端重寫

```text
src/routes/
├── __root.tsx        ── 保留現有 shell
├── index.tsx         ── 故事列表（首頁）
├── new.tsx           ── 新故事
├── auth.tsx          ── 登入 / 註冊
└── story.$storyId.tsx ── 讀 + 寫（合二為一，乾淨）
```

刪除：`story.$storyId_.write.tsx`, `FocusIntro`, `WorldCard`, `SpellcheckEditor`, `StoryRecap`, `recap.functions.ts`, `dictionary.functions.ts`, `spellcheck.ts`, `autocorrect.ts`

### story.$storyId.tsx 設計
- 標題 / 開場 / 所有段落（按順序）
- AI 寫嘅段落用紫色 badge「AI 接續」標示
- 段落 like 掣
- 底部 compose box（限 30–300 字，登入後可用）
- 顯示「第 X / 50 段」進度
- 50 段後顯示「故事完結」

## 四、設計

保留現有暗色 cinema 風格（src/styles.css 已設好），但簡化頁面。Primary：紫 / 琥珀。

## 後續步驟
1. 跑 migration（destructive，會清資料）
2. 寫 server route + functions
3. 重寫 routes
4. 設定 pg_cron
5. 驗證