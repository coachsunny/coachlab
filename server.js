import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { FRAMEWORKS } from "./lib/prompts.js";
import {
  testGeminiKey,
  generateRoleplayResponse,
  generateCoachHint,
  generateEvaluationReport,
  getDefaultModel
} from "./lib/gemini.js";
import {
  testDeepSeekKey,
  generateDeepSeekRoleplayResponse,
  generateDeepSeekCoachHint,
  generateDeepSeekEvaluationReport,
  DEFAULT_DEEPSEEK_MODEL
} from "./lib/deepseek.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));

// /admin 捷徑導向後台頁面
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});
app.get("/admin/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// 學員實戰練習紀錄與導師管理後台（本地記憶體儲存）
let memoryPracticeLogs = [];
const adminSessions = new Map();

function getAdminCredentials() {
  const username = (process.env.ADMIN_USERNAME || "admin").trim();
  const password = (process.env.ADMIN_PASSWORD || "coachlab2026").trim();
  return { username, password };
}

function verifyAdminSession(req) {
  const authHeader = req.headers["authorization"] || req.headers["x-admin-token"] || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const session = adminSessions.get(token);
  if (session && session.expiresAt > Date.now()) {
    return session;
  }

  if (process.env.ADMIN_SECRET && token === process.env.ADMIN_SECRET.trim()) {
    return { username: "admin", token };
  }

  return null;
}

function getKeyPreview(key) {
  if (!key || key.length < 8) return "";
  return key.slice(0, 6) + "..." + key.slice(-4);
}

function resolveProvider(apiKey, modelName) {
  const cleanKey = (apiKey && typeof apiKey === "string") ? apiKey.trim() : "";
  const cleanModel = (modelName && typeof modelName === "string") ? modelName.trim().toLowerCase() : "";

  if (cleanKey.startsWith("sk-") && !cleanKey.startsWith("AIza")) {
    return "deepseek";
  }
  if (cleanKey.startsWith("AIza") || cleanKey.startsWith("AQ.")) {
    return "gemini";
  }
  if (cleanModel.startsWith("deepseek")) {
    return "deepseek";
  }
  if (cleanModel.startsWith("gemini")) {
    return "gemini";
  }

  // 伺服器端環境變數
  if (process.env.DEEPSEEK_API_KEY && !process.env.GEMINI_API_KEY) {
    return "deepseek";
  }
  return "gemini";
}

/**
 * 取得支援的理論框架列表與雙引擎金鑰狀態
 */
app.get("/api/frameworks", (req, res) => {
  const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "").trim();
  const deepseekKey = (process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_KEY || "").trim();

  const isValidGemini = geminiKey.startsWith("AIzaSy") || geminiKey.startsWith("AQ.");
  const isValidDeepseek = deepseekKey.startsWith("sk-");

  const providers = [];
  if (geminiKey) providers.push("gemini");
  if (deepseekKey) providers.push("deepseek");

  const defaultModel = deepseekKey && !geminiKey ? DEFAULT_DEEPSEEK_MODEL : getDefaultModel();

  res.json({
    ok: true,
    frameworks: FRAMEWORKS,
    defaultModel,
    hasServerKey: !!(geminiKey || deepseekKey),
    hasServerGemini: !!geminiKey,
    hasServerDeepseek: !!deepseekKey,
    serverKeyPreview: geminiKey ? getKeyPreview(geminiKey) : (deepseekKey ? getKeyPreview(deepseekKey) : null),
    serverGeminiPreview: geminiKey ? getKeyPreview(geminiKey) : null,
    serverDeepseekPreview: deepseekKey ? getKeyPreview(deepseekKey) : null,
    isServerKeyValidFormat: isValidGemini || isValidDeepseek,
    providers: providers.length > 0 ? providers : ["gemini", "deepseek"]
  });
});

/**
 * 測試 API Key 有效性 (自動適配 DeepSeek 或 Google Gemini)
 */
