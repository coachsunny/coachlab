// ========================================================
// CoachLab 導師督導管理看板前端主腳本 (Admin Dashboard)
// ========================================================

import { LangManager } from './lang.js';

const ADMIN_TOKEN_KEY = 'coachlab_admin_token';
let currentLogs = [];
let viewingLog = null;

// 理論模型定義速查表
const FRAMEWORK_META = {
  nvc: { id: 'nvc', name: '非暴力溝通 (NVC)', icon: '🕊️' },
  satir_iceberg: { id: 'satir_iceberg', name: '薩提爾冰山模型', icon: '🏔️' },
  grow: { id: 'grow', name: 'GROW 教練模型', icon: '🌱' },
  orid: { id: 'orid', name: 'ORID 焦點討論法', icon: '🧭' },
  sfbc: { id: 'sfbc', name: '焦點解決教練 (SFBC)', icon: '✨' },
  custom: { id: 'custom', name: '自定義溝通模式', icon: '⚙️' }
};

// DOM 元素快取
const elements = {
  loginSection: document.getElementById('loginSection'),
  dashboardSection: document.getElementById('dashboardSection'),
  authNavControls: document.getElementById('authNavControls'),
  formAdminLogin: document.getElementById('formAdminLogin'),
  inputAdminUser: document.getElementById('inputAdminUser'),
  inputAdminPass: document.getElementById('inputAdminPass'),
  loginErrorMsg: document.getElementById('loginErrorMsg'),
  btnLogout: document.getElementById('btnLogout'),
  btnRefreshList: document.getElementById('btnRefreshList'),
  btnExportAllJson: document.getElementById('btnExportAllJson'),
  btnClearAllLogs: document.getElementById('btnClearAllLogs'),
  btnToggleLang: document.getElementById('btnToggleLang'),
  langBtnText: document.getElementById('langBtnText'),

  // 統計指標
  statTotalCount: document.getElementById('statTotalCount'),
  statUniqueStudents: document.getElementById('statUniqueStudents'),
  statAvgScore: document.getElementById('statAvgScore'),
  statTopFramework: document.getElementById('statTopFramework'),

  // 篩選
  filterSearch: document.getElementById('filterSearch'),
  filterFramework: document.getElementById('filterFramework'),
  filterLevel: document.getElementById('filterLevel'),

  // 列表
  logsTableBody: document.getElementById('logsTableBody'),
  logsEmptyState: document.getElementById('logsEmptyState'),

  // 詳情彈窗
  modalLogDetail: document.getElementById('modalLogDetail'),
  modalLogTitle: document.getElementById('modalLogTitle'),
  modalLogContent: document.getElementById('modalLogContent'),
  btnCloseDetailModal: document.getElementById('btnCloseDetailModal'),
  btnCloseDetailModalBottom: document.getElementById('btnCloseDetailModalBottom'),
  btnDownloadDetailMd: document.getElementById('btnDownloadDetailMd'),
  btnCopyDetailText: document.getElementById('btnCopyDetailText')
};

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  initLanguage();
  bindEvents();
  await checkAuthSession();
});

function initLanguage() {
  const currentLang = LangManager.getLang();
  if (elements.langBtnText) {
    elements.langBtnText.textContent = currentLang === 'zh-TW' ? '簡體' : '繁體';
  }
  if (currentLang === 'zh-TW') {
    LangManager.translateDOM(document.body);
  }
}

