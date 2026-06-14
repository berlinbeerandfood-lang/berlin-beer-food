/**
 * PUT    /api/admin/match/[id]         → update match
 * DELETE /api/admin/match/[id]         → delete match
 */
import { isAuthenticated, jsonResponse, unauthorized } from '../../_auth.js';

export async function onRequestPut({ request, env, params }) {
  if (!await isAuthenticated(request, env)) return unauthorized();

  try {
    const raw = await env.BERLIN_KV.get('active_match');
    if (!raw) return jsonResponse({ error: 'No hay un partido activo.' }, 404);

    const existing = JSON.parse(raw);
    if (existing.id !== params.id) return jsonResponse({ error: 'ID de partido no coincide.' }, 404);

    const body = await request.json();

    // Merge updates (preserve id, participantCount, realResult, createdAt)
    const updated = {
      ...existing,
      title:         String(body.title || existing.title).trim().slice(0, 120),
      homeTeam: {
        name:  String(body.homeTeam?.name  || existing.homeTeam?.name  || '').trim().slice(0, 60),
        crest: String(body.homeTeam?.crest || existing.homeTeam?.crest || '').trim().slice(0, 200),
      },
      awayTeam: {
        name:  String(body.awayTeam?.name  || existing.awayTeam?.name  || '').trim().slice(0, 60),
        crest: String(body.awayTeam?.crest || existing.awayTeam?.crest || '').trim().slice(0, 200),
      },
      matchDatetime: body.matchDatetime || existing.matchDatetime,
      closeTime:     body.closeTime     || existing.closeTime,
      prize:         String(body.prize  || existing.prize || '').trim().slice(0, 200),
      updatedAt:     new Date().toISOString(),
    };

    await env.BERLIN_KV.put('active_match', JSON.stringify(updated));
    return jsonResponse({ match: updated });

  } catch (err) {
    console.error('Update match error:', err);
    return jsonResponse({ error: 'Error interno.' }, 500);
  }
}

export async function onRequestDelete({ request, env, params }) {
  if (!await isAuthenticated(request, env)) return unauthorized();

  try {
    const raw = await env.BERLIN_KV.get('active_match');
    if (!raw) return jsonResponse({ error: 'No hay partido activo.' }, 404);

    const match = JSON.parse(raw);
    if (match.id !== params.id) return jsonResponse({ error: 'ID no coincide.' }, 404);

    // Archive before delete
    await archiveMatch(env, match);

    // Delete all bets for this match
    const betKeys = await env.BERLIN_KV.list({ prefix: `bet:${match.id}:` });
    await Promise.all(betKeys.keys.map(k => env.BERLIN_KV.delete(k.name)));

    await env.BERLIN_KV.delete('active_match');
    return jsonResponse({ success: true });

  } catch (err) {
    console.error('Delete match error:', err);
    return jsonResponse({ error: 'Error interno.' }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

async function archiveMatch(env, match) {
  await env.BERLIN_KV.put(`archived_match:${match.id}`, JSON.stringify(match));
  const indexRaw = await env.BERLIN_KV.get('archived_match_index');
  const index    = indexRaw ? JSON.parse(indexRaw) : [];
  if (!index.includes(match.id)) {
    index.unshift(match.id);
    await env.BERLIN_KV.put('archived_match_index', JSON.stringify(index));
  }
}
