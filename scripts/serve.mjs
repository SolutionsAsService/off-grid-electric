// node scripts/serve.mjs [port]   Serves site/ with the headers in vercel.json and a real 404, so pages are tested under the policy they ship with.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const site = path.join(root, 'site')
const port = Number(process.argv[2]) || 8132
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'))
const headers = Object.fromEntries((cfg.headers || []).flatMap((h) => h.headers.map((x) => [x.key, x.value])))
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml' }
http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  if (p.endsWith('/')) p += 'index.html'
  let file = path.join(site, p)
  if (!fs.existsSync(file) && fs.existsSync(file + '.html')) file += '.html'
  const ok = file.startsWith(site) && fs.existsSync(file) && fs.statSync(file).isFile()
  const target = ok ? file : path.join(site, '404.html')
  res.writeHead(ok ? 200 : 404, { ...headers, 'Content-Type': types[path.extname(target)] || 'application/octet-stream' })
  res.end(fs.existsSync(target) ? fs.readFileSync(target) : 'Not found')
}).listen(port, () => console.log('http://localhost:' + port))
