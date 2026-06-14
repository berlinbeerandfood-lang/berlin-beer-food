/**
 * GET /api/admin/history
 * Lists all past (archived) matches.
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

export async function onRequestGet({ request, env }) {
  if (!await isAuthenticated(request, env)) return unauthorized();

  try {
    const indexRaw = await env.BERLIN_KV.get("archived_match_index");
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
    console.error("History error:", err);
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