function bindEvents() {
  // 繁簡切換
  elements.btnToggleLang?.addEventListener('click', () => {
    const nextLang = LangManager.toggleLang();
    if (elements.langBtnText) {
      elements.langBtnText.textContent = nextLang === 'zh-TW' ? '簡體' : '繁體';
    }
  });

  // 登入登出
  elements.formAdminLogin?.addEventListener('submit', handleLogin);
  elements.btnLogout?.addEventListener('click', handleLogout);

  // 列表控制
  elements.btnRefreshList?.addEventListener('click', () => loadPracticeLogs());
  elements.btnExportAllJson?.addEventListener('click', handleExportAllJson);
  elements.btnClearAllLogs?.addEventListener('click', handleClearAllLogs);

  // 篩選與搜尋
  let searchTimer = null;
  elements.filterSearch?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadPracticeLogs(), 300);
  });
  elements.filterFramework?.addEventListener('change', () => loadPracticeLogs());
  elements.filterLevel?.addEventListener('change', () => loadPracticeLogs());

  // 詳情彈窗
  elements.btnCloseDetailModal?.addEventListener('click', closeDetailModal);
  elements.btnCloseDetailModalBottom?.addEventListener('click', closeDetailModal);
  elements.modalLogDetail?.addEventListener('click', (e) => {
    if (e.target === elements.modalLogDetail) closeDetailModal();
  });

  // 彈窗內部下載與複製
  elements.btnDownloadDetailMd?.addEventListener('click', () => {
    if (viewingLog) downloadLogMarkdown(viewingLog);
  });
  elements.btnCopyDetailText?.addEventListener('click', () => {
    if (viewingLog) copyLogTranscript(viewingLog);
  });
}

// 驗證登入狀態
async function checkAuthSession() {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) {
    showLoginView();
    return;
  }

  try {
    const res = await fetch('/api/admin/verify', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.ok) {
      showDashboardView();
      await loadPracticeLogs();
    } else {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      showLoginView();
    }
  } catch (e) {
    console.error('Session 驗證失敗:', e);
    showLoginView();
  }
}

// 處理登入
async function handleLogin() {
  const username = elements.inputAdminUser.value.trim();
  const password = elements.inputAdminPass.value.trim();
  hideLoginError();

  if (!username || !password) {
    showLoginError('請輸入管理員帳號與密碼');
    return;
  }

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (data.ok && data.token) {
      localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      showDashboardView();
      await loadPracticeLogs();
    } else {
      showLoginError(data.error || '帳號或密碼錯誤！');
    }
  } catch (err) {
    showLoginError('連線異常，請稍後再試');
  }
}

// 登出
function handleLogout() {
  if (confirm(LangManager.t('確定要登出導師督導看板嗎？'))) {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    showLoginView();
  }
}

function showLoginView() {
  elements.loginSection.classList.remove('hidden');
  elements.dashboardSection.classList.add('hidden');
  elements.authNavControls.classList.add('hidden');
  if (elements.inputAdminPass) elements.inputAdminPass.value = '';
}

function showDashboardView() {
  elements.loginSection.classList.add('hidden');
  elements.dashboardSection.classList.remove('hidden');
  elements.authNavControls.classList.remove('hidden');
}

function showLoginError(msg) {
  if (elements.loginErrorMsg) {
    elements.loginErrorMsg.textContent = LangManager.t(msg);
    elements.loginErrorMsg.style.display = 'block';
  }
}

function hideLoginError() {
  if (elements.loginErrorMsg) {
    elements.loginErrorMsg.style.display = 'none';
  }
}

