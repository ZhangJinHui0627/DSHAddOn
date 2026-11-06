/**
 * dsh-claude-model-picker - host half.
 *
 * Serves the three documents the browser half needs: the localized model
 * description rules, the price snapshot used by the rate badges, and a tiny
 * activation log the browser half writes to. All local; nothing is fetched from
 * a third party.
 *
 * Route registration follows the host webServer contract (same pattern as the
 * local dsh-codex-slider-bridge / dsh-status-badges plugins).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const name = 'dsh-claude-model-picker';
export const inject = [];

const ROUTE_PREFIX = '/plugins/dsh-claude-model-picker/';
const HERE = path.dirname(fileURLToPath(import.meta.url));

function sendJson(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
  res.end(JSON.stringify(body));
}

function readDocument(res, name) {
  try {
    const text = fs.readFileSync(path.join(HERE, 'data', name), 'utf8');
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(text);
  } catch (error) {
    sendJson(res, 404, { error: String((error && error.message) || error) });
  }
}

/** The activation log: what the browser half reports about its own startup. */
function activationLogPath() {
  const home = typeof process.env.DSH_HOME === 'string' && process.env.DSH_HOME.trim() !== ''
    ? process.env.DSH_HOME.trim()
    : path.join(os.homedir(), '.dsh');
  return path.join(home, 'dsh-claude-model-picker', 'activation.log');
}

function appendActivation(line) {
  try {
    const file = activationLogPath();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, line.slice(0, 8000) + '\n', 'utf8');
  } catch { /* a diagnostic that cannot be written must not fail the request */ }
}

function readBody(req) {
  return new Promise((resolve) => {
    let buf = '';
    req.on('data', (chunk) => {
      buf += chunk;
      if (buf.length > 32768) { req.destroy(); resolve(''); }
    });
    req.on('end', () => resolve(buf));
    req.on('error', () => resolve(''));
  });
}

export function apply(ctx) {
  if (typeof ctx.inject !== 'function') return;
  let cleanup;
  ctx.inject(['webServer'], (scope) => {
    const ws = scope.get ? scope.get('webServer') : scope.webServer;
    if (!ws || typeof ws.register !== 'function') return;
    const disposers = [];
    const register = (route, handler) => {
      try {
        const dispose = ws.register({ kind: 'exact', path: ROUTE_PREFIX + route, handler });
        if (typeof dispose === 'function') disposers.push(dispose);
      } catch { /* route already held: the client half keeps its local fallbacks */ }
    };
    for (const name of ['model-descriptions.json', 'prices.json']) {
      register(name, (req, res) => {
        if (req.method && req.method !== 'GET' && req.method !== 'HEAD') return sendJson(res, 405, { error: 'GET only' });
        readDocument(res, name);
      });
    }
    // The /plugins prefix is owned by the client-module route, which answers
    // GET/HEAD only; a report therefore travels as a GET query string.
    register('report', (req, res) => {
      if (req.method && req.method !== 'GET' && req.method !== 'HEAD') return sendJson(res, 405, { error: 'GET only' });
      let query = '';
      try { query = new URL(req.url || '/', 'http://x').searchParams.get('d') || ''; } catch { query = ''; }
      appendActivation(query || '(empty)');
      sendJson(res, 200, { ok: true });
    });
    cleanup = () => {
      for (const dispose of disposers) { try { dispose(); } catch { /* ignore */ } }
    };
    return cleanup;
  });
  return () => { if (cleanup) cleanup(); };
}