app.post("/api/test-key", async (req, res) => {
  try {
    const { apiKey, modelName } = req.body;
    const isClientKey = !!(apiKey && apiKey.trim());
    const provider = resolveProvider(apiKey, modelName);

    if (provider === "deepseek") {
      const result = await testDeepSeekKey(apiKey, modelName);
      res.json({
        ok: true,
        provider: "deepseek",
        message: isClientKey ? `✅ 個人 DeepSeek API Key (${result.model}) 測試成功！` : `✅ 伺服器全局 DeepSeek API Key 驗證成功！`,
        details: result
      });
    } else {
      const result = await testGeminiKey(apiKey, modelName);
      res.json({
        ok: true,
        provider: "gemini",
        message: isClientKey ? `✅ 個人 Gemini API Key (${result.model}) 測試成功！` : `✅ 伺服器全局 Gemini API Key 驗證成功！所有用戶無需配置即可使用。`,
        details: result
      });
    }
  } catch (error) {
    console.error("Test API Key Error:", error.message);
    res.status(400).json({
      ok: false,
      error: error.message || "API 連線失敗，請檢查金鑰與網路連線"
    });
  }
});

/**
 * 角色扮演對話交互 (支援 DeepSeek / Gemini)
 */
app.post("/api/chat", async (req, res) => {
  try {
    const { apiKey, targetConfig, history, userMessage, modelName } = req.body;
    if (!targetConfig) {
      return res.status(400).json({ ok: false, error: "缺少 targetConfig 角色與情境設定" });
    }

    const provider = resolveProvider(apiKey, modelName);
    let result;

    if (provider === "deepseek") {
      result = await generateDeepSeekRoleplayResponse({
        apiKey,
        targetConfig,
        history: history || [],
        userMessage: userMessage || "",
        modelName: modelName || DEFAULT_DEEPSEEK_MODEL
      });
    } else {
      result = await generateRoleplayResponse({
        apiKey,
        targetConfig,
        history: history || [],
        userMessage: userMessage || "",
        modelName: modelName || getDefaultModel()
      });
    }

    res.json({ ok: true, reply: result, provider });
  } catch (error) {
    console.error("Chat Error:", error.message);
    res.status(500).json({
      ok: false,
      error: error.message || "生成對話回應失敗"
    });
  }
});

/**
 * 取得即時教練錦囊提示 (支援 DeepSeek / Gemini)
 */
app.post("/api/hint", async (req, res) => {
  try {
    const { apiKey, targetConfig, history, modelName } = req.body;
    if (!targetConfig) {
      return res.status(400).json({ ok: false, error: "缺少 targetConfig 設定" });
    }

    const provider = resolveProvider(apiKey, modelName);
    let result;

    if (provider === "deepseek") {
      result = await generateDeepSeekCoachHint({
        apiKey,
        targetConfig,
        history: history || [],
        modelName: modelName || DEFAULT_DEEPSEEK_MODEL
      });
    } else {
      result = await generateCoachHint({
        apiKey,
        targetConfig,
        history: history || [],
        modelName: modelName || getDefaultModel()
      });
    }

    res.json({ ok: true, hint: result.hint, provider });
  } catch (error) {
    console.error("Hint Error:", error.message);
    res.status(500).json({
      ok: false,
      error: error.message || "取得教練錦囊失敗"
    });
  }
});

/**
 * 產生練習後全方位評估報告 (支援 DeepSeek / Gemini)
 */
app.post("/api/evaluate", async (req, res) => {
  try {
    const { apiKey, targetConfig, history, modelName } = req.body;
    if (!targetConfig || !Array.isArray(history) || history.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "對話記錄不足，請先進行至少 1~2 回合對話後再進行評估"
      });
    }

    const provider = resolveProvider(apiKey, modelName);
    let report;

    if (provider === "deepseek") {
      report = await generateDeepSeekEvaluationReport({
        apiKey,
        targetConfig,
        history,
        modelName: modelName || DEFAULT_DEEPSEEK_MODEL
      });
    } else {
      report = await generateEvaluationReport({
        apiKey,
        targetConfig,
        history,
        modelName: modelName || getDefaultModel()
      });
    }

    res.json({ ok: true, report, provider });
  } catch (error) {
    console.error("Evaluation Error:", error.message);
    res.status(500).json({
      ok: false,
      error: error.message || "生成評估報告失敗"
    });
  }
});

// ==========================================
// 學員練習紀錄與導師管理後台 API
// ==========================================

