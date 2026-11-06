// local-token-ledger —— dsh-go 原生界面：累计全部 token + 今日 + 本对话，逐模型参考定价与估价。
// 用量：本机会话记录 assistant/message.usage；不读密钥、不读对话正文。
// 定价：token-prices.json 内置参考价；缺价模型自动去公开目录查（可关），查不到会明确列出。
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

export const name = 'local-token-ledger'

const HOME = process.env.DSH_HOME || path.join(process.env.HOME || '/root', '.dsh')
const SESSIONS_DIR = path.join(HOME, 'sessions')
const PRICE_FILE = path.join(HOME, 'dsh-go', 'token-prices.json')
const AUTO_FILE = path.join(HOME, 'dsh-go', 'token-prices-auto.json')
const CATALOG_FILE = path.join(HOME, 'dsh-go', 'token-price-catalog.json')
const BUNDLED_PRICE_FILE = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'token-prices.json')

const SOURCES = {
  openrouter: 'https://openrouter.ai/api/v1/models',
  modelsdev: 'https://models.dev/api.json',
  litellm: 'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json',
}

const DEFAULTS = {
  currency: 'CNY',
  cnyPerUsd: 7.2,
  autoLookup: { enabled: true, ttlHours: 24, timeoutMs: 12000, sources: ['openrouter', 'modelsdev', 'litellm'] },
  strip: { rotateMs: 6500, frameMs: 280, frames: 6 },
  peak: { ranges: [[9, 12], [14, 18]], weekdays: [1, 2, 3, 4, 5], utcOffsetHours: 8 },
  aliases: {},
  prices: {},
}

function loadPrices() {
  try {
    if (!fs.existsSync(PRICE_FILE) && fs.existsSync(BUNDLED_PRICE_FILE)) {
      try {
        fs.mkdirSync(path.dirname(PRICE_FILE), { recursive: true })
        fs.copyFileSync(BUNDLED_PRICE_FILE, PRICE_FILE)
      } catch {}
    }
    const raw = JSON.parse(fs.readFileSync(PRICE_FILE, 'utf8'))
    if (raw && typeof raw === 'object') {
      return {
        ...DEFAULTS, ...raw,
        prices: raw.prices && typeof raw.prices === 'object' ? raw.prices : {},
        aliases: raw.aliases && typeof raw.aliases === 'object' ? raw.aliases : {},
        autoLookup: { ...DEFAULTS.autoLookup, ...(raw.autoLookup || {}) },
        strip: { ...DEFAULTS.strip, ...(raw.strip || {}) },
        peak: { ...DEFAULTS.peak, ...(raw.peak || {}) },
      }
    }
  } catch {}
  return DEFAULTS
}

function saveConfig(next) {
  try {
    let cur = {}
    try { cur = JSON.parse(fs.readFileSync(PRICE_FILE, 'utf8')) } catch {}
    fs.mkdirSync(path.dirname(PRICE_FILE), { recursive: true })
    fs.writeFileSync(PRICE_FILE, JSON.stringify({ ...cur, ...next }, null, 2) + '\n')
    notifyConfigChange()
    return true
  } catch { return false }
}

// 配置一变，立刻唤醒状态条、并把新数据直接推给已打开的面板，不等下一轮定时刷新。
const stripWakeups = new Set()
const panelEmitters = new Map()
let configEpoch = 0

function notifyConfigChange() {
  configEpoch += 1
  for (const wake of stripWakeups) { try { wake() } catch {} }
  for (const p of panelEmitters.values()) {
    try { p.emit(summarize(loadPrices(), p.scope, p.locale)) } catch {}
  }
}

// ── 自动查价：把公开目录压成小索引存本机，24h 内复用 ────────────────────────
// row = [id, cacheHit, input, output, rank]；USD / 百万 token。
const pending = new Set()
const attempted = new Map()
let catalog = null
let catalogLoading = null
let auto = { at: 0, prices: {} }
try {
  const j = JSON.parse(fs.readFileSync(AUTO_FILE, 'utf8'))
  if (j && typeof j === 'object') auto = { at: j.at || 0, prices: j.prices || {} }
} catch {}

