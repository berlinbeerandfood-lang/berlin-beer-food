/**
 * Shared admin auth utilities
 */

export function verifyToken(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token) return false;

  // Token is HMAC-like: base64(timestamp + ":" + hash)
  // For simplicity we use a signed session approach via KV
  // The real validation happens via session key lookup
  return token;
}

export async function isAuthenticated(request, env) {
  const token = verifyToken(request, env);
  if (!token) return false;
  const session = await env.BERLIN_KV.get(`admin_session:${token}`);
  return !!session;
}

export function unauthorized() {
  return new Response(JSON.stringify({ error: 'No autorizado.' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}
