/**
 * dsh-qwen-voucher — 阿里云代金券余额胶囊（独立版）
 *
 * 在对话顶栏显示一张千问 AI 平台代金券余额胶囊：通过阿里云 BSS QueryCashCoupons
 * （RPC v1 / HMAC-SHA1 / 零第三方依赖）只读查询，浏览器侧不接触任何凭据。
 *
 * 凭据只从 $DSH_HOME/dsh-qwen-voucher/config.json 读取，仅用于给
 * business.aliyuncs.com / sts.aliyuncs.com 的请求签名，不写日志、不下发前端。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

export const name = 'dsh-qwen-voucher';
export const inject = [];
// ---------------------------------------------------------------- Qwen half

const QWEN_DIR_NAME = 'dsh-qwen-voucher';
const QWEN_BSS_ENDPOINT = 'https://business.aliyuncs.com/';
const QWEN_STS_ENDPOINT = 'https://sts.aliyuncs.com/';
const QWEN_DEFAULT_MINUTES = 30;
const QWEN_ALLOWED_MINUTES = [5, 10, 30];

function qwenDshHome() {
  const env = process.env.DSH_HOME;
  if (typeof env === 'string' && env.trim() !== '') return env.trim();
  return path.join(os.homedir(), '.dsh');
}
const qwenDirPath = () => path.join(qwenDshHome(), QWEN_DIR_NAME);
const qwenConfigPath = () => path.join(qwenDirPath(), 'config.json');
const qwenPrefsPath = () => path.join(qwenDirPath(), 'prefs.json');
const qwenStatePath = () => path.join(qwenDirPath(), 'qwenState.json');

function qwenReadConfig() {
  const blank = { accounts: [], refreshMinutes: QWEN_DEFAULT_MINUTES };
  const normAcc = (a, fallbackLabel) => ({
    label: typeof a.label === 'string' && a.label.trim() ? a.label.trim() : fallbackLabel,
    accessKeyId: typeof a.accessKeyId === 'string' ? a.accessKeyId.trim() : '',
    accessKeySecret: typeof a.accessKeySecret === 'string' ? a.accessKeySecret.trim() : '',
    couponNo: typeof a.couponNo === 'string' ? a.couponNo.trim() : '',
  });
  try {
    const j = JSON.parse(fs.readFileSync(qwenConfigPath(), 'utf8'));
    const mins = Number(j.refreshMinutes);
    let accounts = [];
    if (Array.isArray(j.accounts)) {
      accounts = j.accounts
        .filter((a) => a && typeof a === 'object')
        .map((a, i) => normAcc(a, i === 0 ? '我的' : '账户' + (i + 1)));
    }
    if (!accounts.length) accounts = [normAcc(j, '我的')];
    return { accounts, refreshMinutes: QWEN_ALLOWED_MINUTES.includes(mins) ? mins : QWEN_DEFAULT_MINUTES };
  } catch {
    return blank;
  }
}

function qwenReadPrefs() {
  try {
    const j = JSON.parse(fs.readFileSync(qwenPrefsPath(), 'utf8'));
    const mins = Number(j.refreshMinutes);
    return QWEN_ALLOWED_MINUTES.includes(mins) ? mins : null;
  } catch {
    return null;
  }
}

function qwenWritePrefs(minutes) {
  fs.mkdirSync(qwenDirPath(), { recursive: true });
  fs.writeFileSync(qwenPrefsPath(), JSON.stringify({ refreshMinutes: minutes }, null, 2) + '\n', { mode: 0o600 });
}

/** UI preference wins over config.json; falls back to 30. */
function qwenEffectiveMinutes(cfg = qwenReadConfig()) {
  const pref = qwenReadPrefs();
  return QWEN_ALLOWED_MINUTES.includes(pref) ? pref : cfg.refreshMinutes;
}

