/* =============================================
   BERLIN BEER & FOOD — ADMIN PANEL
   ============================================= */

const API = '/api';
const ADMIN_KEY = 'berlin_admin_session';

let currentMatch = null;
let allParticipants = [];
let historyMatches = [];

// ---- Auth ----

const adminLogin     = document.getElementById('adminLogin');
const adminDashboard = document.getElementById('adminDashboard');
const loginPassword  = document.getElementById('loginPassword');
const loginError     = document.getElementById('loginError');
const loginBtn       = document.getElementById('loginBtn');
const logoutBtn      = document.getElementById('logoutBtn');

function getSession() { return sessionStorage.getItem(ADMIN_KEY); }
function setSession(token) { sessionStorage.setItem(ADMIN_KEY, token); }
function clearSession() { sessionStorage.removeItem(ADMIN_KEY); }

function showDashboard() {
  adminLogin.classList.add('hidden');
  adminDashboard.classList.remove('hidden');
  loadMatchSection();
}

function showLogin() {
  adminLogin.classList.remove('hidden');
  adminDashboard.classList.add('hidden');
}

loginBtn.addEventListener('click', async () => {
  const pwd = loginPassword.value;
  if (!pwd) return;

  loginBtn.disabled = true;
  loginError.classList.add('hidden');

  try {
    const res  = await fetch(`${API}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pwd }),
    });
    const data = await res.json();

    if (!res.ok) {
      loginError.classList.remove('hidden');
      return;
    }

    setSession(data.token);
    showDashboard();
  } catch (err) {
    loginError.textContent = 'Error de conexión.';
    loginError.classList.remove('hidden');
  } finally {
    loginBtn.disabled = false;
  }
});

loginPassword.addEventListener('keydown', e => {
  if (e.key === 'Enter') loginBtn.click();
});

logoutBtn.addEventListener('click', () => {
  clearSession();
  showLogin();
});

// Check existing session on load
(async () => {
  const token = getSession();
  if (token) {
    try {
      const res = await fetch(`${API}/admin/verify`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) { showDashboard(); return; }
    } catch {}
    clearSession();
  }
  showLogin();
})();

// ---- Auth helper ----

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getSession()}`,
  };
}

async function authedFetch(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { ...authHeaders(), ...(opts.headers || {}) },
  });
  if (res.status === 401) { clearSession(); showLogin(); throw new Error('Unauthorized'); }
  return res;
}

// ---- Sidebar navigation ----

const menuToggle  = document.getElementById('menuToggle');
const sidebarEl   = document.getElementById('adminSidebar');
const sidebarClose = document.getElementById('sidebarClose');
const topbarTitle = document.getElementById('topbarTitle');
const navItems    = document.querySelectorAll('.nav-item');
const sections    = {
  match:        document.getElementById('sectionMatch'),
  participants: document.getElementById('sectionParticipants'),
  results:      document.getElementById('sectionResults'),
  history:      document.getElementById('sectionHistory'),
};
const sectionTitles = {
  match: 'Partido actual', participants: 'Participantes',
  results: 'Resultados', history: 'Historial',
};

let overlayEl = null;

function openSidebar() {
  sidebarEl.classList.add('open');
  if (!overlayEl) {
    overlayEl = document.createElement('div');
    overlayEl.className = 'sidebar-overlay visible';
    overlayEl.addEventListener('click', closeSidebar);
    document.body.appendChild(overlayEl);
  } else {
    overlayEl.classList.add('visible');
  }
}

function closeSidebar() {
  sidebarEl.classList.remove('open');
  if (overlayEl) overlayEl.classList.remove('visible');
}

menuToggle.addEventListener('click', openSidebar);
sidebarClose.addEventListener('click', closeSidebar);

navItems.forEach(item => {
  item.addEventListener('click', () => {
    const section = item.dataset.section;
    navItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    Object.values(sections).forEach(s => s.classList.add('hidden'));
    sections[section].classList.remove('hidden');
    topbarTitle.textContent = sectionTitles[section];
    closeSidebar();

    if (section === 'participants') loadParticipants();
    if (section === 'results')      loadResults();
    if (section === 'history')      loadHistory();
  });
});

// ---- Match section ----

