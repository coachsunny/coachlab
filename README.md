# 🎯 CoachLab - 沟通与教练对话模拟训练室

> **自定义练习对象与情境，选用经典沟通教练模式（非暴力沟通、萨提亚冰山模型、GROW模型、ORID等），在安全无压力的环境中锻炼高情商对话力。练习后获得全方位深度复盘诊断报告与金句重构建议。背后调用 Google AI (Gemini 3.8 Flash) API。**

---

## ✨ 核心特色

1. **自定义练习对象与情境 (Persona & Scenario Customization)**：
   - 自由定义对话者的**称呼、身份关系、性格特质、心理防卫机制、当前冲突事件、初始态度**。
   - 内置 **6 大职场与生活常见难题情境模板**，一键带入（绩效落后的防卫下属、拒绝沟通的青春期孩子、强势推诿的主管、愤怒投诉的 VIP 客户、倦怠想离职的骨干、委屈受伤的伴侣）。
   - 支持三种难度等级：**温和引导 (初学友善)**、**写实逼真 (真实反应)**、**高难挑战 (强烈防御)**。

2. **多元沟通与教练理论模型 (Multi-Framework Support)**：
   - **🕊️ 非暴力沟通 (NVC)**：观察 (Observation) → 感受 (Feeling) → 需要 (Need) → 请求 (Request)。
   - **🏔️ 萨提亚/萨提尔冰山模型 (Satir Iceberg Model)**：行为/事件 → 应对姿态 → 感受 → 观点信念 → 期待 → 渴望 → 核心自我。
   - **🌱 GROW 教练模型**：目标 (Goal) → 现状 (Reality) → 方案 (Options) → 意愿 (Will)。
   - **🧭 ORID 焦点讨论法**：见 (Objective) → 感 (Reflective) → 思 (Interpretive) → 行 (Decisional)。
   - **✨ 焦点解决教练 (SFBC)**：奇迹提问、评量刻度 (1-10)、例外经验与资源赋能。
   - **⚙️ 自定义沟通模式**：支持自由输入企业内部教练 SOP 或个人谈话守则。

3. **沉浸式对话练习室 (Interactive Roleplay Studio)**：
   - AI 深度沉浸角色扮演，具有真实的心理转折与防御演绎。
   - **💭 角色内心转折提示**：可即时观察对象在对话中防卫心的增减与潜意识情绪变化。
   - **💡 教练锦囊 (Coach Hint)**：卡关时一键向大师级教练督导求助，获取当前局势诊断、理论切入点与三种提问方向建议。
   - **⏪ 撤回重试 (Undo / Retry)**：支持回溯上一句发言并重新打磨推敲。

4. **全方位教练复盘诊断报告 (Comprehensive Post-Practice Evaluation)**：
   - **🏆 量化指标总分 (0-100)** 与考官评级（精熟大师 / 优秀教练 / 具备雏形 / 起步探索）。
   - **📊 五大核心维度指标剖析**：理论掌握度、共情倾听、有力提问、心理安全感、推进赋能。
   - **🌟 做得好的亮点 (Strengths)**：精准节录对话原句，深入剖析为什么有效、符合何种心法。
   - **💡 改善机会与示范金句 (Growth Opportunities - Before & After)**：揪出容易引发防卫的句子，提供具体“推荐重构说法”与“心法原理解析”。
   - **🔍 理论架构深度探勘**：冰山探求层次深度、NVC 四要素落实检视。
   - **🚀 刻意练习行动指引**：量身打造下一次练习的刻意练习步骤。
   - **📋 支持一键复制完整 Markdown 报告、打印/导出 PDF，并自动保存于历史记录**。

5. **Google AI Gemini 官方 SDK 驱动**：
   - 调用 Google 最新一代 **`gemini-3.8-flash`**（亦可自由切换模型）。
   - 支持在网页界面直接填写 API Key（存储于浏览器 LocalStorage），亦支持在 `.env` 文件中预先配置。
   - 内置一键 API 连接状态测试工具。