function writeAuto() {
  try { fs.writeFileSync(AUTO_FILE, JSON.stringify(auto, null, 2) + '\n') } catch {}
}

function r6(x) { const n = Number(x); return Number.isFinite(n) ? Math.round(n * 1e6) / 1e6 : 0 }
function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '') }
function shortOf(id) { return String(id || '').split('/').pop() || '' }

function officialRank(id, src) {
  const s = String(id).toLowerCase()
  if (src === 'openrouter') return s.includes(':') ? 6 : 0
  if (src === 'modelsdev') {
    if (/^(openai|deepseek|tencent|qwen|alibaba|alibaba-cn|moonshotai|z-ai|minimax|zhipuai|google|anthropic)\//.test(s)) return 1
    if (/^(vercel|opencode-go|kilo|requesty|nano-gpt|merge-gateway)\//.test(s)) return 3
    return 4
  }
  if (src === 'litellm') return s.includes('/') ? 5 : 2
  return 7
}

async function fetchJson(url, timeoutMs) {
  const r = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: { 'user-agent': 'dsh-local-token-ledger' } })
  if (!r.ok) throw new Error('HTTP ' + r.status)
  return await r.json()
}

function buildRows(name, data) {
  const rows = []
  const push = (id, c, i, o) => {
    if (!id || !(Number(i) > 0)) return
    rows.push([String(id), r6(c), r6(i), r6(o), officialRank(id, name)])
  }
  if (name === 'openrouter') {
    for (const m of data?.data || []) {
      const p = m.pricing
      if (!p) continue
      push(m.id, Number(p.input_cache_read || 0) * 1e6, Number(p.prompt || 0) * 1e6, Number(p.completion || 0) * 1e6)
    }
  } else if (name === 'modelsdev') {
    for (const [prov, group] of Object.entries(data || {})) {
      for (const [id, m] of Object.entries(group?.models || {})) {
        const c = m.cost
        if (c) push(prov + '/' + id, c.cache_read || 0, c.input, c.output || 0)
      }
    }
  } else if (name === 'litellm') {
    for (const [id, v] of Object.entries(data || {})) {
      if (!v || !(v.input_cost_per_token > 0)) continue
      push(id, (v.cache_read_input_token_cost || 0) * 1e6, v.input_cost_per_token * 1e6, (v.output_cost_per_token || 0) * 1e6)
    }
  }
  return rows
}

async function refreshCatalog(cfg, force) {
  if (catalogLoading) return catalogLoading
  const ttl = Math.max(1, Number(cfg.autoLookup?.ttlHours) || 24) * 3600e3
  if (!force && catalog && Date.now() - catalog.at < ttl) return catalog
  if (!force) {
    try {
      const j = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'))
      if (j && Array.isArray(j.rows) && Date.now() - (j.at || 0) < ttl) { catalog = j; return catalog }
    } catch {}
  }
  const timeoutMs = Math.max(3000, Number(cfg.autoLookup?.timeoutMs) || 12000)
  const names = (cfg.autoLookup?.sources || Object.keys(SOURCES)).filter((n) => SOURCES[n])
  catalogLoading = (async () => {
    const rows = []
    const got = []
    for (const n of names) {
      try { rows.push(...buildRows(n, await fetchJson(SOURCES[n], timeoutMs))); got.push(n) } catch {}
    }
    if (!rows.length) return catalog
    // 同 id 保留 rank 小的
    const best = new Map()
    for (const r of rows) {
      const k = norm(r[0])
      if (!best.has(k) || r[4] < best.get(k)[4]) best.set(k, r)
    }
    catalog = { at: Date.now(), sources: got, rows: [...best.values()] }
    try { fs.writeFileSync(CATALOG_FILE, JSON.stringify(catalog)) } catch {}
    return catalog
  })().catch(() => catalog).finally(() => { catalogLoading = null })
  return catalogLoading
}

