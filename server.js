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