---

## 🚀 本地运行与快速开始

### 1. 前置依赖
- 已安装 [Node.js](https://nodejs.org/) (建议 v18 及以上)
- Google Gemini API Key（可于 [Google AI Studio](https://aistudio.google.com/app/apikey) 免费申请）

### 2. 安装与启动
```bash
# 安装依赖
npm install

# 启动服务器
npm start
```

服务器将在 `http://localhost:3000` 启动。打开浏览器即可访问！

---

## 🌐 这个项目适合部署在哪里？

由于本项目后端采用 **Node.js (Express)**，前端为纯静态 SPA，背靠 **Google Gemini API**，以下是针对不同使用场景的最优部署建议：

### 方案 1：Zeabur（极力推荐，最省心且对两岸访问极佳）
- **特点**：支持 GitHub 仓库一键导入自动部署 Node.js，支持香港/亚太节点。
- **最大优势**：
  1. 香港节点网络优质，**大陆与海外学生访问均非常流畅**。
  2. 服务器位于境外，能**天然直连 Google Gemini API**，大陆学生访问前端时**无需科学上网**！
  3. 提供免费测试额度，自带免费 HTTPS 域名（`*.zeabur.app`）。

### 方案 2：Render / Railway（国际主流免费/低成本 PaaS）
- **Render**：提供免费 Web Service 计划，连接 GitHub 后直接识别 `npm start`，一键生成公共 HTTPS 链接。
- **Railway**：每月提供免费测试信用额，自动化 CI/CD 体验极好。

### 方案 3：轻量云服务器 VPS（腾讯云香港 / 阿里云香港 / AWS Lightsail）
- **适合场景**：长期班级教学、机构内部专属使用、需要自定义独立顶级域名。
- **部署方式**：
  ```bash
  git clone <your-repo>
  cd Coach
  docker compose up -d
  ```
- **重要提醒**：务必选择**香港或海外机房**，若购买大陆境内机房（如北京、上海），服务器会因 GFW 拦截无法连接 Google Gemini API。

### 方案 4：课堂现场即用（免服务器穿透）
- 若教师在自己电脑上运行，只需在终端执行：
  ```bash
  npx localtunnel --port 3000
  ```
  即可瞬间获得一个公网 HTTPS 临时网址，发送给 20 位学生直接在手机/电脑上使用。

---

## 🔑 配置 API Key 的方式

### 方式一：直接在网页界面配置（推荐学生使用）
每个学生可在网页右上角点击「**⚙️ API 设置**」，填入自己的 Gemini API Key。各学生拥有独立速率额度，互不干扰。

### 方式二：服务器环境变量配置（推荐老师/管理员统一配置）
编辑根目录下的 `.env` 文件：
```env
GEMINI_API_KEY=AIzaSy...你的Key
PORT=3000
GEMINI_MODEL=gemini-3.8-flash
```
启动后所有访问该网页的学生无需填写 Key，直接开箱即用。

---

## 📁 项目目录结构

```
d:\Coach\
├── package.json               # 项目配置与启动脚本
├── Dockerfile                 # Docker 容器化打包文件
├── docker-compose.yml         # Docker Compose 一键启动文件
├── .env                       # 本地环境变量配置
├── .env.example               # 环境变量范本
├── server.js                  # Express 后端 API 服务
├── lib/
│   ├── gemini.js              # Google AI SDK 初始化与调用封装
│   └── prompts.js             # 各理论提示词、角色演练与评估 Prompt
├── public/
│   ├── index.html             # 单页应用 UI 结构 (简体中文)
│   ├── css/
│   │   └── style.css          # 现代化专业教练风格样式
│   └── js/
│       ├── app.js             # 前端控制主逻辑与状态管理
│       ├── frameworks.js      # 5 大沟通理论模型知识库
│       └── presets.js         # 6 大职场/生活情境预设模板库
└── README.md                  # 简体中文说明与部署指南
```