function lookupModel(model) {
  if (!catalog || !Array.isArray(catalog.rows)) return null
  const q = norm(model), qs = norm(shortOf(model))
  let best = null, bestScore = 99
  for (const r of catalog.rows) {
    const id = String(r[0]), k = norm(id), s = norm(shortOf(id))
    let score
    if (k === q || s === q) score = 0
    else if (s === qs) score = 1
    else if (s && q && (s.startsWith(q) || q.startsWith(s)) && Math.abs(s.length - q.length) <= 10) score = 2
    else continue
    const rank = score * 10 + (r[4] || 7)
    if (rank < bestScore) { bestScore = rank; best = { usd: [r[1], r[2], r[3]], source: id } }
  }
  return best
}

function ensureLookups(models, cfg) {
  const enabled = cfg.autoLookup?.enabled !== false
  const retryMs = Math.max(1, Number(cfg.autoLookup?.ttlHours) || 24) * 3600e3
  const stale = Date.now() - auto.at
  if (stale > retryMs) { auto = { at: Date.now(), prices: {} }; attempted.clear(); writeAuto() }
  if (enabled) void refreshCatalog(cfg, false)
  for (const m of models) {
    // null 也是「已经查过但没查到」，在 TTL 内不重复联网；面板会明确列出。
    if (!m || cfg.prices[m] || cfg.aliases[m] || Object.prototype.hasOwnProperty.call(auto.prices, m) || pending.has(m)) continue
    if (Date.now() - (attempted.get(m) || 0) < 60000) continue
    attempted.set(m, Date.now())
    if (!enabled) { auto.prices[m] = null; writeAuto(); continue }
    pending.add(m)
    void (async () => {
      try {
        await refreshCatalog(cfg, false)
        const hit = lookupModel(m)
        auto.prices[m] = hit ? { usd: hit.usd, source: hit.source, at: Date.now() } : null
      } catch { auto.prices[m] = null }
      finally { pending.delete(m); auto.at = Date.now(); writeAuto() }
    })()
  }
}

function resolvePrice(model, cfg) {
  let key = model
  if (!cfg.prices[key] && cfg.aliases[key]) key = cfg.aliases[key]
  const p = cfg.prices[key]
  if (p && Array.isArray(p.usd)) return { ...p, key, origin: 'builtin' }
  const a = auto.prices[model]
  if (a && a.usd) return { usd: a.usd, source: '目录 ' + (a.source || ''), key: model, origin: 'auto' }
  return null
}

// ── 会话日志 ────────────────────────────────────────────────────────────────
const cache = new Map()

function listSessionFiles() {
  const out = []
  let workspaces = []
  try { workspaces = fs.readdirSync(SESSIONS_DIR, { withFileTypes: true }) } catch { return out }
  for (const ws of workspaces) {
    if (!ws.isDirectory() || ws.name.startsWith('.')) continue
    const wsDir = path.join(SESSIONS_DIR, ws.name)
    let sessions = []
    try { sessions = fs.readdirSync(wsDir, { withFileTypes: true }) } catch { continue }
    for (const s of sessions) {
      if (!s.isDirectory()) continue
      const sDir = path.join(wsDir, s.name)
      let files = []
      try { files = fs.readdirSync(sDir) } catch { continue }
      for (const f of files) {
        if (/^session\.v\d+\.jsonl\.zstd$/.test(f)) out.push({ file: path.join(sDir, f), id: s.name.replace(/^session-/, '') })
      }
    }
  }
  return out
}

function readEvents(entry) {
  let st
  try { st = fs.statSync(entry.file) } catch { return [] }
  const hit = cache.get(entry.file)
  if (hit && hit.mtimeMs === st.mtimeMs && hit.size === st.size) return hit.events
  const events = []
  try {
    const raw = zlib.zstdDecompressSync(fs.readFileSync(entry.file)).toString('utf8')
    for (const line of raw.split('\n')) {
      if (!line || !line.includes('usage')) continue
      let rec
      try { rec = JSON.parse(line) } catch { continue }
      if (rec?.type !== 'assistant/message') continue
      const u = rec.data?.usage
      if (!u) continue
      const input = u.inputTokens | 0, output = u.outputTokens | 0
      const cacheRead = u.cacheReadTokens | 0, cacheWrite = u.cacheWriteTokens | 0
      events.push({
        time: rec.time || 0, sessionId: entry.id,
        provider: rec.data?.message?.source?.provider || 'unknown',
        model: rec.data?.message?.source?.model || 'unknown',
        input, output, cacheRead, cacheWrite,
        total: u.totalTokens ?? input + output + cacheRead + cacheWrite,
      })
    }
  } catch { return [] }
  cache.set(entry.file, { mtimeMs: st.mtimeMs, size: st.size, events })
  return events
}

