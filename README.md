# Sprintly

一個以星期一開始、每週一個 sprint 的單人 PWA 待辦清單。桌機、平板與手機皆有 Material 3 自適應介面，支援清單／Kanban、拖曳、完整鍵盤操作、離線快取與清楚的逐項同步狀態。

## 快速開始

需要 Node.js 24+ 與 pnpm 11。

```bash
pnpm install
APP_PASSWORD=your-password pnpm dev
```

- 前端開發伺服器：http://localhost:5173
- Fastify API：http://localhost:3000
- 未設定 `APP_PASSWORD` 的非 production 開發環境，預設密碼為 `sprintly`。

首次啟動會建立 `data/sprintly.sqlite`。密碼使用 scrypt 加鹽雜湊後才寫入資料庫；若要更換既有工作區密碼，必須明確更新資料庫中的 `app_settings.password_hash` 或建立新的資料 volume，單純改環境變數不會覆蓋既有雜湊。

## Docker Compose

```bash
cp .env.example .env
# 編輯 .env，至少設定 APP_PASSWORD
docker compose up --build -d
```

開啟 http://localhost:3000。SQLite 保存在具名 volume `sprintly-data`。

## 鍵盤操作

- `N`：新增項目
- `/`：搜尋
- `1` / `2`：清單／Kanban
- `[` / `]`：上一個／下一個 sprint
- `←` / `→`：切換 sprint tab
- 項目上 `↑` / `↓`：移動焦點
- 項目上 `Enter`：編輯
- 項目上 `X`：完成／取消完成
- 拖曳把手上 `Space`：用鍵盤開始／放下拖曳
- `?`：快捷鍵說明

## 資料與排程規則

- 每個項目必屬於一個分類，系統內建不可缺少的「未分類」。
- `sprintStart` 永遠是星期一；`scheduledDate` 留白表示只排到整個 sprint。
- 第一次建立時，「預計日期」是指定日，或只指定 sprint 時的該週星期一。
- 項目最初只在 sprint 層級，之後第一次拉到同一個 sprint 的某一天時，「預計日期」會細化成該日。
- 之後跨 sprint 或日期移動保留「預計日期」，只更新「最後預計日期」。兩個欄位都能在編輯對話框手動修正。
- API 使用版本號避免較舊的瀏覽器分頁靜默覆蓋新資料。

## Monorepo

```text
apps/web       React + React Router + TanStack Query + Base UI + Vite PWA
apps/api       Fastify + node:sqlite
packages/shared 共享 Zod contract、型別與 sprint 日期規則
```

## 驗證

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm format:check
```
