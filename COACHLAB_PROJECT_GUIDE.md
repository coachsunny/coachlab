# 🎯 CoachLab (教練實驗室) - 完整架構規劃、理論模型與使用指南

> **專案定位**：專業級教練與深度溝通模擬訓練室（Professional Coaching & Communication Simulator）  
> **當前版本**：v1.2.0 (Stable)  
> **GitHub 倉庫**：https://github.com/coachsunny/coachlab  
> **本對話框專屬任務**：專注於 `CoachLab` 的深度教練功能演進、理論模型擴充與診斷精準度提升。  

---

## 1. 專案定位與與 CoachQuest 的界線

本專案與衍生出的遊戲化專案 **CoachQuest (教練大冒險)** 有著明確的分工與邊界：

| 維度 | 🎯 CoachLab (`d:\Coach`) | 🎮 CoachQuest (`d:\CoachQuest`) |
| :--- | :--- | :--- |
| **核心定位** | **專業深度教練與高情商溝通診斷室** | **寶可夢式遊戲化對決與關主收攏冒險** |
| **目標受眾** | 企業主管、專業教練 (ICF)、HR、深度溝通學習者 | 課堂學員、初學者、團隊破冰活動、自學闖關者 |
| **對話對象** | **自由客製化角色**（身份、性格、心理防衛、衝突事件）+ 6大情境模板 | **16 位固定風格關主**（分屬職場、親子、夫妻、朋友四大道館） |
| **互動機制** | 即時內心轉折、教練錦囊提示、撤回重試、自由對談深度 | 血條 HP、偷看心聲、戰術錦囊、70 分收攏精靈球、3種多人約戰 |
| **結算產出** | **0-100 深度復盤報告**（ICF 五維雷達、Before & After 金句重構、冰山探勘度、刻意練習行動方案） | **百寶箱圖鑑收藏**（收攏卡、通關金句、經驗值 EXP、前 10 排行榜） |
| **運行架構** | **雙模式**：Node.js Express 本地/伺服器 + Cloudflare Workers 邊緣 | **純邊緣運算**：Cloudflare Workers + 靜態資產 (SPA) |

---

## 2. 核心架構與雙模式運行

CoachLab 具備靈活的**雙運行環境架構**：

```mermaid
graph TD
    Client[前端 SPA /public/index.html] --> API Router{選擇運行環境}
    
    subgraph 本地 / Docker / VPS
        API Router -->|Express 服務器| Express[server.js :3000]
        Express --> SDKLib[lib/gemini.js & lib/prompts.js]
        SDKLib --> GoogleGenAI[@google/genai 官方 SDK]
    end

    subgraph Cloudflare 邊緣環境
        API Router -->|Workers / Pages| Worker[worker.js]
        Worker --> Catchall[functions/api/[[catchall]].js]
        Catchall --> DirectREST[Google Gemini REST API v1beta]
    end

    GoogleGenAI --> GeminiCloud[Google Gemini 3.8 / 3.5 Flash]
    DirectREST --> GeminiCloud
```

### 兩大運行模式：
1. **本地 / 容器 / 傳統伺服器模式 (`server.js`)**：
   - 適合本機開發、測試或部署至 Docker、Zeabur、Render、AWS、自建 VPS。
   - 使用 Express + `@google/genai` 官方 SDK。
   - 支援讀取根目錄 `.env` 檔案中定義的 `GEMINI_API_KEY`、`PORT`、`GEMINI_MODEL`。
2. **Cloudflare Workers 邊緣模式 (`worker.js` + `functions/api/[[catchall]].js`)**：
   - 適合免維護無伺服器全球分發。
   - 採用標準 REST API 呼叫，具備零冷啟動與高併發特性。
   - 可在 Cloudflare Dashboard 或 `wrangler.toml` 配置環境變數與 Secret。

---

## 3. 五大教練理論模型庫

CoachLab 內建五大國際公認溝通與教練框架（定義於 `lib/prompts.js` 與 `public/js/frameworks.js`），並支援使用者自由輸入自定義框架：

### ① 🕊️ 非暴力溝通 (NVC - Nonviolent Communication)
- **四要素**：
  1. **觀察 (Observation)**：客觀描述事實，不帶評判、推論與指責。
  2. **感受 (Feeling)**：辨識並表達內心真實情緒（非想法）。
  3. **需要 (Need)**：挖掘情緒背後未被滿足的普世核心價值與需要（如尊重、安全、被理解）。
  4. **請求 (Request)**：提出具體、可行、正向且可協商的行動提議。

