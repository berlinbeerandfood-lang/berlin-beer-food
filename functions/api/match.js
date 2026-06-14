/**
 * GET /api/match
 * Returns the current active match (public, no auth required).
 */
export async function onRequestGet({ env }) {
  try {
    const match = await getActiveMatch(env);
    return jsonResponse({ match });
  } catch (err) {
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}

async function getActiveMatch(env) {
  const raw = await env.BERLIN_KV.get('active_match');
  if (!raw) return null;
  const match = JSON.parse(raw);
  // Don't expose sensitive admin fields to public
  return sanitizeMatchForPublic(match);
}

function sanitizeMatchForPublic(match) {
  if (!match) return null;
  return {
    id:            match.id,
    title:         match.title,
    homeTeam:      match.homeTeam,
    awayTeam:      match.awayTeam,
    matchDatetime: match.matchDatetime,
    closeTime:     match.closeTime,
    prize:         match.prize,
    // realResult intentionally omitted from public view
  };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
