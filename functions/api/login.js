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

  // Generic error response for security (same message on all authentication failures)
  const genericAuthError = () => errorResponse('Неверный пароль или доступ заблокирован.', 401);
  const rateLimitError = () => errorResponse('Слишком много попыток, попробуй через 15 минут.', 429);

  const ip = getClientIp(request);
  const rateKey = `rate:login:${ip}`;

  // Check rate limit in KV
  let attempts = 0;
  if (env.SCHEDULE_KV) {
    const attemptsStr = await env.SCHEDULE_KV.get(rateKey);
    attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;
    if (attempts >= 5) {
      return rateLimitError();
    }
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
    // Increment failed attempts
    if (env.SCHEDULE_KV) {
      const newAttempts = attempts + 1;
      // 900 seconds = 15 minutes TTL
      await env.SCHEDULE_KV.put(rateKey, String(newAttempts), { expirationTtl: 900 });
      if (newAttempts >= 5) {
        return rateLimitError();
      }
    }
    return genericAuthError();
  }

  // Login successful: reset rate limit counter
  if (env.SCHEDULE_KV && attempts > 0) {
    await env.SCHEDULE_KV.delete(rateKey);
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