function blank() { return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0, paid: 0, turns: 0, usd: 0, cny: 0 } }
function add(t, ev) {
  t.input += ev.input; t.output += ev.output; t.cacheRead += ev.cacheRead
  t.cacheWrite += ev.cacheWrite; t.total += ev.total; t.paid += ev.input + ev.output; t.turns += 1
}

function isPeak(t, cfg) {
  if (!Number.isFinite(t) || t <= 0) return false
  const d = new Date(t + (cfg.peak?.utcOffsetHours ?? 8) * 3600e3)
  const wd = d.getUTCDay(), h = d.getUTCHours() + d.getUTCMinutes() / 60
  if (!(cfg.peak?.weekdays || [1, 2, 3, 4, 5]).includes(wd)) return false
  return (cfg.peak?.ranges || []).some((r) => Array.isArray(r) && h >= r[0] && h < r[1])
}

function ratesFor(ev, p, cfg) {
  if (!p) return null
  const rate = Number(cfg.cnyPerUsd) || 7.2
  const usdRates = p.usd
  const cnyRates = p.cny
    ? (isPeak(ev.time, cfg) && p.cnyPeak ? p.cnyPeak : p.cny)
    : usdRates.map((x) => x * rate)
  const cost = (r) => (ev.cacheRead * r[0] + (ev.input + ev.cacheWrite) * r[1] + ev.output * r[2]) / 1e6
  // USD 口径统一用美元价，保证切币种时总账一致；人民币口径优先用官方人民币价。
  return { usd: cost(usdRates), cny: cost(cnyRates) }
}

function shortProvider(p) {
  return ({ 'deepseek-account': '官方', 'custom-ai': '自定义', 'openai-codex': 'Codex', workbuddy: 'WB', 'deepseek-official': '官方' })[p] || p
}

function shortSource(s) {
  const t = String(s || '')
  if (/DeepSeek 官方/.test(t)) return '官方'
  if (/OpenRouter|目录 /.test(t)) return '目录'
  if (/models\.dev/i.test(t)) return 'MD'
  if (/litellm/i.test(t)) return 'LT'
  if (/参考/.test(t)) return '参考'
  return '内置'
}

function fmt(n) {
  const v = Number(n) || 0
  if (v < 1000) return String(v)
  if (v < 1e6) return (v / 1000).toFixed(v < 1e4 ? 2 : 1) + 'k'
  return (v / 1e6).toFixed(2) + 'M'
}

function money(n, cur) {
  const sym = cur === 'USD' ? '$' : '¥'
  const v = Number(n) || 0
  if (v > 0 && v < 0.01) return '<' + sym + '0.01'
  return sym + v.toFixed(2)
}

function collect(cfg, scope) {
  const day = new Date(); day.setHours(0, 0, 0, 0)
  const dayMs = day.getTime()
  const sid = String(scope?.sessionId || '').replace(/^session-/, '')
  const all = blank(), today = blank(), mine = blank()
  const byKey = new Map(), usedModels = new Set()
  let pricedCalls = 0, unpricedCalls = 0, costUsd = 0, costCny = 0

  for (const entry of listSessionFiles()) {
    for (const ev of readEvents(entry)) {
      add(all, ev)
      if (ev.time >= dayMs) add(today, ev)
      if (sid && ev.sessionId === sid) add(mine, ev)
      usedModels.add(ev.model)
      const key = ev.provider + '\u0000' + ev.model
      let e = byKey.get(key)
      if (!e) {
        e = { provider: ev.provider, model: ev.model, calls: 0, ...blank(), costUsd: 0, costCny: 0, priced: false, source: '' }
        byKey.set(key, e)
      }
      e.calls += 1; add(e, ev)
      const p = resolvePrice(ev.model, cfg)
      const r = ratesFor(ev, p, cfg)
      if (r) {
        pricedCalls += 1; e.priced = true; e.source = p.source || ''
        costUsd += r.usd; costCny += r.cny; e.costUsd += r.usd; e.costCny += r.cny
        all.usd += r.usd; all.cny += r.cny
        if (ev.time >= dayMs) { today.usd += r.usd; today.cny += r.cny }
        if (sid && ev.sessionId === sid) { mine.usd += r.usd; mine.cny += r.cny }
      } else unpricedCalls += 1
    }
  }
  const models = [...byKey.values()].sort((a, b) => b.total - a.total)
  ensureLookups([...usedModels], cfg)
  const unpriced = models.filter((m) => !m.priced).map((m) => m.model)
  return { all, today, mine, models, usedModels: [...usedModels], pricedCalls, unpricedCalls, costUsd, costCny, unpriced }
}