const noMatchMsg       = document.getElementById('noMatchMsg');
const matchAdminCard   = document.getElementById('matchAdminCard');
const adminMatchTitle  = document.getElementById('adminMatchTitle');
const adminHomeName    = document.getElementById('adminHomeName');
const adminAwayName    = document.getElementById('adminAwayName');
const adminMatchDT     = document.getElementById('adminMatchDatetime');
const adminCloseTime   = document.getElementById('adminCloseTime');
const adminPrize       = document.getElementById('adminPrize');
const adminMatchStatus = document.getElementById('adminMatchStatus');
const resultRow        = document.getElementById('resultRow');
const adminRealResult  = document.getElementById('adminRealResult');

const btnCreateMatch = document.getElementById('btnCreateMatch');
const btnEditMatch   = document.getElementById('btnEditMatch');
const btnSetResult   = document.getElementById('btnSetResult');
const btnDeleteMatch = document.getElementById('btnDeleteMatch');

function formatDT(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

async function loadMatchSection() {
  try {
    const res  = await authedFetch(`${API}/admin/match`);
    const data = await res.json();
    currentMatch = data.match || null;
    renderMatchCard();
  } catch (err) {
    console.error(err);
  }
}

function renderMatchCard() {
  if (!currentMatch) {
    noMatchMsg.classList.remove('hidden');
    matchAdminCard.classList.add('hidden');
    return;
  }
  noMatchMsg.classList.add('hidden');
  matchAdminCard.classList.remove('hidden');

  adminMatchTitle.textContent = currentMatch.title || '—';
  adminHomeName.textContent   = currentMatch.homeTeam?.name || '—';
  adminAwayName.textContent   = currentMatch.awayTeam?.name || '—';
  adminMatchDT.textContent    = formatDT(currentMatch.matchDatetime);
  adminCloseTime.textContent  = formatDT(currentMatch.closeTime);
  adminPrize.textContent      = currentMatch.prize || '—';

  const now = new Date();
  const closed = currentMatch.closeTime && now >= new Date(currentMatch.closeTime);
  adminMatchStatus.textContent = currentMatch.realResult
    ? `Finalizado (${currentMatch.realResult.home}–${currentMatch.realResult.away})`
    : closed ? 'Cerrado a nuevas apuestas' : '🟢 Activo';

  if (currentMatch.realResult) {
    resultRow.style.display = 'flex';
    adminRealResult.textContent = `${currentMatch.realResult.home} – ${currentMatch.realResult.away}`;
  } else {
    resultRow.style.display = 'none';
  }
}

// ---- Match modal ----

const matchModal    = document.getElementById('matchModal');
const modalTitle    = document.getElementById('modalTitle');
const modalClose    = document.getElementById('modalClose');
const btnModalCancel = document.getElementById('btnModalCancel');
const btnModalSave  = document.getElementById('btnModalSave');
const modalError    = document.getElementById('modalError');

const mMatchTitle   = document.getElementById('mMatchTitle');
const mHomeName     = document.getElementById('mHomeName');
const mAwayName     = document.getElementById('mAwayName');
const mHomeEmoji    = document.getElementById('mHomeEmoji');
const mAwayEmoji    = document.getElementById('mAwayEmoji');
const mMatchDatetime = document.getElementById('mMatchDatetime');
const mCloseTime    = document.getElementById('mCloseTime');
const mPrize        = document.getElementById('mPrize');

function openMatchModal(editing = false) {
  modalTitle.textContent = editing ? 'Editar partido' : 'Nuevo partido';
  modalError.classList.add('hidden');
  matchModal.classList.remove('hidden');

  if (editing && currentMatch) {
    mMatchTitle.value    = currentMatch.title || '';
    mHomeName.value      = currentMatch.homeTeam?.name || '';
    mAwayName.value      = currentMatch.awayTeam?.name || '';
    mHomeEmoji.value     = currentMatch.homeTeam?.crest || '';
    mAwayEmoji.value     = currentMatch.awayTeam?.crest || '';
    mMatchDatetime.value = currentMatch.matchDatetime ? currentMatch.matchDatetime.slice(0, 16) : '';
    mCloseTime.value     = currentMatch.closeTime     ? currentMatch.closeTime.slice(0, 16)     : '';
    mPrize.value         = currentMatch.prize || '';
  } else {
    [mMatchTitle, mHomeName, mAwayName, mHomeEmoji, mAwayEmoji, mMatchDatetime, mCloseTime, mPrize]
      .forEach(el => el.value = '');
  }
}

function closeMatchModal() { matchModal.classList.add('hidden'); }

btnCreateMatch.addEventListener('click', () => openMatchModal(false));
btnEditMatch.addEventListener('click',   () => openMatchModal(true));
modalClose.addEventListener('click', closeMatchModal);
btnModalCancel.addEventListener('click', closeMatchModal);

matchModal.addEventListener('click', e => {
  if (e.target === matchModal) closeMatchModal();
});

btnModalSave.addEventListener('click', async () => {
  modalError.classList.add('hidden');

  const title    = mMatchTitle.value.trim();
  const homeName = mHomeName.value.trim();
  const awayName = mAwayName.value.trim();
  const matchDT  = mMatchDatetime.value;
  const closeT   = mCloseTime.value;
  const prize    = mPrize.value.trim();

  if (!title || !homeName || !awayName || !matchDT || !closeT) {
    modalError.textContent = 'Completá todos los campos obligatorios.';
    modalError.classList.remove('hidden');
    return;
  }

  if (new Date(closeT) >= new Date(matchDT)) {
    // Allow close before match start - that's fine
  }

  const payload = {
    title,
    homeTeam: { name: homeName, crest: mHomeEmoji.value.trim() },
    awayTeam: { name: awayName, crest: mAwayEmoji.value.trim() },
    matchDatetime: new Date(matchDT).toISOString(),
    closeTime:     new Date(closeT).toISOString(),
    prize,
  };

  const isEditing = !!currentMatch;
  const url    = isEditing ? `${API}/admin/match/${currentMatch.id}` : `${API}/admin/match`;
  const method = isEditing ? 'PUT' : 'POST';

  btnModalSave.disabled = true;
  try {
    const res  = await authedFetch(url, { method, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) {
      modalError.textContent = data.error || 'Error al guardar.';
      modalError.classList.remove('hidden');
      return;
    }
    currentMatch = data.match;
    renderMatchCard();
    closeMatchModal();
  } catch (err) {
    modalError.textContent = 'Error de conexión.';
    modalError.classList.remove('hidden');
  } finally {
    btnModalSave.disabled = false;
  }
});

// ---- Delete match ----

btnDeleteMatch.addEventListener('click', async () => {
  if (!currentMatch) return;
  if (!confirm(`¿Eliminar el partido "${currentMatch.title}"? Esta acción no se puede deshacer.`)) return;

  try {
    const res = await authedFetch(`${API}/admin/match/${currentMatch.id}`, { method: 'DELETE' });
    if (res.ok) { currentMatch = null; renderMatchCard(); }
  } catch (err) {
    alert('Error al eliminar el partido.');
  }
});

// ---- Result modal ----

const resultModal      = document.getElementById('resultModal');
const resultModalClose = document.getElementById('resultModalClose');
const btnResultCancel  = document.getElementById('btnResultCancel');
const btnResultSave    = document.getElementById('btnResultSave');
const resultMatchLabel = document.getElementById('resultMatchLabel');
const resultHomeName   = document.getElementById('resultHomeName');
const resultAwayName   = document.getElementById('resultAwayName');
const resultError      = document.getElementById('resultError');

function setupScoreControls(modalEl) {
  modalEl.querySelectorAll('.score-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target  = btn.dataset.target;
      const input   = document.getElementById(target);
      const display = document.getElementById(target + 'Display');
      let val = parseInt(input.value, 10);
      if (btn.classList.contains('plus'))  val = Math.min(val + 1, 20);
      else                                 val = Math.max(val - 1, 0);
      input.value = val;
      display.textContent = val;
    });
  });
}

