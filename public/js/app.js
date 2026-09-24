import { FRAMEWORKS_DATA } from "./frameworks.js";
import { PRESETS } from "./presets.js";

// 全局状态
const state = {
  activeView: "setup", // 'setup' | 'practice' | 'report'
  selectedFrameworkId: "nvc",
  targetConfig: null,
  chatHistory: [],
  evaluationReport: null,
  isWaitingForAI: false,
  apiKey: localStorage.getItem("gemini_api_key") || "",
  geminiModel: localStorage.getItem("gemini_model") || "gemini-3.6-flash",
  hasServerKey: false,
  serverKeyPreview: null,
  isServerKeyValidFormat: false,
  practiceHistory: JSON.parse(localStorage.getItem("coachlab_history") || "[]")
};

// DOM 元素缓存
const elements = {
  // Views
  viewSetup: document.getElementById("view-setup"),
  viewPractice: document.getElementById("view-practice"),
  viewReport: document.getElementById("view-report"),

  // Navigation
  brandLogo: document.getElementById("brand-logo"),
  navFrameworkBadge: document.getElementById("nav-framework-badge"),
  navFwIcon: document.getElementById("nav-fw-icon"),
  navFwName: document.getElementById("nav-fw-name"),
  btnSettings: document.getElementById("btn-settings"),
  btnHistory: document.getElementById("btn-history"),
  keyStatusDot: document.getElementById("key-status-dot"),

  // Setup view
  frameworkGrid: document.getElementById("framework-selector-grid"),
  frameworkPreview: document.getElementById("active-framework-preview"),
  customFrameworkBox: document.getElementById("custom-framework-box"),
  customFrameworkInput: document.getElementById("custom-framework-input"),
  presetPillsContainer: document.getElementById("preset-pills-container"),
  targetName: document.getElementById("target-name"),
  targetRole: document.getElementById("target-role"),
  targetTraits: document.getElementById("target-traits"),
  targetScenario: document.getElementById("target-scenario"),
  targetInitialMood: document.getElementById("target-initial-mood"),
  difficultyLevel: document.getElementById("difficulty-level"),
  btnStartPractice: document.getElementById("btn-start-practice"),

  // Practice view
  roomAvatar: document.getElementById("room-avatar"),
  roomTargetName: document.getElementById("room-target-name"),
  roomTargetRole: document.getElementById("room-target-role"),
  roomDiffTag: document.getElementById("room-diff-tag"),
  roomScenarioBrief: document.getElementById("room-scenario-brief"),
  turnCount: document.getElementById("turn-count"),
  btnFrameworkGuideToggle: document.getElementById("btn-framework-guide-toggle"),
  roomFwIcon: document.getElementById("room-fw-icon"),
  frameworkCheatSheet: document.getElementById("framework-cheat-sheet"),
  btnEndPractice: document.getElementById("btn-end-practice"),
  chatViewport: document.getElementById("chat-viewport"),
  chatMessages: document.getElementById("chat-messages"),
  btnGetHint: document.getElementById("btn-get-hint"),
  btnUndoTurn: document.getElementById("btn-undo-turn"),
  toggleInnerThoughts: document.getElementById("toggle-inner-thoughts"),
  userInputText: document.getElementById("user-input-text"),
  btnSendMessage: document.getElementById("btn-send-message"),

  // Report view
  rptOverallScore: document.getElementById("rpt-overall-score"),
  rptOverallLevel: document.getElementById("rpt-overall-level"),
  rptFrameworkName: document.getElementById("rpt-framework-name"),
  rptTargetName: document.getElementById("rpt-target-name"),
  rptTurns: document.getElementById("rpt-turns"),
  rptDate: document.getElementById("rpt-date"),
  rptSummary: document.getElementById("rpt-summary"),
  dimensionBarsContainer: document.getElementById("dimension-bars-container"),
  rptStrengthsList: document.getElementById("rpt-strengths-list"),
  rptGrowthList: document.getElementById("rpt-growth-list"),
  rptStageAnalysis: document.getElementById("rpt-stage-analysis"),
  rptKeyTakeaway: document.getElementById("rpt-key-takeaway"),
  rptPracticeTips: document.getElementById("rpt-practice-tips"),
  btnCopyReport: document.getElementById("btn-copy-report"),
  btnPracticeAgain: document.getElementById("btn-practice-again"),
  btnNewPractice: document.getElementById("btn-new-practice"),
  btnPrintReport: document.getElementById("btn-print-report"),

  // Modals
  modalSettings: document.getElementById("modal-settings"),
  btnCloseSettings: document.getElementById("btn-close-settings"),
  serverKeyIndicator: document.getElementById("server-key-indicator"),
  serverKeyStatusText: document.getElementById("server-key-status-text"),
  inputApiKey: document.getElementById("input-api-key"),
  btnToggleKeyVisibility: document.getElementById("btn-toggle-key-visibility"),
  selectGeminiModel: document.getElementById("select-gemini-model"),
  btnTestConnection: document.getElementById("btn-test-connection"),
  btnSaveSettings: document.getElementById("btn-save-settings"),
  testKeyResult: document.getElementById("test-key-result"),

  modalHint: document.getElementById("modal-hint"),
  btnCloseHint: document.getElementById("btn-close-hint"),
  hintContent: document.getElementById("hint-content"),
  btnApplyHint: document.getElementById("btn-apply-hint"),

  modalHistory: document.getElementById("modal-history"),
  btnCloseHistory: document.getElementById("btn-close-history"),
  btnDismissHistory: document.getElementById("btn-dismiss-history"),
  historyList: document.getElementById("history-list"),
  btnClearHistory: document.getElementById("btn-clear-history")
};

