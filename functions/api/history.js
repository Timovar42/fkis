import { jsonResponse, errorResponse, requireAuth } from './_utils.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const session = await requireAuth(request, env);
  if (!session) {
    return errorResponse('Требуется авторизация.', 401);
  }

  if (!env.SCHEDULE_KV) {
    return jsonResponse({ ok: true, history: [] });
  }

  let historyList = [];
  const historyStr = await env.SCHEDULE_KV.get('schedule:history');
  if (historyStr) {
    try {
      historyList = JSON.parse(historyStr);
    } catch (e) {}
  }

  return jsonResponse({
    ok: true,
    history: historyList
  });
}
