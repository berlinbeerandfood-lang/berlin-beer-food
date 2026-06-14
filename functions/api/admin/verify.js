/**
 * GET /api/admin/verify
 * Verifies that an admin session token is still valid.
 */
import { isAuthenticated, jsonResponse, unauthorized } from './_auth.js';

export async function onRequestGet({ request, env }) {
  if (!await isAuthenticated(request, env)) return unauthorized();
  return jsonResponse({ ok: true });
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