// =================== 初始化函数 ===================
async function initApp() {
  renderFrameworkCards();
  selectFramework("nvc");
  renderPresetPills();
  bindEvents();
  updateKeyStatusUI();
  await checkServerStatus();
}

/**
 * 检查后端服务器与预设配置
 */
async function checkServerStatus() {
  try {
    const res = await fetch("/api/frameworks");
    const data = await res.json();
    if (data.ok) {
      state.hasServerKey = !!data.hasServerKey;
      state.serverKeyPreview = data.serverKeyPreview || null;
      state.isServerKeyValidFormat = !!data.isServerKeyValidFormat;
      if (data.defaultModel && !localStorage.getItem("gemini_model")) {
        state.geminiModel = data.defaultModel;
        elements.selectGeminiModel.value = data.defaultModel;
      }
      updateKeyStatusUI();
      updateServerKeyBannerUI();
    }
  } catch (err) {
    console.warn("无法连接后端服务器:", err);
  }
}

/**
 * 更新设置窗口内的云端全局 Key 提示横幅
 */
function updateServerKeyBannerUI() {
  if (!elements.serverKeyIndicator || !elements.serverKeyStatusText) return;

  if (state.hasServerKey) {
    if (state.isServerKeyValidFormat) {
      elements.serverKeyIndicator.className = "server-key-banner server-key-active";
      elements.serverKeyStatusText.innerHTML = `
        <span><strong>✅ 云端全局 API Key 已就绪</strong>（${state.serverKeyPreview || "已配置"}）<br>
        <span style="font-size: 0.8rem; opacity: 0.9;">所有学生/手机端留空即可直接使用，无需任何配置！</span></span>
      `;
    } else {
      elements.serverKeyIndicator.className = "server-key-banner server-key-invalid";
      elements.serverKeyStatusText.innerHTML = `
        <span><strong>⚠️ 云端 GEMINI_API_KEY 格式异常</strong>（当前值：<code>${state.serverKeyPreview}</code>）<br>
        <span style="font-size: 0.8rem;">请前往 Cloudflare 控制台检查环境变量，确保填入以 <code>AIzaSy</code> 或 <code>AQ.</code> 开头的有效 Key。</span></span>
      `;
    }
  } else {
    elements.serverKeyIndicator.className = "server-key-banner server-key-none";
    elements.serverKeyStatusText.innerHTML = `
      <span><strong>ℹ️ 云端暂未检测到 GEMINI_API_KEY</strong><br>
      <span style="font-size: 0.8rem;">学生端可在下方填入个人 API Key，或由管理员在 Cloudflare 环境变量中添加全局 Key。</span></span>
    `;
  }
}

/**
 * 更新顶部密钥指示灯
 */
function updateKeyStatusUI() {
  const hasKey = !!state.apiKey || (state.hasServerKey && state.isServerKeyValidFormat);
  if (hasKey) {
    elements.keyStatusDot.className = "status-dot dot-ok";
    elements.keyStatusDot.title = state.apiKey ? "已设置客户端专属 API Key" : "云端全局 API Key 生效中（学生可直接使用）";
  } else if (state.hasServerKey && !state.isServerKeyValidFormat) {
    elements.keyStatusDot.className = "status-dot dot-warn";
    elements.keyStatusDot.title = "云端 API Key 格式异常（非 AIzaSy 开头）";
  } else {
    elements.keyStatusDot.className = "status-dot dot-warn";
    elements.keyStatusDot.title = "尚未设置 API Key，点击右上角设置以配置";
  }
}

