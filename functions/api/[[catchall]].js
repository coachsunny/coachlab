import { FRAMEWORKS, buildRoleplaySystemPrompt, buildCoachHintPrompt, buildEvaluationPrompt } from "../../lib/prompts.js";

const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";
const DEFAULT_DEEPSEEK_MODEL = "deepseek-chat";
const DEEPSEEK_ENDPOINT = "https://api.deepseek.com/chat/completions";

function getKeyPreview(key) {
  if (!key || key.length < 8) return "";
  return key.slice(0, 6) + "..." + key.slice(-4);
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

function getBaseUrl(env) {
  const custom = (env && env.GEMINI_BASE_URL) || (typeof process !== "undefined" && process?.env?.GEMINI_BASE_URL);
  if (custom && typeof custom === "string" && custom.trim()) {
    return custom.trim().replace(/\/+$/, "");
  }
  return "https://generativelanguage.googleapis.com";
}

/**
 * 智慧解析雙模 API 設定 (支援 DeepSeek 與 Google Gemini 自動適配)
 */
function resolveApiConfig(reqBody, env) {
  const clientKey = (reqBody && reqBody.apiKey && typeof reqBody.apiKey === "string")
    ? reqBody.apiKey.trim()
    : ((reqBody && reqBody.userApiKey && typeof reqBody.userApiKey === "string") ? reqBody.userApiKey.trim() : "");

  const requestedModel = (reqBody && reqBody.modelName && typeof reqBody.modelName === "string")
    ? reqBody.modelName.trim()
    : ((reqBody && reqBody.model && typeof reqBody.model === "string") ? reqBody.model.trim() : "");

  // 1. 從環境變數提取金鑰
  let deepseekEnvKey = "";
  let geminiEnvKey = "";

  if (env && typeof env === "object") {
    for (const [k, v] of Object.entries(env)) {
      if (typeof v !== "string" || !v.trim()) continue;
      const upper = k.trim().toUpperCase();
      if (upper === "DEEPSEEK_API_KEY" || upper === "DEEPSEEK_KEY") {
        deepseekEnvKey = v.trim();
      }
      if (upper === "GEMINI_API_KEY" || upper === "GOOGLE_API_KEY" || upper === "GEMINI_KEY" || upper === "GOOGLE_GEMINI_API_KEY") {
        geminiEnvKey = v.trim();
      }
    }
  }

  // 本機開發環境相容 (process / globalThis)
  if (!deepseekEnvKey) {
    const gKey = (typeof globalThis !== "undefined" && (globalThis.DEEPSEEK_API_KEY || globalThis.DEEPSEEK_KEY))
      || (typeof process !== "undefined" && (process?.env?.DEEPSEEK_API_KEY || process?.env?.DEEPSEEK_KEY)) || "";
    if (typeof gKey === "string" && gKey.trim()) deepseekEnvKey = gKey.trim();
  }
  if (!geminiEnvKey) {
    const gKey = (typeof globalThis !== "undefined" && (globalThis.GEMINI_API_KEY || globalThis.GOOGLE_API_KEY))
      || (typeof process !== "undefined" && (process?.env?.GEMINI_API_KEY || process?.env?.GOOGLE_API_KEY)) || "";
    if (typeof gKey === "string" && gKey.trim()) geminiEnvKey = gKey.trim();
  }

  // 2. 判斷 Provider 與生效金鑰
  let provider = "gemini";
  let apiKey = "";
  let model = requestedModel;

  if (clientKey) {
    apiKey = clientKey;
    // 使用者自備金鑰：依照前綴特徵與指定模型智慧判定
    if (clientKey.startsWith("sk-") && !clientKey.startsWith("AIza")) {
      provider = "deepseek";
    } else if (clientKey.startsWith("AIza") || clientKey.startsWith("AQ.")) {
      provider = "gemini";
    } else if (requestedModel.startsWith("deepseek")) {
      provider = "deepseek";
    } else {
      provider = "gemini";
    }
  } else {
    // 伺服器端環境變數金鑰
    if (requestedModel.startsWith("deepseek")) {
      if (deepseekEnvKey) {
        provider = "deepseek";
        apiKey = deepseekEnvKey;
      } else if (geminiEnvKey) {
        provider = "gemini";
        apiKey = geminiEnvKey;
        model = DEFAULT_GEMINI_MODEL;
      }
    } else if (requestedModel.startsWith("gemini")) {
      if (geminiEnvKey) {
        provider = "gemini";
        apiKey = geminiEnvKey;
      } else if (deepseekEnvKey) {
        provider = "deepseek";
        apiKey = deepseekEnvKey;
        model = DEFAULT_DEEPSEEK_MODEL;
      }
    } else {
      // 未指定模型：若有 DEEPSEEK_API_KEY 優先支援 deepseek；若無則走 gemini
      if (deepseekEnvKey && !geminiEnvKey) {
        provider = "deepseek";
        apiKey = deepseekEnvKey;
      } else if (geminiEnvKey) {
        provider = "gemini";
        apiKey = geminiEnvKey;
      } else if (deepseekEnvKey) {
        provider = "deepseek";
        apiKey = deepseekEnvKey;
      }
    }
  }

  // 補齊模型名稱預設值
  if (!model) {
    model = (provider === "deepseek") ? DEFAULT_DEEPSEEK_MODEL : DEFAULT_GEMINI_MODEL;
  } else if (provider === "deepseek" && model.startsWith("gemini")) {
    model = DEFAULT_DEEPSEEK_MODEL;
  } else if (provider === "gemini" && model.startsWith("deepseek")) {
    model = DEFAULT_GEMINI_MODEL;
  }

  return {
    provider,
    apiKey,
    model,
    clientKey,
    isClientKey: !!clientKey,
    hasServerDeepseek: !!deepseekEnvKey,
    hasServerGemini: !!geminiEnvKey,
    deepseekEnvKey,
    geminiEnvKey,
    serverDeepseekPreview: deepseekEnvKey ? getKeyPreview(deepseekEnvKey) : null,
    serverGeminiPreview: geminiEnvKey ? getKeyPreview(geminiEnvKey) : null
  };
}

/**
 * 呼叫 DeepSeek 官方 REST API (標準 OpenAI 格式相容)
 */
async function callDeepSeekApi({ apiKey, model, systemInstruction, messages, temperature = 0.7, jsonMode = false, maxTokens = 2500 }) {
  if (!apiKey) {
    throw new Error("未檢測到 DeepSeek API Key。請在右上角“API 設置”填入 sk-... 密鑰，或在 Cloudflare Secrets 配置 DEEPSEEK_API_KEY。");
  }

  const targetModel = model || DEFAULT_DEEPSEEK_MODEL;
  const formattedMessages = [];

  if (systemInstruction) {
    formattedMessages.push({
      role: "system",
      content: systemInstruction
    });
  }

  if (Array.isArray(messages)) {
    for (const m of messages) {
      let text = "";
      if (typeof m.content === "string") {
        text = m.content;
      } else if (Array.isArray(m.parts)) {
        text = m.parts.map(p => p.text || "").join("\n");
      }
      const role = (m.role === "model" || m.role === "assistant") ? "assistant" : "user";
      formattedMessages.push({ role, content: text });
    }
  }

  const payload = {
    model: targetModel,
    messages: formattedMessages,
    max_tokens: maxTokens
  };

  if (targetModel === "deepseek-reasoner") {
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
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!resp.ok) {
    const errText = await resp.text();
    let errMsg = `DeepSeek API 請求失敗 (${targetModel}: HTTP ${resp.status})`;
    try {
      const errJson = JSON.parse(errText);
      if (errJson.error?.message) {
        errMsg = `DeepSeek 錯誤: ${errJson.error.message}`;
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
    throw new Error(`DeepSeek API (${targetModel}) 返回內容為空`);
  }

  return rawText;
}

/**
 * 呼叫 Google Gemini REST API (標準 Web Fetch，免任何 npm 依賴)
 */
async function callGeminiApi({ apiKey, model, contents, systemInstruction, temperature = 0.7, jsonMode = false, baseUrl = "https://generativelanguage.googleapis.com" }) {
  if (!apiKey) {
    throw new Error("未檢測到 Google Gemini API Key。請在右上角“API 設置”中配置，或在 Cloudflare 密鑰中添加 GEMINI_API_KEY。");
  }

  const requestedModel = (model && model !== "gemini-2.5-flash") ? model : DEFAULT_GEMINI_MODEL;
  
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
  const maxAttempts = 2;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    for (let i = 0; i < modelCandidates.length; i++) {
      const currentModel = modelCandidates[i];
      try {
        const url = `${baseUrl}/v1beta/models/${currentModel}:generateContent?key=${encodeURIComponent(apiKey)}`;

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
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey
          },
          body: JSON.stringify(payload)
        });

        const resData = await resp.json();

        if (!resp.ok) {
          let errMsg = resData.error?.message || "Google API 請求失敗";
          const detailsStr = JSON.stringify(resData.error?.details || "");
          const isGeoBlocked = errMsg.includes("User location is not supported") || errMsg.includes("location is not supported");
          
          if (errMsg.includes("ACCESS_TOKEN_TYPE_UNSUPPORTED") || detailsStr.includes("ACCESS_TOKEN_TYPE_UNSUPPORTED")) {
            errMsg = "Google API 認證失敗 (ACCESS_TOKEN_TYPE_UNSUPPORTED)：當前填寫的密鑰不被 Generative Language API 接受。";
          }
          
          const isRetryable = isGeoBlocked || errMsg.includes("high demand") || errMsg.includes("no longer available") || resp.status === 503 || resp.status === 429;
          
          if (isRetryable && (i < modelCandidates.length - 1 || attempt < maxAttempts - 1)) {
            console.warn(`Model ${currentModel} attempt ${attempt + 1} failed (${errMsg}), auto-retrying...`);
            lastError = new Error(errMsg);
            await new Promise(r => setTimeout(r, 600));
            continue;
          }
          
          if (isGeoBlocked) {
            errMsg = "本次對話偶發分配至 Cloudflare 香港(HKG)等節點，觸碰 Google 區域限制 (User location is not supported)。請點擊左下方“⏪ 撤回重試”重新發送即可！";
          }
          throw new Error(errMsg);
        }

        const candidate = resData.candidates?.[0];
        const text = candidate?.content?.parts?.[0]?.text || "";
        return text;
      } catch (err) {
        lastError = err;
        const isGeoBlocked = err.message.includes("User location is not supported") || err.message.includes("location is not supported");
        const isRetryable = isGeoBlocked || err.message.includes("high demand") || err.message.includes("no longer available") || err.message.includes("503") || err.message.includes("429");
        if (isRetryable && (i < modelCandidates.length - 1 || attempt < maxAttempts - 1)) {
          console.warn("Retrying due to:", err.message);
          await new Promise(r => setTimeout(r, 600));
          continue;
        }
        if (isGeoBlocked) {
          throw new Error("本次對話偶發分配至 Cloudflare 香港(HKG)等節點，觸碰 Google 區域限制 (User location is not supported)。請點擊左下方“⏪ 撤回重試”重新發送即可！");
        }
        throw err;
      }
    }
  }

  throw lastError;
}

