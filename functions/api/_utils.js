// Common utilities for Cloudflare Pages Functions
// KV binding: env.SCHEDULE_KV
// Env vars: env.ADMIN_PASSWORD_HASH, env.SESSION_SECRET

export const INITIAL_SCHEDULE = {
  version: 1,
  updatedAt: new Date().toISOString(),
  bells: [
    ["08:00", "09:30"],
    ["09:40", "11:10"],
    ["11:25", "12:55"],
    ["13:05", "14:35"]
  ],
  subjects: [
    {
      id: "s_eng",
      name: "Иностранный язык: английский",
      short: "Англ. яз.",
      type: "",
      teacher: "Шульга Светлана Ярославовна",
      place: "к2 · 315",
      venue: "r"
    },
    {
      id: "s_afv_lk",
      name: "Адаптивное ФВ дошкольников и школьников",
      short: "АФВ дошк.",
      type: "лк",
      teacher: "Торопчина Людмила Генадьевна",
      place: "к2 · 315",
      venue: "r"
    },
    {
      id: "s_afv_pr",
      name: "Адаптивное ФВ дошкольников и школьников",
      short: "АФВ дошк.",
      type: "пр",
      teacher: "Торопчина Людмила Генадьевна",
      place: "к2 · 315",
      venue: "r"
    },
    {
      id: "s_fks_lk",
      name: "Физическая культура и спорт",
      short: "ФКиС",
      type: "лк",
      teacher: "Кольцов Денис Александрович",
      place: "к2 · 315",
      venue: "r"
    },
    {
      id: "s_fks_pr",
      name: "Физическая культура и спорт",
      short: "ФКиС",
      type: "пр",
      teacher: "—",
      place: "Городской стадион",
      venue: "s"
    },
    {
      id: "s_foot",
      name: "Футбол и методика преподавания",
      short: "Футбол",
      type: "",
      teacher: "Мамков Олег Михайлович",
      place: "Городской стадион",
      venue: "s"
    },
    {
      id: "s_lang",
      name: "Официальный язык: Молд. / Укр. яз.",
      short: "Гос. язык",
      type: "",
      teacher: "Мазепа Татьяна Андреевна / Якимович Елена",
      place: "к2 · 204 / 205",
      venue: "r"
    },
    {
      id: "s_gym",
      name: "Гимнастика и методика преподавания",
      short: "Гимнастика",
      type: "пр",
      teacher: "Черниченко Игорь Павлович",
      place: "к1 · спортзал",
      venue: "g"
    },
    {
      id: "s_bask",
      name: "Баскетбол и методика преподавания",
      short: "Баскетбол",
      type: "пр",
      teacher: "Чебан Татьяна Николаевна",
      place: "к3 · спортзал",
      venue: "g"
    },
    {
      id: "s_org",
      name: "Основы российской государственности",
      short: "Осн. гос-ти",
      type: "",
      teacher: "Осипова С. А.",
      place: "к2 · 315",
      venue: "r"
    },
    {
      id: "s_vved",
      name: "Введение в профессиональную деятельность",
      short: "Введение в проф.",
      type: "",
      teacher: "Граневский Владимир Викторович",
      place: "к2 · 204",
      venue: "r"
    },
    {
      id: "s_toa",
      name: "Теория и организация АФК",
      short: "Теория АФК",
      type: "",
      teacher: "Граневский Владимир Викторович",
      place: "к2 · 204",
      venue: "r"
    },
    {
      id: "s_ir",
      name: "История России",
      short: "История России",
      type: "",
      teacher: "Чащина Светлана Фёдоровна",
      place: "к2 · 315",
      venue: "r"
    },
    {
      id: "s_ifk",
      name: "История физической культуры",
      short: "История ФК",
      type: "",
      teacher: "Мыцыков Николай Владимирович",
      place: "к2 · 204",
      venue: "r"
    }
  ],
  week: [
    [null, "s_eng", "s_afv_lk", "s_fks_lk"],
    [null, "s_foot", "s_lang", null],
    ["s_gym", "s_bask", "s_fks_pr", null],
    ["s_org", "s_vved", "s_org", "s_toa"],
    ["s_ir", "s_ir", "s_afv_pr", null],
    ["s_ifk", "s_ifk", "s_eng", "s_toa"]
  ],
  overrides: []
};

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
  // Format: pbkdf2$iterations$salt_hex$hash_hex
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

  if (derivedBytes.length !== expectedKey.length) {
    return false;
  }

  // Constant-time comparison
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
      return null; // Expired
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
  // 14 days = 1209600 seconds
  return `afk_session=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly; Secure; SameSite=Strict`;
}

export function clearSessionCookie() {
  return `afk_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

// Check session from request
export async function requireAuth(request, env) {
  const cookieHeader = request.headers.get('Cookie');
  const cookies = parseCookies(cookieHeader);
  const token = cookies['afk_session'];

  if (!token) return null;
  const session = await verifySession(token, env.SESSION_SECRET);
  return session;
}

// Client IP extractor
export function getClientIp(request) {
  return request.headers.get('CF-Connecting-IP') ||
         request.headers.get('x-real-ip') ||
         request.headers.get('x-forwarded-for') ||
         '127.0.0.1';
}

// Strict schema validator for schedule objects
export function validateSchedule(data) {
  if (!data || typeof data !== 'object') {
    return 'Данные должны быть объектом JSON.';
  }

  // Bells validation: 4 slots with start and end times
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
  if (!Array.isArray(data.subjects)) {
    return 'Поле "subjects" должно быть массивом.';
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

  // Week validation: 6 days x 4 slots
  if (!Array.isArray(data.week) || data.week.length !== 6) {
    return 'Поле "week" должно содержать 6 дней (Пн–Сб).';
  }
  for (let d = 0; d < 6; d++) {
    const day = data.week[d];
    if (!Array.isArray(day) || day.length !== 4) {
      return `День #${d + 1} в недельной сетке должен содержать 4 пары.`;
    }
    for (let s = 0; s < 4; s++) {
      const val = day[s];
      if (val !== null && typeof val !== 'string') {
        return `Ячейка день ${d + 1}, пара ${s + 1} должна быть null или строковым ID предмета.`;
      }
      if (typeof val === 'string' && !subjectIds.has(val)) {
        return `Предмет с ID "${val}" (день ${d + 1}, пара ${s + 1}) не найден в списке предметов.`;
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

  return null; // Valid
}
