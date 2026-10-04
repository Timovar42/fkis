import {
  jsonResponse,
  errorResponse,
  requireAuth,
  validateSchedule,
  INITIAL_SCHEDULE
} from './_utils.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const session = await requireAuth(request, env);
  if (!session) {
    return errorResponse('Требуется авторизация.', 401);
  }

  if (!env.SCHEDULE_KV) {
    return errorResponse('База данных KV не подключена.', 500);
  }

  // Get draft to publish
  let draftToPublish = null;
  const draftStr = await env.SCHEDULE_KV.get('schedule:draft');
  if (draftStr) {
    try {
      draftToPublish = JSON.parse(draftStr);
    } catch (e) {}
  }

  // If client also passed payload in request body, we can use that too
  try {
    const body = await request.json().catch(() => null);
    if (body && body.week && body.subjects) {
      draftToPublish = body;
    }
  } catch (e) {}

  if (!draftToPublish) {
    draftToPublish = INITIAL_SCHEDULE;
  }

  const validationError = validateSchedule(draftToPublish);
  if (validationError) {
    return errorResponse(validationError, 422);
  }

  // Get current published version
  let currentPublished = null;
  const currentStr = await env.SCHEDULE_KV.get('schedule:current');
  if (currentStr) {
    try {
      currentPublished = JSON.parse(currentStr);
    } catch (e) {}
  }

  const previousVersion = currentPublished?.version || 1;
  const newVersion = previousVersion + 1;

  draftToPublish.version = newVersion;
  draftToPublish.updatedAt = new Date().toISOString();

  // If there was a current published version, save it to history
  let historyList = [];
  const historyIndexStr = await env.SCHEDULE_KV.get('schedule:history');
  if (historyIndexStr) {
    try {
      historyList = JSON.parse(historyIndexStr);
    } catch (e) {}
  }

  if (currentPublished) {
    // Save snapshot of previous version
    await env.SCHEDULE_KV.put(
      `schedule:history:${previousVersion}`,
      JSON.stringify(currentPublished)
    );

    // Add to history index
    historyList.unshift({
      version: previousVersion,
      updatedAt: currentPublished.updatedAt || new Date().toISOString(),
      subjectsCount: currentPublished.subjects?.length || 0
    });

    // Keep only last 10 versions in history
    if (historyList.length > 10) {
      const removed = historyList.splice(10);
      for (const item of removed) {
        await env.SCHEDULE_KV.delete(`schedule:history:${item.version}`);
      }
    }

    await env.SCHEDULE_KV.put('schedule:history', JSON.stringify(historyList));
  }

  // Save new published schedule
  const publishedJson = JSON.stringify(draftToPublish);
  await env.SCHEDULE_KV.put('schedule:current', publishedJson);
  // Synchronize draft with new published version
  await env.SCHEDULE_KV.put('schedule:draft', publishedJson);

  return jsonResponse({
    ok: true,
    message: 'Опубликовано, студенты уже видят новое расписание.',
    version: newVersion,
    updatedAt: draftToPublish.updatedAt
  });
}
