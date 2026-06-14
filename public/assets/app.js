/* =============================================
   BERLIN BEER & FOOD — PUBLIC APP
   ============================================= */

const API = '/api';

let currentMatch = null;

// ---- DOM refs ----
const stateLoading   = document.getElementById('stateLoading');
const stateEmpty     = document.getElementById('stateEmpty');
const stateClosed    = document.getElementById('stateClosed');
const stateActive    = document.getElementById('stateActive');
const stateSuccess   = document.getElementById('stateSuccess');

const matchTitle     = document.getElementById('matchTitle');
const matchDate      = document.getElementById('matchDate');
const matchHour      = document.getElementById('matchHour');
const matchPrize     = document.getElementById('matchPrize');
const teamHomeName   = document.getElementById('teamHomeName');
const teamAwayName   = document.getElementById('teamAwayName');
const teamHomeEmoji  = document.getElementById('teamHomeEmoji');
const teamAwayEmoji  = document.getElementById('teamAwayEmoji');
const teamHomeCrest  = document.getElementById('teamHomeCrest');
const teamAwayCrest  = document.getElementById('teamAwayCrest');
const scoreHomeName  = document.getElementById('scoreHomeName');
const scoreAwayName  = document.getElementById('scoreAwayName');

const playerName     = document.getElementById('playerName');
const tableNumber    = document.getElementById('tableNumber');
const homeGoals      = document.getElementById('homeGoals');
const awayGoals      = document.getElementById('awayGoals');
const homeDisplay    = document.getElementById('homeGoalsDisplay');
const awayDisplay    = document.getElementById('awayGoalsDisplay');
const errorMsg       = document.getElementById('errorMsg');
const submitBtn      = document.getElementById('submitBtn');
const successMessage = document.getElementById('successMessage');
const successDetail  = document.getElementById('successDetail');

// ---- State helpers ----

function showState(state) {
  [stateLoading, stateEmpty, stateClosed, stateActive, stateSuccess].forEach(el => {
    el.classList.add('hidden');
  });
  state.classList.remove('hidden');
}

// ---- Crest rendering ----

function renderCrest(container, emojiOrUrl, fallback) {
  container.innerHTML = '';
  if (!emojiOrUrl) {
    container.innerHTML = `<span class="crest-placeholder">${fallback}</span>`;
    return;
  }
  const isUrl = emojiOrUrl.startsWith('http') || emojiOrUrl.startsWith('/');
  if (isUrl) {
    const img = document.createElement('img');
    img.src = emojiOrUrl;
    img.alt = '';
    img.onerror = () => { container.innerHTML = `<span class="crest-placeholder">${fallback}</span>`; };
    container.appendChild(img);
  } else {
    container.innerHTML = `<span class="crest-placeholder">${emojiOrUrl}</span>`;
  }
}

// ---- Date formatting ----

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatHour(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

// ---- Load active match ----

async function loadMatch() {
  showState(stateLoading);
  try {
    const res = await fetch(`${API}/match`);
    const data = await res.json();

    if (!data.match) {
      showState(stateEmpty);
      return;
    }

    currentMatch = data.match;
    populateMatch(currentMatch);

    const now = new Date();
    const closeTime = currentMatch.closeTime ? new Date(currentMatch.closeTime) : null;

    if (closeTime && now >= closeTime) {
      showState(stateClosed);
    } else {
      showState(stateActive);
    }

  } catch (err) {
    console.error('Error cargando partido:', err);
    showState(stateEmpty);
  }
}

function populateMatch(match) {
  matchTitle.textContent = match.title || '—';
  matchDate.textContent  = formatDate(match.matchDatetime);
  matchHour.textContent  = formatHour(match.matchDatetime);
  matchPrize.textContent = match.prize || 'Sin especificar';

  teamHomeName.textContent = match.homeTeam?.name || 'Local';
  teamAwayName.textContent = match.awayTeam?.name || 'Visitante';
  scoreHomeName.textContent = match.homeTeam?.name || 'Local';
  scoreAwayName.textContent = match.awayTeam?.name || 'Visitante';

  renderCrest(teamHomeCrest, match.homeTeam?.crest, '🏠');
  renderCrest(teamAwayCrest, match.awayTeam?.crest, '✈️');
}

// ---- Score controls ----

document.querySelectorAll('.score-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const target  = btn.dataset.target;
    const input   = document.getElementById(target);
    const display = document.getElementById(target + 'Display');
    let val = parseInt(input.value, 10);

    if (btn.classList.contains('plus')) {
      val = Math.min(val + 1, 20);
    } else {
      val = Math.max(val - 1, 0);
    }

    input.value = val;
    display.textContent = val;
  });
});

// ---- Form validation & submission ----

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.remove('hidden');
}

function hideError() {
  errorMsg.classList.add('hidden');
}

submitBtn.addEventListener('click', async () => {
  hideError();

  const name  = playerName.value.trim();
  const table = tableNumber.value.trim();
  const hg    = parseInt(homeGoals.value, 10);
  const ag    = parseInt(awayGoals.value, 10);

  if (!name) { showError('Por favor ingresá tu nombre.'); playerName.focus(); return; }
  if (!table || isNaN(parseInt(table))) { showError('Por favor ingresá tu número de mesa.'); tableNumber.focus(); return; }
  if (!currentMatch) { showError('No hay un partido activo.'); return; }

  // Close time check (client-side, server also validates)
  if (currentMatch.closeTime && new Date() >= new Date(currentMatch.closeTime)) {
    showState(stateClosed);
    return;
  }

  submitBtn.disabled = true;
  submitBtn.querySelector('span').textContent = 'Enviando...';

  try {
    const res = await fetch(`${API}/bet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        matchId:       currentMatch.id,
        playerName:    name,
        tableNumber:   parseInt(table, 10),
        homeGoals:     hg,
        awayGoals:     ag,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      showError(data.error || 'Error al enviar el pronóstico. Intentá de nuevo.');
      return;
    }

    // Show success
    successMessage.textContent = `¡Tu pronóstico fue registrado, ${name}!`;
    successDetail.innerHTML = `
      <strong>Tu apuesta:</strong> ${currentMatch.homeTeam?.name || 'Local'} ${hg} – ${ag} ${currentMatch.awayTeam?.name || 'Visitante'}<br>
      Mesa Nº ${table} · ${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
    `;
    showState(stateSuccess);

  } catch (err) {
    console.error('Error enviando apuesta:', err);
    showError('Error de conexión. Revisá tu internet e intentá de nuevo.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.querySelector('span').textContent = 'Enviar pronóstico';
  }
});

// ---- Init ----
loadMatch();
