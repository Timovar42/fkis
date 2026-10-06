// Common utilities for Cloudflare Pages Functions & Workers
// KV binding: env.SCHEDULE_KV
// Env vars: env.ADMIN_PASSWORD_HASH, env.SESSION_SECRET

export const TIMEZONE = 'Europe/Chisinau';

export const INITIAL_TEMPLATE = [
  [null, "s_eng", "s_afv_lk", "s_fks_lk"],
  [null, "s_foot", "s_lang", null],
  ["s_gym", "s_bask", "s_fks_pr", null],
  ["s_org", "s_vved", "s_org", "s_toa"],
  ["s_ir", "s_ir", "s_afv_pr", null],
  ["s_ifk", "s_ifk", "s_eng", "s_toa"]
];

export const INITIAL_SUBJECTS = [
  { id: "s_eng", name: "Иностранный язык: английский", short: "Англ. яз.", type: "", teacher: "Шульга Светлана Ярославовна", place: "к2 · 315", venue: "r" },
  { id: "s_afv_lk", name: "Адаптивное ФВ дошкольников и школьников", short: "АФВ дошк.", type: "лк", teacher: "Торопчина Людмила Генадьевна", place: "к2 · 315", venue: "r" },
  { id: "s_afv_pr", name: "Адаптивное ФВ дошкольников и школьников", short: "АФВ дошк.", type: "пр", teacher: "Торопчина Людмила Генадьевна", place: "к2 · 315", venue: "r" },
  { id: "s_fks_lk", name: "Физическая культура и спорт", short: "ФКиС", type: "лк", teacher: "Кольцов Денис Александрович", place: "к2 · 315", venue: "r" },
  { id: "s_fks_pr", name: "Физическая культура и спорт", short: "ФКиС", type: "пр", teacher: "—", place: "Городской стадион", venue: "s" },
  { id: "s_foot", name: "Футбол и методика преподавания", short: "Футбол", type: "", teacher: "Мамков Олег Михайлович", place: "Городской стадион", venue: "s" },
  { id: "s_lang", name: "Официальный язык: Молд. / Укр. яз.", short: "Гос. язык", type: "", teacher: "Мазепа Татьяна Андреевна / Якимович Елена", place: "к2 · 204 / 205", venue: "r" },
  { id: "s_gym", name: "Гимнастика и методика преподавания", short: "Гимнастика", type: "пр", teacher: "Черниченко Игорь Павлович", place: "к1 · спортзал", venue: "g" },
  { id: "s_bask", name: "Баскетбол и методика преподавания", short: "Баскетбол", type: "пр", teacher: "Чебан Татьяна Николаевна", place: "к3 · спортзал", venue: "g" },
  { id: "s_org", name: "Основы российской государственности", short: "Осн. гос-ти", type: "", teacher: "Осипова С. А.", place: "к2 · 315", venue: "r" },
  { id: "s_vved", name: "Введение в профессиональную деятельность", short: "Введение в проф.", type: "", teacher: "Граневский Владимир Викторович", place: "к2 · 204", venue: "r" },
  { id: "s_toa", name: "Теория и организация АФК", short: "Теория АФК", type: "", teacher: "Граневский Владимир Викторович", place: "к2 · 204", venue: "r" },
  { id: "s_ir", name: "История России", short: "История России", type: "", teacher: "Чащина Светлана Фёдоровна", place: "к2 · 315", venue: "r" },
  { id: "s_ifk", name: "История физической культуры", short: "История ФК", type: "", teacher: "Мыцыков Николай Владимирович", place: "к2 · 204", venue: "r" }
];

export const INITIAL_BELLS = [
  ["08:00", "09:30"],
  ["09:40", "11:10"],
  ["11:25", "12:55"],
  ["13:05", "14:35"]
];

// Response helpers
export function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers
    }
  });
}

export function errorResponse(message, status = 400) {
  return jsonResponse({ error: message, ok: false }, status);
}

// Convert hex string to Uint8Array
export function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

// Convert Uint8Array to hex string
export function bytesToHex(bytes) {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Verify PBKDF2 hash using Web Crypto API with constant-time comparison
export async function verifyPassword(password, storedHash) {
  if (!storedHash || typeof storedHash !== 'string') return false;
  const parts = storedHash.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;

  const iterations = parseInt(parts[1], 10);
  const salt = hexToBytes(parts[2]);
  const expectedKey = hexToBytes(parts[3]);

  if (isNaN(iterations) || iterations < 1000 || salt.length === 0 || expectedKey.length === 0) {
    return false;
  }

  const enc = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256'
    },
    passwordKey,
    expectedKey.length * 8
  );

  const derivedBytes = new Uint8Array(derivedBits);
  if (derivedBytes.length !== expectedKey.length) return false;

  return crypto.subtle.timingSafeEqual(derivedBytes, expectedKey);
}

