import {
  jsonResponse,
  errorResponse,
  requireAuth,
  validateSchedule,
  migrateScheduleData
} from './_utils.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const session = await requireAuth(request, env);
  if (!session) {
    return errorResponse('Требуется авторизация.', 401);
  }

  const now = new Date();
  let published = null;
  let draft = null;

  if (env.SCHEDULE_KV) {
    const pubStr = await env.SCHEDULE_KV.get('schedule:current');
    if (pubStr) {
      try { published = JSON.parse(pubStr); } catch (e) {}
    }

    const draftStr = await env.SCHEDULE_KV.get('schedule:draft');
    if (draftStr) {
      try { draft = JSON.parse(draftStr); } catch (e) {}
    }
  }

  published = migrateScheduleData(published, now);
  draft = draft ? migrateScheduleData(draft, now) : published;

  // Compare draft vs published to know if dirty
  const isDirty = JSON.stringify(draft.weeks) !== JSON.stringify(published.weeks) ||
                  JSON.stringify(draft.template) !== JSON.stringify(published.template) ||
                  JSON.stringify(draft.subjects) !== JSON.stringify(published.subjects) ||
                  JSON.stringify(draft.bells) !== JSON.stringify(published.bells) ||
                  JSON.stringify(draft.overrides || []) !== JSON.stringify(published.overrides || []) ||
                  JSON.stringify(draft.homework || []) !== JSON.stringify(published.homework || []);

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

  const now = new Date();
  // Ensure basic structure before validation
  draftData = migrateScheduleData(draftData, now);

  const validationError = validateSchedule(draftData, now);
  if (validationError) {
    return errorResponse(validationError, 422);
  }

  draftData.updatedAt = now.toISOString();

  await env.SCHEDULE_KV.put('schedule:draft', JSON.stringify(draftData));

  return jsonResponse({
    ok: true,
    message: 'Черновик сохранён.',
    updatedAt: draftData.updatedAt
  });
}