// 1. POST /api/practice-logs/submit (學員練習紀錄同步與中途即時快照)
app.post("/api/practice-logs/submit", (req, res) => {
  try {
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "本地學員";
    const body = req.body || {};
    const payload = (body && typeof body.log === "object" && body.log !== null) ? body.log : body;
    const logId = payload.id || ("log_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7));
    const status = payload.status || (payload.score ? "已完成評估" : "進行中 (未完成評估)");

    const logEntry = {
      id: logId,
      submittedAt: payload.submittedAt || new Date().toISOString(),
      clientIp,
      studentName: (payload.studentName || payload.studentNickname || "學員教練").trim(),
      frameworkId: payload.frameworkId || "nvc",
      frameworkName: payload.frameworkName || "",
      targetName: payload.targetName || "練習對象",
      targetRole: payload.targetRole || "",
      scenario: payload.scenario || "",
      difficulty: payload.difficulty || "realistic",
      turns: Number(payload.turns) || 1,
      score: Number(payload.score) || 0,
      level: payload.level || (status === "已完成評估" ? "精準教練" : "演練進行中"),
      status,
      dimensionScores: payload.dimensionScores || {},
      summary: payload.summary || (status === "進行中 (未完成評估)" ? `學員正進行第 ${payload.turns || 1} 輪對話演練中...` : ""),
      strengths: Array.isArray(payload.strengths) ? payload.strengths : [],
      growthAreas: Array.isArray(payload.growthAreas) ? payload.growthAreas : [],
      deliberatePracticeTips: Array.isArray(payload.deliberatePracticeTips) ? payload.deliberatePracticeTips : [],
      frameworkDeepDive: payload.frameworkDeepDive || null,
      dialogueHistory: Array.isArray(payload.dialogueHistory) ? payload.dialogueHistory : []
    };

    const existingIdx = memoryPracticeLogs.findIndex(l => l.id === logId);
    if (existingIdx >= 0) {
      memoryPracticeLogs[existingIdx] = logEntry;
    } else {
      memoryPracticeLogs.unshift(logEntry);
    }
    if (memoryPracticeLogs.length > 500) memoryPracticeLogs.length = 500;

    res.json({ ok: true, id: logEntry.id, message: "練習紀錄已成功歸檔至導師後台" });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || "歸檔失敗" });
  }
});

// 2. POST /api/admin/login
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body || {};
  const creds = getAdminCredentials();
  if (username === creds.username && password === creds.password) {
    const token = "clt_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
    adminSessions.set(token, { username, createdAt: Date.now(), expiresAt });
    return res.json({ ok: true, token, username });
  }
  return res.status(401).json({ ok: false, error: "管理員帳號或密碼錯誤" });
});

// 3. GET /api/admin/verify
app.get("/api/admin/verify", (req, res) => {
  const session = verifyAdminSession(req);
  if (!session) {
    return res.status(401).json({ ok: false, error: "未授權或登入已過期" });
  }
  res.json({ ok: true, username: session.username });
});

// 4. GET /api/admin/practice-logs
app.get("/api/admin/practice-logs", (req, res) => {
  const session = verifyAdminSession(req);
  if (!session) {
    return res.status(401).json({ ok: false, error: "未授權訪問管理端點" });
  }

  const search = (req.query.search || "").toLowerCase().trim();
  const framework = (req.query.framework || "all").trim();
  const level = (req.query.level || "all").trim();

  let filtered = memoryPracticeLogs;
  if (search) {
    filtered = filtered.filter(l =>
      (l.studentName && l.studentName.toLowerCase().includes(search)) ||
      (l.targetName && l.targetName.toLowerCase().includes(search)) ||
      (l.scenario && l.scenario.toLowerCase().includes(search)) ||
      (l.summary && l.summary.toLowerCase().includes(search))
    );
  }
  if (framework && framework !== "all") {
    filtered = filtered.filter(l => l.frameworkId === framework);
  }
  if (level && level !== "all") {
    filtered = filtered.filter(l => l.level === level);
  }

  const totalCount = memoryPracticeLogs.length;
  const uniqueStudents = new Set(memoryPracticeLogs.map(l => l.studentName || "學員教練")).size;
  const avgScore = totalCount > 0
    ? Math.round(memoryPracticeLogs.reduce((sum, l) => sum + (l.score || 0), 0) / totalCount)
    : 0;

  const fwCounts = {};
  memoryPracticeLogs.forEach(l => {
    const fw = l.frameworkId || "nvc";
    fwCounts[fw] = (fwCounts[fw] || 0) + 1;
  });
  let topFramework = "NVC";
  let topCount = 0;
  for (const [k, v] of Object.entries(fwCounts)) {
    if (v > topCount) {
      topCount = v;
      topFramework = k.toUpperCase();
    }
  }

  res.json({
    ok: true,
    stats: {
      totalCount,
      uniqueStudents,
      avgScore,
      topFramework
    },
    logs: filtered
  });
});