setupScoreControls(resultModal);

btnSetResult.addEventListener('click', () => {
  if (!currentMatch) return;
  resultMatchLabel.textContent = currentMatch.title;
  resultHomeName.textContent   = currentMatch.homeTeam?.name || 'Local';
  resultAwayName.textContent   = currentMatch.awayTeam?.name || 'Visitante';

  const rh = document.getElementById('resultHome');
  const ra = document.getElementById('resultAway');
  const dh = document.getElementById('resultHomeDisplay');
  const da = document.getElementById('resultAwayDisplay');

  if (currentMatch.realResult) {
    rh.value = currentMatch.realResult.home; dh.textContent = currentMatch.realResult.home;
    ra.value = currentMatch.realResult.away; da.textContent = currentMatch.realResult.away;
  } else {
    rh.value = 0; dh.textContent = 0;
    ra.value = 0; da.textContent = 0;
  }

  resultError.classList.add('hidden');
  resultModal.classList.remove('hidden');
});

function closeResultModal() { resultModal.classList.add('hidden'); }
resultModalClose.addEventListener('click', closeResultModal);
btnResultCancel.addEventListener('click',  closeResultModal);
resultModal.addEventListener('click', e => { if (e.target === resultModal) closeResultModal(); });

btnResultSave.addEventListener('click', async () => {
  resultError.classList.add('hidden');
  const home = parseInt(document.getElementById('resultHome').value, 10);
  const away = parseInt(document.getElementById('resultAway').value, 10);

  btnResultSave.disabled = true;
  try {
    const res  = await authedFetch(`${API}/admin/match/${currentMatch.id}/result`, {
      method: 'POST',
      body: JSON.stringify({ home, away }),
    });
    const data = await res.json();
    if (!res.ok) {
      resultError.textContent = data.error || 'Error al guardar resultado.';
      resultError.classList.remove('hidden');
      return;
    }
    currentMatch = data.match;
    renderMatchCard();
    closeResultModal();
  } catch (err) {
    resultError.textContent = 'Error de conexión.';
    resultError.classList.remove('hidden');
  } finally {
    btnResultSave.disabled = false;
  }
});

