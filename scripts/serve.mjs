import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const MIME = {
  '.css': 'text/css; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.zip': 'application/zip'
};

function decodePath(rawUrl) {
  const rawPath = String(rawUrl || '/').split('?', 1)[0];
  let decoded;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch (_error) {
    throw new Error('Malformed URL encoding');
  }
  if (decoded.includes('\\') || decoded.includes('\0') || decoded.split('/').some((segment) => segment === '..')) {
    throw new Error('Unsafe URL path');
  }
  return decoded === '/' || decoded.endsWith('/') ? `${decoded}index.html` : decoded;
}

export function createStaticServer(options = {}) {
  const root = resolve(options.root || join(process.cwd(), 'public'));
  return createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    if (!['GET', 'HEAD'].includes(request.method || '')) {
      response.writeHead(405, { Allow: 'GET, HEAD' });
      response.end('Method not allowed');
      return;
    }

    let requestedPath;
    try {
      requestedPath = decodePath(request.url);
    } catch (error) {
      response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end(error.message);
      return;
    }
    const target = resolve(root, `.${requestedPath}`);
    if (target !== root && !target.startsWith(`${root}${sep}`)) {
      response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Unsafe URL path');
      return;
    }

    try {
      const data = await readFile(target);
      response.writeHead(200, { 'Content-Type': MIME[extname(target).toLowerCase()] || 'application/octet-stream' });
      response.end(request.method === 'HEAD' ? undefined : data);
    } catch (_error) {
      try {
        const fallback = await readFile(join(root, '404.html'));
        response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        response.end(request.method === 'HEAD' ? undefined : fallback);
      } catch (_fallbackError) {
        response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('Not found');
      }
    }
  });
}

function readOption(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (invokedPath === import.meta.url) {
  const root = resolve(readOption('--root', 'public'));
  const port = Number(readOption('--port', '4173'));
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Port must be an integer from 0 to 65535');
  const server = createStaticServer({ root });
  server.listen(port, '127.0.0.1', () => {
    const address = server.address();
    console.log(`Serving ${root} at http://127.0.0.1:${address.port}`);
  });
  const stop = () => server.close(() => process.exit(0));
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}