// 5. GET /api/admin/practice-logs/detail
app.get("/api/admin/practice-logs/detail", (req, res) => {
  const session = verifyAdminSession(req);
  if (!session) {
    return res.status(401).json({ ok: false, error: "未授權訪問管理端點" });
  }

  const logId = req.query.id;
  const log = memoryPracticeLogs.find(l => l.id === logId);
  if (!log) {
    return res.status(404).json({ ok: false, error: "找不到該筆學員練習紀錄" });
  }

  res.json({ ok: true, log });
});

// 6. POST /api/admin/practice-logs/delete
app.post("/api/admin/practice-logs/delete", (req, res) => {
  const session = verifyAdminSession(req);
  if (!session) {
    return res.status(401).json({ ok: false, error: "未授權訪問管理端點" });
  }

  const logId = req.body?.id;
  memoryPracticeLogs = memoryPracticeLogs.filter(l => l.id !== logId);
  res.json({ ok: true, message: "紀錄已成功刪除" });
});

// 7. POST /api/admin/practice-logs/clear
app.post("/api/admin/practice-logs/clear", (req, res) => {
  const session = verifyAdminSession(req);
  if (!session) {
    return res.status(401).json({ ok: false, error: "未授權訪問管理端點" });
  }

  memoryPracticeLogs = [];
  res.json({ ok: true, message: "已清空所有練習紀錄" });
});

// 8. POST /api/admin/import-save (導師後台直接匯入學員的 JSON 存檔檔案)
app.post("/api/admin/import-save", (req, res) => {
  const session = verifyAdminSession(req);
  if (!session) {
    return res.status(401).json({ ok: false, error: "未授權訪問管理端點" });
  }

  const rawData = req.body?.data || req.body;
  let importedCount = 0;
  const items = Array.isArray(rawData) ? rawData : (Array.isArray(rawData.practiceLogs) ? rawData.practiceLogs : [rawData]);

  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const logId = item.id || ("log_imp_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7));
    const entry = {
      id: logId,
      submittedAt: item.submittedAt || item.date || new Date().toISOString(),
      clientIp: item.clientIp || "匯入檔案",
      studentName: (item.studentName || item.studentNickname || "匯入學員").trim(),
      frameworkId: item.frameworkId || "nvc",
      frameworkName: item.frameworkName || "",
      targetName: item.targetName || "練習對象",
      targetRole: item.targetRole || "",
      scenario: item.scenario || "",
      difficulty: item.difficulty || "realistic",
      turns: Number(item.turns) || 1,
      score: Number(item.score) || 0,
      level: item.level || "精準教練",
      status: item.status || "已完成評估",
      dimensionScores: item.dimensionScores || {},
      summary: item.summary || "",
      strengths: Array.isArray(item.strengths) ? item.strengths : [],
      growthAreas: Array.isArray(item.growthAreas) ? item.growthAreas : [],
      deliberatePracticeTips: Array.isArray(item.deliberatePracticeTips) ? item.deliberatePracticeTips : [],
      frameworkDeepDive: item.frameworkDeepDive || null,
      dialogueHistory: Array.isArray(item.dialogueHistory) ? item.dialogueHistory : []
    };

    const existingIdx = memoryPracticeLogs.findIndex(l => l.id === logId);
    if (existingIdx >= 0) {
      memoryPracticeLogs[existingIdx] = entry;
    } else {
      memoryPracticeLogs.unshift(entry);
      importedCount++;
    }
  }

  if (memoryPracticeLogs.length > 500) memoryPracticeLogs.length = 500;
  res.json({
    ok: true,
    message: `成功匯入學員存檔，新增/更新了 ${importedCount} 筆實戰紀錄！`,
    importedCount
  });
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 CoachLab 對話教練練習程序已啟動！`);
  console.log(`🌐 本地地址: http://localhost:${PORT}`);
  console.log(`🤖 預設 Gemini 模型: ${getDefaultModel()}`);
  console.log(`🟢 預設 DeepSeek 模型: ${DEFAULT_DEEPSEEK_MODEL}`);
  console.log(`🔑 伺服器 Gemini Key: ${process.env.GEMINI_API_KEY ? "已配置" : "未配置"}`);
  console.log(`🔑 伺服器 DeepSeek Key: ${process.env.DEEPSEEK_API_KEY ? "已配置" : "未配置"}`);
  console.log(`=================================================`);
});
