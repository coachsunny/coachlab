// ==========================================
// CoachLab - OpenCC 繁簡體雙向即時切換模組
// ==========================================

let tw2cn = null;
let cn2tw = null;

// 初始化 OpenCC 轉換實例
function initConverters() {
  if (tw2cn && cn2tw) return true;
  const occ = (typeof window !== "undefined" && (window.OpenCC || globalThis.OpenCC));
  if (occ && typeof occ.Converter === "function") {
    try {
      tw2cn = occ.Converter({ from: "tw", to: "cn" });
      cn2tw = occ.Converter({ from: "cn", to: "tw" });
      return true;
    } catch (e) {
      console.warn("OpenCC 轉換器初始化失敗:", e);
    }
  }
  return false;
}

export const LangManager = {
  // 取得目前語言偏好：'zh-TW' (繁體) 或 'zh-CN' (簡體)
  getLang() {
    try {
      if (typeof localStorage !== "undefined") {
        const saved = localStorage.getItem("coachlab_lang") || localStorage.getItem("coachquest_lang");
        if (saved === "zh-CN" || saved === "zh-TW") return saved;
      }
      if (typeof navigator !== "undefined") {
        const navLang = (navigator.language || "").toLowerCase();
        if (navLang.startsWith("zh-tw") || navLang.startsWith("zh-hk") || navLang.startsWith("zh-mo") || navLang.startsWith("zh-hant")) {
          return "zh-TW";
        }
      }
    } catch (_) {}
    return "zh-TW"; // 預設使用繁體中文
  },

  // 設定語言
  setLang(lang) {
    const target = lang === "zh-CN" ? "zh-CN" : "zh-TW";
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("coachlab_lang", target);
      }
    } catch (_) {}
    return target;
  },

  // 字串動態翻譯
  t(text) {
    if (!text || typeof text !== "string") return text;
    initConverters();
    const lang = this.getLang();
    if (lang === "zh-CN" && tw2cn) {
      return tw2cn(text);
    }
    if (lang === "zh-TW" && cn2tw) {
      return cn2tw(text);
    }
    return text;
  },

  // 強制轉簡體
  toSimplified(text) {
    if (!text || typeof text !== "string") return text;
    initConverters();
    return tw2cn ? tw2cn(text) : text;
  },

  // 強制轉繁體
  toTraditional(text) {
    if (!text || typeof text !== "string") return text;
    initConverters();
    return cn2tw ? cn2tw(text) : text;
  },

  // 轉換整頁 DOM 文字節點
  translateDOM(root = document.body) {
    if (!root || typeof document === "undefined") return;
    initConverters();
    const isTw = this.getLang() === "zh-TW";
    const converter = isTw ? cn2tw : tw2cn;
    if (!converter) return;

    const skipTags = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE"]);

    function walk(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const val = node.nodeValue;
        if (val && val.trim()) {
          node.nodeValue = converter(val);
        }
        return;
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        if (skipTags.has(node.tagName)) return;

        // 轉換 placeholder
        if (node.placeholder) {
          node.placeholder = converter(node.placeholder);
        }
        // 轉換 title
        if (node.title) {
          node.title = converter(node.title);
        }

        for (let child = node.firstChild; child; child = child.nextSibling) {
          walk(child);
        }
      }
    }

    walk(root);

    // 更新 HTML lang 屬性
    if (document.documentElement) {
      document.documentElement.lang = isTw ? "zh-TW" : "zh-CN";
    }
  },

  // 切換語言並即時轉換全站 DOM
  toggleLang() {
    const current = this.getLang();
    const next = current === "zh-TW" ? "zh-CN" : "zh-TW";
    this.setLang(next);
    this.translateDOM(document.body);
    return next;
  }
};
