/**
 * GET  /api/admin/match  → get active match (full, with realResult)
 * POST /api/admin/match  → create new match
 */

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

async function archiveMatch(env, match) {
  await env.BERLIN_KV.put(`archived_match:${match.id}`, JSON.stringify(match));
  const indexRaw = await env.BERLIN_KV.get("archived_match_index");
  const index    = indexRaw ? JSON.parse(indexRaw) : [];
  if (!index.includes(match.id)) {
    index.unshift(match.id);
    await env.BERLIN_KV.put("archived_match_index", JSON.stringify(index));
  }
}

function buildMatch(body) {
  return {
    id:               crypto.randomUUID(),
    title:            String(body.title || "").trim().slice(0, 120),
    homeTeam: {
      name:  String(body.homeTeam?.name  || "").trim().slice(0, 60),
      crest: String(body.homeTeam?.crest || "").trim().slice(0, 200),
    },
    awayTeam: {
      name:  String(body.awayTeam?.name  || "").trim().slice(0, 60),
      crest: String(body.awayTeam?.crest || "").trim().slice(0, 200),
    },
    matchDatetime:    body.matchDatetime || null,
    closeTime:        body.closeTime     || null,
    prize:            String(body.prize  || "").trim().slice(0, 200),
    participantCount: 0,
    realResult:       null,
    createdAt:        new Date().toISOString(),
  };
}

function validateMatch(match) {
  if (!match.title)          return "El nombre del partido es obligatorio.";
  if (!match.homeTeam?.name) return "El nombre del equipo local es obligatorio.";
  if (!match.awayTeam?.name) return "El nombre del equipo visitante es obligatorio.";
  if (!match.matchDatetime)  return "La fecha y hora del partido son obligatorias.";
  if (!match.closeTime)      return "La hora de cierre de apuestas es obligatoria.";
  return null;
}

export async function onRequestGet({ request, env }) {
  if (!await isAuthenticated(request, env)) return unauthorized();
  const raw = await env.BERLIN_KV.get("active_match");
  return jsonResponse({ match: raw ? JSON.parse(raw) : null });
}

export async function onRequestPost({ request, env }) {
  if (!await isAuthenticated(request, env)) return unauthorized();
  try {
    const body  = await request.json();
    const match = buildMatch(body);
    const error = validateMatch(match);
    if (error) return jsonResponse({ error }, 400);

    // Archive existing match if present
    const existingRaw = await env.BERLIN_KV.get("active_match");
    if (existingRaw) await archiveMatch(env, JSON.parse(existingRaw));

    await env.BERLIN_KV.put("active_match", JSON.stringify(match));
    return jsonResponse({ match }, 201);
  } catch (err) {
    console.error("Create match error:", err);
    return jsonResponse({ error: "Error interno." }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
