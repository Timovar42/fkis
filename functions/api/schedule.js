import { jsonResponse, INITIAL_SCHEDULE } from './_utils.js';

export async function onRequestGet(context) {
  const { env } = context;

  try {
    let schedule = null;
    if (env.SCHEDULE_KV) {
      const stored = await env.SCHEDULE_KV.get('schedule:current');
      if (stored) {
        schedule = JSON.parse(stored);
      }
    }

    if (!schedule) {
      schedule = INITIAL_SCHEDULE;
    }

    // Clean up expired overrides (dates strictly before today's UTC/local date)
    const todayStr = new Date().toISOString().slice(0, 10);
    if (Array.isArray(schedule.overrides)) {
      schedule.overrides = schedule.overrides.filter(ov => ov.date >= todayStr);
    }

    return jsonResponse(schedule, 200, {
      'Cache-Control': 'public, max-age=60, s-maxage=60',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
  } catch (err) {
    return jsonResponse(INITIAL_SCHEDULE, 200, {
      'Cache-Control': 'public, max-age=60',
      'Access-Control-Allow-Origin': '*'
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