### ② 🏔️ 薩提爾冰山模型 (Satir Iceberg Model)
- **探索層次**：
  1. **行為與應對姿態**：指責型 (Blamer)、討好型 (Placater)、超理智型 (Super-reasonable)、打岔型 (Irrelevant)、一致性 (Congruent)。
  2. **感受 (Feelings)**：當下的情緒與對情緒的感受。
  3. **觀點 (Perceptions)**：深層信念、預設立場、主觀假設。
  4. **期待 (Expectations)**：對自己、對他人、對他人對自己的期待。
  5. **渴望 (Yearnings)**：人類核心渴望（愛、接納、自由、價值感）。
  6. **核心自我 (Self)**：我是誰、內在生命力與選擇的權利。

### ③ 🌱 GROW 教練模型
- **教練流程**：
  - **G (Goal)**：明確期望達成的具體目標與衡量標準。
  - **R (Reality)**：釐清客觀現狀、已採取的行動與關鍵障礙。
  - **O (Options)**：發散探索各種可能策略與替代方案。
  - **W (Will / Way Forward)**：落實執行承諾、第一步行動與問責機制。

### ④ 🧭 ORID 焦點討論法
- **引導步驟**：
  - **O (Objective 焦點客觀)**：事實、數據、看到了什麼、聽到了什麼。
  - **R (Reflective 反映情感)**：感受、情緒反應、最觸動的點。
  - **I (Interpretive 詮釋意義)**：價值、意義、學習、洞察與關鍵假設。
  - **D (Decisional 決定行動)**：決策、下一步具體行動方案。

### ⑤ ✨ 焦點解決短期教練 (SFBC - Solution-Focused Brief Coaching)
- **核心技術**：
  - **奇蹟提問 (Miracle Question)**：想像問題解決後的理想世界。
  - **評量刻度 (Scaling 1-10)**：將抽象感受具象化，探討從 N 分到 N+1 分的方法。
  - **例外經驗 (Exceptions)**：尋找過去問題「沒有發生」或「稍微好一點」的成功資源。
  - **讚賞賦能 (Compliments & Empowerment)**：看見對方的優勢與努力。

### ⑥ ⚙️ 自定義模式 (Custom Framework)
- 允許企業教練、內訓講師自行輸入專屬談話 SOP（如績效面談七步法、客戶異議處理三步驟）。

---

## 4. 六大實戰情境預設與三階難度

定義於 `public/js/presets.js`，包含：
1. **💼 研發團隊成員 - 績效落後的防衛下屬**（預設框架：NVC / 難度：高難挑戰）
2. **🧸 青春期孩子 - 拒絕溝通且沉迷手機**（預設框架：薩提爾冰山 / 難度：高難挑戰）
3. **👔 跨部門總監 - 強勢推諉責任的平級**（預設框架：ORID / 難度：寫實逼真）
4. **😡 憤怒 VIP 客戶 - 服務出錯要求鉅額賠償**（預設框架：NVC / 難度：高難挑戰）
5. **🥀 核心骨幹員工 - 職業倦怠透露離職念頭**（預設框架：SFBC / 難度：溫和引導）
6. **💍 婚姻伴侶 - 感覺被忽視與委屈**（預設框架：薩提爾冰山 / 難度：寫實逼真）

### 三階難度設定：
- **🟢 溫和引導 (Beginner Friendly)**：防衛心較低，易受同理提問打動，適合初學者演練基本動作。
- **🟡 寫實逼真 (Realistic)**：具備真實人性的防禦機制，若教練提問流於表面或帶有評判，會出現沉默或反彈。
- **🔴 高難挑戰 (High Challenge)**：高度抗拒、轉移焦點、冷嘲熱諷或強烈推諉，嚴格考驗教練的定力、深度傾聽與架構功力。

---

## 5. 全方位復盤評估體系 (0-100 Diagnostic Engine)

對話結束後點擊「產生教練評估報告」，後端將調用強大 Prompt（定義於 `lib/prompts.js`），輸出符合專業督導標準的量化報告：

1. **🏆 總分與等級評定**：
   - 90~100 分：精熟大師 (Mastery)
   - 80~89 分：優秀教練 (Proficient)
   - 70~79 分：具備雛形 (Developing)
   - <70 分：起步探索 (Novice)
2. **📊 五大核心維度雷達 (0-100)**：
   - **理論框架掌握度**（是否精準落實選定心法的步驟與思維）
   - **深度共情與傾聽**（是否聽出弦外之音與未被滿足的深層需要）
   - **有力提問與引導**（是否使用開放式、啟發性提問拓展對方視角）
   - **心理安全感營造**（是否維持中立、無批判、支持性氛圍）
   - **推進轉化與賦能**（是否成功引導出當事人的自我覺察與行動承諾）
