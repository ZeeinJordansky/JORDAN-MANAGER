const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// 1. Redis setup
if (!code.includes('const redisClient =')) {
  const redisBlock = `import Redis from "ioredis";
import RedisMock from "ioredis-mock";

let redisClient: any;
try {
  if (process.env.REDIS_URL) {
    redisClient = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1, lazyConnect: true });
    redisClient.connect().catch(() => {
      redisClient = new RedisMock();
    });
  } else {
    redisClient = new RedisMock();
  }
} catch (e) {
  redisClient = new RedisMock();
}
`;
  code = redisBlock + code;
}

// 2. Auto unmute text fix
code = code.replace(
  'Блокировка чата у [id${uId}|пользователя] была окончена.',
  'Блокировка чата у [id${uId}|пользователя] была закончена и автоматически снята.'
);

fs.writeFileSync('server.ts', code);
console.log('Redis & Auto-unmute patched successfully.');
