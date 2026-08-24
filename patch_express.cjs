const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const limiterCode = `
app.use(express.json());

// DDOS Protection: Rate Limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 300, // 300 requests per minute per IP
  message: "Too many requests, please try again later."
});
app.set("trust proxy", 1);
app.use(limiter);
`;
code = code.replace('app.use(express.json());', limiterCode.trim());

fs.writeFileSync('server.ts', code);
