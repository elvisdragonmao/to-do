# EM's To Do

以星期一為起點、每週一個 sprint 的單人 PWA 待辦清單。介面使用 Material Design 3 token 與 Base UI primitives，支援桌機、平板、手機、鍵盤、觸控與滑鼠。

## 功能

- Kanban View：`To Do`、`In Progress`、`Done`。
- 星期 View：`Inbox`、Monday 到 Sunday。
- Backlog：跨所有 sprint 顯示尚未進入 `Done` 的項目，並依分類整理。
- 垂直 sprint pager：只有項目看板上下連續滾動，週與週之間保留 16px gap；慢滑時逐週停靠，高速滑動會保留原生慣性並跨越多週，放開後再用 scroll snap 對齊；日期列、View 控制與工具列固定在 viewport。
- 右側固定月份行事曆：瀏覽器決定下一個 snap target 時，同一根週選取 bar 就會以 `translateY` 同步移動；整週完成時顯示冰藍狀態色。
- 整張卡片拖曳：拖曳期間 sprint pager 會鎖在目前週；浮空卡片下方只保留真正的放置空位，也能直接拖到小日曆的日期，跨 sprint 安排工作日。
- 卡片原位編輯：標題、描述、狀態、緊急程度、分類、時數與日期直接轉為 input/select，不開啟放大 dialog；空描述不佔版面，從標題按 `Enter` 進入描述、按 `Cmd`/`Ctrl` + `Enter` 一次儲存文字欄位。
- 描述內的 `http://` 或 `https://` 網址可直接開啟。
- 分類可由右鍵或長按選單修改顏色。
- 搜尋結果會自動捲到第一筆符合項目，並降低其他卡片的不透明度。
- optimistic update、逐卡同步 shimmer/spinner、離線排隊與錯誤回復。
- 單一密碼登入，沒有註冊流程。

## 資料模型

每個項目一定屬於一個分類；新資料庫會建立「未分類」。項目包含：

- 標題與 description。
- 建立日期、更新日期。
- 所屬 sprint 與目前預計工作日期；未指定日期時表示排在整個 sprint。
- 初始預計工作日期與最後預計工作日期。
- 分類、緊急程度、預計花費時間（小時，可有小數）。
- Deadline。
- 狀態與完成日期。
- 排序值與 optimistic concurrency version。

排程規則：

- `sprintStart` 永遠是星期一。
- 建立在 sprint 層級時，初始與最後預計工作日期先使用該週星期一。
- 第一次從該 sprint 拉到其中一天時，初始預計工作日期會細化為該日。
- 之後移到其他 sprint 或其他日期時，保留初始預計工作日期，只更新最後預計工作日期。
- 初始與最後預計工作日期都能直接手動修正。
- 第一次進入 `Done` 時由後端寫入完成日期；離開 `Done` 時清除。完成日期也能手動修正。

## 鍵盤操作

| 快捷鍵             | 行為                                         |
| ------------------ | -------------------------------------------- |
| `N`                | 開始新增項目並顯示數字目標                   |
| `/`                | 搜尋項目                                     |
| `1`                | Kanban View                                  |
| `2`                | 星期 View                                    |
| `[` / `]`          | 上一個／下一個 sprint，保留 scroll-snap 動畫 |
| 方向鍵             | 依畫面幾何位置選擇項目                       |
| `Cmd`/`Ctrl` + `/` | 快捷鍵列表                                   |
| `Esc`              | 關閉 dialog、側欄、數字目標或快速新增        |

按 `N` 後，數字優先用來選擇新增目標：

- Kanban View：`1` To Do、`2` In Progress、`3` Done、`4` 到 `9` 為前六個分類。
- 星期 View：`0` Inbox、`1` Monday、`2` Tuesday，依序到 `7` Sunday。

快速新增欄位依序為標題、預計時數、Deadline。範例：

```text
N → 1 → Study Physics → Tab → 1.5 → Tab → 20260830 → Enter
```

若要同時加入描述，在標題欄按 `Enter` 會展開並聚焦描述欄；完成後按 `Cmd`/`Ctrl` + `Enter` 建立項目。描述留白時不會顯示空白列。

## 架構

```text
apps/
  web/                 React、React Router、TanStack Query、Base UI、dnd-kit、Lucide、Vite PWA
    src/features/      依 auth、categories、workspace 功能分區
    src/styles/        Material 3 tokens、base、components、auth、workspace
  api/                 Fastify、node:sqlite、cookie session、scrypt 密碼雜湊
packages/
  shared/              共用 Zod contracts、TypeScript types、sprint 日期與排程規則
```

TanStack Query 擁有所有 server state。任務與分類 mutation 使用 optimistic cache update；成功、失敗與離線暫停狀態都由 mutation state 映射回個別卡片。前端 route 只負責 sprint URL 與 view shell，排程規則集中在 shared package 與 workspace model。

## 本機開發

需要 Node.js 24+ 與 pnpm 11。

```bash
pnpm install
APP_PASSWORD=your-password pnpm dev
```

- Web：http://localhost:5173
- API：http://localhost:3000
- 非 production 且未設定 `APP_PASSWORD` 時，開發密碼為 `em-to-do`。
- 預設 SQLite 路徑為 `data/em-to-do.sqlite`。

首次啟動只把經過 scrypt 加鹽雜湊的密碼寫入 `app_settings`。之後修改 `APP_PASSWORD` 不會覆寫現有資料庫的密碼；要重建開發環境可刪除未上線的開發資料庫或 Docker volume。

目前專案尚未進 production，資料表以最新 baseline 直接建立，不提供舊開發資料庫的 schema 相容遷移。

## Docker Compose

```bash
cp .env.example .env
# 編輯 .env 的 APP_PASSWORD
docker compose up --build -d
```

開啟 http://localhost:3000。SQLite 儲存在 `em-to-do-data` named volume。

## PWA 與離線行為

- Production build 會產生 manifest、service worker、一般圖示與 maskable 圖示。
- App shell 預快取；API 維持 Network Only，避免 service worker 回傳過期寫入結果。
- 最近成功取得的 session、分類與 sprint 任務會保存於 TanStack Query localStorage persister，冷啟動離線時仍可顯示。
- 離線 mutation 會暫停並在卡片顯示「待同步」；恢復網路後繼續執行。

## 驗證

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm format:check
docker compose config
```
