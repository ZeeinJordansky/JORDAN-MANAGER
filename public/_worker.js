import serverModule from './server.cjs';
const app = serverModule.app || serverModule.default || serverModule;
import { createServer } from 'node:http';

const server = createServer(app);

export default {
  async fetch(request, env, ctx) {
    if (env) {
      for (const key of Object.keys(env)) {
        if (typeof env[key] === 'string') {
          process.env[key] = env[key];
        }
      }
    }

    return new Promise((resolve, reject) => {
      const url = new URL(request.url);
      const headers = {};
      for (const [k, v] of request.headers.entries()) {
        headers[k] = v;
      }

      let body = null;
      const handleRequest = () => {
        const mockReq = {
          method: request.method,
          url: url.pathname + url.search,
          headers: headers,
          socket: { remoteAddress: request.headers.get('cf-connecting-ip') || '127.0.0.1' },
          on: (event, cb) => {
            if (event === 'data' && body) cb(body);
            if (event === 'end') cb();
          },
          once: (event, cb) => {
            if (event === 'data' && body) cb(body);
            if (event === 'end' && (!body || event === 'end')) cb();
          },
          pause: () => {},
          resume: () => {},
        };

        let resStatusCode = 200;
        let resHeaders = {};
        let resChunks = [];

        const mockRes = {
          statusCode: 200,
          setHeader: (name, val) => { resHeaders[name.toLowerCase()] = val; },
          getHeader: (name) => resHeaders[name.toLowerCase()],
          removeHeader: (name) => { delete resHeaders[name.toLowerCase()]; },
          writeHead: (status, headersObj) => {
            resStatusCode = status;
            if (headersObj) {
              for (const [k, v] of Object.entries(headersObj)) {
                resHeaders[k.toLowerCase()] = v;
              }
            }
          },
          write: (chunk) => {
            if (chunk) resChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          },
          end: (chunk) => {
            if (chunk) resChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            const fullBody = Buffer.concat(resChunks);
            resolve(new Response(fullBody, {
              status: resStatusCode,
              headers: resHeaders
            }));
          },
          on: () => {},
          once: () => {},
          emit: () => {}
        };

        try {
          server.emit('request', mockReq, mockRes);
        } catch (err) {
          reject(err);
        }
      };

      if (request.method !== 'GET' && request.method !== 'HEAD') {
        request.arrayBuffer().then(buffer => {
          body = Buffer.from(buffer);
          handleRequest();
        }).catch(reject);
      } else {
        handleRequest();
      }
    });
  }
};
