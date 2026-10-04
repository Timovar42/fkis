import { onRequestGet as handleGetSchedule } from './functions/api/schedule.js';
import { onRequestPost as handlePostLogin } from './functions/api/login.js';
import { onRequestPost as handlePostLogout } from './functions/api/logout.js';
import { onRequestGet as handleGetDraft, onRequestPut as handlePutDraft } from './functions/api/draft.js';
import { onRequestPost as handlePostPublish } from './functions/api/publish.js';
import { onRequestGet as handleGetHistory } from './functions/api/history.js';
import { onRequestPost as handlePostRestore } from './functions/api/restore/[version].js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method.toUpperCase();

    const makeContext = (params = {}) => ({
      request,
      env,
      params,
      waitUntil: ctx && typeof ctx.waitUntil === 'function' ? ctx.waitUntil.bind(ctx) : () => {}
    });

    try {
      if (method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Cookie'
          }
        });
      }

      // API routing
      if (path === '/api/schedule' && method === 'GET') {
        return await handleGetSchedule(makeContext());
      }

      if (path === '/api/login' && method === 'POST') {
        return await handlePostLogin(makeContext());
      }

      if (path === '/api/logout' && method === 'POST') {
        return await handlePostLogout(makeContext());
      }

      if (path === '/api/draft') {
        if (method === 'GET') return await handleGetDraft(makeContext());
        if (method === 'PUT') return await handlePutDraft(makeContext());
      }

      if (path === '/api/publish' && method === 'POST') {
        return await handlePostPublish(makeContext());
      }

      if (path === '/api/history' && method === 'GET') {
        return await handleGetHistory(makeContext());
      }

      const restoreMatch = path.match(/^\/api\/restore\/([^/]+)$/);
      if (restoreMatch && method === 'POST') {
        return await handlePostRestore(makeContext({ version: restoreMatch[1] }));
      }

      // Serve static assets (HTML/CSS/JS)
      if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
        return await env.ASSETS.fetch(request);
      }

      return new Response('Not found', { status: 404 });
    } catch (err) {
      console.error('Unhandled worker error:', err);
      return new Response(JSON.stringify({ error: 'Внутренняя ошибка сервера', details: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }
  }
};