// =================== 画面切换控制 ===================
function switchView(viewName) {
  state.activeView = viewName;
  elements.viewSetup.classList.remove("active");
  elements.viewPractice.classList.remove("active");
  elements.viewReport.classList.remove("active");

  if (viewName === "setup") {
    elements.viewSetup.classList.add("active");
    elements.navFrameworkBadge.classList.add("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else if (viewName === "practice") {
    elements.viewPractice.classList.add("active");
    elements.navFrameworkBadge.classList.remove("hidden");
  } else if (viewName === "report") {
    elements.viewReport.classList.add("active");
    elements.navFrameworkBadge.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

// =================== Step 1: Framework 渲染与选择 ===================
function renderFrameworkCards() {
  elements.frameworkGrid.innerHTML = "";
  Object.values(FRAMEWORKS_DATA).forEach((fw) => {
    const card = document.createElement("div");
    card.className = "fw-card " + (fw.id === state.selectedFrameworkId ? "selected" : "");
    card.dataset.id = fw.id;
    card.innerHTML = `
      <div class="fw-card-top">
        <span class="fw-icon">${fw.icon}</span>
        <span class="fw-badge ${fw.badgeColor}">${fw.shortName}</span>
      </div>
      <div class="fw-title">${fw.name}</div>
      <div class="fw-tagline">${fw.tagline}</div>
      <div class="fw-desc">${fw.description}</div>
    `;
    card.addEventListener("click", () => selectFramework(fw.id));
    elements.frameworkGrid.appendChild(card);
  });
}

function selectFramework(frameworkId) {
  state.selectedFrameworkId = frameworkId;
  const fw = FRAMEWORKS_DATA[frameworkId];
  if (!fw) return;

  // 更新卡片选中样式
  document.querySelectorAll(".fw-card").forEach((c) => {
    c.classList.toggle("selected", c.dataset.id === frameworkId);
  });

  // 更新导航栏 Badge
  elements.navFwIcon.textContent = fw.icon;
  elements.navFwName.textContent = fw.name;
  elements.roomFwIcon.textContent = fw.icon;

  // 渲染指引预览卡
  let stepsHtml = "";
  if (fw.steps && fw.steps.length > 0) {
    stepsHtml = `
      <div class="steps-list">
        ${fw.steps.map(s => `
          <div class="step-item">
            <div class="step-name">${s.name}</div>
            <div class="step-desc">${s.desc}</div>
          </div>
        `).join("")}
      </div>
    `;
  }

  elements.frameworkPreview.innerHTML = `
    <div class="preview-title">
      <span>${fw.icon}</span>
      <span>${fw.name} 核心练习心法</span>
    </div>
    ${stepsHtml}
    <div class="pro-tip-box">
      <strong>💡 教练心法提醒：</strong> ${fw.proTip}
    </div>
  `;

  // 自定义模式输入框
  if (frameworkId === "custom") {
    elements.customFrameworkBox.classList.remove("hidden");
  } else {
    elements.customFrameworkBox.classList.add("hidden");
  }

  // 更新练习室折叠秘笈
  elements.frameworkCheatSheet.innerHTML = `
    <strong>${fw.icon} ${fw.name} 秘笈：</strong> ${fw.proTip}
  `;
}

// =================== Step 2: 预设情境按钮 ===================
function renderPresetPills() {
  elements.presetPillsContainer.innerHTML = "";
  PRESETS.forEach((preset) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "preset-btn";
    btn.innerHTML = `<span>${preset.icon}</span> <span>${preset.title}</span>`;
    btn.addEventListener("click", () => applyPreset(preset));
    elements.presetPillsContainer.appendChild(btn);
  });
}

function applyPreset(preset) {
  elements.targetName.value = preset.targetName;
  elements.targetRole.value = preset.targetRole;
  elements.targetTraits.value = preset.traits;
  elements.targetScenario.value = preset.scenario;
  elements.targetInitialMood.value = preset.initialMood;
  elements.difficultyLevel.value = preset.difficulty || "realistic";

  if (preset.recommendedFramework && FRAMEWORKS_DATA[preset.recommendedFramework]) {
    selectFramework(preset.recommendedFramework);
  }

  // 视觉微反馈
  elements.targetName.focus();
}

// =================== 开始练习与初始化对话 ===================
async function startPractice() {
  const targetName = elements.targetName.value.trim() || "练习对象";
  const targetRole = elements.targetRole.value.trim() || "同事";
  const traits = elements.targetTraits.value.trim() || "一般性格";
  const scenario = elements.targetScenario.value.trim() || "日常沟通情境";
  const initialMood = elements.targetInitialMood.value.trim() || "平常";
  const difficulty = elements.difficultyLevel.value;
  const frameworkId = state.selectedFrameworkId;
  const customFrameworkPrompt = elements.customFrameworkInput.value.trim();

  // 检查 API Key：若本地无专属 Key，且尚未同步云端全局 Key，先快速拉取一次云端状态
  if (!state.apiKey && !state.hasServerKey) {
    await checkServerStatus();
  }

  // 仅在本地无 Key 且云端也未配置任何全局 Key 时才弹出设置
  if (!state.apiKey && !state.hasServerKey) {
    showSettingsModal();
    elements.testKeyResult.className = "test-result-box test-error";
    elements.testKeyResult.textContent = "未检测到 API Key。请在下方填入您的 Google Gemini API Key，或由管理员在 Cloudflare 环境变量中配置 GEMINI_API_KEY。";
    elements.testKeyResult.classList.remove("hidden");
    return;
  }

  // 封存对话设置
  state.targetConfig = {
    targetName,
    targetRole,
    traits,
    scenario,
    initialMood,
    difficulty,
    frameworkId,
    customFrameworkPrompt
  };

  // 清空对话记录
  state.chatHistory = [];
  elements.chatMessages.innerHTML = "";
  updateTurnCount();

  // 更新练习室 Header
  elements.roomTargetName.textContent = targetName;
  elements.roomTargetRole.textContent = targetRole;
  elements.roomScenarioBrief.textContent = "情境：" + scenario;
  
  const diffLabels = { beginner: "温和引导", realistic: "写实逼真", challenging: "高难挑战" };
  elements.roomDiffTag.textContent = diffLabels[difficulty] || "写实";

  // 切换至对话室
  switchView("practice");

  // 发送起始指令让 AI 角色开场发言
  await requestAIRoleplayOpening();
}

/**
 * 取得练习对象的开场白
 */
async function requestAIRoleplayOpening() {
  showTypingIndicator();
  state.isWaitingForAI = true;

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: state.apiKey,
        modelName: state.geminiModel,
        targetConfig: state.targetConfig,
        history: [],
        userMessage: "（谈话正式开始，请你以设定的角色开口说第一句话或做出反应）"
      })
    });

    const data = await res.json();
    removeTypingIndicator();

    if (!data.ok) {
      throw new Error(data.error || "开场加载失败");
    }

    const { text, innerThought } = data.reply;
    appendMessage({
      role: "target",
      content: text,
      innerThought
    });

    state.chatHistory.push({
      role: "target",
      content: text,
      innerThought
    });
  } catch (err) {
    removeTypingIndicator();
    appendMessage({
      role: "target",
      content: "“……”（对方正看着你，等待你开口对话）",
      innerThought: "对象有些紧绷，不知找自己有何用意。"
    });
    state.chatHistory.push({
      role: "target",
      content: "“……”（对方正看着你，等待你开口对话）",
      innerThought: "对象有些紧绷"
    });
    console.error("AI Opening error:", err);
  } finally {
    state.isWaitingForAI = false;
    elements.userInputText.focus();
  }
}

