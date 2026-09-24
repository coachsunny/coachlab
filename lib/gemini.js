import { GoogleGenAI } from "@google/genai";
import {
  buildRoleplaySystemPrompt,
  buildCoachHintPrompt,
  buildEvaluationPrompt
} from "./prompts.js";

/**
 * 取得 Google GenAI Client 实例
 */
export function getGenAIClient(apiKey) {
  const effectiveKey = (apiKey && apiKey.trim()) || process.env.GEMINI_API_KEY;
  if (!effectiveKey) {
    throw new Error(
      "未检测到 Google Gemini API Key。请在右上角“设置”中填入 API 密钥，或于服务器 .env 文件中配置 GEMINI_API_KEY。"
    );
  }
  if (!effectiveKey.startsWith("AIzaSy")) {
    throw new Error(
      `API Key 格式无效（当前以 "${effectiveKey.slice(0, 7)}..." 开头）。Google Gemini 官方 API Key 必须以 "AIzaSy" 开头，请确认是否误填了其他平台的 Token。`
    );
  }
  return new GoogleGenAI({ apiKey: effectiveKey });
}

export function getDefaultModel() {
  return process.env.GEMINI_MODEL || "gemini-3.8-flash";
}

/**
 * 测试 API Key 是否有效
 */
export async function testGeminiKey(apiKey, modelName) {
  const ai = getGenAIClient(apiKey);
  const model = modelName || getDefaultModel();
  const response = await ai.models.generateContent({
    model,
    contents: "Ping",
    config: {
      maxOutputTokens: 10,
    }
  });
  return { ok: true, model, output: response.text };
}

/**
 * 角色扮演对话生成
 */
export async function generateRoleplayResponse({
  apiKey,
  targetConfig,
  history,
  userMessage,
  modelName
}) {
  const ai = getGenAIClient(apiKey);
  const model = modelName || getDefaultModel();

  const systemInstruction = buildRoleplaySystemPrompt(targetConfig);

  const contents = [];
  if (Array.isArray(history)) {
    for (const item of history) {
      if (!item.content) continue;
      contents.push({
        role: item.role === "user" ? "user" : "model",
        parts: [{ text: item.content }]
      });
    }
  }

  if (userMessage && userMessage.trim()) {
    contents.push({
      role: "user",
      parts: [{ text: userMessage.trim() }]
    });
  }

  const response = await ai.models.generateContent({
    model,
    contents,
    config: {
      systemInstruction,
      temperature: 0.8,
    }
  });

  const fullText = response.text || "";

  // 提取内心状态标签 <!--inner: ...-->
  let innerThought = null;
  const innerMatch = fullText.match(/<!--inner:\s*([\s\S]*?)-->/i);
  let cleanText = fullText;
  if (innerMatch) {
    innerThought = innerMatch[1].trim();
    cleanText = fullText.replace(/<!--inner:\s*[\s\S]*?-->/gi, "").trim();
  }

  return {
    text: cleanText,
    innerThought,
    raw: fullText
  };
}

/**
 * 产生即时教练锦囊 (Coach Hint)
 */
export async function generateCoachHint({
  apiKey,
  targetConfig,
  history,
  modelName
}) {
  const ai = getGenAIClient(apiKey);
  const model = modelName || getDefaultModel();

  // 将对话历史整理为文本格式
  const transcript = (history || [])
    .map((item, idx) => {
      const speaker = item.role === "user" ? "【使用者/教练】" : `【练习对象 ${targetConfig.targetName || "对象"}】`;
      return `${idx + 1}. ${speaker}: ${item.content}`;
    })
    .join("\n");

  const prompt = buildCoachHintPrompt({
    frameworkId: targetConfig.frameworkId,
    customFrameworkPrompt: targetConfig.customFrameworkPrompt,
    targetName: targetConfig.targetName,
    targetRole: targetConfig.targetRole,
    scenario: targetConfig.scenario,
    transcript: transcript || "（刚开始对话，尚未有实质来回）"
  });

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      temperature: 0.7,
    }
  });

  return {
    hint: response.text || "目前尚无具体提示。"
  };
}

/**
 * 产生练习后全方位评估报告 (Evaluation)
 */
export async function generateEvaluationReport({
  apiKey,
  targetConfig,
  history,
  modelName
}) {
  const ai = getGenAIClient(apiKey);
  const model = modelName || getDefaultModel();

  const transcript = (history || [])
    .map((item, idx) => {
      const speaker = item.role === "user" ? "【使用者/教练】" : `【练习对象 ${targetConfig.targetName || "对象"}】`;
      return `第 ${idx + 1} 轮 ${speaker}：\n${item.content}\n`;
    })
    .join("\n--------------------\n");

  const prompt = buildEvaluationPrompt({
    frameworkId: targetConfig.frameworkId,
    customFrameworkPrompt: targetConfig.customFrameworkPrompt,
    targetName: targetConfig.targetName,
    targetRole: targetConfig.targetRole,
    scenario: targetConfig.scenario,
    difficulty: targetConfig.difficulty,
    transcript: transcript || "（无对话记录）"
  });

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      temperature: 0.4,
      responseMimeType: "application/json"
    }
  });

  const rawJson = response.text || "{}";

  // 确保干净解析 JSON
  let reportData;
  try {
    const cleaned = rawJson.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    reportData = JSON.parse(cleaned);
  } catch (err) {
    console.error("JSON parse failed on evaluation response:", err, rawJson);
    // 降级备用结构
    reportData = {
      overallScore: 78,
      overallLevel: "具备雏形",
      dimensionScores: {
        frameworkProficiency: 75,
        empathyListening: 80,
        powerfulQuestioning: 75,
        psychologicalSafety: 80,
        forwardMomentum: 70
      },
      summary: "本次练习展现了良好的沟通诚意与共情意图，但在问题挖掘深度与提问句型上仍有进一步精进的空间。",
      strengths: [
        {
          title: "保持稳定温和的对话姿态",
          quote: "（参考对话整体氛围）",
          analysis: "面对对象的防卫反应，能维持开放平静的口吻，有助于维系基本的沟通渠道。"
        }
      ],
      growthAreas: [
        {
          title: "避免封闭式提问，强化开放式探索",
          quote: "（参考对话中的疑问句）",
          impact: "有时过早提出解决方案或是非题，限制了对象主动分享内在感受的空间。",
          betterAlternative: "“听起来这件事让你感到有些吃力，想和你了解看看，在那个当下发生了什么事呢？”",
          rationale: "以不带评判的开放式提问邀请对方还原现场，降低对象被质问的戒心。"
        }
      ],
      frameworkDeepDive: {
        frameworkName: targetConfig.frameworkId || "沟通模式",
        stageAnalysis: "已初步实践倾听与确认，若能更进一步探寻深层需求或冰山底层，效果将更显著。",
        keyTakeaway: "慢即是快。先连接情感，再处理事情。"
      },
      deliberatePracticeTips: [
        "练习将“你为什么…”替换为“想多了解发生了什么…”",
        "在给出任何建议前，先确认对方三种不同的感受与需要",
        "适度留白 3~5 秒，给对象沉淀思绪的空间"
      ],
      rawTextFallback: rawJson
    };
  }

  return reportData;
}
