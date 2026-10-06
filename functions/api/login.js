import {
  jsonResponse,
  errorResponse,
  verifyPassword,
  signSession,
  makeSessionCookie,
  getClientIp
} from './_utils.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  const genericAuthError = () => errorResponse('Неверный пароль.', 401);

  const ip = getClientIp(request);
  const rateKey = `rate:login:${ip}`;

  // Reset any existing lockout in KV
  if (env.SCHEDULE_KV) {
    try { await env.SCHEDULE_KV.delete(rateKey); } catch (e) {}
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return genericAuthError();
  }

  const { password } = body || {};
  if (!password || typeof password !== 'string') {
    return genericAuthError();
  }

  // Check ADMIN_PASSWORD_HASH from env
  const expectedHash = env.ADMIN_PASSWORD_HASH;
  if (!expectedHash) {
    // If not configured yet, reject for security
    return errorResponse('Переменная ADMIN_PASSWORD_HASH не настроена в Cloudflare.', 500);
  }

  const isMatch = await verifyPassword(password, expectedHash);

  if (!isMatch) {
    return genericAuthError();
  }

  // 14 days expiration
  const exp = Date.now() + 14 * 24 * 60 * 60 * 1000;
  const sessionPayload = {
    role: 'admin',
    exp,
    iat: Date.now()
  };

  const secret = env.SESSION_SECRET || 'fallback-session-secret-change-in-env';
  const token = await signSession(sessionPayload, secret);
  const cookie = makeSessionCookie(token, 14 * 24 * 60 * 60);

  return jsonResponse({ ok: true, message: 'Успешная авторизация.' }, 200, {
    'Set-Cookie': cookie
  });
}