function qwenNum(v) {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function qwenPercentEncode(s) {
  return encodeURIComponent(String(s))
    .replace(/\+/g, '%20')
    .replace(/\*/g, '%2A')
    .replace(/%7E/g, '~');
}

function qwenSignature(params, secret) {
  const canon = Object.keys(params)
    .sort()
    .map((k) => qwenPercentEncode(k) + '=' + qwenPercentEncode(params[k]))
    .join('&');
  const stringToSign = 'GET&' + qwenPercentEncode('/') + '&' + qwenPercentEncode(canon);
  return crypto.createHmac('sha1', secret + '&').update(stringToSign, 'utf8').digest('base64');
}

async function qwenCallAliyun(endpoint, action, version, extra, acc) {
  const params = {
    Format: 'JSON',
    Version: version,
    AccessKeyId: acc.accessKeyId,
    SignatureMethod: 'HMAC-SHA1',
    SignatureVersion: '1.0',
    SignatureNonce: crypto.randomUUID(),
    Timestamp: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
    Action: action,
    ...extra,
  };
  params.Signature = qwenSignature(params, acc.accessKeySecret);
  const qs = Object.keys(params)
    .sort()
    .map((k) => qwenPercentEncode(k) + '=' + qwenPercentEncode(params[k]))
    .join('&');
  const res = await fetch(endpoint + '?' + qs, { signal: AbortSignal.timeout(15000) });
  const body = await res.json().catch(() => ({}));
  const ok = res.ok && body.Success !== false && (!body.Code || body.Code === 'Success');
  if (!ok) {
    const err = new Error(body.Message || body.Code || 'HTTP ' + res.status);
    err.code = body.Code || String(res.status);
    throw err;
  }
  return body;
}

function qwenNormalizeCoupons(body) {
  const list = body && body.Data && body.Data.CashCoupon;
  if (!Array.isArray(list)) return [];
  return list
    .map((c) => ({
      id: String(c.CashCouponId ?? ''),
      no: String(c.CashCouponNo ?? ''),
      nominal: qwenNum(c.NominalValue),
      balance: qwenNum(c.Balance),
      status: String(c.Status ?? ''),
      effective: String(c.EffectiveTime ?? ''),
      expiry: String(c.ExpiryTime ?? ''),
      products: String(c.ApplicableProducts ?? ''),
      scenarios: String(c.ApplicableScenarios ?? ''),
    }))
    .filter((c) => c.status === 'Available');
}

function qwenPick(coupons, couponNo) {
  if (!coupons.length) return null;
  if (couponNo) {
    const hit = coupons.find((c) => c.no === couponNo || c.id === couponNo);
    if (hit) return hit;
  }
  return coupons.reduce((a, b) => (b.balance > a.balance ? b : a), coupons[0]);
}

let qwenState = null;

function qwenPersist() {
  try {
    fs.mkdirSync(qwenDirPath(), { recursive: true });
    fs.writeFileSync(qwenStatePath(), JSON.stringify(qwenState), { mode: 0o600 });
  } catch { /* best-effort cache */ }
}

function qwenLoadPersisted() {
  try {
    const j = JSON.parse(fs.readFileSync(qwenStatePath(), 'utf8'));
    if (j && typeof j === 'object') {
      if (!Array.isArray(j.accounts)) {
        j.accounts = [{ label: '我的', configured: j.configured !== false, ok: j.ok !== false, at: j.at ?? null, coupons: j.coupons || [], selected: j.selected || null, error: j.error ?? null, errorAt: j.errorAt ?? null }];
      }
      qwenState = j;
    }
  } catch { /* first run */ }
}

async function qwenRefresh() {
  const cfg = qwenReadConfig();
  const minutes = qwenEffectiveMinutes(cfg);
  const usable = cfg.accounts.filter((a) => a.accessKeyId && a.accessKeySecret);
  if (!usable.length) {
    qwenState = { configured: false, ok: false, at: null, accounts: [], coupons: [], selected: null, error: 'config.json missing or incomplete', errorAt: Date.now(), refreshMinutes: minutes };
    qwenPersist();
    return qwenState;
  }
  const accounts = [];
  for (const acc of usable) {
    const prev = qwenState && Array.isArray(qwenState.accounts) ? qwenState.accounts.find((x) => x.label === acc.label) : null;
    try {
      const body = await qwenCallAliyun(QWEN_BSS_ENDPOINT, 'QueryCashCoupons', '2017-12-14', { EffectiveOrNot: 'true' }, acc);
      const coupons = qwenNormalizeCoupons(body);
      accounts.push({ label: acc.label, configured: true, ok: true, at: Date.now(), coupons, selected: qwenPick(coupons, acc.couponNo), error: null, errorAt: null });
    } catch (e) {
      accounts.push({
        label: acc.label,
        configured: true,
        ok: false,
        at: prev ? prev.at ?? null : null,
        coupons: prev ? prev.coupons : [],
        selected: prev ? prev.selected : null,
        error: String((e && e.message) || e),
        errorAt: Date.now(),
      });
    }
  }
  const first = accounts[0];
  qwenState = {
    configured: true,
    ok: accounts.every((a) => a.ok),
    at: accounts.reduce((m, a) => Math.max(m, a.at || 0), 0) || null,
    accounts,
    coupons: first ? first.coupons : [],
    selected: first ? first.selected : null,
    error: accounts.filter((a) => !a.ok).map((a) => a.label + ': ' + a.error).join('; ') || null,
    errorAt: accounts.some((a) => !a.ok) ? Date.now() : null,
    refreshMinutes: minutes,
  };
  qwenPersist();
  return qwenState;
}

const qwenPublicState = (s = qwenState) => s ?? { configured: false, ok: false, at: null, accounts: [], coupons: [], selected: null, error: 'not started', errorAt: null, refreshMinutes: QWEN_DEFAULT_MINUTES };

function applyQwen(ctx) {
  qwenLoadPersisted();
  let timer = null;
  const stopTimer = () => {
    if (timer !== null) { clearInterval(timer); timer = null; }
  };
  /** (Re)arm the periodic qwenRefresh with the currently effective interval. */
  const schedule = () => {
    stopTimer();
    const minutes = qwenEffectiveMinutes();
    timer = setInterval(() => { qwenRefresh().catch(() => {}); }, minutes * 60000);
    timer.unref?.();
    return minutes;
  };
  const start = () => {
    qwenRefresh().catch(() => {});
    schedule();
  };

  ctx.effect(() => {
    start();
    return stopTimer;
  });

  ctx.inject(['webServer'], (sub) => {
    const ws = sub.get('webServer');
    if (!ws) return;
    const send = (res, code, body) => {
      res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(body));
    };
    const readJson = (req) => new Promise((resolve) => {
      let buf = '';
      req.on('data', (c) => {
        buf += c;
        if (buf.length > 65536) { req.destroy(); resolve({}); }
      });
      req.on('end', () => {
        try { resolve(JSON.parse(buf || '{}')); } catch { resolve({}); }
      });
      req.on('error', () => resolve({}));
    });

    const d1 = ws.register({
      kind: 'exact',
      path: '/plugins/dsh-qwen-voucher/status',
      handler: (_req, res) => {
        if (qwenState && qwenState.refreshMinutes !== qwenEffectiveMinutes()) qwenState.refreshMinutes = qwenEffectiveMinutes();
        send(res, 200, qwenPublicState());
      },
    });
    const d2 = ws.register({
      kind: 'exact',
      path: '/plugins/dsh-qwen-voucher/refresh',
      handler: (req, res) => {
        if ((req.method || 'GET') !== 'POST') return send(res, 405, { error: 'POST only' });
        qwenRefresh()
          .then((s) => send(res, 200, qwenPublicState(s)))
          .catch((e) => send(res, 500, { error: String((e && e.message) || e) }));
      },
    });
    const d3 = ws.register({
      kind: 'exact',
      path: '/plugins/dsh-qwen-voucher/prefs',
      handler: async (req, res) => {
        if ((req.method || 'GET') !== 'POST') return send(res, 405, { error: 'POST only' });
        const bodyDoc = await readJson(req);
        const minutes = Number(bodyDoc.refreshMinutes);
        if (!QWEN_ALLOWED_MINUTES.includes(minutes)) {
          return send(res, 400, { error: 'refreshMinutes must be one of ' + QWEN_ALLOWED_MINUTES.join('/') });
        }
        try {
          qwenWritePrefs(minutes);
        } catch (e) {
          return send(res, 500, { error: String((e && e.message) || e) });
        }
        schedule();
        if (qwenState) qwenState.refreshMinutes = minutes;
        send(res, 200, qwenPublicState());
      },
    });
    return () => {
      for (const d of [d1, d2, d3]) { try { if (typeof d === 'function') d(); } catch { /* ignore */ } }
    };
  });
}
export function apply(ctx) {
  applyQwen(ctx);
}
