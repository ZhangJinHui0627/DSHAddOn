/**
 * dsh-codex-slider-bridge - host half.
 *
 * The plugin itself is a browser-side bridge; the host half only stores the
 * probe report the browser posts, so a run can be inspected from disk without
 * opening devtools. Nothing here reads credentials or talks to upstream.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const name = 'dsh-codex-slider-bridge';
export const inject = [];

const DIR_NAME = 'dsh-codex-slider-bridge';
const MAX_BODY = 256 * 1024;

function dshHome() {
  const env = process.env.DSH_HOME;
  if (typeof env === 'string' && env.trim() !== '') return env.trim();
  return path.join(os.homedir(), '.dsh');
}
const dirPath = () => path.join(dshHome(), DIR_NAME);
const reportPath = () => path.join(dirPath(), 'report.json');

function readReport() {
  try {
    return JSON.parse(fs.readFileSync(reportPath(), 'utf8'));
  } catch {
    return null;
  }
}

function writeReport(doc) {
  fs.mkdirSync(dirPath(), { recursive: true });
  fs.writeFileSync(reportPath(), JSON.stringify(doc, null, 2) + '\n', { mode: 0o600 });
}

export function apply(ctx) {
  ctx.inject(['webServer'], (sub) => {
    const ws = sub.get('webServer');
    if (!ws) return;
    const send = (res, code, body) => {
      res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(body));
    };
    const readJson = (req) => new Promise((resolve) => {
      let buf = '';
      req.on('data', (chunk) => {
        buf += chunk;
        if (buf.length > MAX_BODY) { req.destroy(); resolve(null); }
      });
      req.on('end', () => {
        try { resolve(JSON.parse(buf || 'null')); } catch { resolve(null); }
      });
      req.on('error', () => resolve(null));
    });

    const dispose = ws.register({
      kind: 'exact',
      path: '/plugins/dsh-codex-slider-bridge/report',
      handler: async (req, res) => {
        const method = req.method || 'GET';
        if (method === 'GET') {
          const doc = readReport();
          if (doc === null) return send(res, 404, { error: 'no report yet' });
          return send(res, 200, doc);
        }
        if (method !== 'POST') return send(res, 405, { error: 'GET or POST only' });
        const body = await readJson(req);
        if (body === null || typeof body !== 'object') return send(res, 400, { error: 'invalid JSON body' });
        try {
          writeReport({ receivedAt: Date.now(), ...body });
        } catch (error) {
          return send(res, 500, { error: String((error && error.message) || error) });
        }
        return send(res, 200, { ok: true, path: reportPath() });
      },
    });

    return () => {
      try { if (typeof dispose === 'function') dispose(); } catch { /* ignore */ }
    };
  });
}