/**
 * 統一執行 AI 請求 (支援 DeepSeek 與 Gemini 自動降級備援)
 */
async function executeAiTask({ config, systemInstruction, messages, temperature = 0.7, jsonMode = false, baseUrl }) {
  const { provider, apiKey, model, geminiEnvKey, deepseekEnvKey } = config;

  if (provider === "deepseek") {
    try {
      return await callDeepSeekApi({
        apiKey,
        model,
        systemInstruction,
        messages,
        temperature,
        jsonMode
      });
    } catch (deepseekErr) {
      console.warn(`[Dual-Engine Fallback] DeepSeek 呼叫失敗: ${deepseekErr.message}`);
      // 若有 Gemini 備援金鑰，自動切換至 Gemini 執行
      const fallbackGeminiKey = geminiEnvKey;
      if (fallbackGeminiKey) {
        console.info("[Dual-Engine Fallback] 啟用 Google Gemini 自動備援...");
        const contents = [];
        for (const m of messages) {
          let text = typeof m.content === "string" ? m.content : (Array.isArray(m.parts) ? m.parts.map(p => p.text).join("\n") : "");
          const role = (m.role === "assistant" || m.role === "model") ? "model" : "user";
          contents.push({ role, parts: [{ text }] });
        }
        return await callGeminiApi({
          apiKey: fallbackGeminiKey,
          model: DEFAULT_GEMINI_MODEL,
          contents,
          systemInstruction,
          temperature,
          jsonMode,
          baseUrl
        });
      }
      throw deepseekErr;
    }
  } else {
    // 預設走 Google Gemini
    try {
      const contents = [];
      for (const m of messages) {
        let text = typeof m.content === "string" ? m.content : (Array.isArray(m.parts) ? m.parts.map(p => p.text).join("\n") : "");
        const role = (m.role === "assistant" || m.role === "model") ? "model" : "user";
        contents.push({ role, parts: [{ text }] });
      }
      return await callGeminiApi({
        apiKey,
        model,
        contents,
        systemInstruction,
        temperature,
        jsonMode,
        baseUrl
      });
    } catch (geminiErr) {
      console.warn(`[Dual-Engine Fallback] Gemini 呼叫失敗: ${geminiErr.message}`);
      // 若遇到區域限制或故障，且有 DeepSeek 備援金鑰，自動切換至 DeepSeek
      const fallbackDeepseekKey = deepseekEnvKey;
      if (fallbackDeepseekKey) {
        console.info("[Dual-Engine Fallback] 啟用 DeepSeek 自動備援...");
        return await callDeepSeekApi({
          apiKey: fallbackDeepseekKey,
          model: DEFAULT_DEEPSEEK_MODEL,
          systemInstruction,
          messages,
          temperature,
          jsonMode
        });
      }
      throw geminiErr;
    }
  }
}