// =================== 消息发送与渲染 ===================
async function handleSendMessage() {
  if (state.isWaitingForAI) return;
  const userText = elements.userInputText.value.trim();
  if (!userText) return;

  // 1. 渲染使用者发言
  appendMessage({
    role: "user",
    content: userText
  });
  state.chatHistory.push({
    role: "user",
    content: userText
  });

  elements.userInputText.value = "";
  updateTurnCount();
  showTypingIndicator();
  state.isWaitingForAI = true;

  // 2. 调用后端角色扮演 API
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: state.apiKey,
        modelName: state.geminiModel,
        targetConfig: state.targetConfig,
        history: state.chatHistory.slice(0, -1),
        userMessage: userText
      })
    });

    const data = await res.json();
    removeTypingIndicator();

    if (!data.ok) {
      throw new Error(data.error || "对话生成失败");
    }

    const { text, innerThought } = data.reply;
    appendMessage({
      role: "target",
      content: text,
      innerThought
    });

    state.chatHistory.push({
      role: "target",
      content: text,
      innerThought
    });

    updateTurnCount();
  } catch (err) {
    removeTypingIndicator();
    let msg = err.message;
    if (msg.includes("location is not supported") || msg.includes("User location")) {
      msg = "本次请求偶发分配至 Cloudflare 香港(HKG)等节点，触碰了 Google 区域限制。请点击左下方“⏪ 撤回重试”重新发送即可！";
    }
    appendMessage({
      role: "target",
      content: "[连接提示] 响应超时或失败：" + msg,
      innerThought: null
    });
  } finally {
    state.isWaitingForAI = false;
    elements.userInputText.focus();
  }
}

/**
 * 在画面上追加消息气泡
 */
function appendMessage({ role, content, innerThought }) {
  const row = document.createElement("div");
  row.className = "message-row " + role;

  const avatarChar = role === "user" ? "🧑‍💼" : "👤";
  const authorName = role === "user" ? "我 (教练/对话者)" : (state.targetConfig?.targetName || "对象");

  let innerThoughtHtml = "";
  if (innerThought && role === "target") {
    const isChecked = elements.toggleInnerThoughts.checked;
    innerThoughtHtml = `
      <div class="inner-thought-pill ${isChecked ? "" : "hidden"}">
        <span>💭 内心状态：</span>
        <span>${escapeHtml(innerThought)}</span>
      </div>
    `;
  }

  row.innerHTML = `
    <div class="message-avatar">${avatarChar}</div>
    <div class="message-content-wrap">
      <div class="message-author">${authorName}</div>
      <div class="message-bubble">${escapeHtml(content)}</div>
      ${innerThoughtHtml}
    </div>
  `;

  elements.chatMessages.appendChild(row);
  scrollToBottom();
}

