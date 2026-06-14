/**
 * GET /api/admin/history        → list all past matches
 * GET /api/admin/history/[id]   → detail of one past match
 */
import { isAuthenticated, jsonResponse, unauthorized } from '../_auth.js';

export async function onRequestGet({ request, env }) {
  if (!await isAuthenticated(request, env)) return unauthorized();

  try {
    const indexRaw = await env.BERLIN_KV.get('archived_match_index');
    const index    = indexRaw ? JSON.parse(indexRaw) : [];

    if (index.length === 0) return jsonResponse({ matches: [] });

    const matches = [];
    for (const id of index) {
      const raw = await env.BERLIN_KV.get(`archived_match:${id}`);
      if (raw) {
        const m = JSON.parse(raw);
        matches.push({
          id:               m.id,
          title:            m.title,
          matchDatetime:    m.matchDatetime,
          realResult:       m.realResult || null,
          participantCount: m.participantCount || 0,
          winnersCount:     m.winnersCount || 0,
        });
      }
    }

    return jsonResponse({ matches });

  } catch (err) {
    console.error('History error:', err);
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
