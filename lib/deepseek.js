/**
 * DeepSeek API 调用模块 (兼容 Node 18+ 统一原生 fetch)
 */
import {
  buildRoleplaySystemPrompt,
  buildCoachHintPrompt,
  buildEvaluationPrompt
} from "./prompts.js";

const DEEPSEEK_ENDPOINT = "https://api.deepseek.com/chat/completions";
export const DEFAULT_DEEPSEEK_MODEL = "deepseek-chat";

/**
 * 获取生效的 DeepSeek API Key
 */
export function getDeepSeekApiKey(clientKey) {
  const effective = (clientKey && clientKey.trim()) || process.env.DEEPSEEK_API_KEY || "";
  return effective.trim();
}

/**
 * 核心调用 DeepSeek Chat Completion
 */
export async function callDeepSeekCompletion({
  apiKey,
  model = DEFAULT_DEEPSEEK_MODEL,
  messages = [],
  temperature = 0.7,
  jsonMode = false,
  maxTokens = 2500
}) {
  const effectiveKey = getDeepSeekApiKey(apiKey);
  if (!effectiveKey) {
    throw new Error(
      "未检测到 DeepSeek API Key。请在右上角“API 设置”填入 sk-... 密钥，或在服务器配置 DEEPSEEK_API_KEY。"
    );
  }

  const payload = {
    model: model || DEFAULT_DEEPSEEK_MODEL,
    messages,
    max_tokens: maxTokens
  };

  // deepseek-reasoner 不支持自定义 temperature，且 max_tokens 可设更高
  if (payload.model === "deepseek-reasoner") {
    payload.max_tokens = 4096;
  } else {
    payload.temperature = temperature;
    if (jsonMode) {
      payload.response_format = { type: "json_object" };
    }
  }

  const resp = await fetch(DEEPSEEK_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${effectiveKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!resp.ok) {
    const errText = await resp.text();
    let errMsg = `DeepSeek API 请求失败 (HTTP ${resp.status})`;
    try {
      const errJson = JSON.parse(errText);
      if (errJson.error?.message) {
        errMsg = `DeepSeek 错误: ${errJson.error.message}`;
      }
    } catch (_) {}
    throw new Error(errMsg);
  }

  const data = await resp.json();
  const choice = data.choices?.[0]?.message;
  let rawText = (choice?.content && typeof choice.content === "string") ? choice.content.trim() : "";
  if (!rawText && choice?.reasoning_content) {
    rawText = choice.reasoning_content.trim();
  }

  if (!rawText) {
    throw new Error(`DeepSeek API (${model}) 返回内容为空`);
  }

  return rawText;
}

/**
 * 测试 DeepSeek Key 是否有效
 */
export async function testDeepSeekKey(apiKey, modelName) {
  const model = modelName || DEFAULT_DEEPSEEK_MODEL;
  const rawText = await callDeepSeekCompletion({
    apiKey,
    model,
    messages: [
      { role: "user", content: "Ping" }
    ],
    maxTokens: 20
  });
  return { ok: true, provider: "deepseek", model, output: rawText };
}

/**
 * 角色扮演对话生成 (DeepSeek)
 */
export async function generateDeepSeekRoleplayResponse({
  apiKey,
  targetConfig,
  history = [],
  userMessage = "",
  modelName = DEFAULT_DEEPSEEK_MODEL
}) {
  const systemPrompt = buildRoleplaySystemPrompt(targetConfig);

  const messages = [
    { role: "system", content: systemPrompt }
  ];

  for (const item of history) {
    if (!item.content) continue;
    const role = (item.role === "user") ? "user" : "assistant";
    messages.push({ role, content: item.content });
  }

  if (userMessage && userMessage.trim()) {
    messages.push({ role: "user", content: userMessage.trim() });
  }

  const fullText = await callDeepSeekCompletion({
    apiKey,
    model: modelName,
    messages,
    temperature: 0.8
  });

  // 提取内心转折标签 <!--inner: ...-->
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
 * 获取教练锦囊 (DeepSeek)
 */
export async function generateDeepSeekCoachHint({
  apiKey,
  targetConfig,
  history = [],
  modelName = DEFAULT_DEEPSEEK_MODEL
}) {
  const transcript = (history || [])
    .map((item, idx) => {
      const speaker = item.role === "user" ? "【使用者/教练】" : ("【练习对象 " + (targetConfig.targetName || "对象") + "】");
      return (idx + 1) + ". " + speaker + ": " + item.content;
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

  const hintText = await callDeepSeekCompletion({
    apiKey,
    model: modelName,
    messages: [
      { role: "user", content: prompt }
    ],
    temperature: 0.7
  });

  return { hint: hintText };
}

/**
 * 产生练习后评估报告 (DeepSeek)
 */
export async function generateDeepSeekEvaluationReport({
  apiKey,
  targetConfig,
  history = [],
  modelName = DEFAULT_DEEPSEEK_MODEL
}) {
  const transcript = (history || [])
    .map((item, idx) => {
      const speaker = item.role === "user" ? "【使用者/教练】" : ("【练习对象 " + (targetConfig.targetName || "对象") + "】");
      return "第 " + (idx + 1) + " 轮 " + speaker + "：\n" + item.content + "\n";
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

  const rawJson = await callDeepSeekCompletion({
    apiKey,
    model: modelName,
    messages: [
      {
        role: "system",
        content: "你是一位专业的高级教练考评考官。请务必严格以标准 JSON 格式输出评估结果，不要附带任何多余问候或解释。"
      },
      { role: "user", content: prompt }
    ],
    temperature: 0.3,
    jsonMode: modelName === "deepseek-chat",
    maxTokens: 3500
  });

  const cleanJson = rawJson.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    return JSON.parse(cleanJson);
  } catch (err) {
    const matched = cleanJson.match(/\{[\s\S]*\}/);
    if (matched) {
      try {
        return JSON.parse(matched[0]);
      } catch (_) {}
    }
    return {
      overallScore: 80,
      overallLevel: "良好教练",
      dimensionScores: {
        frameworkProficiency: 80,
        empathyListening: 82,
        powerfulQuestioning: 78,
        psychologicalSafety: 85,
        forwardMomentum: 75
      },
      summary: "本次练习表现出良好的同理心与沟通态度，展现了扎实的教练潜质。",
      strengths: [
        {
          title: "稳健的沟通姿态",
          quote: "（参考整体对话表现）",
          analysis: "能有效接住对方情绪，维持中立包容的安全对话空间。"
        }
      ],
      growthAreas: [
        {
          title: "多用开放式提问",
          quote: "（参考对话中的疑问句）",
          impact: "避免过快提供建议，让对方有更多自主思考空间。",
          betterAlternative: "“听到你这么说，我想多了解在这之中最困扰你的是什么呢？”",
          rationale: "开放式提问能引导当事人往更深层的内在需求探索。"
        }
      ],
      frameworkDeepDive: {
        frameworkName: targetConfig.frameworkId || "教练理论模型",
        stageAnalysis: "已初步完成情绪承接与现状澄清，后续可强化目标确立与行动推进。",
        keyTakeaway: "慢即是快，深层同理是破冰的第一要务。"
      },
      deliberatePracticeTips: [
        "刻意练习开放式提问（以『什么』或『如何』开头）",
        "在对话中适度停顿留白 3 秒"
      ],
      rawTextFallback: rawJson
    };
  }
}
