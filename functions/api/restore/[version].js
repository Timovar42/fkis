import { jsonResponse, errorResponse, requireAuth, migrateScheduleData } from '../_utils.js';

export async function onRequestPost(context) {
  const { request, params, env } = context;
  const session = await requireAuth(request, env);
  if (!session) {
    return errorResponse('Требуется авторизация.', 401);
  }

  if (!env.SCHEDULE_KV) {
    return errorResponse('База данных KV не подключена.', 500);
  }

  const version = params.version;
  if (!version) {
    return errorResponse('Не указана версия для восстановления.', 400);
  }

  const historyKey = `schedule:history:${version}`;
  const historicalDataStr = await env.SCHEDULE_KV.get(historyKey);

  if (!historicalDataStr) {
    return errorResponse(`Версия #${version} не найдена в истории.`, 404);
  }

  let restoredSchedule;
  try {
    restoredSchedule = JSON.parse(historicalDataStr);
  } catch (e) {
    return errorResponse('Ошибка парсинга архивных данных.', 500);
  }

  const now = new Date();
  restoredSchedule = migrateScheduleData(restoredSchedule, now);
  restoredSchedule.updatedAt = now.toISOString();

  const url = new URL(request.url);
  const shouldPublish = url.searchParams.get('publish') === '1' || url.searchParams.get('publish') === 'true';

  if (shouldPublish) {
    const currentStr = await env.SCHEDULE_KV.get('schedule:current');
    if (currentStr) {
      try {
        const current = JSON.parse(currentStr);
        await env.SCHEDULE_KV.put(`schedule:history:${current.version || 1}`, currentStr);
      } catch (e) {}
    }
    const newVersion = (restoredSchedule.version || 0) + 1;
    restoredSchedule.version = newVersion;
    const jsonStr = JSON.stringify(restoredSchedule);
    await env.SCHEDULE_KV.put('schedule:current', jsonStr);
    await env.SCHEDULE_KV.put('schedule:draft', jsonStr);

    return jsonResponse({
      ok: true,
      message: `Версия #${version} успешно восстановлена и опубликована как #${newVersion}.`,
      schedule: restoredSchedule,
      published: true
    });
  } else {
    await env.SCHEDULE_KV.put('schedule:draft', JSON.stringify(restoredSchedule));
    return jsonResponse({
      ok: true,
      message: `Версия #${version} загружена в черновик. Проверьте и нажмите «Опубликовать».`,
      draft: restoredSchedule,
      published: false
    });
  }
}
