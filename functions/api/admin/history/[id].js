/**
 * GET /api/admin/history/[id]
 * Returns full details of a past match including all participants.
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

export async function onRequestGet({ request, env, params }) {
  if (!await isAuthenticated(request, env)) return unauthorized();

  try {
    const matchId = params.id;

    // Check active match first
    let match = null;
    const activeRaw = await env.BERLIN_KV.get("active_match");
    if (activeRaw) {
      const active = JSON.parse(activeRaw);
      if (active.id === matchId) match = active;
    }

    // Then check archive
    if (!match) {
      const archiveRaw = await env.BERLIN_KV.get(`archived_match:${matchId}`);
      if (archiveRaw) match = JSON.parse(archiveRaw);
    }

    if (!match) return jsonResponse({ error: "Partido no encontrado." }, 404);

    const betKeys = await env.BERLIN_KV.list({ prefix: `bet:${matchId}:` });
    const participants = [];

    for (const key of betKeys.keys) {
      const betRaw = await env.BERLIN_KV.get(key.name);
      if (betRaw) participants.push(JSON.parse(betRaw));
    }

    participants.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    return jsonResponse({ match, participants });
  } catch (err) {
    console.error("History detail error:", err);
    return jsonResponse({ error: "Error interno." }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