function priceTable(models, cfg) {
  const rows = []
  for (const m of models) {
    const p = resolvePrice(m.model, cfg)
    if (p) rows.push([m.model, String(p.usd[0]), String(p.usd[1]), String(p.usd[2]), shortSource(p.source)])
    else rows.push([m.model, '—', '—', '—', '未查到'])
  }
  return rows
}

function summarize(cfg, scope, locale) {
  const en = String(locale || '').startsWith('en')
  const s = collect(cfg, scope)
  const cur = cfg.currency === 'USD' ? 'USD' : 'CNY'
  const cost = cur === 'USD' ? s.costUsd : s.costCny
  const note = en
    ? 'All-time local usage. Prices are indicative USD/1M-token reference rates (cache hit / input / output), not a bill. CNY estimates use official CNY rates for DeepSeek models and the configured FX rate for others. Missing models are looked up in public catalogs and listed above. Subscription/promo routes may be free despite an estimate.'
    : '累计本机全部会话记录。逐模型单价为 USD/百万 token（缓存命中/输入/输出）参考价，仅供参考，不是账单。人民币估算：DeepSeek 官方模型优先用官方人民币价，其余按配置汇率换算。缺价模型会自动查公开目录并在上方列出。订阅/活动通道可能实际免费，估价仍会显示。'
  return {
    totalStr: fmt(s.all.total), todayStr: fmt(s.today.total), mineStr: fmt(s.mine.total),
    inputStr: fmt(s.all.input), outputStr: fmt(s.all.output),
    cacheReadStr: fmt(s.all.cacheRead), cacheWriteStr: fmt(s.all.cacheWrite),
    paidStr: fmt(s.all.paid), costStr: money(cost, cur), currencyStr: cur,
    todayCostStr: money(cur === 'USD' ? s.today.usd : s.today.cny, cur),
    pricedCalls: s.pricedCalls, unpricedCalls: s.unpricedCalls,
    rateStr: '1 USD = ' + (Number(cfg.cnyPerUsd) || 7.2) + ' CNY',
    chartLabels: s.models.map((m) => m.model), chartValues: s.models.map((m) => Math.round(m.total / 1000)),
    modelRows: s.models.map((m) => [m.model, shortProvider(m.provider), String(m.calls), fmt(m.total), m.priced ? money(cur === 'USD' ? m.costUsd : m.costCny, cur) : '—']),
    priceRows: priceTable(s.models, cfg),
    unpricedText: s.unpriced.length
      ? (en ? 'Unpriced models (excluded): ' : '未查到价格的模型（未计入估价）：') + s.unpriced.join('、')
      : (en ? 'All used models have a reference price.' : '出现过的模型均已匹配参考价。'),
    unpricedTone: s.unpriced.length ? 'warn' : 'good',
    note,
  }
}