// ---- Participants section ----

const participantsBody   = document.getElementById('participantsBody');
const participantsTable  = document.getElementById('participantsTable');
const noParticipantsMsg  = document.getElementById('noParticipantsMsg');

async function loadParticipants() {
  participantsBody.innerHTML = '';
  try {
    const res  = await authedFetch(`${API}/admin/participants`);
    const data = await res.json();
    allParticipants = data.participants || [];

    if (allParticipants.length === 0) {
      noParticipantsMsg.classList.remove('hidden');
      participantsTable.classList.add('hidden');
      return;
    }

    noParticipantsMsg.classList.add('hidden');
    participantsTable.classList.remove('hidden');

    allParticipants.forEach(p => {
      const tr = document.createElement('tr');
      const dt = new Date(p.createdAt).toLocaleString('es-AR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
      const prediction = `${p.homeGoals} – ${p.awayGoals}`;
      const winnerBadge = p.isWinner
        ? '<span class="badge-winner">🏆 Ganador</span>'
        : '<span class="badge-no">—</span>';

      tr.innerHTML = `
        <td>${esc(p.playerName)}</td>
        <td>${esc(String(p.tableNumber))}</td>
        <td>${prediction}</td>
        <td>${dt}</td>
        <td>${winnerBadge}</td>
      `;
      participantsBody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
  }
}

// ---- Export ----

document.getElementById('btnExportCSV').addEventListener('click', () => {
  if (!allParticipants.length) { alert('No hay participantes para exportar.'); return; }
  const rows = [
    ['Nombre', 'Mesa', 'Pronóstico (local)', 'Pronóstico (visitante)', 'Fecha/hora', 'Ganador'],
    ...allParticipants.map(p => [
      p.playerName, p.tableNumber, p.homeGoals, p.awayGoals,
      new Date(p.createdAt).toLocaleString('es-AR'), p.isWinner ? 'Sí' : 'No',
    ]),
  ];
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  downloadFile(csv, 'participantes_berlin.csv', 'text/csv;charset=utf-8;');
});

document.getElementById('btnExportExcel').addEventListener('click', () => {
  if (!allParticipants.length) { alert('No hay participantes para exportar.'); return; }
  // Generate a simple HTML table that Excel can open
  const rows = [
    ['Nombre', 'Mesa', 'Pronóstico (local)', 'Pronóstico (visitante)', 'Fecha/hora', 'Ganador'],
    ...allParticipants.map(p => [
      p.playerName, p.tableNumber, p.homeGoals, p.awayGoals,
      new Date(p.createdAt).toLocaleString('es-AR'), p.isWinner ? 'Sí' : 'No',
    ]),
  ];
  const html = `<html><head><meta charset="utf-8"><style>td,th{padding:6px 10px;border:1px solid #ccc;}</style></head><body>
    <table>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>
  </body></html>`;
  downloadFile(html, 'participantes_berlin.xls', 'application/vnd.ms-excel');
});

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ---- Results section ----

const noResultsMsg  = document.getElementById('noResultsMsg');
const resultSummary = document.getElementById('resultSummary');
const realScoreDisp = document.getElementById('realScoreDisplay');
const noWinnersMsg  = document.getElementById('noWinnersMsg');
const winnersList   = document.getElementById('winnersList');

async function loadResults() {
  noResultsMsg.classList.remove('hidden');
  resultSummary.classList.add('hidden');

  try {
    const res  = await authedFetch(`${API}/admin/results`);
    const data = await res.json();

    if (!data.realResult) { return; }

    noResultsMsg.classList.add('hidden');
    resultSummary.classList.remove('hidden');
    realScoreDisp.textContent = `${data.realResult.home} : ${data.realResult.away}`;

    const winners = data.winners || [];
    winnersList.innerHTML = '';

    if (winners.length === 0) {
      noWinnersMsg.classList.remove('hidden');
    } else {
      noWinnersMsg.classList.add('hidden');
      winners.forEach((w, i) => {
        const el = document.createElement('div');
        el.className = 'winner-card';
        el.innerHTML = `
          <span class="winner-medal">${i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
          <div>
            <div class="winner-name">${esc(w.playerName)}</div>
            <div class="winner-table">Mesa Nº ${w.tableNumber}</div>
          </div>
          <span class="winner-prediction">${w.homeGoals}–${w.awayGoals}</span>
        `;
        winnersList.appendChild(el);
      });
    }
  } catch (err) {
    console.error(err);
  }
}

// ---- History section ----

const noHistoryMsg   = document.getElementById('noHistoryMsg');
const historyList    = document.getElementById('historyList');
const historyDetail  = document.getElementById('historyDetail');
const btnBackHistory = document.getElementById('btnBackHistory');
const histDetailTitle = document.getElementById('historyDetailTitle');
const histDetailBody  = document.getElementById('historyDetailBody');

async function loadHistory() {
  historyList.innerHTML = '';
  historyDetail.classList.add('hidden');
  noHistoryMsg.classList.remove('hidden');
  historyList.classList.remove('hidden');

  try {
    const res  = await authedFetch(`${API}/admin/history`);
    const data = await res.json();
    historyMatches = data.matches || [];

    if (historyMatches.length === 0) return;
    noHistoryMsg.classList.add('hidden');

    historyMatches.forEach(m => {
      const el = document.createElement('div');
      el.className = 'history-item';
      const scoreEl = m.realResult
        ? `<span class="history-item-score">${m.realResult.home}–${m.realResult.away}</span>`
        : `<span class="history-item-score pending">Sin resultado</span>`;

      el.innerHTML = `
        <div class="history-item-left">
          <span class="history-item-name">${esc(m.title)}</span>
          <span class="history-item-meta">${formatDT(m.matchDatetime)} · ${m.participantCount || 0} participantes</span>
        </div>
        ${scoreEl}
      `;
      el.addEventListener('click', () => openHistoryDetail(m.id));
      historyList.appendChild(el);
    });
  } catch (err) {
    console.error(err);
  }
}

async function openHistoryDetail(matchId) {
  historyList.classList.add('hidden');
  historyDetail.classList.remove('hidden');
  histDetailBody.innerHTML = '';

  try {
    const res  = await authedFetch(`${API}/admin/history/${matchId}`);
    const data = await res.json();
    const m    = data.match;
    histDetailTitle.textContent = `${m.title} · ${formatDT(m.matchDatetime)}`;

    (data.participants || []).forEach(p => {
      const tr = document.createElement('tr');
      const dt = new Date(p.createdAt).toLocaleString('es-AR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
      const winnerBadge = p.isWinner
        ? '<span class="badge-winner">🏆 Ganador</span>'
        : '<span class="badge-no">—</span>';
      tr.innerHTML = `
        <td>${esc(p.playerName)}</td>
        <td>${esc(String(p.tableNumber))}</td>
        <td>${p.homeGoals} – ${p.awayGoals}</td>
        <td>${dt}</td>
        <td>${winnerBadge}</td>
      `;
      histDetailBody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
  }
}

btnBackHistory.addEventListener('click', () => {
  historyDetail.classList.add('hidden');
  historyList.classList.remove('hidden');
});

// ---- Utils ----

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDT(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}