3. **🌟 亮點節錄 (Strengths)**：直接擷取學員的具體發言，深入剖析其有效之處。
4. **💡 Before & After 金句重構**：
   - 指出容易引發防衛或封閉的發言（Before）。
   - 給出專業教練推薦的重構問法（After）。
   - 解析背後的心理學原理。
5. **🚀 下一次練習的刻意練習指南**：給出 1~2 項精準的刻意練習作業。
6. **📋 工具支援**：一鍵複製完整 Markdown、匯出/列印 PDF、自動保存在瀏覽器歷史紀錄。

---

## 6. 後端 API 接口規格

| 端點 | 方法 | 說明 | 主要參數 |
| :--- | :--- | :--- | :--- |
| `/api/frameworks` | GET | 取得支援的理論模型、預設模型與伺服器 Key 狀態 | 無 |
| `/api/test-key` | POST | 驗證個人或伺服器 Gemini API Key 連線 | `{ apiKey, modelName }` |
| `/api/chat` | POST | 角色扮演對話回應（含即時內心轉折提示） | `{ apiKey, targetConfig, history, userMessage, modelName }` |
| `/api/hint` | POST | 取得教練錦囊提示（局勢診斷 + 3個提問方向） | `{ apiKey, targetConfig, history, modelName }` |
| `/api/evaluate` | POST | 產生 0-100 全方位深度復盤診斷報告 | `{ apiKey, targetConfig, history, modelName }` |

---

## 7. 本地啟動與開發維護

### 步驟 1：安裝相依套件
```bash
cd d:\Coach
npm install
```

### 步驟 2：配置環境變數（選填）
複製 `.env.example` 為 `.env`：
```env
GEMINI_API_KEY=AIzaSy...你的GeminiKey
PORT=3000
GEMINI_MODEL=gemini-3.8-flash
```
*(若未在 `.env` 配置，亦可直接在網頁右上角的「⚙️ API 設置」中輸入)*

### 步驟 3：啟動本地伺服器
```bash
# 正式啟動
npm start

# 開發監聽模式 (自動重啟)
npm run dev
```
瀏覽器訪問：`http://localhost:3000`

---

## 8. 多元部署指南

### 方案 A：Cloudflare Workers / Pages 邊緣部署
```bash
# 登入 Cloudflare
npx wrangler login

# （建議）設置加密密鑰 Secret（保證持續有效）
npx wrangler secret put GEMINI_API_KEY

# 一鍵部署
npx wrangler deploy
```

### 方案 B：Zeabur / Render / Railway (Node.js 容器)
- 直接將 GitHub 倉庫 `coachsunny/coachlab` 連結至平台。
- 建置指令留空，啟動指令填入 `npm start`。
- 於平台環境變數設定 `GEMINI_API_KEY`。

### 方案 C：Docker / Docker Compose
```bash
docker compose up -d --build
```

---

## 9. 檔案結構清單

```
d:\Coach\
├── COACHLAB_PROJECT_GUIDE.md  # 【本檔案】完整架構、理論模型與使用手冊
├── README.md                  # 簡體中文快速導覽
├── package.json               # Node.js 專案依賴與腳本
├── server.js                  # Express 後端主服務
├── worker.js                  # Cloudflare Workers 入口點
├── wrangler.toml              # Cloudflare 邊緣配置
├── Dockerfile                 # Docker 容器封裝
├── docker-compose.yml         # Docker 容器編排
├── lib/
│   ├── gemini.js              # Google AI SDK 初始化與模型呼叫邏輯
│   └── prompts.js             # 角色扮演、教練錦囊與復盤評估 System Prompts
├── functions/api/
│   └── [[catchall]].js        # Cloudflare Workers 專用 RESTful API 轉發
└── public/
    ├── index.html             # 單頁應用主界面 (UI 結構)
    ├── css/
    │   └── style.css          # 教練專業風格樣式表
    └── js/
        ├── app.js             # 前端狀態機、對話串流與報告渲染主邏輯
        ├── frameworks.js      # 五大理論模型詳細定義與前端顯示文案
        └── presets.js         # 六大預設情境模板資料庫
```

---

## 10. 後續在當前對話框可繼續推進的方向

本對話框已乾淨重回 **CoachLab** 專屬維護狀態，未來可持續探索的專業教練演進方向：
1. **ICF 2024 最新核心職能精準度微調**：將評估維度更精準地對標 ACC / PCC / MCC 評分標竿。
2. **語音即時教練練習**：串接 Gemini Live WebRTC 實現語音對答與語調情感識別。
3. **對話脈絡時間軸可視化**：在復盤報告中繪製對話中雙方「防衛指數」與「情感溫度」的波形轉折圖。
4. **多語系支援**：擴充繁體中文、英文界面切換。