// Session HMAC signing and verification
export async function signSession(payload, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret || 'default-insecure-secret-replace-in-env'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const dataStr = JSON.stringify(payload);
  const b64Data = btoa(unescape(encodeURIComponent(dataStr)));
  const sigBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(b64Data));
  const sigHex = bytesToHex(new Uint8Array(sigBuffer));

  return `${b64Data}.${sigHex}`;
}

export async function verifySession(sessionToken, secret) {
  if (!sessionToken || typeof sessionToken !== 'string') return null;
  const dotIdx = sessionToken.lastIndexOf('.');
  if (dotIdx === -1) return null;

  const b64Data = sessionToken.substring(0, dotIdx);
  const sigHex = sessionToken.substring(dotIdx + 1);

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret || 'default-insecure-secret-replace-in-env'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const expectedSigBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(b64Data));
  const expectedSigBytes = new Uint8Array(expectedSigBuffer);
  const actualSigBytes = hexToBytes(sigHex);

  if (actualSigBytes.length !== expectedSigBytes.length) return null;
  const isMatch = crypto.subtle.timingSafeEqual(actualSigBytes, expectedSigBytes);
  if (!isMatch) return null;

  try {
    const jsonStr = decodeURIComponent(escape(atob(b64Data)));
    const payload = JSON.parse(jsonStr);
    if (payload.exp && Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch (e) {
    return null;
  }
}

// Cookie helpers
export function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  const items = cookieHeader.split(';');
  for (const item of items) {
    const [k, v] = item.trim().split('=');
    if (k && v) {
      cookies[k] = decodeURIComponent(v);
    }
  }
  return cookies;
}

export function makeSessionCookie(token, maxAgeSeconds = 1209600) {
  return `afk_session=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly; Secure; SameSite=Strict`;
}

