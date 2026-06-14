/**
 * POST /api/bet
 * Submits a new bet for the active match.
 * Body: { matchId, playerName, tableNumber, homeGoals, awayGoals }
 */
export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();

    // Validation
    const { matchId, playerName, tableNumber, homeGoals, awayGoals } = body;

    if (!playerName || typeof playerName !== 'string' || playerName.trim().length === 0) {
      return jsonResponse({ error: 'El nombre es obligatorio.' }, 400);
    }
    if (!tableNumber || isNaN(parseInt(tableNumber)) || parseInt(tableNumber) < 1) {
      return jsonResponse({ error: 'Número de mesa inválido.' }, 400);
    }
    if (typeof homeGoals !== 'number' || homeGoals < 0 || homeGoals > 20) {
      return jsonResponse({ error: 'Goles del equipo local inválidos.' }, 400);
    }
    if (typeof awayGoals !== 'number' || awayGoals < 0 || awayGoals > 20) {
      return jsonResponse({ error: 'Goles del equipo visitante inválidos.' }, 400);
    }

    // Load active match
    const raw = await env.BERLIN_KV.get('active_match');
    if (!raw) {
      return jsonResponse({ error: 'No hay un partido activo en este momento.' }, 400);
    }

    const match = JSON.parse(raw);

    if (match.id !== matchId) {
      return jsonResponse({ error: 'El partido ya no está disponible. Recargá la página.' }, 400);
    }

    // Check close time
    if (match.closeTime && new Date() >= new Date(match.closeTime)) {
      return jsonResponse({ error: 'El tiempo de apuestas para este partido ha finalizado.' }, 400);
    }

    // Check for duplicate bet (same name + table + match)
    const dupKey = `bet_dup:${match.id}:${normalizeName(playerName)}:${parseInt(tableNumber)}`;
    const existing = await env.BERLIN_KV.get(dupKey);
    if (existing) {
      return jsonResponse({ error: 'Ya registraste una apuesta para este partido con este nombre y mesa.' }, 409);
    }

    // Create bet record
    const bet = {
      id:          crypto.randomUUID(),
      matchId:     match.id,
      matchTitle:  match.title,
      playerName:  playerName.trim().slice(0, 80),
      tableNumber: parseInt(tableNumber),
      homeGoals:   Math.floor(homeGoals),
      awayGoals:   Math.floor(awayGoals),
      createdAt:   new Date().toISOString(),
      isWinner:    false,
    };

    // Save bet
    await env.BERLIN_KV.put(`bet:${match.id}:${bet.id}`, JSON.stringify(bet));

    // Save duplicate guard (expires after 7 days)
    await env.BERLIN_KV.put(dupKey, '1', { expirationTtl: 604800 });

    // Update participant count on match
    match.participantCount = (match.participantCount || 0) + 1;
    await env.BERLIN_KV.put('active_match', JSON.stringify(match));

    return jsonResponse({ success: true, betId: bet.id });

  } catch (err) {
    console.error('Bet error:', err);
    return jsonResponse({ error: 'Error interno del servidor.' }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

function normalizeName(str) {
  return str.trim().toLowerCase().replace(/\s+/g, '_');
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
