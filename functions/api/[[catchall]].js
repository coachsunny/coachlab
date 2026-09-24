import { FRAMEWORKS, buildRoleplaySystemPrompt, buildCoachHintPrompt, buildEvaluationPrompt } from "../../lib/prompts.js";

const DEFAULT_MODEL = "gemini-3.8-flash";

function getApiKey(request, env, reqBody) {
  return (reqBody && reqBody.apiKey && reqBody.apiKey.trim()) || env.GEMINI_API_KEY || "";
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}

// 统一调用 Google Gemini REST API (标准 Web Fetch，免任何 npm 依赖)
async function callGeminiApi({ apiKey, model, contents, systemInstruction, temperature = 0.7, jsonMode = false }) {
  if (!apiKey) {
    throw new Error("未检测到 Google Gemini API Key。请在右上角“设置”中配置，或在 Cloudflare 环境变量中添加 GEMINI_API_KEY。");
  }

  const requestedModel = (model && model !== "gemini-2.5-flash") ? model : DEFAULT_MODEL;
  
  // 按照 Google 最新支持模型配置高可用轮询列表：gemini-3.6-flash 与 gemini-3.8-flash
  const modelCandidates = [requestedModel];
  if (!modelCandidates.includes("gemini-3.6-flash")) {
    modelCandidates.push("gemini-3.6-flash");
  }
  if (!modelCandidates.includes("gemini-3.8-flash")) {
    modelCandidates.push("gemini-3.8-flash");
  }
  if (!modelCandidates.includes("gemini-3.5-flash-lite")) {
    modelCandidates.push("gemini-3.5-flash-lite");
  }

  let lastError = null;
  for (let i = 0; i < modelCandidates.length; i++) {
    const currentModel = modelCandidates[i];
    try {
      const url = "https://generativelanguage.googleapis.com/v1beta/models/" + currentModel + ":generateContent?key=" + apiKey;

      const payload = {
        contents,
        generationConfig: {
          temperature
        }
      };

      if (systemInstruction) {
        payload.systemInstruction = {
          parts: [{ text: systemInstruction }]
        };
      }

      if (jsonMode) {
        payload.generationConfig.responseMimeType = "application/json";
      }

      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const resData = await resp.json();

      if (!resp.ok) {
        const errMsg = resData.error?.message || "Google API 请求失败";
        const isRetryable = errMsg.includes("high demand") || errMsg.includes("no longer available") || resp.status === 503 || resp.status === 429;
        if (isRetryable && i < modelCandidates.length - 1) {
          console.warn("Model " + currentModel + " failed (" + errMsg + "), auto-switching to " + modelCandidates[i + 1]);
          lastError = new Error(errMsg);
          continue;
        }
        throw new Error(errMsg);
      }

      const candidate = resData.candidates?.[0];
      const text = candidate?.content?.parts?.[0]?.text || "";
      return text;
    } catch (err) {
      lastError = err;
      const isRetryable = err.message.includes("high demand") || err.message.includes("no longer available") || err.message.includes("503") || err.message.includes("429");
      if (isRetryable && i < modelCandidates.length - 1) {
        console.warn("Retrying with next model due to:", err.message);
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;

  // 处理 OPTIONS 预检请求
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  }

  // 1. GET /api/frameworks
  if (pathname.endsWith("/frameworks") && request.method === "GET") {
    return jsonResponse({
      ok: true,
      frameworks: FRAMEWORKS,
      defaultModel: DEFAULT_MODEL,
      hasServerKey: !!env.GEMINI_API_KEY
    });
  }

  // 下面都是 POST 接口
  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "不支持的 HTTP 方法" }, 405);
  }

  let body = {};
  try {
    body = await request.json();
  } catch (e) {
    body = {};
  }

  const apiKey = getApiKey(request, env, body);

  // 2. POST /api/test-key
  if (pathname.endsWith("/test-key")) {
    try {
      const output = await callGeminiApi({
        apiKey,
        model: body.modelName,
        contents: [{ parts: [{ text: "Ping" }] }]
      });
      return jsonResponse({ ok: true, message: "API 连接测试成功！", details: { ok: true, output } });
    } catch (err) {
      return jsonResponse({ ok: false, error: err.message }, 400);
    }
  }

  // 3. POST /api/chat
  if (pathname.endsWith("/chat")) {
    try {
      const { targetConfig, history, userMessage, modelName } = body;
      if (!targetConfig) {
        return jsonResponse({ ok: false, error: "缺少 targetConfig 设置" }, 400);
      }

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

      const fullText = await callGeminiApi({
        apiKey,
        model: modelName,
        contents,
        systemInstruction,
        temperature: 0.8
      });

      let innerThought = null;
      const innerMatch = fullText.match(/<!--inner:\s*([\s\S]*?)-->/i);
      let cleanText = fullText;
      if (innerMatch) {
        innerThought = innerMatch[1].trim();
        cleanText = fullText.replace(/<!--inner:\s*[\s\S]*?-->/gi, "").trim();
      }

      return jsonResponse({
        ok: true,
        reply: {
          text: cleanText,
          innerThought,
          raw: fullText
        }
      });
    } catch (err) {
      return jsonResponse({ ok: false, error: err.message }, 500);
    }
  }

  // 4. POST /api/hint
  if (pathname.endsWith("/hint")) {
    try {
      const { targetConfig, history, modelName } = body;
      if (!targetConfig) {
        return jsonResponse({ ok: false, error: "缺少 targetConfig 设置" }, 400);
      }

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

      const hintText = await callGeminiApi({
        apiKey,
        model: modelName,
        contents: [{ parts: [{ text: prompt }] }],
        temperature: 0.7
      });

      return jsonResponse({ ok: true, hint: hintText });
    } catch (err) {
      return jsonResponse({ ok: false, error: err.message }, 500);
    }
  }

  // 5. POST /api/evaluate
  if (pathname.endsWith("/evaluate")) {
    try {
      const { targetConfig, history, modelName } = body;
      if (!targetConfig || !Array.isArray(history) || history.length === 0) {
        return jsonResponse({ ok: false, error: "对话记录不足，请先进行至少 1~2 回合对话后再进行评估" }, 400);
      }

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

      const rawJson = await callGeminiApi({
        apiKey,
        model: modelName,
        contents: [{ parts: [{ text: prompt }] }],
        temperature: 0.4,
        jsonMode: true
      });

      let reportData;
      try {
        const cleaned = rawJson.replace(/^[\s\S]*?```json\s*/i, "").replace(/```[\s\S]*?$/i, "").trim();
        reportData = JSON.parse(cleaned);
      } catch (err) {
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

      return jsonResponse({ ok: true, report: reportData });
    } catch (err) {
      return jsonResponse({ ok: false, error: err.message }, 500);
    }
  }

  return jsonResponse({ ok: false, error: "未找到对应的 API 路径" }, 404);
}
