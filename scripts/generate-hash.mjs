import crypto from 'node:crypto';

// Usage: node scripts/generate-hash.mjs "my_secret_password"
const password = process.argv[2];

if (!password) {
  console.error('Ошибка: укажите пароль в аргументах.');
  console.error('Пример: node scripts/generate-hash.mjs "мой_надежный_пароль"');
  process.exit(1);
}

const salt = crypto.randomBytes(16);
const iterations = 100000;
const keylen = 32;
const digest = 'sha256';

crypto.pbkdf2(password, salt, iterations, keylen, digest, (err, derivedKey) => {
  if (err) throw err;
  const hashString = `pbkdf2$${iterations}$${salt.toString('hex')}$${derivedKey.toString('hex')}`;
  const sessionSecret = crypto.randomBytes(32).toString('hex');

  console.log('\n======================================================');
  console.log('✅ Хэш пароля успешно сгенерирован:');
  console.log('======================================================');
  console.log(`ADMIN_PASSWORD_HASH="${hashString}"`);
  console.log('\nСгенерированный секрет для сессий (SESSION_SECRET):');
  console.log(`SESSION_SECRET="${sessionSecret}"`);
  console.log('======================================================');
  console.log('Добавьте эти переменные в Cloudflare Pages:');
  console.log('Settings -> Environment variables -> Production & Preview\n');
});
