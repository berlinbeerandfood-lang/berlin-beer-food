/**
 * GET /api/admin/participants
 * Returns all bets for the active match, sorted by creation time.
 */
import { isAuthenticated, jsonResponse, unauthorized } from './_auth.js';

export async function onRequestGet({ request, env }) {
  if (!await isAuthenticated(request, env)) return unauthorized();

  try {
    const raw = await env.BERLIN_KV.get('active_match');
    if (!raw) return jsonResponse({ participants: [] });

    const match = JSON.parse(raw);

    const betKeys = await env.BERLIN_KV.list({ prefix: `bet:${match.id}:` });
    const participants = [];

    for (const key of betKeys.keys) {
      const betRaw = await env.BERLIN_KV.get(key.name);
      if (betRaw) participants.push(JSON.parse(betRaw));
    }

    // Sort by creation time (oldest first)
    participants.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    return jsonResponse({ participants, matchTitle: match.title });

  } catch (err) {
    console.error('Participants error:', err);
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
