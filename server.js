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

/**
 * 取得支援的理论框架列表
 */
app.get("/api/frameworks", (req, res) => {
  const serverKey = process.env.GEMINI_API_KEY || "";
  const isValidFormat = serverKey.startsWith("AIzaSy") || serverKey.startsWith("AQ.");
  res.json({
    ok: true,
    frameworks: FRAMEWORKS,
    defaultModel: getDefaultModel(),
    hasServerKey: !!serverKey,
    serverKeyPreview: serverKey ? getKeyPreview(serverKey) : null,
    isServerKeyValidFormat: isValidFormat
  });
});

/**
 * 测试 API Key 有效性
 */
app.post("/api/test-key", async (req, res) => {
  try {
    const { apiKey, modelName } = req.body;
    const isClientKey = !!(apiKey && apiKey.trim());
    const result = await testGeminiKey(apiKey, modelName);
    res.json({
      ok: true,
      message: isClientKey ? "✅ 个人 API Key 测试成功！" : "✅ 服务器全局 API Key 验证成功！所有用户无需配置即可使用。",
      details: result
    });
  } catch (error) {
    console.error("Test API Key Error:", error.message);
    res.status(400).json({
      ok: false,
      error: error.message || "API 连接失败，请检查密钥与网络连接"
    });
  }
});

/**
 * 角色扮演对话交互
 */
app.post("/api/chat", async (req, res) => {
  try {
    const { apiKey, targetConfig, history, userMessage, modelName } = req.body;
    if (!targetConfig) {
      return res.status(400).json({ ok: false, error: "缺少 targetConfig 角色与情境设置" });
    }

    const result = await generateRoleplayResponse({
      apiKey,
      targetConfig,
      history: history || [],
      userMessage: userMessage || "",
      modelName
    });

    res.json({ ok: true, reply: result });
  } catch (error) {
    console.error("Chat Error:", error.message);
    res.status(500).json({
      ok: false,
      error: error.message || "生成对话回应失败"
    });
  }
});

/**
 * 取得即时教练锦囊提示
 */
app.post("/api/hint", async (req, res) => {
  try {
    const { apiKey, targetConfig, history, modelName } = req.body;
    if (!targetConfig) {
      return res.status(400).json({ ok: false, error: "缺少 targetConfig 设置" });
    }

    const result = await generateCoachHint({
      apiKey,
      targetConfig,
      history: history || [],
      modelName
    });

    res.json({ ok: true, hint: result.hint });
  } catch (error) {
    console.error("Hint Error:", error.message);
    res.status(500).json({
      ok: false,
      error: error.message || "取得教练锦囊失败"
    });
  }
});

/**
 * 产生练习后全方位评估报告
 */
app.post("/api/evaluate", async (req, res) => {
  try {
    const { apiKey, targetConfig, history, modelName } = req.body;
    if (!targetConfig || !Array.isArray(history) || history.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "对话记录不足，请先进行至少 1~2 回合对话后再进行评估"
      });
    }

    const report = await generateEvaluationReport({
      apiKey,
      targetConfig,
      history,
      modelName
    });

    res.json({ ok: true, report });
  } catch (error) {
    console.error("Evaluation Error:", error.message);
    res.status(500).json({
      ok: false,
      error: error.message || "生成评估报告失败"
    });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 CoachLab 对话教练练习程序已启动！`);
  console.log(`🌐 本地地址: http://localhost:${PORT}`);
  console.log(`🤖 默认模型: ${getDefaultModel()}`);
  console.log(`🔑 服务器端环境变量 API Key: ${process.env.GEMINI_API_KEY ? "已配置" : "未配置（可于网页界面填写）"}`);
  console.log(`=================================================`);
});