export function clearSessionCookie() {
  return `afk_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

export async function requireAuth(request, env) {
  const cookieHeader = request.headers.get('Cookie');
  const cookies = parseCookies(cookieHeader);
  const token = cookies['afk_session'];

  if (!token) return null;
  const session = await verifySession(token, env.SESSION_SECRET);
  return session;
}

export function getClientIp(request) {
  return request.headers.get('CF-Connecting-IP') ||
         request.headers.get('x-real-ip') ||
         request.headers.get('x-forwarded-for') ||
         '127.0.0.1';
}

/* ====================================================================
   TIMEZONE & 3-WEEK WINDOW HELPERS (Europe/Chisinau)
==================================================================== */

// Returns { year, month, day, dateStr } for date in Europe/Chisinau
export function getChisinauDateParts(d = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(d);
  const p = {};
  parts.forEach(pt => p[pt.type] = pt.value);
  return {
    year: parseInt(p.year, 10),
    month: parseInt(p.month, 10),
    day: parseInt(p.day, 10),
    dateStr: `${p.year}-${p.month}-${p.day}`
  };
}

// Convert YYYY-MM-DD + offset in days to YYYY-MM-DD
export function addDaysToDateStr(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0));
  const ry = dt.getUTCFullYear();
  const rm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const rd = String(dt.getUTCDate()).padStart(2, '0');
  return `${ry}-${rm}-${rd}`;
}

// Day of week for YYYY-MM-DD where Monday=0 ... Sunday=6
export function getDayOfWeekForDateStr(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return (dt.getUTCDay() + 6) % 7;
}

// Returns the Monday dateStr for the week containing dateStr
export function getMondayForDateStr(dateStr) {
  const dow = getDayOfWeekForDateStr(dateStr);
  return addDaysToDateStr(dateStr, -dow);
}

// Returns [pastMonday, currentMonday, nextMonday]
export function getThreeWeeksMondays(referenceDate = new Date()) {
  const todayParts = getChisinauDateParts(referenceDate);
  const currentMonday = getMondayForDateStr(todayParts.dateStr);
  const pastMonday = addDaysToDateStr(currentMonday, -7);
  const nextMonday = addDaysToDateStr(currentMonday, 7);
  return [pastMonday, currentMonday, nextMonday];
}

// Deep clone helper
export function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/* ====================================================================
   MIGRATION & DATA ROLLOVER
==================================================================== */

export function migrateScheduleData(raw, referenceDate = new Date()) {
  const data = raw ? clone(raw) : {};

  data.version = data.version || 1;
  data.updatedAt = data.updatedAt || new Date().toISOString();
  data.bells = Array.isArray(data.bells) && data.bells.length === 4 ? data.bells : clone(INITIAL_BELLS);
  data.subjects = Array.isArray(data.subjects) && data.subjects.length > 0 ? data.subjects : clone(INITIAL_SUBJECTS);

  // Template week (6 days x 4 slots)
  if (!Array.isArray(data.template) || data.template.length !== 6) {
    if (Array.isArray(data.week) && data.week.length === 6) {
      data.template = clone(data.week);
    } else {
      data.template = clone(INITIAL_TEMPLATE);
    }
  }

  // Weeks mapping: ensure exactly 3 weeks exist (past, current, next)
  const [pastMonday, currentMonday, nextMonday] = getThreeWeeksMondays(referenceDate);
  const existingWeeks = (data.weeks && typeof data.weeks === 'object') ? data.weeks : {};
  const newWeeks = {};

  [pastMonday, currentMonday, nextMonday].forEach(mon => {
    if (existingWeeks[mon] && Array.isArray(existingWeeks[mon].days) && existingWeeks[mon].days.length === 6) {
      newWeeks[mon] = existingWeeks[mon];
    } else {
      // Initialize week from template
      newWeeks[mon] = { days: clone(data.template) };
    }
  });

  data.weeks = newWeeks;
  delete data.week; // Retire legacy top-level week property

  // Prune overrides older than pastMonday
  if (Array.isArray(data.overrides)) {
    data.overrides = data.overrides.filter(ov => ov && typeof ov.date === 'string' && ov.date >= pastMonday);
  } else {
    data.overrides = [];
  }

  // Prune homework older than pastMonday
  if (Array.isArray(data.homework)) {
    data.homework = data.homework.filter(hw => hw && typeof hw.date === 'string' && hw.date >= pastMonday);
  } else {
    data.homework = [];
  }

  return data;
}

/* ====================================================================
   STRICT DATA VALIDATION
==================================================================== */

export function validateSchedule(data, referenceDate = new Date()) {
  if (!data || typeof data !== 'object') {
    return 'Данные должны быть объектом JSON.';
  }

  // Bells validation
  if (!Array.isArray(data.bells) || data.bells.length !== 4) {
    return 'Поле "bells" должно содержать ровно 4 звонка.';
  }
  for (let i = 0; i < 4; i++) {
    const slot = data.bells[i];
    if (!Array.isArray(slot) || slot.length !== 2 || typeof slot[0] !== 'string' || typeof slot[1] !== 'string') {
      return `Звонок #${i + 1} должен содержать две строки времени (HH:MM).`;
    }
    if (!/^\d{2}:\d{2}$/.test(slot[0]) || !/^\d{2}:\d{2}$/.test(slot[1])) {
      return `Некорректный формат времени в звонке #${i + 1} (ожидается ЧЧ:ММ).`;
    }
  }

  // Subjects validation
  if (!Array.isArray(data.subjects) || data.subjects.length === 0) {
    return 'Поле "subjects" должно быть непустым массивом.';
  }
  const subjectIds = new Set();
  for (const s of data.subjects) {
    if (!s || typeof s !== 'object') return 'Элемент списка предметов некорректен.';
    if (!s.id || typeof s.id !== 'string' || s.id.length > 50) return 'ID предмета некорректен.';
    if (!s.name || typeof s.name !== 'string' || s.name.length > 150) return 'Название предмета обязательно (до 150 символов).';
    if (typeof s.short !== 'string' || s.short.length > 30) return 'Короткое название некорректно (до 30 символов).';
    if (!['', 'лк', 'пр'].includes(s.type || '')) return 'Тип пары может быть только "лк", "пр" или пустым.';
    if (typeof (s.teacher || '') !== 'string' || (s.teacher || '').length > 120) return 'Имя преподавателя слишком длинное (до 120 символов).';
    if (typeof (s.place || '') !== 'string' || (s.place || '').length > 80) return 'Место проведения слишком длинное (до 80 символов).';
    if (!['r', 'g', 's'].includes(s.venue || 'r')) return 'Тип места (venue) должен быть r, g или s.';

    subjectIds.add(s.id);
  }

  // Template validation: 6 days x 4 slots
  if (!Array.isArray(data.template) || data.template.length !== 6) {
    return 'Поле "template" должно содержать 6 дней (Пн–Сб).';
  }
  for (let d = 0; d < 6; d++) {
    const day = data.template[d];
    if (!Array.isArray(day) || day.length !== 4) {
      return `День #${d + 1} в шаблоне должен содержать 4 пары.`;
    }
    for (let s = 0; s < 4; s++) {
      const val = day[s];
      if (val !== null && typeof val !== 'string') {
        return `Ячейка день ${d + 1}, пара ${s + 1} в шаблоне должна быть null или строковым ID предмета.`;
      }
      if (typeof val === 'string' && !subjectIds.has(val)) {
        return `Предмет с ID "${val}" в шаблоне не найден в списке предметов.`;
      }
    }
  }

  // Weeks validation
  if (!data.weeks || typeof data.weeks !== 'object') {
    return 'Поле "weeks" должно быть объектом с датами понедельников.';
  }

  const [pastMonday, currentMonday, nextMonday] = getThreeWeeksMondays(referenceDate);
  const nextSunday = addDaysToDateStr(nextMonday, 6);

  for (const [monKey, weekObj] of Object.entries(data.weeks)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(monKey)) {
      return `Некорректный ключ недели "${monKey}" (ожидается YYYY-MM-DD).`;
    }
    if (!weekObj || !Array.isArray(weekObj.days) || weekObj.days.length !== 6) {
      return `Неделя "${monKey}" должна содержать массив "days" из 6 дней.`;
    }
    for (let d = 0; d < 6; d++) {
      const day = weekObj.days[d];
      if (!Array.isArray(day) || day.length !== 4) {
        return `Неделя "${monKey}", день ${d + 1} должен содержать 4 пары.`;
      }
      for (let s = 0; s < 4; s++) {
        const val = day[s];
        if (val !== null && typeof val !== 'string') {
          return `Неделя "${monKey}", день ${d + 1}, пара ${s + 1} должна быть null или строковым ID предмета.`;
        }
        if (typeof val === 'string' && !subjectIds.has(val)) {
          return `Неделя "${monKey}", предмет с ID "${val}" не найден в списке предметов.`;
        }
      }
    }
  }

  // Overrides validation
  if (data.overrides && !Array.isArray(data.overrides)) {
    return 'Поле "overrides" должно быть массивом.';
  }
  if (Array.isArray(data.overrides)) {
    for (const ov of data.overrides) {
      if (!ov || typeof ov !== 'object') return 'Некорректная запись замены/отмены.';
      if (!ov.date || !/^\d{4}-\d{2}-\d{2}$/.test(ov.date)) return 'Дата замены должна быть в формате ГГГГ-ММ-ДД.';
      if (typeof ov.slot !== 'number' || ov.slot < 0 || ov.slot > 3) return 'Номер пары в замене должен быть от 0 до 3.';
      if (!['cancel', 'replace'].includes(ov.action)) return 'Действие замены должно быть "cancel" или "replace".';
      if (ov.action === 'replace' && ov.subjectId && !subjectIds.has(ov.subjectId)) {
        return `Предмет для замены "${ov.subjectId}" не найден в списке предметов.`;
      }
      if (ov.note && (typeof ov.note !== 'string' || ov.note.length > 200)) {
        return 'Заметка к замене слишком длинная (до 200 символов).';
      }
    }
  }

  // Homework validation
  if (data.homework && !Array.isArray(data.homework)) {
    return 'Поле "homework" должно быть массивом.';
  }
  if (Array.isArray(data.homework)) {
    if (data.homework.length > 80) {
      return 'Максимальное количество домашних заданий — 80.';
    }
    for (const hw of data.homework) {
      if (!hw || typeof hw !== 'object') return 'Некорректная запись домашнего задания.';
      if (!hw.id || typeof hw.id !== 'string' || hw.id.length > 30) return 'ID домашнего задания некорректен.';
      if (!hw.date || !/^\d{4}-\d{2}-\d{2}$/.test(hw.date)) return 'Дата ДЗ должна быть в формате ГГГГ-ММ-ДД.';
      if (hw.date < pastMonday || hw.date > nextSunday) {
        return `Дата ДЗ (${hw.date}) выходит за пределы допустимого окна 3 недель (${pastMonday} – ${nextSunday}).`;
      }
      if (typeof hw.slot !== 'number' || hw.slot < 0 || hw.slot > 3) return 'Номер пары в ДЗ должен быть от 0 до 3.';
      if (!hw.subjectId || !subjectIds.has(hw.subjectId)) {
        return `Предмет для ДЗ "${hw.subjectId}" не найден в списке предметов.`;
      }
      if (!hw.text || typeof hw.text !== 'string' || hw.text.trim().length === 0 || hw.text.length > 600) {
        return 'Текст домашнего задания обязателен и не должен превышать 600 символов.';
      }
      if (hw.due !== null && hw.due !== undefined && hw.due !== '') {
        if (typeof hw.due !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(hw.due)) {
          return 'Срок сдачи ДЗ ("due") должен быть датой ГГГГ-ММ-ДД или null.';
        }
      }
      if (hw.link !== null && hw.link !== undefined && hw.link !== '') {
        if (typeof hw.link !== 'string' || hw.link.length > 300) {
          return 'Ссылка на материалы ДЗ не должна превышать 300 символов.';
        }
        if (!/^https?:\/\//i.test(hw.link)) {
          return 'Ссылка на материалы ДЗ должна начинаться с http:// или https://.';
        }
      }
    }
  }

  return null; // Valid
}
