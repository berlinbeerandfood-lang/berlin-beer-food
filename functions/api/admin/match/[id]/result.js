/**
 * POST /api/admin/match/[id]/result
 * Loads the real match result and automatically detects winners.
 * Body: { home, away }
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

export async function onRequestPost({ request, env, params }) {
  if (!await isAuthenticated(request, env)) return unauthorized();

  try {
    const { home, away } = await request.json();

    if (typeof home !== "number" || home < 0 || home > 20) {
      return jsonResponse({ error: "Resultado local inválido." }, 400);
    }
    if (typeof away !== "number" || away < 0 || away > 20) {
      return jsonResponse({ error: "Resultado visitante inválido." }, 400);
    }

    const raw = await env.BERLIN_KV.get("active_match");
    if (!raw) return jsonResponse({ error: "No hay partido activo." }, 404);

    const match = JSON.parse(raw);
    if (match.id !== params.id) return jsonResponse({ error: "ID de partido no coincide." }, 404);

    match.realResult  = { home, away };
    match.resultSetAt = new Date().toISOString();

    // Mark winners among all bets
    const betKeys = await env.BERLIN_KV.list({ prefix: `bet:${match.id}:` });
    let winnersCount = 0;

    for (const key of betKeys.keys) {
      const betRaw = await env.BERLIN_KV.get(key.name);
      if (!betRaw) continue;
      const bet      = JSON.parse(betRaw);
      bet.isWinner   = (bet.homeGoals === home && bet.awayGoals === away);
      if (bet.isWinner) winnersCount++;
      await env.BERLIN_KV.put(key.name, JSON.stringify(bet));
    }

    match.winnersCount = winnersCount;
    await env.BERLIN_KV.put("active_match", JSON.stringify(match));

    // Also update archived copy if it exists
    const archivedRaw = await env.BERLIN_KV.get(`archived_match:${match.id}`);
    if (archivedRaw) {
      await env.BERLIN_KV.put(`archived_match:${match.id}`, JSON.stringify(match));
    }

    return jsonResponse({ match, winnersCount });
  } catch (err) {
    console.error("Set result error:", err);
    return jsonResponse({ error: "Error interno del servidor." }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
