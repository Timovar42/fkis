import {
  jsonResponse,
  errorResponse,
  requireAuth,
  validateSchedule,
  INITIAL_SCHEDULE
} from './_utils.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const session = await requireAuth(request, env);
  if (!session) {
    return errorResponse('Требуется авторизация.', 401);
  }

  let published = null;
  let draft = null;

  if (env.SCHEDULE_KV) {
    const pubStr = await env.SCHEDULE_KV.get('schedule:current');
    if (pubStr) published = JSON.parse(pubStr);

    const draftStr = await env.SCHEDULE_KV.get('schedule:draft');
    if (draftStr) draft = JSON.parse(draftStr);
  }

  if (!published) published = INITIAL_SCHEDULE;
  if (!draft) draft = published;

  // Compare draft vs published to know if dirty
  const isDirty = JSON.stringify(draft.week) !== JSON.stringify(published.week) ||
                  JSON.stringify(draft.subjects) !== JSON.stringify(published.subjects) ||
                  JSON.stringify(draft.bells) !== JSON.stringify(published.bells) ||
                  JSON.stringify(draft.overrides || []) !== JSON.stringify(published.overrides || []);

  return jsonResponse({
    ok: true,
    draft,
    publishedVersion: published.version || 1,
    publishedUpdatedAt: published.updatedAt,
    isDirty
  });
}

export async function onRequestPut(context) {
  const { request, env } = context;
  const session = await requireAuth(request, env);
  if (!session) {
    return errorResponse('Требуется авторизация.', 401);
  }

  if (!env.SCHEDULE_KV) {
    return errorResponse('База данных KV не подключена.', 500);
  }

  let draftData;
  try {
    draftData = await request.json();
  } catch (e) {
    return errorResponse('Некорректный JSON в теле запроса.', 400);
  }

  const validationError = validateSchedule(draftData);
  if (validationError) {
    return errorResponse(validationError, 422);
  }

  draftData.updatedAt = new Date().toISOString();

  await env.SCHEDULE_KV.put('schedule:draft', JSON.stringify(draftData));

  return jsonResponse({
    ok: true,
    message: 'Черновик сохранён.',
    updatedAt: draftData.updatedAt
  });
}
