import {
  jsonResponse,
  migrateScheduleData,
  getChisinauDateParts,
  TIMEZONE
} from './_utils.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const origin = request.headers.get('Origin');

  // Match CORS origin for https://timovar42.github.io
  const corsOrigin = (origin === 'https://timovar42.github.io' || origin?.includes('github.io'))
    ? 'https://timovar42.github.io'
    : (origin || '*');

  const corsHeaders = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  try {
    let rawSchedule = null;
    if (env.SCHEDULE_KV) {
      const stored = await env.SCHEDULE_KV.get('schedule:current');
      if (stored) {
        try {
          rawSchedule = JSON.parse(stored);
        } catch (e) {}
      }
    }

    const now = new Date();
    const migrated = migrateScheduleData(rawSchedule, now);

    // If data changed due to migration or rollover, save back lazily
    if (env.SCHEDULE_KV && JSON.stringify(migrated) !== JSON.stringify(rawSchedule)) {
      context.waitUntil(
        env.SCHEDULE_KV.put('schedule:current', JSON.stringify(migrated)).catch(() => {})
      );
    }

    const dateParts = getChisinauDateParts(now);

    // Public payload: only subjects, bells, 3 weeks, overrides, homework, serverDate, tz
    const publicPayload = {
      version: migrated.version || 1,
      updatedAt: migrated.updatedAt,
      serverDate: dateParts.dateStr,
      tz: TIMEZONE,
      bells: migrated.bells,
      subjects: migrated.subjects,
      weeks: migrated.weeks,
      overrides: migrated.overrides || [],
      homework: migrated.homework || []
    };

    return jsonResponse(publicPayload, 200, {
      'Cache-Control': 'public, max-age=60, s-maxage=60',
      ...corsHeaders
    });
  } catch (err) {
    const now = new Date();
    const migrated = migrateScheduleData(null, now);
    const dateParts = getChisinauDateParts(now);

    return jsonResponse({
      version: 1,
      updatedAt: now.toISOString(),
      serverDate: dateParts.dateStr,
      tz: TIMEZONE,
      bells: migrated.bells,
      subjects: migrated.subjects,
      weeks: migrated.weeks,
      overrides: [],
      homework: []
    }, 200, {
      'Cache-Control': 'public, max-age=60',
      ...corsHeaders
    });
  }
}

export async function onRequestOptions(context) {
  const { request } = context;
  const origin = request.headers.get('Origin');
  const corsOrigin = (origin === 'https://timovar42.github.io' || origin?.includes('github.io'))
    ? 'https://timovar42.github.io'
    : (origin || '*');

  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
