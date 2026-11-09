/* Landing: one battery through a modelled day. Appliances, panels, battery and sun hours go into Power.simulate (assets/power.js); the hero battery,
   the chart, the four checks and the purchase line are drawn from its output. Both pictures are drawn in real pixels, redrawn when their width
   changes, so their text is the size it is written. The page theme (--sun) follows the sun at the chosen time. Nothing is stored. */
OG.boot(function (G) {
  'use strict'
  var P = G.P, M = G.model, S = G.state, byId = G.byId, esc = G.esc, fmt = G.fmt, clock = G.clock, NS = 'http://www.w3.org/2000/svg'
  var STEP = 5, per = 60 / STEP, t = 12
  function el(parent, name, attrs, text) { var e = document.createElementNS(NS, name); Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]) }); if (text !== undefined) e.textContent = text; if (parent) parent.appendChild(e); return e }
  function chem() { return M.chemistries[S.c] }
  function nice(v) { var s = [100, 200, 300, 500, 800, 1000, 1500, 2000, 3000, 5000, 8000]; for (var i = 0; i < s.length; i++) if (s[i] >= v) return s[i]; return Math.ceil(v / 1000) * 1000 }
  function pct(x, floor) { var near = Math.abs(x - floor) < 0.03; return (x * 100).toFixed(near ? 1 : 0) + '%' }

  // ---- breakers
  var A = G.effective()
  var ul = byId('breakers')
  ul.innerHTML = G.appliances.map(function (a) {
    var hrs = a.to > a.from ? a.to - a.from : 24 - a.from + a.to, when = hrs >= 24 ? 'all day' : clock(a.from) + ' to ' + clock(a.to)
    return '<li><button type="button" role="switch" data-id="' + a.id + '" aria-checked="false" aria-labelledby="b-' + a.id + '" aria-describedby="n-' + a.id + '"><span class="sw" aria-hidden="true"></span><span><b id="b-' + a.id + '">' + esc(a.name) + '</b><small id="n-' + a.id + '"></small><small class="st" aria-hidden="true"></small></span></button></li>'
  }).join('')
  function paintBreakers() {
    A = G.effective()
    ul.querySelectorAll('button').forEach(function (b) {
      var a = A.filter(function (x) { return x.id === b.getAttribute('data-id') })[0], on = S.l.indexOf(a.id) !== -1
      var hrs = a.to > a.from ? a.to - a.from : 24 - a.from + a.to, when = hrs >= 24 ? 'all day' : clock(a.from) + ' to ' + clock(a.to)
      b.setAttribute('aria-checked', String(on)); b.querySelector('.st').textContent = on ? 'ON' : 'OFF'
      b.querySelector('small').textContent = fmt(a.w) + ' W · ' + when + (a.ac ? ' · AC' : ' · DC')
    })
  }
  ul.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; var id = b.getAttribute('data-id'), i = S.l.indexOf(id); if (i === -1) S.l.push(id); else S.l.splice(i, 1); update() })

  // ---- editable watts
  var ob = document.querySelector('#ovtbl tbody')
  ob.innerHTML = G.appliances.map(function (a) { return '<tr><th scope="row"><label for="ov-' + a.id + '">' + esc(a.name) + '</label></th><td><input id="ov-' + a.id + '" type="number" min="1" max="20000" step="1" value="' + a.w + '" data-id="' + a.id + '"></td></tr>' }).join('')
  ob.addEventListener('input', function (e) {
    var i = e.target, v = parseFloat(i.value), id = i.getAttribute('data-id'), def = G.appliances.filter(function (a) { return a.id === id })[0].w
    if (!isFinite(v) || v <= 0) { delete S.ov[id]; return }
    if (v === def) delete S.ov[id]; else S.ov[id] = Math.min(v, 20000)
    update()
  })

  // ---- knobs: a slider and a number field for each
  var KNOBS = [
    { id: 'p', label: 'Solar panels', min: 0, max: 3000, step: 50, unit: 'W', get: function () { return S.p }, set: function (v) { S.p = v }, text: function (v) { return fmt(v) + ' watts' } },
    { id: 'ah', label: 'Battery', min: 25, max: 1000, step: 25, unit: 'Ah', get: function () { return S.ah }, set: function (v) { S.ah = v }, text: function (v) { return fmt(v) + ' amp-hours, ' + fmt(v * S.v) + ' watt-hours' } },
    { id: 'sun', label: 'Peak sun hours', min: 1, max: 8, step: 0.5, unit: 'h', get: function () { return S.sun }, set: function (v) { S.sun = v }, text: function (v) { return v + ' hours' } },
    { id: 'inv', label: 'Inverter', min: M.inverter.ratingMin, max: M.inverter.ratingMax, step: 250, unit: 'W', get: function () { return S.inv }, set: function (v) { S.inv = v }, text: function (v) { return fmt(v) + ' watts' } }
  ]
  byId('knobs').innerHTML = KNOBS.map(function (k) { return '<div class="field"><label for="k-' + k.id + '">' + esc(k.label) + ' <output id="o-' + k.id + '"></output></label><div class="pair"><input id="k-' + k.id + '" type="range" min="' + k.min + '" max="' + k.max + '" step="' + k.step + '"><input id="n-' + k.id + '" type="number" min="' + k.min + '" max="' + (k.id === 'ah' ? 5000 : k.max * 2) + '" step="' + k.step + '" aria-label="' + esc(k.label) + ' in ' + k.unit + '"></div></div>' }).join('')
  KNOBS.forEach(function (k) {
    var r = byId('k-' + k.id), n = byId('n-' + k.id)
    r.addEventListener('input', function () { k.set(+r.value); update() })
    n.addEventListener('change', function () { var v = parseFloat(n.value); if (!isFinite(v) || v < k.min) { v = k.min } k.set(v); update() })
  })
  function paintKnobs() {
    KNOBS.forEach(function (k) { var v = k.get(), r = byId('k-' + k.id), n = byId('n-' + k.id); r.value = v; n.value = v; r.setAttribute('aria-valuetext', k.text(v)); byId('o-' + k.id).textContent = k.text(v).split(',')[0] })
    document.querySelectorAll('.chip[data-c]').forEach(function (c) { c.setAttribute('aria-pressed', String(c.getAttribute('data-c') === S.c)) })
    document.querySelectorAll('.chip[data-v]').forEach(function (c) { c.setAttribute('aria-pressed', String(+c.getAttribute('data-v') === S.v)) })
  }
  document.querySelectorAll('.chip[data-c]').forEach(function (c) { c.addEventListener('click', function () { S.c = c.getAttribute('data-c'); update() }) })
  document.querySelectorAll('.chip[data-v]').forEach(function (c) { c.addEventListener('click', function () { S.v = +c.getAttribute('data-v'); update() }) })

  // ---- simulation
  var sim, params, checks
  function build() {
    var ch = chem()
    params = { panelW: S.p, psh: S.sun, derate: M.derate, rise: M.sun.rise, set: M.sun.set, batV: S.v, batAh: S.ah, dod: ch.dod, chgEff: ch.chargeEfficiency, invEff: M.inverter.efficiency, invStandbyW: M.inverter.standbyW, loads: A.filter(function (a) { return S.l.indexOf(a.id) !== -1 }).map(function (a) { return { w: a.w, ac: a.ac, from: a.from, to: a.to } }) }
    sim = P.simulate(params, 3, STEP)
    checks = P.checks(params, sim, { maxC: ch.maxDischargeC, invRatingW: S.inv, watch: M.checks.watchFraction })
  }
  function idx() { return Math.min(sim.t.length - 1, Math.round(t * per)) }

  // ---- the hero battery (pixel drawing)
  var hero = byId('hero'), H = { w: 0 }, hg
  function layoutHero() {
    var W = Math.max(300, Math.round(hero.parentNode.clientWidth - 20)); if (W === H.w && hg) return false
    var small = W < 560, h = small ? 292 : 252
    H = { w: W, h: h, small: small }
    hero.setAttribute('viewBox', '0 0 ' + W + ' ' + h); hero.setAttribute('width', W); hero.setAttribute('height', h)
    while (hero.childNodes.length > 1) hero.removeChild(hero.lastChild)
    hg = el(hero, 'g')
    var nub = 10, bx, bw, by, bh, mid, px, py, ph = small ? 66 : 92, pw, lx, ly, lw, fL, fR
    if (!small) {
      var leftW = 132, rightW = 156, gap = 70
      bx = leftW + gap; bw = W - leftW - rightW - 2 * gap - nub; by = 36; bh = h - 36 - 66; mid = by + bh / 2
      px = 2; py = mid - ph / 2; pw = leftW - 2; lx = W - rightW; ly = py; lw = rightW - 2
      fL = 'M' + leftW + ' ' + mid + 'H' + bx; fR = 'M' + (bx + bw + nub) + ' ' + mid + 'H' + (W - rightW)
      H.lblL = el(hg, 'text', { x: leftW + gap / 2, y: mid - 14, 'text-anchor': 'middle' }, ''); H.lblR = el(hg, 'text', { x: bx + bw + nub + (W - rightW - bx - bw - nub) / 2, y: mid - 14, 'text-anchor': 'middle' }, '')
    } else {
      bx = 2; bw = W - 4 - nub; by = 112; bh = 88; mid = by + bh / 2
      px = 2; py = 2; pw = Math.floor(W / 2) - 30; lx = Math.floor(W / 2) + 28; ly = 2; lw = W - lx - 2
      var x1 = px + pw / 2, x2 = lx + lw / 2
      fL = 'M' + x1 + ' ' + (py + ph) + 'V' + by; fR = 'M' + x2 + ' ' + by + 'V' + (ly + ph)
      H.lblL = el(hg, 'text', { x: x1 + 8, y: 98, 'text-anchor': 'start' }, ''); H.lblR = el(hg, 'text', { x: x2 + 8, y: 98, 'text-anchor': 'start' }, '')
    }
    Object.assign(H, { bx: bx, bw: bw, by: by, bh: bh, mid: mid, nub: nub })
    H.wireL = el(hg, 'path', { class: 'wire', d: fL, 'stroke-width': 6 }); H.flowL = el(hg, 'path', { class: 'flow off', d: fL })
    H.wireR = el(hg, 'path', { class: 'wire', d: fR, 'stroke-width': 6 }); H.flowR = el(hg, 'path', { class: 'flow out off', d: fR })
    // panels and loads
    var cx = px + pw / 2 + 1, dx = lx + lw / 2
    el(hg, 'rect', { class: 'box', x: px, y: py, width: pw, height: ph }); el(hg, 'text', { class: 'nm', x: cx, y: py + 18 }, 'PANELS')
    H.pv = el(hg, 'text', { class: 'val', x: cx, y: py + (small ? 40 : 46) }, ''); H.pw = el(hg, 'text', { class: 'sub', x: cx, y: py + (small ? 58 : 66) }, '')
    el(hg, 'rect', { class: 'box', x: lx, y: ly, width: lw, height: ph }); el(hg, 'text', { class: 'nm', x: dx, y: ly + 18 }, 'LOADS')
    H.la = el(hg, 'text', { class: 'val', x: dx, y: ly + (small ? 38 : 44) }, ''); H.ld = el(hg, 'text', { class: 'sub', x: dx, y: ly + (small ? 54 : 64) }, ''); H.ln = el(hg, 'text', { class: 'warn', x: dx, y: ly + 82, 'text-anchor': 'middle' }, '')
    // battery
    H.cap = el(hg, 'text', { class: 'nml', x: bx, y: small ? by + bh + 78 : 22, 'text-anchor': 'start' }, '')
    H.shell = el(hg, 'rect', { class: 'shell', x: bx, y: by, width: bw, height: bh }); el(hg, 'rect', { class: 'nub', x: bx + bw, y: mid - 14, width: nub, height: 28 })
    H.fill = el(hg, 'rect', { class: 'fill', x: bx + 3, y: by + 3, width: 0, height: bh - 6 })
    for (var i = 1; i < 10; i++) el(hg, 'line', { class: 'cellline', x1: bx + 3 + (bw - 6) * i / 10, y1: by + 3, x2: bx + 3 + (bw - 6) * i / 10, y2: by + bh - 3 })
    H.floorL = el(hg, 'line', { class: 'floor', y1: by - 4, y2: by + bh + 6 }); H.floorT = el(hg, 'text', { y: by + bh + 22, 'text-anchor': 'middle' }, '')
    H.big = el(hg, 'text', { class: 'big', x: bx + 12, y: mid + 8 }, ''); H.bsub = el(hg, 'text', { class: 'bsub', x: bx + 12, y: mid + 30 }, '')
    H.net = el(hg, 'text', { class: 'note', x: small ? bx : bx + bw / 2, y: by + bh + (small ? 40 : 46), 'text-anchor': small ? 'start' : 'middle' }, '')
    H.min = el(hg, 'path', { class: 'minmark', d: 'M0 0' }); H.minT = el(hg, 'text', { class: 'note', x: bx + bw, y: by + bh + (small ? 58 : 46), 'text-anchor': small ? 'start' : 'end' }, '')
    if (small) H.minT.setAttribute('x', bx)
    return true
  }
  function flowW(w) { return Math.max(3, Math.min(16, Math.sqrt(Math.max(w, 0)) / 2.2)) }
  function setFlow(path, wire, w) { if (w < 1) { path.setAttribute('class', path.getAttribute('class').replace(/ ?off/, '') + ' off'); return } path.setAttribute('class', path.getAttribute('class').replace(/ ?off/, '')); var sw = flowW(w); path.setAttribute('stroke-width', sw.toFixed(1)); wire.setAttribute('stroke-width', Math.max(6, sw + 2).toFixed(1)); path.style.animationDuration = Math.max(0.35, 2.4 / (1 + w / 400)).toFixed(2) + 's' }
  function drawHero() {
    var i = idx(), small = H.small, soc = sim.soc[i], floor = sim.floor, solar = sim.solar[i], waste = sim.waste[i], used = solar - waste, bat = sim.batBus[i], dem = sim.load[i], served = sim.served[i]
    var ratio = dem > 0 ? served / dem : 1, ac = sim.ac[i] * ratio, dc = sim.dc[i] * ratio, dead = sim.unmet[i] > 0
    var iw = H.bw - 6
    H.fill.style.width = (iw * soc).toFixed(1) + 'px'; H.fill.setAttribute('class', 'fill' + (dead ? ' dead' : soc < floor ? ' low' : ''))
    H.shell.setAttribute('stroke', dead ? 'var(--danger)' : 'var(--ink)')
    var fx = H.bx + 3 + iw * floor; H.floorL.setAttribute('x1', fx); H.floorL.setAttribute('x2', fx); H.floorT.setAttribute('x', Math.min(Math.max(fx, H.bx + 44), H.bx + H.bw - 60)); if (small) H.floorT.setAttribute('y', H.by + H.bh + 22); H.floorT.textContent = 'safe floor ' + Math.round(floor * 100) + '%'
    H.big.textContent = (soc * 100).toFixed(0) + '%'; H.big.style.fontSize = (small ? 26 : 36) + 'px'; H.bsub.textContent = clock(t) + ' · of ' + fmt(sim.capWh) + ' Wh'
    H.cap.textContent = 'BATTERY · ' + chem().label + ' ' + S.v + ' V'
    H.net.textContent = Math.abs(bat) < 1 ? 'battery idle' : bat > 0 ? 'charging +' + fmt(bat) + ' W' : 'draining -' + fmt(-bat) + ' W'
    H.pv.textContent = fmt(used) + ' W'; H.pw.textContent = waste > 1 ? 'wasted ' + fmt(waste) + ' W' : 'of ' + fmt(solar) + ' W'; 
    H.la.textContent = (ac > 0 || dc > 0 ? 'AC ' + fmt(ac) + ' W' : 'idle'); H.ld.textContent = dc > 0 || ac > 0 ? 'DC ' + fmt(dc) + ' W' : ''; H.ln.textContent = dead ? 'NOT SERVED' : ''
    H.lblL.textContent = used > 1 ? '+' + fmt(used) + ' W' : ''; H.lblR.textContent = served > 1 ? '-' + fmt(served) + ' W' : ''
    setFlow(H.flowL, H.wireL, used); setFlow(H.flowR, H.wireR, served)
    // the day's lowest point
    var min = Math.min.apply(null, sim.soc), mi = sim.soc.indexOf(min), mx = H.bx + 3 + iw * min, bt = H.by + H.bh
    H.min.setAttribute('d', 'M' + mx + ' ' + (bt + 2) + 'l-7 11h14z'); H.minT.textContent = 'lowest of the day: ' + pct(min, floor) + ' at ' + clock(sim.t[mi])
    byId('hero-title').textContent = 'Battery at ' + clock(t) + ': ' + (soc * 100).toFixed(0) + '% full, ' + (Math.abs(bat) < 1 ? 'idle' : bat > 0 ? 'charging ' + fmt(bat) + ' watts' : 'draining ' + fmt(-bat) + ' watts') + '. Solar used ' + fmt(used) + ' watts, loads served ' + fmt(served) + ' watts' + (dead ? ', loads not served' : '') + '.'
    var sx = Math.max(0, Math.sin(Math.PI * (t - M.sun.rise) / (M.sun.set - M.sun.rise)))
    document.documentElement.style.setProperty('--sun', (t > M.sun.rise && t < M.sun.set ? sx : 0).toFixed(3))
  }

  // ---- the chart (pixel drawing, a fixed power scale for the chosen panels)
  var chart = byId('chart'), K = { w: 0 }, kg
  function layoutChart() {
    var W = Math.max(300, Math.round(chart.parentNode.clientWidth)); if (W === K.w && kg) return false
    var h = W < 520 ? 300 : 320
    var top = W < 520 ? 50 : 28
    K = { w: W, h: h, x0: 46, x1: W - 6, tTop: top, tBot: Math.round(h * 0.55), sTop: Math.round(h * 0.55) + 30, sBot: h - 28 }
    chart.setAttribute('viewBox', '0 0 ' + W + ' ' + h); chart.setAttribute('width', W); chart.setAttribute('height', h)
    while (chart.childNodes.length > 1) chart.removeChild(chart.lastChild)
    kg = el(chart, 'g'); return true
  }
  function X(h) { return K.x0 + (K.x1 - K.x0) * h / 24 }
  function drawChart() {
    while (kg.firstChild) kg.removeChild(kg.firstChild)
    var n = sim.t.length, peakSolar = Math.max.apply(null, sim.solar), maxW = nice(Math.max(peakSolar * 1.12, 100))
    function Yw(w) { return K.tBot - (K.tBot - K.tTop) * Math.min(w, maxW) / maxW }
    function Ys(f) { return K.sBot - (K.sBot - K.sTop) * f }
    el(kg, 'rect', { class: 'night', x: K.x0, y: K.tTop, width: X(M.sun.rise) - K.x0, height: K.tBot - K.tTop }); el(kg, 'rect', { class: 'night', x: X(M.sun.set), y: K.tTop, width: K.x1 - X(M.sun.set), height: K.tBot - K.tTop })
    el(kg, 'text', { x: X(3), y: K.tTop + 14, 'text-anchor': 'middle' }, 'night'); el(kg, 'text', { x: X(21), y: K.tTop + 14, 'text-anchor': 'middle' }, 'night')
    ;[0, 0.5, 1].forEach(function (f) { var y = K.tBot - (K.tBot - K.tTop) * f; el(kg, 'line', { class: f === 0 ? 'ax' : 'grid', x1: K.x0, y1: y, x2: K.x1, y2: y }); el(kg, 'text', { x: K.x0 - 6, y: y + 4, 'text-anchor': 'end' }, fmt(maxW * f)) })
    ;[0, 50, 100].forEach(function (p) { var y = Ys(p / 100); el(kg, 'line', { class: p === 0 ? 'ax' : 'grid', x1: K.x0, y1: y, x2: K.x1, y2: y }); el(kg, 'text', { x: K.x0 - 6, y: y + 4, 'text-anchor': 'end' }, p + '%') })
    for (var h = 0; h <= 24; h += 6) { el(kg, 'line', { class: 'ax', x1: X(h), y1: K.sBot, x2: X(h), y2: K.sBot + 6 }); el(kg, 'text', { x: X(h), y: K.sBot + 20, 'text-anchor': h === 0 ? 'start' : h === 24 ? 'end' : 'middle' }, String(h).padStart(2, '0') + ':00') }
    // potential sun (light) and the part that is used (solid); the rest is wasted
    var d = 'M' + X(0) + ' ' + K.tBot, d2 = d, i
    for (i = 0; i < n; i++) { d += ' L' + X(sim.t[i]).toFixed(1) + ' ' + Yw(sim.solar[i]).toFixed(1); d2 += ' L' + X(sim.t[i]).toFixed(1) + ' ' + Yw(sim.solar[i] - sim.waste[i]).toFixed(1) }
    el(kg, 'path', { class: 'pot', d: d + ' L' + X(24) + ' ' + K.tBot + ' Z' }); el(kg, 'path', { class: 'used', d: d2 + ' L' + X(24) + ' ' + K.tBot + ' Z' })
    // load demand, clipped to the scale with its peak labelled
    d = ''; for (i = 0; i < n; i++) d += (i ? ' L' : 'M') + X(sim.t[i]).toFixed(1) + ' ' + Yw(sim.load[i]).toFixed(1)
    el(kg, 'path', { class: 'load', d: d })
    var peak = Math.max.apply(null, sim.load), pi = sim.load.indexOf(peak)
    if (peak > maxW) el(kg, 'text', { class: 'lab', x: K.x1, y: K.w < 520 ? 38 : 18, 'text-anchor': 'end' }, 'load peaks at ' + fmt(peak) + ' W ▲')
    // battery charge, floor, blackouts
    d = 'M' + X(0) + ' ' + K.sBot; for (i = 0; i < n; i++) d += ' L' + X(sim.t[i]).toFixed(1) + ' ' + Ys(sim.soc[i]).toFixed(1)
    el(kg, 'path', { class: 'soc', d: d + ' L' + X(24) + ' ' + K.sBot + ' Z' })
    var fy = Ys(sim.floor); el(kg, 'line', { class: 'floorl', x1: K.x0, y1: fy, x2: K.x1, y2: fy }); el(kg, 'text', { class: 'labd', x: K.x1 - 4, y: fy - 5, 'text-anchor': 'end' }, 'safe floor ' + Math.round(sim.floor * 100) + '%')
    var start = -1, first = true
    for (i = 0; i <= n; i++) { var dead = i < n && sim.unmet[i] > 0; if (dead && start < 0) start = i; if (!dead && start >= 0) { el(kg, 'rect', { class: 'dead', x: X(sim.t[start]), y: K.sTop, width: Math.max(3, X(sim.t[i - 1] + STEP / 60) - X(sim.t[start])), height: K.sBot - K.sTop }); if (first) { el(kg, 'text', { class: 'labd', x: Math.min(X(sim.t[start]) + 4, K.x1 - 70), y: K.sBot - 6 }, 'NO POWER'); first = false } start = -1 } }
    // direct labels
    var lx = K.x0 + 8; el(kg, 'rect', { x: lx, y: 9, width: 10, height: 10, fill: 'var(--volt)' }); el(kg, 'text', { class: 'labs', x: lx + 14, y: 18 }, 'solar used'); el(kg, 'rect', { x: lx + 96, y: 9, width: 10, height: 10, fill: 'var(--volt)', opacity: 0.3 }); el(kg, 'text', { x: lx + 110, y: 18 }, 'wasted'); el(kg, 'line', { x1: lx + 168, y1: 14, x2: lx + 184, y2: 14, stroke: 'var(--ink)', 'stroke-width': 3 }); el(kg, 'text', { class: 'lab', x: lx + 188, y: 18 }, 'load')
    el(kg, 'text', { class: 'labc', x: K.x0 + 6, y: K.sTop + 14 }, 'battery charge'); el(kg, 'text', { x: K.x1, y: K.tTop - 12 + 0, 'text-anchor': 'end', opacity: 0 }, '')
    // cursor and dots
    K.cur = el(kg, 'line', { class: 'cur', y1: K.tTop, y2: K.sBot }); K.dots = [el(kg, 'circle', { class: 'dot', r: 5 }), el(kg, 'circle', { class: 'dot', r: 5 }), el(kg, 'circle', { class: 'dot', r: 5 })]
    K.maxW = maxW; K.Yw = Yw; K.Ys = Ys
    cursor()
  }
  function cursor() {
    var i = idx(), x = X(sim.t[i])
    K.cur.setAttribute('x1', x); K.cur.setAttribute('x2', x)
    K.dots[0].setAttribute('cx', x); K.dots[0].setAttribute('cy', K.Yw(sim.solar[i])); K.dots[1].setAttribute('cx', x); K.dots[1].setAttribute('cy', K.Yw(sim.load[i])); K.dots[2].setAttribute('cx', x); K.dots[2].setAttribute('cy', K.Ys(sim.soc[i]))
    byId('now').innerHTML = '<b>' + clock(t) + '</b> · solar ' + fmt(sim.solar[i]) + ' W · load ' + fmt(sim.load[i]) + ' W · battery ' + (sim.soc[i] * 100).toFixed(0) + '%'
    byId('to').textContent = clock(t); byId('t').setAttribute('aria-valuetext', clock(t))
    chart.querySelector('title').textContent = 'The modelled day as a chart. At ' + clock(t) + ': solar ' + fmt(sim.solar[i]) + ' watts, load ' + fmt(sim.load[i]) + ' watts, battery ' + (sim.soc[i] * 100).toFixed(0) + ' percent.'
    drawHero()
  }

  // ---- verdict, checks, purchase line
  var text = '', annT = 0
  function verdict() {
    var tot = sim.totals, v = byId('verdict'), fl = sim.floor, mi = sim.soc.indexOf(Math.min.apply(null, sim.soc)), fd = sim.unmet.findIndex(function (u) { return u > 0 })
    var L = checks.label, msg
    if (L === 'IDLE') msg = 'Nothing is switched on. Flip a breaker.'
    else if (L === 'NO POWER') msg = 'The battery runs empty from ' + clock(sim.t[fd]) + ' and the loads are off for ' + fmt(tot.blackoutH, 1) + ' hours of the day.'
    else if (L === 'OVERLOAD') msg = checks.current.state === 'fail' ? 'The energy works out, but at the busiest moment the loads pull ' + fmt(checks.current.amps) + ' A from the battery, above the ' + fmt(checks.current.limitA) + ' A it can supply.' : 'The energy works out, but the AC loads reach ' + fmt(checks.inverter.peakAcW) + ' W, above the ' + fmt(S.inv) + ' W inverter.'
    else if (L === 'NEAR LIMIT') msg = 'The energy works out and nothing fails, but the busiest moment is close to a limit: ' + (checks.current.state === 'watch' ? fmt(checks.current.amps) + ' A from a battery rated for ' + fmt(checks.current.limitA) + ' A' : fmt(checks.inverter.peakAcW) + ' W on a ' + fmt(S.inv) + ' W inverter') + '. Real equipment has surge and ageing on top.'
    else if (L === 'TOO DEEP') msg = 'The loads stay powered, but the battery falls to ' + pct(tot.minSoc, fl) + ' at ' + clock(sim.t[mi]) + ', below its ' + Math.round(fl * 100) + '% safe floor. That shortens its life.'
    else msg = 'On paper the energy balance holds: the battery is lowest at ' + clock(sim.t[mi]) + ' at ' + pct(tot.minSoc, fl) + ' (safe floor ' + Math.round(fl * 100) + '%).'
    var cls = L === 'NO POWER' || L === 'OVERLOAD' ? 'fail' : L === 'TOO DEEP' || L === 'NEAR LIMIT' ? 'watch' : ''
    v.className = 'verdict' + (cls ? ' ' + cls : '')
    byId('vtext').innerHTML = '<span class="tag' + (cls ? ' ' + cls : '') + '">' + L + '</span>' + esc(msg)
    function row(name, c, textv) { var s = c.state === 'ok' ? 'OK' : c.state === 'watch' ? 'WATCH' : 'FAIL'; return '<li><span class="tag' + (c.state === 'ok' ? '' : ' ' + c.state) + '">' + s + '</span><b>' + name + '</b> ' + esc(textv) + '</li>' }
    byId('checks').innerHTML = S.l.length ? row('Energy', checks.energy, checks.energy.state === 'ok' ? 'every load is served all day' : fmt(checks.energy.unmetWh) + ' Wh a day goes unserved') + row('Depth', checks.depth, checks.depth.state === 'fail' ? 'the battery runs empty' : 'lowest ' + pct(checks.depth.minSoc, fl) + ' against a ' + Math.round(fl * 100) + '% floor') + row('Battery current', checks.current, 'peak ' + fmt(checks.current.amps) + ' A of ' + fmt(checks.current.limitA) + ' A (' + chem().maxDischargeC + 'C, typical)') + row('Inverter', checks.inverter, 'peak AC ' + fmt(checks.inverter.peakAcW) + ' W of ' + fmt(S.inv) + ' W') : ''
    var on = A.filter(function (a) { return S.l.indexOf(a.id) !== -1 }).map(function (a) { return { w: a.w, hours: a.to > a.from ? a.to - a.from : 24 - a.from + a.to, ac: a.ac } })
    var dayBus = P.dailyWh(on, M.inverter.efficiency) + (on.some(function (l) { return l.ac }) ? M.inverter.standbyW * 24 : 0)
    var rec = P.recommend(dayBus, S.sun, M.derate, M.sizing.margin, M.sizing.autonomyDays, chem().dod, S.v)
    byId('buy').innerHTML = S.l.length ? 'What to buy for these loads, with ' + M.sizing.autonomyDays + ' days of cloud covered: about <b>' + fmt(P.roundUp(rec.panelW, 50)) + ' W</b> of panels and <b>' + fmt(P.roundUp(rec.batteryAh, 25)) + ' Ah</b> at ' + S.v + ' V (you have ' + fmt(S.p) + ' W and ' + fmt(S.ah) + ' Ah). The simulation above covers one clear day, so it can say OK while this says more. <a class="carry" href="system.html">Size it</a> shows the arithmetic.' : ''
    byId('vnums').textContent = 'Panels make ' + fmt(tot.gen) + ' Wh a day; loads use ' + fmt(tot.load) + ' Wh a day' + (tot.wasted > 0 ? '; ' + fmt(tot.wasted) + ' Wh of sun is wasted because the battery is full' : '') + '. Modelled for day 3 of 3, starting full.'
    byId('unchecked').textContent = 'Not checked here: wire size, fuses, surge current, panel string voltage, temperature, battery age. A green result is not a design; see Safety.'
    var msgText = L + '. ' + msg
    clearTimeout(annT); annT = setTimeout(function () { if (msgText !== text) { text = msgText; byId('announce').textContent = msgText } }, 700)
  }
  function table() {
    byId('daytbl').querySelector('tbody').innerHTML = sim.t.map(function (h, i) { return i % 24 === 0 ? '<tr><th scope="row">' + clock(h) + '</th><td class="n">' + fmt(sim.solar[i]) + '</td><td class="n">' + fmt(sim.load[i]) + '</td><td class="n">' + (sim.soc[i] * 100).toFixed(0) + '</td></tr>' : '' }).join('')
  }

  function update() { build(); paintBreakers(); paintKnobs(); G.carry(S); layoutHero(); layoutChart(); drawChart(); verdict(); table() }

  // ---- time of day
  var tIn = byId('t'), playing = 0, raf = 0, playBtn = byId('play'), pauseBtn = byId('pause')
  tIn.addEventListener('input', function () { t = +tIn.value; cursor() })
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduce) { playBtn.hidden = true; pauseBtn.hidden = true }
  playBtn.addEventListener('click', function () {
    if (playing) { playing = 0; cancelAnimationFrame(raf); playBtn.textContent = 'Play the day'; return }
    playing = 1; playBtn.textContent = 'Stop'; var last = performance.now(); if (t >= 24) t = 0
    ;(function frame(now) { t += (now - last) / 1000 * 2; last = now; if (t >= 24) { t = 24; playing = 0; playBtn.textContent = 'Play the day'; tIn.value = t; cursor(); return } tIn.value = t; cursor(); raf = requestAnimationFrame(frame) })(last)
  })
  pauseBtn.addEventListener('click', function () { var on = pauseBtn.getAttribute('aria-pressed') !== 'true'; pauseBtn.setAttribute('aria-pressed', String(on)); hero.classList.toggle('paused', on) })
  if (window.ResizeObserver) new ResizeObserver(function () { var a = layoutHero(), b = layoutChart(); if (a || b) { if (b) drawChart(); else cursor(); drawHero() } }).observe(document.querySelector('.stage'))

  // ---- assumptions and tiles
  var ch1 = M.chemistries.lifepo4, ch2 = M.chemistries.lead
  var rows = [
    ['Peak sun hours', M.sun.psh + ' h', 'Set by the slider; 3 to 6 is common, your place and season decide.'],
    ['Panel derate', Math.round(M.derate * 100) + '%', 'Real output after heat, dust, wiring and charger losses, against the label.'],
    ['Sunrise and sunset', M.sun.rise + ':00 and ' + M.sun.set + ':00', 'The sun is modelled as a smooth half-sine between these hours, not measured data.'],
    ['Inverter efficiency', Math.round(M.inverter.efficiency * 100) + '%', 'AC loads cost 1 / 0.9 times their watts at the battery.'],
    ['Inverter standby', M.inverter.standbyW + ' W', 'Counted all day when any AC load is switched on.'],
    ['LiFePO4', Math.round(ch1.dod * 100) + '% usable, ' + Math.round(ch1.chargeEfficiency * 100) + '% charge efficiency, ' + ch1.maxDischargeC + 'C', 'The C figure is the typical continuous discharge limit as a multiple of capacity; your battery\'s datasheet decides.'],
    ['Lead-acid', Math.round(ch2.dod * 100) + '% usable, ' + Math.round(ch2.chargeEfficiency * 100) + '% charge efficiency, ' + ch2.maxDischargeC + 'C', 'Deeper discharge shortens lead-acid life; it also sags under heavy current.'],
    ['Sizing rule', M.sizing.margin + 'x margin, ' + M.sizing.autonomyDays + ' days', 'Panels 25% over the daily need; the battery covers two days with no sun.']
  ]
  document.querySelector('#assume tbody').innerHTML = rows.map(function (r) { return '<tr><th scope="row">' + esc(r[0]) + '</th><td class="n">' + esc(r[1]) + '</td><td>' + esc(r[2]) + '</td></tr>' }).join('')
  var tiles = [['basics.html', 'Basics', 'Volts, amps, ohms and watts, with calculators you can try'], ['solar.html', 'Solar', 'Panel ratings, strings, and why cold weather raises voltage'], ['system.html', 'Size it', 'Loads to panels, battery, wire and fuse, with the arithmetic shown'], ['multimeters.html', 'Multimeter', 'What every setting measures, and the readings to expect'], ['safety.html', 'Safety', 'The limits of this guide, and what to hand to a professional']]
  byId('tiles').innerHTML = tiles.map(function (x) { return '<li><a class="carry" href="' + x[0] + '"><b>' + esc(x[1]) + '</b><span>' + esc(x[2]) + '</span></a></li>' }).join('')

  update(); G.carry(S)
})
