// DSH Go APK distribution helper.
// Serves the APK from this directory (or --apk <path>) over HTTP so a phone on the
// same LAN can download it. The APK itself is not committed: it is a ~190 MB binary
// and exceeds GitHub's per-file limit. Point --apk at your local copy.
//
//   node serve-apk.mjs --apk ./dsh-go-1.0.11-arm64.apk --port 8125
//
// Size and SHA-256 are computed at startup, so the served page never lies about
// a stale binary.

import { createServer } from 'node:http'
import { createReadStream, statSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve, basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))

function arg(name, fallback) {
  const i = process.argv.indexOf('--' + name)
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

const manifestPath = join(HERE, 'manifest.json')
let manifest = {}
try { manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) } catch { /* optional */ }

const apkPath = resolve(arg('apk', manifest.apk || join(HERE, 'dsh-go-arm64.apk')))
const port = Number(arg('port', '8125'))

let stat
try {
  stat = statSync(apkPath)
} catch {
  console.error('APK not found: ' + apkPath)
  console.error('Pass --apk <path> or place the APK next to this script.')
  process.exit(1)
}

const size = stat.size
const sha = await new Promise((res, rej) => {
  const h = createHash('sha256')
  createReadStream(apkPath)
    .on('data', (c) => h.update(c))
    .on('end', () => res(h.digest('hex')))
    .on('error', rej)
})

const fileName = basename(apkPath)
const headers = {
  'Content-Type': 'application/vnd.android.package-archive',
  'Content-Length': String(size),
  'Content-Disposition': 'attachment; filename="' + fileName + '"',
  'Cache-Control': 'no-store',
}

const page = '<!doctype html><meta charset="utf-8"><title>DSH Go</title>' +
  '<h2>' + fileName + '</h2>' +
  '<p><a href="/' + encodeURIComponent(fileName) + '">Download</a></p>' +
  '<p>Size ' + size + ' bytes<br>SHA-256 <code>' + sha + '</code></p>' +
  '<p>Open the downloaded file on the phone and allow install from this source.</p>'

createServer((req, res) => {
  const name = decodeURIComponent((req.url || '/').split('?')[0].replace(/^\/+/, ''))
  if (name === '') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    return res.end(page)
  }
  if (name !== fileName) { res.writeHead(404); return res.end('not found') }
  res.writeHead(200, headers)
  if (req.method === 'HEAD') return res.end()
  createReadStream(apkPath).pipe(res)
}).listen(port, '0.0.0.0', () => {
  console.log('DSH Go APK ready on http://0.0.0.0:' + port + '/')
})
