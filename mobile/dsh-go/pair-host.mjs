// Prints the DSH Go pairing QR for this machine.
//
// DSH Go pairs with a desktop DSH over a host-side plugin. This helper loads
// that plugin's CLI from the active profile and renders the login URL as a QR
// image, so you can scan it from the phone.
//
//   node pair-host.mjs [--profile desktop] [--out .]
//
// Requires the remote-access plugin to be installed in that profile. It is not
// bundled here: the plugin is third-party and has its own release channel.

import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs'
import { resolve, join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { homedir } from 'node:os'

const HERE = dirname(fileURLToPath(import.meta.url))

function arg(name, fallback) {
  const i = process.argv.indexOf('--' + name)
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

const dshHome = process.env.DSH_HOME || join(homedir(), '.dsh')
const profile = arg('profile', 'desktop')
const outDir = resolve(arg('out', HERE))

const pluginRoot = join(dshHome, 'profiles', profile, 'node_modules', 'ds-harness-remote')
const entry = join(pluginRoot, 'dist', 'index.js')

mkdirSync(outDir, { recursive: true })
const logPath = join(outDir, 'pair-host.log')
const t0 = Date.now()
const log = (m) => {
  const line = '[' + ((Date.now() - t0) / 1000).toFixed(1) + 's] ' + m + '\n'
  try { appendFileSync(logPath, line) } catch { /* ignore */ }
  process.stdout.write(line)
}

let mod
try {
  mod = await import(pathToFileURL(entry).href)
} catch (e) {
  log('cannot load ' + entry)
  log('install the remote-access plugin into profile "' + profile + '" first')
  log(String((e && e.message) || e))
  process.exit(1)
}

let captured = null
const sink = () => {
  const chunks = []
  return {
    write: (s) => { chunks.push(String(s)); return true },
    text: () => chunks.join(''),
  }
}

const runtime = {
  stdout: sink(),
  stderr: sink(),
  env: process.env,
  now: () => Date.now(),
  wait: (ms) => new Promise((r) => setTimeout(r, ms)),
  renderQr: async (url) => {
    captured = url
    writeFileSync(join(outDir, 'pair-login-url.txt'), url + '\n')
    log('SCAN_URL_SAVED')
    try {
      const qr = await import('qrcode')
      await qr.default.toFile(join(outDir, 'pair-login-qr.png'), url, { width: 520, margin: 2 })
      log('QR_PNG_WRITTEN ' + join(outDir, 'pair-login-qr.png'))
    } catch (e) {
      log('qr image skipped: ' + String((e && e.message) || e))
    }
    return '[QR]'
  },
}

log('login start (profile=' + profile + ')')
try {
  const code = await mod.runCli(['login'], runtime)
  log('login exit=' + code)
} catch (e) {
  log('login error: ' + String((e && e.message) || e))
}
log('DONE captured=' + (captured ? 'yes' : 'no'))
