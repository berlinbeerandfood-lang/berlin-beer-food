/**
 * GET /api/admin/results
 * Returns real result and winners for the active match.
 */
import { isAuthenticated, jsonResponse, unauthorized } from './_auth.js';

export async function onRequestGet({ request, env }) {
  if (!await isAuthenticated(request, env)) return unauthorized();

  try {
    const raw = await env.BERLIN_KV.get('active_match');
    if (!raw) return jsonResponse({ realResult: null, winners: [] });

    const match = JSON.parse(raw);
    if (!match.realResult) return jsonResponse({ realResult: null, winners: [] });

    // Load all bets and filter winners
    const betKeys = await env.BERLIN_KV.list({ prefix: `bet:${match.id}:` });
    const winners = [];

    for (const key of betKeys.keys) {
      const betRaw = await env.BERLIN_KV.get(key.name);
      if (!betRaw) continue;
      const bet = JSON.parse(betRaw);
      if (bet.isWinner) winners.push(bet);
    }

    winners.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    return jsonResponse({
      realResult:  match.realResult,
      winners,
      matchTitle:  match.title,
    });

  } catch (err) {
    console.error('Results error:', err);
    return jsonResponse({ error: 'Error interno.' }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
