/**
 * POST /api/admin/match/[id]/result
 * Loads the real match result and automatically detects winners.
 * Body: { home, away }
 */
import { isAuthenticated, jsonResponse, unauthorized } from '../../../_auth.js';

export async function onRequestPost({ request, env, params }) {
  if (!await isAuthenticated(request, env)) return unauthorized();

  try {
    const { home, away } = await request.json();

    if (typeof home !== 'number' || home < 0 || home > 20) {
      return jsonResponse({ error: 'Resultado local inválido.' }, 400);
    }
    if (typeof away !== 'number' || away < 0 || away > 20) {
      return jsonResponse({ error: 'Resultado visitante inválido.' }, 400);
    }

    const raw = await env.BERLIN_KV.get('active_match');
    if (!raw) return jsonResponse({ error: 'No hay partido activo.' }, 404);

    const match = JSON.parse(raw);
    if (match.id !== params.id) return jsonResponse({ error: 'ID de partido no coincide.' }, 404);

    // Update match with real result
    match.realResult = { home, away };
    match.resultSetAt = new Date().toISOString();

    // Load all bets for this match and mark winners
    const betKeys = await env.BERLIN_KV.list({ prefix: `bet:${match.id}:` });

    let winnersCount = 0;
    for (const key of betKeys.keys) {
      const betRaw = await env.BERLIN_KV.get(key.name);
      if (!betRaw) continue;

      const bet = JSON.parse(betRaw);
      const isWinner = bet.homeGoals === home && bet.awayGoals === away;
      bet.isWinner = isWinner;
      if (isWinner) winnersCount++;

      await env.BERLIN_KV.put(key.name, JSON.stringify(bet));
    }

    match.winnersCount = winnersCount;

    // Save updated match
    await env.BERLIN_KV.put('active_match', JSON.stringify(match));

    // Also update archived copy if exists
    const archivedRaw = await env.BERLIN_KV.get(`archived_match:${match.id}`);
    if (archivedRaw) {
      await env.BERLIN_KV.put(`archived_match:${match.id}`, JSON.stringify(match));
    }

    return jsonResponse({ match, winnersCount });

  } catch (err) {
    console.error('Set result error:', err);
    return jsonResponse({ error: 'Error interno del servidor.' }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