// 載入學員實戰紀錄清單
async function loadPracticeLogs() {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return;

  const search = encodeURIComponent(elements.filterSearch?.value.trim() || '');
  const framework = encodeURIComponent(elements.filterFramework?.value || 'all');
  const level = encodeURIComponent(elements.filterLevel?.value || 'all');

  try {
    const res = await fetch(`/api/admin/practice-logs?search=${search}&framework=${framework}&level=${level}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();

    if (!data.ok) {
      if (res.status === 401) {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        showLoginView();
      }
      return;
    }

    // 更新統計指標
    if (data.stats) {
      elements.statTotalCount.textContent = data.stats.totalCount || 0;
      elements.statUniqueStudents.textContent = data.stats.uniqueStudents || 0;
      elements.statAvgScore.textContent = (data.stats.avgScore || 0) + '分';
      elements.statTopFramework.textContent = data.stats.topFramework || 'NVC';
    }

    currentLogs = data.logs || [];
    renderLogsTable(currentLogs);
  } catch (err) {
    console.error('載入紀錄失敗:', err);
  }
}

// 渲染表格
function renderLogsTable(logs) {
  if (!elements.logsTableBody) return;
  elements.logsTableBody.innerHTML = '';

  if (logs.length === 0) {
    elements.logsEmptyState.classList.remove('hidden');
    return;
  }
  elements.logsEmptyState.classList.add('hidden');

  logs.forEach(log => {
    const tr = document.createElement('tr');
    const dateStr = new Date(log.submittedAt || log.date).toLocaleString('zh-TW', { hour12: false });
    
    // 評級徽章
    let badgeClass = 'badge-developing';
    if (log.score >= 90) badgeClass = 'badge-master';
    else if (log.score >= 80) badgeClass = 'badge-proficient';
    else if (log.score >= 70) badgeClass = 'badge-developing';
    else badgeClass = 'badge-novice';

    const fwMeta = FRAMEWORK_META[log.frameworkId] || { name: log.frameworkName || '理論模式', icon: '🕊️' };
    const summaryText = log.summary || (log.strengths?.[0]?.analysis) || '（暫無診斷摘要）';

    tr.innerHTML = `
      <td>
        <div class="student-cell">
          <div class="student-avatar">🧑‍💼</div>
          <div>
            <div class="student-name">${escapeHtml(log.studentName || '學員教練')}</div>
            <div class="student-ip">${escapeHtml(log.clientIp || '')}</div>
          </div>
        </div>
      </td>
      <td>
        <span class="fw-badge">
          <span>${fwMeta.icon}</span>
          <span>${escapeHtml(fwMeta.name)}</span>
        </span>
      </td>
      <td>
        <div style="font-weight: 700; color: #0f172a;">👤 ${escapeHtml(log.targetName || '對象')} (${escapeHtml(log.targetRole || '角色')})</div>
        <div style="font-size: 0.76rem; color: var(--text-muted); max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(log.scenario || '')}">
          ${escapeHtml(log.scenario || '')}
        </div>
      </td>
      <td>
        <span class="score-badge ${badgeClass}">
          ${escapeHtml(log.level || '評估完成')} · ${log.score || 80}分
        </span>
      </td>
      <td>
        <span style="font-weight: 700; color: var(--primary);">${log.turns || 1}</span> 輪
      </td>
      <td>
        <div class="summary-preview" title="${escapeHtml(summaryText)}">
          ${escapeHtml(summaryText)}
        </div>
      </td>
      <td style="font-size: 0.82rem; color: var(--text-muted); white-space: nowrap;">
        ${dateStr}
      </td>
      <td>
        <div class="action-cell">
          <button class="btn btn-outline btn-sm btn-view-detail" data-id="${log.id}" title="調閱完整對話逐字稿與 ICF 診斷報告">
            👁️ 逐字稿
          </button>
          <button class="btn btn-primary btn-sm btn-download-md" data-id="${log.id}" title="下載 Markdown 完整報告">
            📥 報告
          </button>
          <button class="btn btn-danger btn-sm btn-delete-log" data-id="${log.id}" title="刪除此筆練習紀錄">
            🗑️
          </button>
        </div>
      </td>
    `;
    elements.logsTableBody.appendChild(tr);
  });

  // 綁定操作按鈕
  elements.logsTableBody.querySelectorAll('.btn-view-detail').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const log = currentLogs.find(l => l.id === id);
      if (log) openDetailModal(log);
    });
  });

  elements.logsTableBody.querySelectorAll('.btn-download-md').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const log = currentLogs.find(l => l.id === id);
      if (log) downloadLogMarkdown(log);
    });
  });

  elements.logsTableBody.querySelectorAll('.btn-delete-log').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      if (confirm(LangManager.t('確定要刪除這筆學員演練紀錄嗎？'))) {
        await deletePracticeLog(id);
      }
    });
  });

  if (LangManager.getLang() === 'zh-TW') {
    LangManager.translateDOM(elements.logsTableBody);
  }
}

// 開啟逐字稿詳情彈窗
function openDetailModal(log) {
  viewingLog = log;
  const dateStr = new Date(log.submittedAt || log.date).toLocaleString('zh-TW', { hour12: false });
  const dims = log.dimensionScores || {};
  const fwMeta = FRAMEWORK_META[log.frameworkId] || { name: log.frameworkName || '理論模型', icon: '🕊️' };

  elements.modalLogTitle.textContent = `📜 【${log.studentName || '學員教練'}】對談【${log.targetName}】實況逐字稿與復盤報告`;

  // 格式化逐字稿列表
  let transcriptHtml = '';
  if (Array.isArray(log.dialogueHistory) && log.dialogueHistory.length > 0) {
    let round = 1;
    transcriptHtml = log.dialogueHistory.map(msg => {
      if (msg.role === 'user') {
        const h = `
          <div class="chat-bubble-turn turn-user">
            <div class="turn-role">🧑‍💼 學員教練【${escapeHtml(log.studentName || '教練')}】（第 ${round} 輪提問）</div>
            <div>${escapeHtml(msg.content)}</div>
          </div>
        `;
        round++;
        return h;
      } else {
        return `
          <div class="chat-bubble-turn turn-target">
            <div class="turn-role">👤 練習對象【${escapeHtml(log.targetName)} (${escapeHtml(log.targetRole || '')})】</div>
            <div>${escapeHtml(msg.content)}</div>
            ${msg.innerThought ? `<div class="turn-thought">💭 對象潛意識心聲：${escapeHtml(msg.innerThought)}</div>` : ''}
          </div>
        `;
      }
    }).join('');
  } else {
    transcriptHtml = '<div style="color: var(--text-muted); font-style: italic; padding: 1rem;">（無逐字稿記錄）</div>';
  }

  // 格式化亮點與改善機會
  let strengthsHtml = '';
  if (Array.isArray(log.strengths) && log.strengths.length > 0) {
    strengthsHtml = log.strengths.map(s => `
      <div class="highlight-card strength">
        <div style="font-weight: 700; color: #047857;">🌟 ${escapeHtml(s.title || '有效同理傾聽')}</div>
        ${s.quote ? `<div class="quote-box">「${escapeHtml(s.quote)}」</div>` : ''}
        <div style="font-size: 0.88rem; color: #334155;">${escapeHtml(s.analysis || '')}</div>
      </div>
    `).join('');
  }

  let growthHtml = '';
  if (Array.isArray(log.growthAreas) && log.growthAreas.length > 0) {
    growthHtml = log.growthAreas.map(g => `
      <div class="highlight-card growth">
        <div style="font-weight: 700; color: #b45309;">💡 ${escapeHtml(g.title || '提問句型重構')}</div>
        ${g.quote ? `<div style="font-size: 0.82rem; color: #b91c1c; margin-top: 0.25rem;">⚠️ 原句：<span style="font-style: italic;">「${escapeHtml(g.quote)}」</span></div>` : ''}
        ${g.betterAlternative ? `<div class="quote-box" style="border-left: 3px solid #10b981;">👉 推薦重構句：<b>${escapeHtml(g.betterAlternative)}</b></div>` : ''}
        ${g.rationale ? `<div style="font-size: 0.84rem; color: #475569;">原理剖析：${escapeHtml(g.rationale)}</div>` : ''}
      </div>
    `).join('');
  }

  // 格式化行動指引
  let tipsHtml = '';
  if (Array.isArray(log.deliberatePracticeTips) && log.deliberatePracticeTips.length > 0) {
    tipsHtml = `
      <div style="margin-top: 1rem;">
        <h5 style="font-size: 0.92rem; color: #0f172a; margin-bottom: 0.4rem;">🚀 刻意練習行動指引</h5>
        <ul style="padding-left: 1.25rem; font-size: 0.88rem; color: #334155; line-height: 1.6;">
          ${log.deliberatePracticeTips.map(t => `<li>${escapeHtml(t)}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  elements.modalLogContent.innerHTML = `
    <!-- 基本資訊卡 -->
    <div style="background: #f8fafc; border: 1px solid var(--border); border-radius: var(--radius); padding: 1rem 1.25rem; margin-bottom: 1.25rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
        <div>
          <h4 style="font-size: 1.2rem; color: #0f172a; margin-bottom: 0.25rem;">
            ${fwMeta.icon} ${escapeHtml(log.targetName)} · ${escapeHtml(log.targetRole || '')}
          </h4>
          <p style="font-size: 0.85rem; color: var(--text-muted);">
            教練學員：<b>${escapeHtml(log.studentName || '學員教練')}</b> ｜ 理論模型：<b>${escapeHtml(fwMeta.name)}</b> ｜ 互動：共 <b>${log.turns || 1}</b> 輪
          </p>
          <p style="font-size: 0.82rem; color: #475569; margin-top: 0.25rem;">
            情境背景：${escapeHtml(log.scenario || '')}
          </p>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 1.8rem; font-weight: 800; color: var(--primary);">${log.score || 80}<span style="font-size: 1rem;">分</span></div>
          <div style="font-size: 0.85rem; font-weight: 700; color: #059669;">${escapeHtml(log.level || '優秀教練')}</div>
        </div>
      </div>
    </div>

    <!-- 總評摘要 -->
    ${log.summary ? `
      <div style="margin-bottom: 1.25rem;">
        <h5 style="font-size: 0.92rem; color: var(--text-muted); margin-bottom: 0.35rem;">📝 督導總評摘要</h5>
        <div style="background: #ffffff; border-left: 4px solid var(--primary); padding: 0.75rem 1rem; border-radius: 4px; border: 1px solid var(--border); border-left-width: 4px; font-size: 0.92rem; color: #334155; line-height: 1.6;">
          ${escapeHtml(log.summary)}
        </div>
      </div>
    ` : ''}

    <!-- 五維度分析指標 -->
    <div style="margin-bottom: 1.25rem;">
      <h5 style="font-size: 0.92rem; color: var(--text-muted); margin-bottom: 0.35rem;">📊 ICF 教練核心溝通能力五維指標</h5>
      <div class="dim-grid">
        <div class="dim-badge">理論掌握度：${dims.frameworkProficiency || 75}分</div>
        <div class="dim-badge">共情傾聽：${dims.empathyListening || 80}分</div>
        <div class="dim-badge">有力提問：${dims.powerfulQuestioning || 75}分</div>
        <div class="dim-badge">心理安全感：${dims.psychologicalSafety || 80}分</div>
        <div class="dim-badge">推進賦能：${dims.forwardMomentum || 70}分</div>
      </div>
    </div>

    <!-- 做得好的亮點 -->
    ${strengthsHtml ? `
      <div style="margin-bottom: 1.25rem;">
        <h5 style="font-size: 0.92rem; color: #047857; margin-bottom: 0.35rem;">🌟 做得好的亮點 (Strengths)</h5>
        ${strengthsHtml}
      </div>
    ` : ''}

    <!-- 改善機會與示範金句 -->
    ${growthHtml ? `
      <div style="margin-bottom: 1.25rem;">
        <h5 style="font-size: 0.92rem; color: #b45309; margin-bottom: 0.35rem;">💡 改善機會與示範金句 (Before & After)</h5>
        ${growthHtml}
      </div>
    ` : ''}

    ${tipsHtml}

    <!-- 完整對話練習逐字稿 -->
    <div style="margin-top: 1.5rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
        <h5 style="font-size: 1rem; color: #0f172a; font-weight: 700;">📜 完整實戰對話逐字稿 (Transcript)</h5>
        <span style="font-size: 0.78rem; color: var(--text-muted);">共 ${log.turns || 1} 輪完整對談</span>
      </div>
      <div class="transcript-box">
        ${transcriptHtml}
      </div>
    </div>
  `;

  elements.modalLogDetail.classList.remove('hidden');

  if (LangManager.getLang() === 'zh-TW') {
    LangManager.translateDOM(elements.modalLogContent);
  }
}

function closeDetailModal() {
  elements.modalLogDetail.classList.add('hidden');
  viewingLog = null;
}

// 刪除單筆紀錄
async function deletePracticeLog(id) {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return;

  try {
    const res = await fetch('/api/admin/practice-logs/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ id })
    });
    const data = await res.json();
    if (data.ok) {
      await loadPracticeLogs();
    } else {
      alert(data.error || '刪除失敗');
    }
  } catch (err) {
    alert('操作異常');
  }
}

// 清空全部紀錄
async function handleClearAllLogs() {
  const pass = prompt(LangManager.t('【警告】此操作將永久清空所有學員實戰演練逐字稿與報告！\n若確認清空，請在下方輸入「CLEAR」：'));
  if (pass !== 'CLEAR') return;

  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return;

  try {
    const res = await fetch('/api/admin/practice-logs/clear', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.ok) {
      alert(LangManager.t('所有學員演練紀錄已清空！'));
      await loadPracticeLogs();
    }
  } catch (err) {
    alert('清空失敗');
  }
}

// 匯出全部 JSON 備份檔
function handleExportAllJson() {
  if (currentLogs.length === 0) {
    alert(LangManager.t('目前尚無任何學員紀錄可供匯出'));
    return;
  }

  const exportObj = {
    app: 'CoachLab',
    exportedAt: new Date().toISOString(),
    totalCount: currentLogs.length,
    records: currentLogs
  };

  const jsonStr = JSON.stringify(exportObj, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `CoachLab_全體學員實戰逐字稿紀錄_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 下載個別 Markdown 完整復盤報告與逐字稿
function downloadLogMarkdown(log) {
  const dateStr = new Date(log.submittedAt || log.date).toLocaleString('zh-TW', { hour12: false });
  const dims = log.dimensionScores || {};
  const fwMeta = FRAMEWORK_META[log.frameworkId] || { name: log.frameworkName || '理論模式', icon: '🕊️' };

  let md = `# 🎯 CoachLab 教練對話演練督導復盤報告\n\n`;
  md += `> **演練時間**：${dateStr}\n`;
  md += `> **教練學員**：🧑‍💼 **${log.studentName || '學員教練'}**\n`;
  md += `> **理論模型**：${fwMeta.icon} **${fwMeta.name}**\n`;
  md += `> **練習對象**：👤 **${log.targetName}**（${log.targetRole || ''}）\n`;
  md += `> **衝突情境**：${log.scenario || ''}\n`;
  md += `> **難度等級**：${log.difficulty === 'challenging' ? '高難挑戰' : (log.difficulty === 'beginner' ? '初學溫和' : '寫實逼真')}\n`;
  md += `> **綜合評分**：**${log.score || 80} 分**（評級：**${log.level || '優秀教練'}**）\n`;
  md += `> **互動輪次**：共 ${log.turns || 1} 輪對話\n\n`;
  md += `---\n\n`;

  if (log.summary) {
    md += `## 📝 督導綜合評審摘要\n${log.summary}\n\n`;
  }

  md += `## 📊 ICF 教練核心能力五維度分析\n\n`;
  md += `| 評估維度 | 得分 |\n| :--- | :--- |\n`;
  md += `| 理論框架掌握度 | **${dims.frameworkProficiency || 75} 分** |\n`;
  md += `| 深度共情與傾聽 | **${dims.empathyListening || 80} 分** |\n`;
  md += `| 有力提問與引導 | **${dims.powerfulQuestioning || 75} 分** |\n`;
  md += `| 心理安全感營造 | **${dims.psychologicalSafety || 80} 分** |\n`;
  md += `| 推進轉化與賦能 | **${dims.forwardMomentum || 70} 分** |\n\n`;
  md += `---\n\n`;

  if (Array.isArray(log.strengths) && log.strengths.length > 0) {
    md += `## 🌟 做得好的亮點 (Strengths)\n\n`;
    log.strengths.forEach((s, idx) => {
      md += `### ${idx + 1}. ${s.title}\n`;
      if (s.quote) md += `> 「${s.quote}」\n\n`;
      md += `${s.analysis}\n\n`;
    });
    md += `---\n\n`;
  }

  if (Array.isArray(log.growthAreas) && log.growthAreas.length > 0) {
    md += `## 💡 改善機會與示範金句 (Before & After)\n\n`;
    log.growthAreas.forEach((g, idx) => {
      md += `### ${idx + 1}. ${g.title}\n`;
      if (g.quote) md += `- **原發言 (Before)**：\`${g.quote}\`\n`;
      if (g.betterAlternative) md += `- **推薦重構說法 (After)**：**「${g.betterAlternative}」**\n`;
      if (g.rationale) md += `- **心法原理解析**：${g.rationale}\n\n`;
    });
    md += `---\n\n`;
  }

  if (log.frameworkDeepDive?.stageAnalysis || log.frameworkDeepDive?.keyTakeaway) {
    md += `## 🔍 理論架構深入實踐診斷\n`;
    if (log.frameworkDeepDive.stageAnalysis) md += `- **階段與層次探討**：${log.frameworkDeepDive.stageAnalysis}\n`;
    if (log.frameworkDeepDive.keyTakeaway) md += `- **核心心法提醒**：${log.frameworkDeepDive.keyTakeaway}\n\n`;
    md += `---\n\n`;
  }

  if (Array.isArray(log.deliberatePracticeTips) && log.deliberatePracticeTips.length > 0) {
    md += `## 🚀 下一步刻意練習行動指引\n\n`;
    log.deliberatePracticeTips.forEach((tip, idx) => {
      md += `${idx + 1}. ${tip}\n`;
    });
    md += `\n---\n\n`;
  }

  md += `## 📜 完整實戰對話逐字稿實錄 (Transcript)\n\n`;
  if (Array.isArray(log.dialogueHistory) && log.dialogueHistory.length > 0) {
    let round = 1;
    for (const msg of log.dialogueHistory) {
      if (msg.role === 'user') {
        md += `### 🔹 第 ${round} 輪 · 教練學員發言\n`;
        md += `**🧑‍💼 ${log.studentName || '學員教練'}**：\n> ${msg.content.replace(/\n/g, '\n> ')}\n\n`;
        round++;
      } else {
        md += `**👤 ${log.targetName} (${log.targetRole || '對象'})**：\n${msg.content}\n\n`;
        if (msg.innerThought) {
          md += `*💭 對象潛意識心聲：${msg.innerThought}*\n\n`;
        }
      }
    }
  } else {
    md += `*（無逐字稿記錄）*\n\n`;
  }

  md += `---\n*CoachLab 導師督導管理後台 · https://chat.portal-coachsunny.com/admin*\n`;

  // 若使用者語言為簡體，自動轉換輸出
  if (LangManager.getLang() === 'zh-CN') {
    md = LangManager.toSimplified(md);
  }

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const cleanName = (log.studentName || '學員').replace(/[^\w\u4e00-\u9fa5]/g, '_');
  const cleanTarget = (log.targetName || '對象').replace(/[^\w\u4e00-\u9fa5]/g, '_');
  a.download = `CoachLab_復盤逐字稿_${cleanName}_${cleanTarget}_${new Date().toISOString().slice(0, 10)}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 複製逐字稿純文字
function copyLogTranscript(log) {
  const dateStr = new Date(log.submittedAt || log.date).toLocaleString('zh-TW', { hour12: false });
  let text = `【CoachLab 教練對話演練逐字稿】\n`;
  text += `學員教練：${log.studentName || '學員教練'}\n練習對象：${log.targetName} (${log.targetRole || ''})\n演練時間：${dateStr}\n綜合評分：${log.score}分 (${log.level})\n`;
  text += `情境背景：${log.scenario || ''}\n`;
  if (log.summary) text += `總評摘要：${log.summary}\n`;
  text += `\n--- 完整逐字稿 ---\n`;

  let round = 1;
  (log.dialogueHistory || []).forEach(m => {
    if (m.role === 'user') {
      text += `\n[第 ${round} 輪 · 教練] ${log.studentName || '學員'}：\n${m.content}\n`;
      round++;
    } else {
      text += `[對象] ${log.targetName}：\n${m.content}\n`;
      if (m.innerThought) text += `(💭 內心狀態：${m.innerThought})\n`;
    }
  });

  if (LangManager.getLang() === 'zh-CN') {
    text = LangManager.toSimplified(text);
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      alert(LangManager.t('📋 逐字稿全文已複製到剪貼簿！'));
    });
  } else {
    prompt(LangManager.t('請複製以下逐字稿：'), text);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
