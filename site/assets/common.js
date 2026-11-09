/* Shared chrome, data loading and the state that travels between pages in the address (?l=fridge.lights&p=800...). No storage, no cookies,
   no request to any other site. */
(function () {
  'use strict'
  var NAV = [['index.html', 'Simulator'], ['basics.html', 'Basics'], ['acdc.html', 'AC vs DC'], ['solar.html', 'Solar'], ['system.html', 'Size it'], ['multimeters.html', 'Multimeter'], ['safety.html', 'Safety']]
  var page = document.body.getAttribute('data-page') || ''
  var CUR = { home: 'index.html', basics: 'basics.html', acdc: 'acdc.html', solar: 'solar.html', system: 'system.html', multimeters: 'multimeters.html', safety: 'safety.html' }[page]

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) }
  function byId(id) { return document.getElementById(id) }
  function get(url) { return fetch(url).then(function (r) { if (!r.ok) throw new Error(url + ' ' + r.status); return r.json() }) }
  function fmt(n, d) { return Number(n).toLocaleString('en-US', { maximumFractionDigits: d === undefined ? 0 : d, minimumFractionDigits: d === undefined ? 0 : d }) }
  function clock(h) { var m = Math.round((h % 24) * 60); return String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0') }

  // ---- state in the address
  var DEFAULT = { l: null, p: 800, ah: 200, v: 12, c: 'lifepo4', sun: 4.5, inv: 2000, ov: {} }
  function readState(appliances) {
    var q = new URLSearchParams(location.search), s = Object.assign({}, DEFAULT)
    var on = appliances.filter(function (a) { return a.on }).map(function (a) { return a.id })
    if (q.has('l')) on = q.get('l') ? q.get('l').split('.').filter(function (id) { return appliances.some(function (a) { return a.id === id }) }) : []
    s.l = on
    ;[['p', 0, 5000], ['ah', 10, 5000], ['sun', 1, 8], ['inv', 100, 10000]].forEach(function (k) { var v = parseFloat(q.get(k[0])); if (isFinite(v) && v >= k[1] && v <= k[2]) s[k[0]] = v })
    s.ov = {}
    if (q.get('w')) q.get('w').split('.').forEach(function (kv) { var a = kv.split(':'), v = parseFloat(a[1]); if (appliances.some(function (x) { return x.id === a[0] }) && isFinite(v) && v > 0 && v <= 20000) s.ov[a[0]] = v })
    var v = parseInt(q.get('v'), 10); if ([12, 24, 48].indexOf(v) !== -1) s.v = v
    var c = q.get('c'); if (c === 'lead' || c === 'lifepo4') s.c = c
    return s
  }
  function writeQuery(s) { var w = Object.keys(s.ov || {}).map(function (k) { return k + ':' + s.ov[k] }).join('.'); return '?l=' + s.l.join('.') + '&p=' + s.p + '&ah=' + s.ah + '&v=' + s.v + '&c=' + s.c + '&sun=' + s.sun + '&inv=' + s.inv + (w ? '&w=' + w : '') }
  function carry(s) {
    document.querySelectorAll('header.site nav a, a.carry').forEach(function (a) { var u = a.getAttribute('href').split('?')[0]; if (/^[\w-]+\.html$/.test(u)) a.setAttribute('href', u + writeQuery(s)) })
    if (history.replaceState) history.replaceState(null, '', location.pathname + writeQuery(s))
  }

  function chrome() {
    var skip = document.createElement('a'); skip.className = 'skip'; skip.href = '#main'; skip.textContent = 'Skip to the content'; document.body.insertBefore(skip, document.body.firstChild)
    var h = document.createElement('header'); h.className = 'site'
    h.innerHTML = '<div class="wrap"><a class="brand" href="index.html"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M18 3 7 18h8l-2 11 11-15h-8z"/></svg>Off-grid electric</a><nav aria-label="Main">' + NAV.map(function (n) { return '<a href="' + n[0] + '"' + (n[0] === CUR ? ' aria-current="page"' : '') + '>' + esc(n[1]) + '</a>' }).join('') + '</nav></div>'
    document.body.insertBefore(h, skip.nextSibling)
    var f = document.createElement('footer'); f.className = 'site'
    f.innerHTML = '<div class="wrap"><p>Typical values, not a design for your installation. Wiring, fuses and battery banks must follow your local electrical code; read <a href="safety.html">Safety</a> first. No cookies, no analytics, no request to another site.</p><p><a href="https://github.com/SolutionsAsService/off-grid-electric">Source on GitHub</a> · MIT licence · Part of the <a href="https://demo.ultimatebusinessmachines.com/portfolio">Ultimate Business Machines</a> portfolio</p></div>'
    document.body.appendChild(f)
  }

  var boot = Promise.all([get('data/model.json'), get('data/appliances.json'), get('data/awg.json')]).then(function (r) {
    var G = { model: r[0], appliances: r[1], awg: r[2].rows, metric: r[2].metric, esc: esc, byId: byId, fmt: fmt, clock: clock, readState: readState, carry: carry, writeQuery: writeQuery, P: window.Power }
    chrome()
    document.querySelectorAll('.tblwrap').forEach(function (w) { var cap = w.querySelector('caption'); w.setAttribute('tabindex', '0'); w.setAttribute('role', 'region'); w.setAttribute('aria-label', cap ? cap.textContent : 'Table') })
    G.state = readState(G.appliances)
    G.effective = function () { return G.appliances.map(function (a) { return Object.assign({}, a, { w: G.state.ov[a.id] || a.w }) }) }
    carry(G.state)
    return G
  })
  window.OG = { boot: function (fn) { boot.then(fn).catch(function (e) { var p = document.createElement('p'); p.className = 'noscript wrap'; p.textContent = 'This page could not load its data: ' + e.message + '. Serve the folder over http (for example with python3 -m http.server).'; document.body.appendChild(p) }) } }
})()
