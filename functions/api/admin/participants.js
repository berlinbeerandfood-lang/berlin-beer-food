/**
 * GET /api/admin/participants
 * Returns all bets for the active match, sorted by creation time.
 */
<<<<<<< HEAD
import { isAuthenticated, jsonResponse, unauthorized } from './_auth.js';
=======

async function isAuthenticated(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.replace("Bearer ", "").trim();
  if (!token) return false;
  const session = await env.BERLIN_KV.get(`admin_session:${token}`);
  return !!session;
}
function unauthorized() {
  return new Response(JSON.stringify({ error: "No autorizado." }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
>>>>>>> 467e8f5 (Inicial: Berlin Beer & Food)

export async function onRequestGet({ request, env }) {
  if (!await isAuthenticated(request, env)) return unauthorized();

  try {
<<<<<<< HEAD
    const raw = await env.BERLIN_KV.get('active_match');
    if (!raw) return jsonResponse({ participants: [] });

    const match = JSON.parse(raw);

=======
    const raw = await env.BERLIN_KV.get("active_match");
    if (!raw) return jsonResponse({ participants: [] });

    const match   = JSON.parse(raw);
>>>>>>> 467e8f5 (Inicial: Berlin Beer & Food)
    const betKeys = await env.BERLIN_KV.list({ prefix: `bet:${match.id}:` });
    const participants = [];

    for (const key of betKeys.keys) {
      const betRaw = await env.BERLIN_KV.get(key.name);
      if (betRaw) participants.push(JSON.parse(betRaw));
    }

<<<<<<< HEAD
    // Sort by creation time (oldest first)
    participants.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    return jsonResponse({ participants, matchTitle: match.title });

  } catch (err) {
    console.error('Participants error:', err);
    return jsonResponse({ error: 'Error interno.' }, 500);
=======
    participants.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    return jsonResponse({ participants, matchTitle: match.title });
  } catch (err) {
    console.error("Participants error:", err);
    return jsonResponse({ error: "Error interno." }, 500);
>>>>>>> 467e8f5 (Inicial: Berlin Beer & Food)
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
<<<<<<< HEAD
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
=======
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
>>>>>>> 467e8f5 (Inicial: Berlin Beer & Food)
    },
  });
}
