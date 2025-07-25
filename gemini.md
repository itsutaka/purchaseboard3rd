# 專案技術摘要 (gemini.md)

本文檔旨在為 AI 協作者提供對 "Purchaseboard" 專案的全面技術理解。

## 1. 專案概覽

本專案是一個 Firebase 多站點 (multi-site) 的 monorepo，管理著兩個主要的網站：

1.  **"bqpurchase" (採購板)**：一個動態的採購需求管理應用程式。
    *   **前端**：位於 `client/` 的 React 單頁應用程式 (SPA)，使用 Vite 進行建構。
    *   **後端**：位於 `functions/` 的 Node.js Express 應用程式，作為 Firebase Cloud Function 部署，提供 `/api` 路徑下的 RESTful API。

2.  **"bqgracechurch" (教會官網)**：一個靜態內容網站，原始碼主要位於 `bqgracechurchmainpage/`。

此結構允許在單一程式碼庫中同時管理一個複雜的 Web 應用和一個相關的靜態網站。

## 2. 關鍵技術棧

-   **平台**：Firebase (Hosting, Cloud Functions, Firestore, Authentication)
-   **前端**：
    -   框架：React 18
    -   建構工具：Vite
    -   HTTP 客戶端：Axios
    -   樣式：Tailwind CSS
    -   PDF 產生：`jspdf`, `jspdf-autotable`
    -   圖示：`lucide-react`
-   **後端**：
    -   環境：Node.js (v22)
    -   框架：Express.js
    -   Firebase SDK：`firebase-admin`
-   **套件管理**：npm (專案根目錄的 `package.json` 管理大部分相依性)
-   **語言**：JavaScript (前端和後端均使用 ES Modules 語法)

## 3. 資料夾結構
├── client/ # "bqpurchase" React 前端原始碼
│ ├── App.jsx
│ ├── PurchaseRequestBoard.jsx # 核心：採購板主介面
│ ├── TithingTaskList.jsx # 核心：什一奉獻任務列表
│ ├── DedicationEntryForm.jsx # 核心：奉獻登錄表單
│ ├── AuthContext.jsx # 狀態：身份驗證上下文
│ ├── pdfGenerator.js # 工具：PDF 傳票產生器
│ └── ...
├── functions/ # "bqpurchase" 後端 API (Firebase Cloud Functions)
│ ├── index.js # API 進入點
│ ├── package.json
│ └── ...
├── bqgracechurchmainpage/ # "bqgracechurch" 靜態網站內容
├── public/ # Vite 的公共資源，如字體、圖片
├── firebase.json # 核心：Firebase 專案設定 (託管、重寫規則)
├── firestore.rules # Firestore 安全性規則
├── tailwind.config.js # Tailwind CSS 設定檔
├── package.json # 根目錄的 package.json，管理整個專案
└── vite.config.js # Vite 設定檔


## 4. 前端架構 (`client/`)

前端是一個功能豐富的 React 應用程式。
-   **進入點**：`client/main.jsx` 初始化 React 應用，並包裹在 `AuthProvider` 中。
-   **核心元件**：
    -   `PurchaseRequestBoard.jsx`：處理採購需求的顯示、建立、更新、刪除及評論功能。
    -   `TithingTaskList.jsx` & `TithingTaskDetail.jsx`：管理什一奉獻相關任務的列表與詳細資訊。
    -   `DedicationEntryForm.jsx` & `LoggedDedicationsList.jsx`：用於輸入和顯示指定用途的奉獻記錄。
    -   `TransferReimbursementModal.jsx`: 處理轉帳和報銷的彈出視窗。
-   **狀態管理**：
    -   `AuthContext.jsx`: 使用 React Context 和 Firebase SDK (`firebase/auth`) 管理使用者登入狀態、`currentUser` 物件及登入/登出邏輯。
-   **API 互動**：
    -   主要透過 `axios` 呼叫後端 `/api` 端點。
    -   在請求標頭中會附上 Firebase ID Token (`currentUser.getIdToken()`) 進行身份驗證。
-   **樣式**：
    -   `tailwind.config.js` 中定義了客製化的品牌色彩（榮耀紅 `glory-red`、聖光金 `holy-gold`）和語意化色彩（`success`, `danger`）。

## 5. 後端 API (`functions/`)

後端 API 是作為單一 Firebase Cloud Function (`api`) 部署的 Express 應用。
-   **進入點**：`functions/index.js` 初始化 `firebase-admin` 和 Express 伺服器。
-   **中介軟體**：
    -   `verifyFirebaseToken`：一個關鍵的中介軟體，用於保護大多數 API 端點。它不僅驗證 `Authorization` 標頭中的 Firebase ID Token，還會查詢 Firestore 的 `users` 集合，確保該使用者具有 `status: 'approved'` 的記錄，才會授予存取權限。
-   **資料庫**：使用 `firebase-admin` SDK 與 Firestore 進行所有資料庫操作。
-   **主要 API 端點** (皆位於 `/api` 前綴下)：
    -   `/requirements`：CRUD 操作，用於管理採購需求。
    -   `/requirements/:id/comments`：CRUD 操作，用於管理特定需求的評論。
    -   `/users/:userId/profile`：用於更新使用者設定檔（例如通知偏好）。
    -   `/send-notification`: 用於觸發基於 Gmail 的通知。
    -   `/dedications`: CRUD 操作，用於管理奉獻記錄。
    -   `/tithing-tasks`: CRUD 操作，用於什一奉獻任務。
-   **部署設定**：Cloud Function 部署在 `asia-east1` 區域，配置了最大實例數和記憶體限制。

## 6. Firebase 設定 (`firebase.json`)

此檔案是整個專案的指揮中心。

-   **Hosting (託管)**：
    -   定義了 `bqpurchase` 和 `bqgracechurch` 兩個站點。
    -   `bqpurchase` 的 `public` 目錄指向 `dist/client`（Vite 的建構輸出）。
    -   **重寫規則 (Rewrites)**：
        -   所有對 `/api/**` 的請求都會被重寫到名為 `api` 的 Cloud Function。
        -   所有其他請求都指向 `index.html`，這是標準的 SPA 路由行為。
-   **Emulators (模擬器)**：
    -   `firebase.json` 中設定了本地開發時使用的 Firebase 服務模擬器（Auth, Functions, Firestore, Hosting, Storage）。
    -   開發流程 (`npm run dev`) 會同時啟動 Vite 開發伺服器和 Firebase 模擬器。

## 7. 核心工作流程

-   **身份驗證**：
    1.  使用者在前端透過 `loginmodal.jsx` 登入。
    2.  `AuthContext.jsx` 監聽 Firebase Auth 狀態變化，並將 `currentUser` 傳遞給應用。
    3.  前端發送 API 請求時，從 `currentUser` 獲取 ID Token。
    4.  後端 `verifyFirebaseToken` 中介軟體驗證 Token 並檢查 Firestore 中的使用者核准狀態。
-   **資料流 (採購)**：
    1.  `PurchaseRequestBoard.jsx` 透過 `axios` 向 `GET /api/requirements` 發送請求。
    2.  後端 API 接收請求，從 Firestore 讀取 `requirements` 集合的資料，並回傳 JSON。
    3.  使用者提交新需求時，前端發送 `POST /api/requirements` 請求。
    4.  後端將新需求寫入 Firestore，並將新建立的完整項目回傳給前端。
    5.  前端直接使用回傳的項目更新本地狀態，無需重新獲取整個列表。