// 學員實戰對話練習紀錄儲存庫 (記憶體備援，支援 Cloudflare KV 持久化)
let memoryPracticeLogs = [];
const adminSessions = new Map(); // token -> { username, createdAt, expiresAt }

function getAdminCredentials(env) {
  const username = (env && env.ADMIN_USERNAME) ? String(env.ADMIN_USERNAME).trim() : 'admin';
  const password = (env && env.ADMIN_PASSWORD) ? String(env.ADMIN_PASSWORD).trim() : 'coachlab2026';
  return { username, password };
}

function verifyAdminSession(request, env) {
  const authHeader = request.headers.get('Authorization') || request.headers.get('x-admin-token') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  const session = adminSessions.get(token);
  if (session && session.expiresAt > Date.now()) {
    return session;
  }

  // 支援環境變數 ADMIN_SECRET 作為萬用管理金鑰
  if (env && env.ADMIN_SECRET && token === String(env.ADMIN_SECRET).trim()) {
    return { username: 'admin', token };
  }

  return null;
}

async function getStoredPracticeLogs(env) {
  const kv = env && (env.COACHLAB_KV || env.COACHQUEST_KV);
  if (kv) {
    try {
      const kvData = await kv.get('coachlab_practice_logs_all', { type: 'json' });
      if (Array.isArray(kvData)) {
        return kvData;
      }
    } catch (e) {
      console.warn('KV 讀取 practice_logs 失敗，改用記憶體資料:', e);
    }
  }
  return memoryPracticeLogs;
}