function stripViews(cfg, scope, locale) {
  const en = String(locale || '').startsWith('en')
  const s = collect(cfg, scope)
  const cur = cfg.currency === 'USD' ? 'USD' : 'CNY'
  const cost = (u, c) => money(cur === 'USD' ? u : c, cur)
  // 今日 / 本对话费用在 collect() 里按同一套单价累加。
  const todayCost = cost(s.today.usd, s.today.cny)
  const mineCost = cost(s.mine.usd, s.mine.cny)
  return [
    (en ? 'All ' : '累计 ') + fmt(s.all.total) + ' · ' + (en ? 'Est ' : '估算 ') + cost(s.costUsd, s.costCny),
    (en ? 'Today ' : '今日 ') + fmt(s.today.total) + ' · ' + (en ? 'Est ' : '估算 ') + todayCost,
    (en ? 'Chat ' : '本对话 ') + fmt(s.mine.total) + ' · ' + (en ? 'Est ' : '估算 ') + mineCost,
  ]
}

export function apply(ctx) {
  ctx.inject(['dshGo'], (ctx) => {
    const REFRESH_MS = 15000
    const WIDTH = 24

    ctx.dshGo.strip('ledger-strip', (scope, emit, caps) => {
      let alive = true, timer = null, wake = null, epoch = configEpoch
      const locale = caps?.locale
      const send = (text) => emit({ text: String(text).slice(0, WIDTH), tone: 'muted' })
      const wait = (ms) => new Promise((res) => {
        wake = res
        timer = setTimeout(() => { timer = null; wake = null; res() }, ms)
        timer.unref?.()
      })
      // 配置一变就立刻取消当前等待，重读并显示新币种；每次轮播只推一次文字，
      // 让 App 的过渡动画完整播一次，不再逐帧触发带阴影的切换动画。
      const wakeNow = () => {
        epoch = configEpoch
        try { send(stripViews(loadPrices(), scope, locale)[0]) } catch {}
        if (timer) { clearTimeout(timer); timer = null }
        if (wake) { const w = wake; wake = null; w() }
      }
      stripWakeups.add(wakeNow)

      void (async () => {
        let i = 0
        while (alive) {
          const cfg = loadPrices()
          const sc = cfg.strip || {}
          const rotateMs = Math.min(30000, Math.max(3000, Number(sc.rotateMs) || 6500))
          let views
          try { views = stripViews(cfg, scope, locale) }
          catch { views = [String(locale || '').startsWith('en') ? 'Read failed' : '用量读取失败'] }
          send(views[i % views.length])
          const seen = epoch
          await wait(rotateMs)
          if (!alive) break
          if (epoch !== seen) continue // 配置刚变，下一轮从头用新配置，不切到下一条
          i += 1
        }
      })().catch(() => {})

      return () => {
        alive = false
        stripWakeups.delete(wakeNow)
        if (timer) clearTimeout(timer)
        if (wake) { const w = wake; wake = null; w() }
      }
    })

    ctx.dshGo.panel('ledger-panel', {
      view: (scope, caps) => {
        const en = String(caps?.locale || '').startsWith('en')
        const t = en ? {
          all: 'All tokens', est: 'Estimated', today: 'Today', chat: 'This chat',
          input: 'Input (miss)', cacheRead: 'Cache read', cacheWrite: 'Cache write', output: 'Output',
          total: 'Total (incl. cache)', paid: 'Input + output', priced: 'Priced calls', unpriced: 'Unpriced',
          rate: 'FX', todayCost: 'Today est.', tokens: 'Tokens', byModel: 'By model (k tokens)',
          model: 'Model', route: 'Route', calls: 'Calls', estShort: 'Est.', src: 'Src',
          priceTitle: 'Reference price · USD per 1M tokens (cache / input / output)',
          hit: 'Hit', miss: 'Miss', out: 'Output',
          refresh: 'Refresh', relookup: 'Re-check prices', currency: 'CNY / USD',
          empty: 'No usage yet',
        } : {
          all: '累计 Token', est: '估算费用', today: '今日 Token', chat: '本对话 Token',
          input: '输入未命中', cacheRead: '缓存读取', cacheWrite: '缓存写入', output: '输出',
          total: '总量(含缓存)', paid: '输入+输出', priced: '已计价调用', unpriced: '未计价调用',
          rate: '汇率', todayCost: '今日估算', tokens: 'Token', byModel: '按模型 (千 token)',
          model: '模型', route: '通道', calls: '调用', estShort: '估算', src: '来源',
          priceTitle: '参考单价 · USD/百万 token（命中/输入/输出）',
          hit: '命中', miss: '输入', out: '输出',
          refresh: '刷新', relookup: '重新查价', currency: '切 ¥/$',
          empty: '暂无用量',
        }
        return {
          type: 'stack', title: en ? 'Token ledger' : 'Token 总账',
          children: [
            {
              type: 'row', children: [
                { type: 'metric', label: t.all, value: { $: 'data.totalStr' }, caption: { $: 'data.currencyStr' } },
                { type: 'metric', label: t.est, value: { $: 'data.costStr' } },
                { type: 'metric', label: t.today, value: { $: 'data.todayStr' }, caption: { $: 'data.todayCostStr' } },
                { type: 'metric', label: t.chat, value: { $: 'data.mineStr' } },
              ],
            },
            {
              type: 'keyValue', items: [
                [t.input, { $: 'data.inputStr' }], [t.cacheRead, { $: 'data.cacheReadStr' }],
                [t.cacheWrite, { $: 'data.cacheWriteStr' }], [t.output, { $: 'data.outputStr' }],
                [t.total, { $: 'data.totalStr' }], [t.paid, { $: 'data.paidStr' }],
                [t.priced, { $: 'data.pricedCalls' }], [t.unpriced, { $: 'data.unpricedCalls' }],
                [t.rate, { $: 'data.rateStr' }],
              ],
            },
            { type: 'chart', kind: 'hbar', categories: { $: 'data.chartLabels' }, series: [{ name: t.tokens, values: { $: 'data.chartValues' } }], unit: 'k tokens', caption: t.byModel },
            { type: 'table', columns: [t.model, t.route, t.calls, t.tokens, t.estShort], rows: { $: 'data.modelRows' } },
            { type: 'text', text: t.priceTitle, tone: 'muted' },
            { type: 'table', columns: [t.model, t.hit, t.miss, t.out, t.src], rows: { $: 'data.priceRows' } },
            { type: 'callout', text: { $: 'data.unpricedText' }, tone: { $: 'data.unpricedTone' } },
            { type: 'callout', text: { $: 'data.note' }, tone: 'info' },
            { type: 'actions', items: [
              { label: t.refresh, action: 'reload', icon: 'refresh' },
              { label: t.relookup, action: 'relookup', icon: 'search' },
              { label: t.currency, action: 'currency', icon: 'money' },
            ] },
          ],
        }
      },
      data: (scope, emit, caps) => {
        let alive = true
        const locale = caps?.locale
        const key = String(scope?.sessionId || '') + '|' + String(locale || '')
        const push = () => {
          if (!alive) return
          try { emit(summarize(loadPrices(), scope, locale)) }
          catch {
            emit({ totalStr: '—', todayStr: '—', mineStr: '—', inputStr: '—', outputStr: '—', cacheReadStr: '—', cacheWriteStr: '—', paidStr: '—', costStr: '—', currencyStr: '—', todayCostStr: '—', pricedCalls: 0, unpricedCalls: 0, rateStr: '—', chartLabels: [], chartValues: [], modelRows: [], priceRows: [], unpricedText: '读取失败', unpricedTone: 'warn', note: 'Read failed' })
          }
        }
        panelEmitters.set(key, { emit, scope, locale })
        push()
        const timer = setInterval(push, REFRESH_MS)
        return () => { alive = false; clearInterval(timer); if (panelEmitters.get(key)?.emit === emit) panelEmitters.delete(key) }
      },
      actions: {
        reload: () => ({ refresh: true }),
        relookup: () => {
          auto = { at: Date.now(), prices: {} }
          attempted.clear()
          writeAuto()
          void refreshCatalog(loadPrices(), true)
          return { toast: '正在重新查公开价格表', refresh: true }
        },
        currency: () => {
          const c = loadPrices()
          const next = c.currency === 'USD' ? 'CNY' : 'USD'
          saveConfig({ currency: next })
          return { toast: next === 'USD' ? '已切换为美元' : '已切换为人民币', refresh: true }
        },
      },
    })
  })
}