function showTypingIndicator() {
  removeTypingIndicator();
  const indicator = document.createElement("div");
  indicator.id = "chat-typing-indicator";
  indicator.className = "message-row target";
  indicator.innerHTML = `
    <div class="message-avatar">👤</div>
    <div class="typing-indicator">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  `;
  elements.chatMessages.appendChild(indicator);
  scrollToBottom();
}

function removeTypingIndicator() {
  const el = document.getElementById("chat-typing-indicator");
  if (el) el.remove();
}

function scrollToBottom() {
  elements.chatViewport.scrollTop = elements.chatViewport.scrollHeight;
}

function updateTurnCount() {
  const userTurns = state.chatHistory.filter(m => m.role === "user").length;
  elements.turnCount.textContent = userTurns;
}

// =================== 教练锦囊 (Coach Hint) ===================
async function handleGetHint() {
  if (state.chatHistory.length === 0) {
    alert("请先开始对话，教练督导才能为您分析当前局势喔！");
    return;
  }

  showHintModal();
  elements.hintContent.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>大师级教练督导正在深度解析局势、对象心理与最佳切入点...</p>
    </div>
  `;

  try {
    const res = await fetch("/api/hint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: state.apiKey,
        modelName: state.geminiModel,
        targetConfig: state.targetConfig,
        history: state.chatHistory
      })
    });

    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "无法取得锦囊");

    elements.hintContent.innerHTML = formatMarkdownLike(data.hint);
  } catch (err) {
    elements.hintContent.innerHTML = `
      <div class="test-result-box test-error">
        获取锦囊失败：${err.message}
      </div>
    `;
  }
}

// =================== 撤回上一句 (Undo) ===================
function handleUndoTurn() {
  if (state.chatHistory.length < 2) {
    alert("目前没有足够的回合可以撤回。");
    return;
  }

  if (confirm("确定要撤回上一句发言并重新尝试吗？")) {
    const lastMsg = state.chatHistory[state.chatHistory.length - 1];
    if (lastMsg.role === "target") {
      state.chatHistory.pop();
    }
    const prevMsg = state.chatHistory[state.chatHistory.length - 1];
    if (prevMsg && prevMsg.role === "user") {
      elements.userInputText.value = prevMsg.content;
      state.chatHistory.pop();
    }

    elements.chatMessages.innerHTML = "";
    state.chatHistory.forEach(msg => appendMessage(msg));
    updateTurnCount();
    elements.userInputText.focus();
  }
}

// =================== 结束练习并评估 (Evaluation) ===================
async function handleEndAndEvaluate() {
  const userTurns = state.chatHistory.filter(m => m.role === "user").length;
  if (userTurns === 0) {
    alert("您尚未开始与对象交谈，请至少进行 2~3 轮对话后再进行评估！");
    return;
  }

  if (userTurns < 2) {
    const proceed = confirm("目前您仅发言了 " + userTurns + " 次，建议多聊几轮评估会更加精准全面。确定现在结束并给出评价吗？");
    if (!proceed) return;
  }

  switchView("report");
  showReportLoading();

  try {
    const res = await fetch("/api/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: state.apiKey,
        modelName: state.geminiModel,
        targetConfig: state.targetConfig,
        history: state.chatHistory
      })
    });

    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "评估生成失败");

    state.evaluationReport = data.report;
    renderEvaluationReport(data.report);

    saveToHistory(data.report);
  } catch (err) {
    alert("评估失败：" + err.message);
    elements.rptSummary.textContent = "生成失败：" + err.message;
  }
}

function showReportLoading() {
  elements.rptOverallScore.textContent = "--";
  elements.rptOverallLevel.textContent = "评析中...";
  elements.rptSummary.textContent = "ICF 考官级教练正在逐轮逐句审视您的沟通层次、提问启发性与共情深度，请稍候约 10 秒...";
  elements.dimensionBarsContainer.innerHTML = "<div class='loading-state'><div class='spinner'></div></div>";
  elements.rptStrengthsList.innerHTML = "<div class='loading-state'><div class='spinner'></div></div>";
  elements.rptGrowthList.innerHTML = "<div class='loading-state'><div class='spinner'></div></div>";
}

/**
 * 渲染全方位评估报告
 */
function renderEvaluationReport(report) {
  const fw = FRAMEWORKS_DATA[state.targetConfig?.frameworkId] || FRAMEWORKS_DATA.nvc;
  const userTurns = state.chatHistory.filter(m => m.role === "user").length;

  elements.rptOverallScore.textContent = report.overallScore || 80;
  elements.rptOverallLevel.textContent = report.overallLevel || "优秀教练";
  elements.rptFrameworkName.textContent = fw.name;
  elements.rptTargetName.textContent = `${state.targetConfig?.targetName} (${state.targetConfig?.targetRole})`;
  elements.rptTurns.textContent = `${userTurns} 轮`;
  elements.rptDate.textContent = new Date().toLocaleDateString("zh-CN");
  elements.rptSummary.textContent = report.summary || "本次练习整体表现出色，具备共情倾听之基本姿态。";

  const dims = [
    { label: "理论架构掌握度", key: "frameworkProficiency", val: report.dimensionScores?.frameworkProficiency || 75 },
    { label: "共情心与深度倾听", key: "empathyListening", val: report.dimensionScores?.empathyListening || 80 },
    { label: "有力提问与启发性", key: "powerfulQuestioning", val: report.dimensionScores?.powerfulQuestioning || 75 },
    { label: "心理安全感营造", key: "psychologicalSafety", val: report.dimensionScores?.psychologicalSafety || 80 },
    { label: "推进与责任赋能", key: "forwardMomentum", val: report.dimensionScores?.forwardMomentum || 70 }
  ];

  elements.dimensionBarsContainer.innerHTML = dims.map(d => `
    <div class="dimension-item">
      <div class="dimension-header">
        <span>${d.label}</span>
        <span class="dimension-score-val">${d.val} 分</span>
      </div>
      <div class="bar-track">
        <div class="bar-fill" style="width: ${d.val}%;"></div>
      </div>
    </div>
  `).join("");

  const strengths = report.strengths || [];
  elements.rptStrengthsList.innerHTML = strengths.map((s, idx) => `
    <div class="strength-item">
      <div class="strength-title">
        <span>✅ 亮点 ${idx + 1}：${escapeHtml(s.title)}</span>
      </div>
      <div class="quote-box">
        “${escapeHtml(s.quote || "")}”
      </div>
      <div class="analysis-text">
        ${escapeHtml(s.analysis || "")}
      </div>
    </div>
  `).join("");

  const growthAreas = report.growthAreas || [];
  elements.rptGrowthList.innerHTML = growthAreas.map((g, idx) => `
    <div class="growth-item">
      <div class="growth-title">
        <span>⚠️ 改善机会 ${idx + 1}：${escapeHtml(g.title)}</span>
      </div>
      <div class="quote-box-warn">
        🔴 原对话句子：“${escapeHtml(g.quote || "")}”
      </div>
      <div class="impact-desc">
        <strong>盲点剖析：</strong> ${escapeHtml(g.impact || "")}
      </div>
      <div class="rewrite-box">
        <div class="rewrite-label">✨ 推荐示范金句 (Better Alternative)：</div>
        <div class="rewrite-quote">“${escapeHtml(g.betterAlternative || "")}”</div>
        <div class="rewrite-rationale"><strong>心法原理解析：</strong> ${escapeHtml(g.rationale || "")}</div>
      </div>
    </div>
  `).join("");

  elements.rptStageAnalysis.textContent = report.frameworkDeepDive?.stageAnalysis || "已展现初步实践。";
  elements.rptKeyTakeaway.textContent = report.frameworkDeepDive?.keyTakeaway || fw.proTip;

  const tips = report.deliberatePracticeTips || [
    "下次对话时，多停顿 3 秒再回应",
    "将“为什么”替换为“发生了什么事”",
    "确认对方感受后再切入解决方案"
  ];
  elements.rptPracticeTips.innerHTML = tips.map((tip, idx) => `
    <li class="action-tip-item">
      <span class="action-tip-num">${idx + 1}</span>
      <span>${escapeHtml(tip)}</span>
    </li>
  `).join("");
}

// =================== 历史记录保存与浏览 ===================
function saveToHistory(report) {
  const record = {
    id: "rec_" + Date.now(),
    date: new Date().toLocaleString("zh-CN"),
    targetName: state.targetConfig.targetName,
    targetRole: state.targetConfig.targetRole,
    frameworkId: state.targetConfig.frameworkId,
    score: report.overallScore || 80,
    level: report.overallLevel || "优秀教练",
    targetConfig: state.targetConfig,
    report: report,
    history: state.chatHistory
  };

  state.practiceHistory.unshift(record);
  if (state.practiceHistory.length > 30) state.practiceHistory.pop();
  localStorage.setItem("coachlab_history", JSON.stringify(state.practiceHistory));
}

function renderHistoryModal() {
  if (state.practiceHistory.length === 0) {
    elements.historyList.innerHTML = '<div style="text-align:center; padding: 2rem; color: #64748b;">目前尚无练习记录，完成一场练习后将自动为您保留！</div>';
    return;
  }

  elements.historyList.innerHTML = state.practiceHistory.map((item, idx) => {
    const fw = FRAMEWORKS_DATA[item.frameworkId] || FRAMEWORKS_DATA.nvc;
    return `
      <div class="history-item-card">
        <div class="history-item-left">
          <div class="history-item-title">${fw.icon} ${item.targetName} (${item.targetRole}) - ${fw.shortName}</div>
          <div class="history-item-meta">时间：${item.date} ｜ 评等：${item.level}</div>
        </div>
        <div class="history-item-right">
          <span class="history-score-chip">${item.score} 分</span>
          <button class="btn btn-outline btn-sm btn-view-history" data-idx="${idx}">查看报告</button>
        </div>
      </div>
    `;
  }).join("");

  document.querySelectorAll(".btn-view-history").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const idx = parseInt(e.currentTarget.dataset.idx, 10);
      const record = state.practiceHistory[idx];
      if (record) {
        state.targetConfig = record.targetConfig;
        state.chatHistory = record.history || [];
        state.evaluationReport = record.report;
        hideModals();
        switchView("report");
        renderEvaluationReport(record.report);
      }
    });
  });
}

// =================== Markdown 报告生成与复制 ===================
function copyReportMarkdown() {
  if (!state.evaluationReport) return;
  const r = state.evaluationReport;
  const fw = FRAMEWORKS_DATA[state.targetConfig?.frameworkId] || FRAMEWORKS_DATA.nvc;
  const turns = state.chatHistory.filter(m => m.role === "user").length;

  const strengthsMd = (r.strengths || []).map((s, i) => `### ${i + 1}. ${s.title}
> 💬 “${s.quote}”
- **亮点解析**：${s.analysis}
`).join("\n");

  const growthMd = (r.growthAreas || []).map((g, i) => `### ${i + 1}. ${g.title}
> 🔴 原始发言：“${g.quote}”
- **盲点剖析**：${g.impact}
- **✨ 示范金句**：“${g.betterAlternative}”
- **心法原理**：${g.rationale}
`).join("\n");

  const tipsMd = (r.deliberatePracticeTips || []).map((tip, i) => `${i + 1}. ${tip}`).join("\n");

  const md = `# 🎯 CoachLab 对话教练实战评估报告

- **练习时间**：${new Date().toLocaleString("zh-CN")}
- **沟通模型**：${fw.name} (${fw.subtitle})
- **练习对象**：${state.targetConfig?.targetName}（${state.targetConfig?.targetRole}）
- **情境背景**：${state.targetConfig?.scenario}
- **对话轮次**：${turns} 回合
- **综合得分**：**${r.overallScore} / 100**（评级：${r.overallLevel}）

---

## 📊 五大核心沟通维度
- 理论架构掌握度：${r.dimensionScores?.frameworkProficiency || 0} / 100
- 共情心与深度倾听：${r.dimensionScores?.empathyListening || 0} / 100
- 有力提问与启发性：${r.dimensionScores?.powerfulQuestioning || 0} / 100
- 心理安全感营造：${r.dimensionScores?.psychologicalSafety || 0} / 100
- 推进与责任赋能：${r.dimensionScores?.forwardMomentum || 0} / 100

---

## 📝 总体教练评述
${r.summary}

---

## 🌟 做得好的亮点 (Strengths)
${strengthsMd}

---

## 💡 改善机会与示范金句 (Growth Opportunities)
${growthMd}

---

## 🔍 理论架构深入诊断
- **层次深度分析**：${r.frameworkDeepDive?.stageAnalysis}
- **核心心法提醒**：${r.frameworkDeepDive?.keyTakeaway}

---

## 🚀 下一步刻意练习建议
${tipsMd}
`;

  navigator.clipboard.writeText(md).then(() => {
    alert("✅ 评估报告 Markdown 已成功复制到剪贴板！");
  }).catch(() => {
    prompt("请按 Ctrl+C 复制以下报告：", md);
  });
}

// =================== 弹窗交互控制 ===================
function showSettingsModal() {
  elements.inputApiKey.value = state.apiKey;
  elements.selectGeminiModel.value = state.geminiModel;
  elements.testKeyResult.classList.add("hidden");
  if (state.hasServerKey && state.isServerKeyValidFormat) {
    elements.inputApiKey.placeholder = `（已生效云端全局 Key ${state.serverKeyPreview || ""}，留空即可）`;
  } else {
    elements.inputApiKey.placeholder = "AIzaSy...";
  }
  updateServerKeyBannerUI();
  checkServerStatus(); // 异步刷新最新云端配置
  elements.modalSettings.classList.remove("hidden");
}

function showHintModal() {
  elements.modalHint.classList.remove("hidden");
}

function showHistoryModal() {
  renderHistoryModal();
  elements.modalHistory.classList.remove("hidden");
}

function hideModals() {
  elements.modalSettings.classList.add("hidden");
  elements.modalHint.classList.add("hidden");
  elements.modalHistory.classList.add("hidden");
}

// =================== 事件监听绑定 ===================
function bindEvents() {
  // 导航
  elements.brandLogo.addEventListener("click", () => {
    if (state.activeView !== "setup") {
      if (confirm("要返回首页设置吗？当前练习进度将会重置。")) {
        switchView("setup");
      }
    }
  });

  elements.btnSettings.addEventListener("click", showSettingsModal);
  elements.btnCloseSettings.addEventListener("click", hideModals);

  elements.btnHistory.addEventListener("click", showHistoryModal);
  elements.btnCloseHistory.addEventListener("click", hideModals);
  elements.btnDismissHistory.addEventListener("click", hideModals);

  // Settings 密钥操作
  elements.btnToggleKeyVisibility.addEventListener("click", () => {
    const input = elements.inputApiKey;
    input.type = input.type === "password" ? "text" : "password";
  });

  elements.btnSaveSettings.addEventListener("click", () => {
    state.apiKey = elements.inputApiKey.value.trim();
    state.geminiModel = elements.selectGeminiModel.value;
    localStorage.setItem("gemini_api_key", state.apiKey);
    localStorage.setItem("gemini_model", state.geminiModel);
    updateKeyStatusUI();
    hideModals();
    alert("设置已保存！" + (state.apiKey ? "（将优先使用您设置的专属 API Key）" : "（将使用云端全局配置）"));
  });

  elements.btnTestConnection.addEventListener("click", async () => {
    const testKey = elements.inputApiKey.value.trim();
    const model = elements.selectGeminiModel.value;
    elements.testKeyResult.className = "test-result-box";
    elements.testKeyResult.textContent = testKey 
      ? "正在测试客户端自定义 API Key..." 
      : "输入框为空，正在测试 Cloudflare 云端全局 API Key...";
    elements.testKeyResult.classList.remove("hidden");

    try {
      const res = await fetch("/api/test-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: testKey, modelName: model })
      });
      const data = await res.json();
      if (data.ok) {
        elements.testKeyResult.className = "test-result-box test-success";
        elements.testKeyResult.textContent = data.message || "✅ 连接成功！Google AI API 运行正常。";
        // 刷新一次云端状态
        await checkServerStatus();
      } else {
        throw new Error(data.error || "测试失败");
      }
    } catch (err) {
      elements.testKeyResult.className = "test-result-box test-error";
      elements.testKeyResult.textContent = "❌ 连接失败：" + err.message;
    }
  });

  // Setup View
  elements.btnStartPractice.addEventListener("click", startPractice);

  // Practice View
  elements.btnSendMessage.addEventListener("click", handleSendMessage);
  elements.userInputText.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });

  elements.btnGetHint.addEventListener("click", handleGetHint);
  elements.btnCloseHint.addEventListener("click", hideModals);
  elements.btnApplyHint.addEventListener("click", hideModals);

  elements.btnUndoTurn.addEventListener("click", handleUndoTurn);
  elements.btnEndPractice.addEventListener("click", handleEndAndEvaluate);

  elements.btnFrameworkGuideToggle.addEventListener("click", () => {
    elements.frameworkCheatSheet.classList.toggle("hidden");
  });

  elements.toggleInnerThoughts.addEventListener("change", (e) => {
    const show = e.target.checked;
    document.querySelectorAll(".inner-thought-pill").forEach(el => {
      el.classList.toggle("hidden", !show);
    });
  });

  // Report View
  elements.btnCopyReport.addEventListener("click", copyReportMarkdown);
  elements.btnPracticeAgain.addEventListener("click", () => {
    if (state.targetConfig) {
      startPractice();
    }
  });
  elements.btnNewPractice.addEventListener("click", () => {
    switchView("setup");
  });
  elements.btnPrintReport.addEventListener("click", () => {
    window.print();
  });

  // History Clear
  elements.btnClearHistory.addEventListener("click", () => {
    if (confirm("确定要清空所有历史练习记录吗？此动作无法复原。")) {
      state.practiceHistory = [];
      localStorage.removeItem("coachlab_history");
      renderHistoryModal();
    }
  });

  // 点击弹窗外关闭
  [elements.modalSettings, elements.modalHint, elements.modalHistory].forEach(modal => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) hideModals();
    });
  });
}

// 辅助函数
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatMarkdownLike(str) {
  if (!str) return "";
  let out = escapeHtml(str);
  out = out.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\n/g, "<br>");
  return out;
}

// 启动 App
initApp();