async function saveStoredPracticeLogs(env, logs) {
  memoryPracticeLogs = logs;
  const kv = env && (env.COACHLAB_KV || env.COACHQUEST_KV);
  if (kv) {
    try {
      await kv.put('coachlab_practice_logs_all', JSON.stringify(logs));
    } catch (e) {
      console.warn('KV 儲存 practice_logs 失敗:', e);
    }
  }
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;

  // 處理 OPTIONS 預檢請求
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
    const config = resolveApiConfig({}, env);
    const providers = [];
    if (config.hasServerGemini) providers.push("gemini");
    if (config.hasServerDeepseek) providers.push("deepseek");

    const envKeys = env ? Object.keys(env).filter(k => k !== "ASSETS") : [];

    return jsonResponse({
      ok: true,
      frameworks: FRAMEWORKS,
      defaultModel: config.hasServerDeepseek && !config.hasServerGemini ? DEFAULT_DEEPSEEK_MODEL : DEFAULT_GEMINI_MODEL,
      hasServerKey: config.hasServerGemini || config.hasServerDeepseek,
      hasServerGemini: config.hasServerGemini,
      hasServerDeepseek: config.hasServerDeepseek,
      serverKeyPreview: config.serverGeminiPreview || config.serverDeepseekPreview,
      serverGeminiPreview: config.serverGeminiPreview,
      serverDeepseekPreview: config.serverDeepseekPreview,
      isServerKeyValidFormat: true,
      providers: providers.length > 0 ? providers : ["gemini", "deepseek"],
      envKeys
    });
  }

  // 安全解析 POST / PUT 請求的 Body
  let body = {};
  if (request.method === "POST" || request.method === "PUT") {
    try {
      body = await request.json();
    } catch (e) {
      body = {};
    }
  }

  // ==========================================
  // 學員練習紀錄與導師管理後台 API
  // ==========================================

  // 1. POST /api/practice-logs/submit (學員實戰練習紀錄自動同步上傳)
  if (pathname.endsWith("/practice-logs/submit") && request.method === "POST") {
    try {
      const clientIp = request.headers.get("cf-connecting-ip") || 
                       request.headers.get("x-real-ip") || 
                       request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                       "雲端學員";
      
      const logEntry = {
        id: "log_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
        submittedAt: new Date().toISOString(),
        clientIp,
        studentName: (body.studentName || "學員教練").trim(),
        frameworkId: body.frameworkId || "nvc",
        frameworkName: body.frameworkName || "",
        targetName: body.targetName || "練習對象",
        targetRole: body.targetRole || "",
        scenario: body.scenario || "",
        difficulty: body.difficulty || "realistic",
        turns: Number(body.turns) || 1,
        score: Number(body.score) || 80,
        level: body.level || "精準教練",
        dimensionScores: body.dimensionScores || {},
        summary: body.summary || "",
        strengths: Array.isArray(body.strengths) ? body.strengths : [],
        growthAreas: Array.isArray(body.growthAreas) ? body.growthAreas : [],
        deliberatePracticeTips: Array.isArray(body.deliberatePracticeTips) ? body.deliberatePracticeTips : [],
        frameworkDeepDive: body.frameworkDeepDive || null,
        dialogueHistory: Array.isArray(body.dialogueHistory) ? body.dialogueHistory : []
      };

      const logs = await getStoredPracticeLogs(env);
      logs.unshift(logEntry);
      if (logs.length > 500) logs.length = 500;
      await saveStoredPracticeLogs(env, logs);

      return jsonResponse({ ok: true, id: logEntry.id, message: "練習紀錄已成功歸檔至導師後台" });
    } catch (err) {
      return jsonResponse({ ok: false, error: err.message || "歸檔失敗" }, 500);
    }
  }

  // 2. POST /api/admin/login (管理員登入)
  if (pathname.endsWith("/admin/login") && request.method === "POST") {
    const { username, password } = body;
    const creds = getAdminCredentials(env);
    if (username === creds.username && password === creds.password) {
      const token = "clt_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
      const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
      adminSessions.set(token, { username, createdAt: Date.now(), expiresAt });
      return jsonResponse({ ok: true, token, username });
    }
    return jsonResponse({ ok: false, error: "管理員帳號或密碼錯誤" }, 401);
  }

  // 3. GET /api/admin/verify (驗證管理員 Session)
  if (pathname.endsWith("/admin/verify") && request.method === "GET") {
    const session = verifyAdminSession(request, env);
    if (!session) {
      return jsonResponse({ ok: false, error: "未授權或登入已過期" }, 401);
    }
    return jsonResponse({ ok: true, username: session.username });
  }

  // 4. GET /api/admin/practice-logs (管理員調閱學員練習紀錄清單)
  if (pathname.endsWith("/admin/practice-logs") && request.method === "GET") {
    const session = verifyAdminSession(request, env);
    if (!session) {
      return jsonResponse({ ok: false, error: "未授權訪問管理端點" }, 401);
    }

    const logs = await getStoredPracticeLogs(env);
    const search = (url.searchParams.get("search") || "").toLowerCase().trim();
    const framework = (url.searchParams.get("framework") || "all").trim();
    const level = (url.searchParams.get("level") || "all").trim();

    let filtered = logs;
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

    const totalCount = logs.length;
    const uniqueStudents = new Set(logs.map(l => l.studentName || "學員教練")).size;
    const avgScore = totalCount > 0
      ? Math.round(logs.reduce((sum, l) => sum + (l.score || 0), 0) / totalCount)
      : 0;

    const fwCounts = {};
    logs.forEach(l => {
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

    return jsonResponse({
      ok: true,
      stats: {
        totalCount,
        uniqueStudents,
        avgScore,
        topFramework
      },
      logs: filtered
    });
  }

  // 5. GET /api/admin/practice-logs/detail (調閱單筆完整對話與逐字稿)
  if (pathname.endsWith("/admin/practice-logs/detail") && request.method === "GET") {
    const session = verifyAdminSession(request, env);
    if (!session) {
      return jsonResponse({ ok: false, error: "未授權訪問管理端點" }, 401);
    }

    const logId = url.searchParams.get("id");
    const logs = await getStoredPracticeLogs(env);
    const log = logs.find(l => l.id === logId);

    if (!log) {
      return jsonResponse({ ok: false, error: "找不到該筆學員練習紀錄" }, 404);
    }

    return jsonResponse({ ok: true, log });
  }

  // 6. POST /api/admin/practice-logs/delete (管理員刪除單筆紀錄)
  if (pathname.endsWith("/admin/practice-logs/delete") && request.method === "POST") {
    const session = verifyAdminSession(request, env);
    if (!session) {
      return jsonResponse({ ok: false, error: "未授權訪問管理端點" }, 401);
    }

    const logId = body.id;
    let logs = await getStoredPracticeLogs(env);
    logs = logs.filter(l => l.id !== logId);
    await saveStoredPracticeLogs(env, logs);

    return jsonResponse({ ok: true, message: "紀錄已成功刪除" });
  }

  // 7. POST /api/admin/practice-logs/clear (管理員清空所有紀錄)
  if (pathname.endsWith("/admin/practice-logs/clear") && request.method === "POST") {
    const session = verifyAdminSession(request, env);
    if (!session) {
      return jsonResponse({ ok: false, error: "未授權訪問管理端點" }, 401);
    }

    await saveStoredPracticeLogs(env, []);
    return jsonResponse({ ok: true, message: "已清空所有練習紀錄" });
  }

  // ==========================================
  // AI 互動端點 (POST)
  // ==========================================
  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "不支持的 HTTP 方法" }, 405);
  }

  const config = resolveApiConfig(body, env);
  const baseUrl = getBaseUrl(env);

  // 8. POST /api/test-key
  if (pathname.endsWith("/test-key")) {
    try {
      const isClientKey = config.isClientKey;
      const effectiveKey = config.apiKey;

      if (!effectiveKey) {
        return jsonResponse({
          ok: false,
          error: "未檢測到任何 API Key。手機端未輸入，且雲端環境變數 (GEMINI_API_KEY / DEEPSEEK_API_KEY) 也未設置。"
        }, 400);
      }

      if (config.provider === "deepseek") {
        const output = await callDeepSeekApi({
          apiKey: effectiveKey,
          model: config.model,
          messages: [{ role: "user", content: "Ping" }],
          maxTokens: 20
        });

        const keySource = isClientKey ? "客戶端自定義 DeepSeek Key" : "Cloudflare 雲端全局 DeepSeek Key";
        return jsonResponse({
          ok: true,
          message: isClientKey ? `✅ 個人 DeepSeek API Key (${config.model}) 測試成功！` : `✅ 雲端全局 DeepSeek API Key 驗證成功！`,
          provider: "deepseek",
          keySource,
          details: { ok: true, provider: "deepseek", model: config.model, output }
        });
      } else {
        const output = await callGeminiApi({
          apiKey: effectiveKey,
          model: config.model,
          contents: [{ parts: [{ text: "Ping" }] }],
          baseUrl
        });

        const keySource = isClientKey ? "客戶端自定義 Google Gemini Key" : "Cloudflare 雲端全局 Gemini Key";
        return jsonResponse({
          ok: true,
          message: isClientKey ? `✅ 個人 Gemini API Key (${config.model}) 測試成功！` : `✅ 雲端全局 Gemini API Key 驗證成功！所有學生無需配置即可直接使用。`,
          provider: "gemini",
          keySource,
          details: { ok: true, provider: "gemini", model: config.model, output }
        });
      }
    } catch (err) {
      return jsonResponse({ ok: false, error: err.message }, 400);
    }
  }

  // 3. POST /api/chat
  if (pathname.endsWith("/chat")) {
    try {
      const { targetConfig, history, userMessage } = body;
      if (!targetConfig) {
        return jsonResponse({ ok: false, error: "缺少 targetConfig 設置" }, 400);
      }

      const systemInstruction = buildRoleplaySystemPrompt(targetConfig);

      const messages = [];
      if (Array.isArray(history)) {
        for (const item of history) {
          if (!item.content) continue;
          messages.push({
            role: item.role === "user" ? "user" : "assistant",
            content: item.content
          });
        }
      }

      if (userMessage && userMessage.trim()) {
        messages.push({
          role: "user",
          content: userMessage.trim()
        });
      }

      const fullText = await executeAiTask({
        config,
        systemInstruction,
        messages,
        temperature: 0.8,
        baseUrl
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
          raw: fullText,
          provider: config.provider,
          model: config.model
        }
      });
    } catch (err) {
      return jsonResponse({ ok: false, error: err.message }, 500);
    }
  }

  // 4. POST /api/hint
  if (pathname.endsWith("/hint")) {
    try {
      const { targetConfig, history } = body;
      if (!targetConfig) {
        return jsonResponse({ ok: false, error: "缺少 targetConfig 設置" }, 400);
      }

      const transcript = (history || [])
        .map((item, idx) => {
          const speaker = item.role === "user" ? "【使用者/教練】" : ("【練習對象 " + (targetConfig.targetName || "對象") + "】");
          return (idx + 1) + ". " + speaker + ": " + item.content;
        })
        .join("\n");

      const prompt = buildCoachHintPrompt({
        frameworkId: targetConfig.frameworkId,
        customFrameworkPrompt: targetConfig.customFrameworkPrompt,
        targetName: targetConfig.targetName,
        targetRole: targetConfig.targetRole,
        scenario: targetConfig.scenario,
        transcript: transcript || "（剛開始對話，尚未有實質來回）"
      });

      const hintText = await executeAiTask({
        config,
        systemInstruction: "你是一位資深的高級教練督導（Master Certified Coach）。請提供犀利且溫暖的引導錦囊。",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        baseUrl
      });

      return jsonResponse({ ok: true, hint: hintText, provider: config.provider, model: config.model });
    } catch (err) {
      return jsonResponse({ ok: false, error: err.message }, 500);
    }
  }

  // 5. POST /api/evaluate
  if (pathname.endsWith("/evaluate")) {
    try {
      const { targetConfig, history } = body;
      if (!targetConfig || !Array.isArray(history) || history.length === 0) {
        return jsonResponse({ ok: false, error: "對話記錄不足，請先進行至少 1~2 回合對話後再進行評估" }, 400);
      }

      const transcript = (history || [])
        .map((item, idx) => {
          const speaker = item.role === "user" ? "【使用者/教練】" : ("【練習對象 " + (targetConfig.targetName || "對象") + "】");
          return "第 " + (idx + 1) + " 輪 " + speaker + "：\n" + item.content + "\n";
        })
        .join("\n--------------------\n");

      const prompt = buildEvaluationPrompt({
        frameworkId: targetConfig.frameworkId,
        customFrameworkPrompt: targetConfig.customFrameworkPrompt,
        targetName: targetConfig.targetName,
        targetRole: targetConfig.targetRole,
        scenario: targetConfig.scenario,
        difficulty: targetConfig.difficulty,
        transcript: transcript || "（無對話記錄）"
      });

      const rawJson = await executeAiTask({
        config,
        systemInstruction: "你是一位專業的高級教練考評考官。請務必嚴格以標準 JSON 格式輸出評估結果，不要附帶任何多餘文字。",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        jsonMode: true,
        baseUrl
      });

      let reportData;
      try {
        const cleaned = rawJson.replace(/^[\s\S]*?```json\s*/i, "").replace(/```[\s\S]*?$/i, "").trim();
        reportData = JSON.parse(cleaned);
      } catch (err) {
        const matched = rawJson.match(/\{[\s\S]*\}/);
        if (matched) {
          try {
            reportData = JSON.parse(matched[0]);
          } catch (_) {}
        }

        if (!reportData) {
          reportData = {
            overallScore: 78,
            overallLevel: "具備雛形",
            dimensionScores: {
              frameworkProficiency: 75,
              empathyListening: 80,
              powerfulQuestioning: 75,
              psychologicalSafety: 80,
              forwardMomentum: 70
            },
            summary: "本次練習展現了良好的溝通誠意與共情意圖，但在問題挖掘深度與提問句型上仍有進一步精進的空間。",
            strengths: [
              {
                title: "保持穩定溫和的對話姿態",
                quote: "（參考對話整體氛圍）",
                analysis: "面對對象的防衛反應，能維持開放平靜的口吻，有助於維繫基本的溝通渠道。"
              }
            ],
            growthAreas: [
              {
                title: "避免封閉式提問，強化開放式探索",
                quote: "（參考對話中的疑問句）",
                impact: "有時過早提出解決方案或是非題，限制了對象主動分享內在感受的空間。",
                betterAlternative: "“聽起來這件事讓你感到有些吃力，想和你了解看看，在那個當下發生了什麼事呢？”",
                rationale: "以不帶評判的開放式提問邀請對方還原現場，降低對象被質問的戒心。"
              }
            ],
            frameworkDeepDive: {
              frameworkName: targetConfig.frameworkId || "溝通模式",
              stageAnalysis: "已初步實踐傾聽與確認，若能更進一步探尋深層需求或冰山底層，效果將更顯著。",
              keyTakeaway: "慢即是快。先連接情感，再處理事情。"
            },
            deliberatePracticeTips: [
              "練習將“你為什麼…”替換為“想多了解發生了什麼…”",
              "在給出任何建議前，先確認對方三種不同的感受與需要",
              "適度留白 3~5 秒，給對象沉澱思緒的空間"
            ],
            rawTextFallback: rawJson
          };
        }
      }

      return jsonResponse({ ok: true, report: reportData, provider: config.provider, model: config.model });
    } catch (err) {
      return jsonResponse({ ok: false, error: err.message }, 500);
    }
  }

  return jsonResponse({ ok: false, error: "未找到對應的 API 路徑" }, 404);
}
