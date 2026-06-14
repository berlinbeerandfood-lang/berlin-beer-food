/**
 * POST /api/admin/login
 * Authenticates the admin with password.
 * Body: { password }
 */
<<<<<<< HEAD
import { jsonResponse } from './_auth.js';
=======

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

export async function onRequestPost({ request, env }) {
  try {
    const { password } = await request.json();

    if (!password) {
<<<<<<< HEAD
      return jsonResponse({ error: 'Contraseña requerida.' }, 400);
    }

    // Retrieve the admin password from environment variable
    const adminPassword = env.ADMIN_PASSWORD;
    if (!adminPassword) {
      return jsonResponse({ error: 'El servidor no está configurado correctamente.' }, 500);
    }

    // Constant-time comparison to prevent timing attacks
    const pwdBuffer    = new TextEncoder().encode(password);
    const correctBuffer = new TextEncoder().encode(adminPassword);

    if (pwdBuffer.length !== correctBuffer.length) {
      return jsonResponse({ error: 'Contraseña incorrecta.' }, 401);
=======
      return jsonResponse({ error: "Contraseña requerida." }, 400);
    }

    const adminPassword = env.ADMIN_PASSWORD;
    if (!adminPassword) {
      return jsonResponse({ error: "El servidor no está configurado correctamente." }, 500);
    }

    // Constant-time comparison to prevent timing attacks
    const pwdBuffer     = new TextEncoder().encode(password);
    const correctBuffer = new TextEncoder().encode(adminPassword);

    if (pwdBuffer.length !== correctBuffer.length) {
      return jsonResponse({ error: "Contraseña incorrecta." }, 401);
>>>>>>> 467e8f5 (Inicial: Berlin Beer & Food)
    }

    let diff = 0;
    for (let i = 0; i < pwdBuffer.length; i++) {
      diff |= pwdBuffer[i] ^ correctBuffer[i];
    }

    if (diff !== 0) {
<<<<<<< HEAD
      return jsonResponse({ error: 'Contraseña incorrecta.' }, 401);
    }

    // Generate session token
    const token = crypto.randomUUID();
    // Session valid for 8 hours
    await env.BERLIN_KV.put(`admin_session:${token}`, '1', { expirationTtl: 28800 });
=======
      return jsonResponse({ error: "Contraseña incorrecta." }, 401);
    }

    // Generate session token — valid 8 hours
    const token = crypto.randomUUID();
    await env.BERLIN_KV.put(`admin_session:${token}`, "1", { expirationTtl: 28800 });
>>>>>>> 467e8f5 (Inicial: Berlin Beer & Food)

    return jsonResponse({ token });

  } catch (err) {
<<<<<<< HEAD
    console.error('Login error:', err);
    return jsonResponse({ error: 'Error interno del servidor.' }, 500);
=======
    console.error("Login error:", err);
    return jsonResponse({ error: "Error interno del servidor." }, 500);
>>>>>>> 467e8f5 (Inicial: Berlin Beer & Food)
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
<<<<<<< HEAD
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
=======
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
>>>>>>> 467e8f5 (Inicial: Berlin Beer & Food)
    },
  });
}
