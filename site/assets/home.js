/* Landing: a modelled day. Appliances (breakers), panels, battery and sun hours go into Power.simulate (assets/power.js); the chart, the circuit
   strip and the verdict are drawn from its output. The page theme (--sun) follows the sun at the chosen time of day. Nothing is stored. */
OG.boot(function (G) {
  'use strict'
  var P = G.P, M = G.model, A = G.appliances, S = G.state, byId = G.byId, esc = G.esc, fmt = G.fmt, clock = G.clock, NS = 'http://www.w3.org/2000/svg'
  var C = { x0: 84, x1: 708, tTop: 14, tBot: 150, sTop: 184, sBot: 262, axis: 296 }
  var STEP = 5, per = 60 / STEP, t = 12
  function el(name, attrs, text) { var e = document.createElementNS(NS, name); Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]) }); if (text !== undefined) e.textContent = text; return e }
  function X(h) { return C.x0 + (C.x1 - C.x0) * h / 24 }
  function chem() { return M.chemistries[S.c] }

  // ---- breakers
  var ul = byId('breakers')
  ul.innerHTML = A.map(function (a) {
    var hrs = a.to > a.from ? a.to - a.from : 24 - a.from + a.to, when = hrs >= 24 ? 'all day' : clock(a.from) + ' to ' + clock(a.to)
    return '<li><button type="button" role="switch" data-id="' + a.id + '" aria-checked="false" aria-describedby="n-' + a.id + '"><span class="sw" aria-hidden="true"></span><span><b>' + esc(a.name) + '</b><small id="n-' + a.id + '">' + fmt(a.w) + ' W · ' + when + (a.ac ? ' · AC' : ' · DC') + '</small><small class="st"></small></span></button></li>'
  }).join('')
  function paintBreakers() {
    ul.querySelectorAll('button').forEach(function (b) { var on = S.l.indexOf(b.getAttribute('data-id')) !== -1; b.setAttribute('aria-checked', String(on)); b.querySelector('.st').textContent = on ? 'ON' : 'OFF' })
  }
  ul.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return
    var id = b.getAttribute('data-id'), i = S.l.indexOf(id)
    if (i === -1) S.l.push(id); else S.l.splice(i, 1)
    update()
  })

  // ---- knobs
  var pw = byId('pw'), ah = byId('ah'), sun = byId('sun')
  pw.value = S.p; ah.value = S.ah; sun.value = S.sun
  function paintKnobs() {
    byId('pwo').textContent = fmt(S.p) + ' W'; byId('aho').textContent = fmt(S.ah) + ' Ah at ' + S.v + ' V = ' + fmt(S.ah * S.v) + ' Wh'; byId('suno').textContent = S.sun + ' h'
    document.querySelectorAll('.chip[data-c]').forEach(function (c) { c.setAttribute('aria-pressed', String(c.getAttribute('data-c') === S.c)) })
    document.querySelectorAll('.chip[data-v]').forEach(function (c) { c.setAttribute('aria-pressed', String(+c.getAttribute('data-v') === S.v)) })
  }
  pw.addEventListener('input', function () { S.p = +pw.value; update() })
  ah.addEventListener('input', function () { S.ah = +ah.value; update() })
  sun.addEventListener('input', function () { S.sun = +sun.value; update() })
  document.querySelectorAll('.chip[data-c]').forEach(function (c) { c.addEventListener('click', function () { S.c = c.getAttribute('data-c'); update() }) })
  document.querySelectorAll('.chip[data-v]').forEach(function (c) { c.addEventListener('click', function () { S.v = +c.getAttribute('data-v'); update() }) })

  // ---- chart skeleton
  var chart = byId('chart'), g = el('g')
  var night = el('rect', { class: 'night', x: C.x0, y: C.tTop, width: 0, height: C.tBot - C.tTop }); g.appendChild(night)
  var night2 = el('rect', { class: 'night', x: C.x0, y: C.tTop, width: 0, height: C.tBot - C.tTop }); g.appendChild(night2)
  var yl = []
  ;[0, 0.5, 1].forEach(function (f) { var y = C.tBot - (C.tBot - C.tTop) * f; g.appendChild(el('line', { class: f === 0 ? 'ax' : 'grid', x1: C.x0, y1: y, x2: C.x1, y2: y })); var l = el('text', { x: C.x0 - 8, y: y + 7, 'text-anchor': 'end' }, ''); g.appendChild(l); yl.push(l) })
  ;[0, 50, 100].forEach(function (p) { var y = C.sBot - (C.sBot - C.sTop) * p / 100; g.appendChild(el('line', { class: p === 0 ? 'ax' : 'grid', x1: C.x0, y1: y, x2: C.x1, y2: y })); g.appendChild(el('text', { x: C.x0 - 8, y: y + 7, 'text-anchor': 'end' }, p + '%')) })
  for (var h = 0; h <= 24; h += 6) { g.appendChild(el('line', { class: 'ax', x1: X(h), y1: C.sBot, x2: X(h), y2: C.sBot + 8 })); g.appendChild(el('text', { x: X(h), y: C.axis, 'text-anchor': h === 0 ? 'start' : h === 24 ? 'end' : 'middle' }, String(h).padStart(2, '0'))) }
  var solarP = el('path', { class: 'solar' }), loadP = el('path', { class: 'load' }), socP = el('path', { class: 'soc' }), floorL = el('line', { class: 'floor', x1: C.x0, x2: C.x1 })
  var floorT = el('text', { class: 'labd', x: C.x1 - 4, 'text-anchor': 'end' }, ''), deadG = el('g'), curL = el('line', { class: 'cur', y1: C.tTop, y2: C.sBot })
  ;[solarP, loadP, socP, floorL, floorT, deadG].forEach(function (n) { g.appendChild(n) })
  g.appendChild(el('text', { class: 'labs', x: C.x0 + 56, y: C.tTop + 22 }, 'Solar (W)')); g.appendChild(el('text', { class: 'lab', x: C.x0 + 200, y: C.tTop + 22 }, 'Load (W)'))
  g.appendChild(el('text', { class: 'labc', x: C.x0 + 6, y: C.sTop + 22 }, 'Battery charge'))
  g.appendChild(curL)
  var dots = ['solar', 'load', 'soc'].map(function () { var d = el('circle', { class: 'dot', r: 7 }); g.appendChild(d); return d })
  chart.appendChild(g)

  function nice(v) { var s = [50, 100, 200, 300, 500, 800, 1000, 1500, 2000, 3000, 4000, 6000]; for (var i = 0; i < s.length; i++) if (s[i] >= v) return s[i]; return Math.ceil(v / 1000) * 1000 }

  // ---- circuit strip skeleton
  var sch = byId('schem'), sg = el('g'), nodes = {}, flows = {}
  var BOX = { panels: [4, 8, 116, 44, 'PANELS'], charger: [150, 8, 120, 44, 'CHARGER'], battery: [300, 8, 120, 44, 'BATTERY'], inverter: [470, 8, 120, 44, 'INVERTER'], acl: [620, 8, 96, 44, 'AC LOAD'], dcl: [470, 90, 120, 44, 'DC LOAD'] }
  var WIRE = { w1: 'M120 30H150', w2: 'M270 30H300', w3: 'M420 30H470', w4: 'M590 30H620', w5: 'M360 52V112H470' }
  Object.keys(WIRE).forEach(function (k) { sg.appendChild(el('path', { class: 'wire', d: WIRE[k] })); var f = el('path', { class: 'flow off', d: WIRE[k] }); sg.appendChild(f); flows[k] = f })
  Object.keys(BOX).forEach(function (k) { var b = BOX[k]; var r = el('rect', { class: 'box', x: b[0], y: b[1], width: b[2], height: b[3] }); sg.appendChild(r); nodes[k] = { box: r, val: el('text', { class: 'wv', x: b[0] + b[2] / 2, y: b[1] + b[3] + 26 }, '') }; sg.appendChild(el('text', { class: 'nm', x: b[0] + b[2] / 2, y: b[1] + b[3] / 2 + 7 }, b[4])); sg.appendChild(nodes[k].val) })
  
  sch.appendChild(sg)

  function setFlow(k, watts) { var f = flows[k]; if (watts < 1) { f.setAttribute('class', 'flow off'); return } f.setAttribute('class', 'flow'); f.style.animationDuration = Math.max(0.3, 3 / (1 + watts / 120)).toFixed(2) + 's' }

  // ---- compute and draw
  var sim, params, annT = 0
  function loadsOn() { return A.filter(function (a) { return S.l.indexOf(a.id) !== -1 }) }
  function build() {
    var ch = chem()
    params = { panelW: S.p, psh: S.sun, derate: M.derate, rise: M.sun.rise, set: M.sun.set, batV: S.v, batAh: S.ah, dod: ch.dod, chgEff: ch.chargeEfficiency, invEff: M.inverter.efficiency, invStandbyW: M.inverter.standbyW, loads: loadsOn().map(function (a) { return { w: a.w, ac: a.ac, from: a.from, to: a.to } }) }
    sim = P.simulate(params, 3, STEP)
  }
  function draw() {
    var n = sim.t.length, tot = sim.totals
    var maxW = nice(Math.max.apply(null, sim.solar.concat(sim.load)) * 1.08 || 100)
    function Yw(w) { return C.tBot - (C.tBot - C.tTop) * w / maxW }
    function Ys(f) { return C.sBot - (C.sBot - C.sTop) * f }
    ;[0, 0.5, 1].forEach(function (f, i) { yl[i].textContent = fmt(maxW * f) })
    night.setAttribute('width', X(M.sun.rise) - C.x0); night2.setAttribute('x', X(M.sun.set)); night2.setAttribute('width', C.x1 - X(M.sun.set))
    var d = 'M' + X(0) + ' ' + C.tBot; for (var i = 0; i < n; i++) d += ' L' + X(sim.t[i]).toFixed(1) + ' ' + Yw(sim.solar[i]).toFixed(1); solarP.setAttribute('d', d + ' L' + X(24) + ' ' + C.tBot + ' Z')
    d = ''; for (i = 0; i < n; i++) { var x = X(sim.t[i]).toFixed(1), y = Yw(sim.load[i]).toFixed(1); d += (i ? ' L' : 'M') + x + ' ' + y }; loadP.setAttribute('d', d)
    d = 'M' + X(0) + ' ' + C.sBot; for (i = 0; i < n; i++) d += ' L' + X(sim.t[i]).toFixed(1) + ' ' + Ys(sim.soc[i]).toFixed(1); socP.setAttribute('d', d + ' L' + X(24) + ' ' + C.sBot + ' Z')
    var fy = Ys(sim.floor); floorL.setAttribute('y1', fy); floorL.setAttribute('y2', fy); floorT.setAttribute('y', fy - 8); floorT.textContent = 'safe floor ' + Math.round(sim.floor * 100) + '%'
    while (deadG.firstChild) deadG.removeChild(deadG.firstChild)
    var start = -1, first = true
    for (i = 0; i <= n; i++) {
      var dead = i < n && sim.unmet[i] > 0
      if (dead && start < 0) start = i
      if (!dead && start >= 0) { deadG.appendChild(el('rect', { class: 'dead', x: X(sim.t[start]), y: C.sTop, width: Math.max(3, X(sim.t[i - 1] + STEP / 60) - X(sim.t[start])), height: C.sBot - C.sTop })); if (first) { deadG.appendChild(el('text', { class: 'labd', x: X(sim.t[start]) + 6, y: C.sBot - 8 }, 'NO POWER')); first = false }; start = -1 }
    }
    cursor(maxW, Yw, Ys)
    verdict()
  }
  function cursor(maxW, Yw, Ys) {
    var n = sim.t.length, idx = Math.min(n - 1, Math.round(t * per)), nxt = (idx + 1) % n, x = X(sim.t[idx])
    curL.setAttribute('x1', x); curL.setAttribute('x2', x)
    dots[0].setAttribute('cx', x); dots[0].setAttribute('cy', (Yw || function (w) { return C.tBot - (C.tBot - C.tTop) * w / nice(Math.max.apply(null, sim.solar.concat(sim.load)) * 1.08 || 100) })(sim.solar[idx]))
    dots[1].setAttribute('cx', x); dots[1].setAttribute('cy', (Yw || function (w) { return C.tBot - (C.tBot - C.tTop) * w / nice(Math.max.apply(null, sim.solar.concat(sim.load)) * 1.08 || 100) })(sim.load[idx]))
    dots[2].setAttribute('cx', x); dots[2].setAttribute('cy', C.sBot - (C.sBot - C.sTop) * sim.soc[idx])
    byId('to').textContent = clock(t)
    // the circuit at this time
    var hr = sim.t[idx], ac = 0, dc = 0
    loadsOn().forEach(function (a) { var on = a.from <= a.to ? (hr >= a.from && hr < a.to) : (hr >= a.from || hr < a.to); if (on) { if (a.ac) ac += a.w; else dc += a.w } })
    var solar = sim.solar[idx], inv = ac ? ac / params.invEff + params.invStandbyW : 0, bat = (sim.soc[nxt] - sim.soc[idx]) * sim.capWh * 60 / STEP
    if (idx === n - 1) bat = (sim.soc[0] - sim.soc[idx]) * sim.capWh * per
    nodes.panels.val.textContent = fmt(solar) + ' W'; nodes.charger.val.textContent = fmt(solar) + ' W'
    nodes.battery.val.textContent = (Math.abs(bat) < 1 ? 'idle' : bat > 0 ? '+' + fmt(bat) + ' W' : '-' + fmt(-bat) + ' W')
    nodes.inverter.val.textContent = fmt(inv) + ' W in'; nodes.acl.val.textContent = fmt(ac) + ' W'; nodes.dcl.val.textContent = fmt(dc) + ' W'
    setFlow('w1', solar); setFlow('w2', solar); setFlow('w3', inv); setFlow('w4', ac); setFlow('w5', dc)
    nodes.battery.box.setAttribute('class', 'box' + (Math.abs(bat) >= 1 ? ' act' : ''))
    var sx = Math.max(0, Math.sin(Math.PI * (t - M.sun.rise) / (M.sun.set - M.sun.rise)))
    document.documentElement.style.setProperty('--sun', (t > M.sun.rise && t < M.sun.set ? sx : 0).toFixed(3))
    schemTitle(solar, inv, bat, ac, dc)
  }
  function schemTitle(solar, inv, bat, ac, dc) { byId('schem-title').textContent = 'Circuit at ' + clock(t) + ': panels ' + fmt(solar) + ' W, battery ' + (Math.abs(bat) < 1 ? 'idle' : bat > 0 ? 'charging ' + fmt(bat) + ' W' : 'discharging ' + fmt(-bat) + ' W') + ', AC load ' + fmt(ac) + ' W, DC load ' + fmt(dc) + ' W' }

  var text = ''
  function verdict() {
    var tot = sim.totals, v = byId('verdict'), floorPct = Math.round(sim.floor * 100), minPct = Math.round(tot.minSoc * 100)
    var minIdx = sim.soc.indexOf(Math.min.apply(null, sim.soc)), firstDead = sim.unmet.findIndex(function (u) { return u > 0 })
    var tag, cls, msg
    if (!S.l.length) { cls = ''; tag = 'IDLE'; msg = 'Nothing is switched on. Flip a breaker.' }
    else if (tot.unmet > 0) { cls = 'bad'; tag = 'NO POWER'; msg = 'The battery runs empty from ' + clock(sim.t[firstDead]) + ' for ' + fmt(tot.blackoutH, 1) + ' hours of the day.' }
    else if (tot.minSoc < sim.floor) { cls = 'warn'; tag = 'TOO DEEP'; msg = 'The lights stay on, but the battery falls to ' + minPct + '% at ' + clock(sim.t[minIdx]) + ', below its ' + floorPct + '% safe floor. That shortens its life.' }
    else { cls = ''; tag = 'OK'; msg = 'The cabin runs through the night. The battery is lowest at ' + clock(sim.t[minIdx]) + ' at ' + minPct + '% (safe floor ' + floorPct + '%).' }
    v.className = 'verdict' + (cls ? ' ' + cls : '')
    byId('vtext').innerHTML = '<span class="tag">' + tag + '</span>' + esc(msg)
    byId('vnums').textContent = 'Panels make ' + fmt(tot.gen) + ' Wh a day; loads use ' + fmt(tot.load) + ' Wh a day' + (tot.wasted > 0 ? '; ' + fmt(tot.wasted) + ' Wh of sun is wasted because the battery is full' : '') + '. Modelled for day 3 of 3, starting full.'
    var on = loadsOn().map(function (a) { return { w: a.w, hours: a.to > a.from ? a.to - a.from : 24 - a.from + a.to, ac: a.ac } })
    var dayBus = P.dailyWh(on, M.inverter.efficiency) + (on.some(function (l) { return l.ac }) ? M.inverter.standbyW * 24 : 0)
    var ch = chem(), pwNeed = P.panelWatts(dayBus, S.sun, M.derate, M.sizing.margin), bWh = P.batteryWh(dayBus, M.sizing.autonomyDays, ch.dod)
    byId('sizing').textContent = S.l.length ? 'Rule-of-thumb sizing for these loads (not the simulation): about ' + fmt(Math.ceil(pwNeed / 50) * 50) + ' W of panels and ' + fmt(Math.ceil(P.batteryAh(bWh, S.v) / 25) * 25) + ' Ah at ' + S.v + ' V for ' + M.sizing.autonomyDays + ' days without sun, using ' + ch.label + ' down to ' + Math.round(ch.dod * 100) + '%. See Size it for the arithmetic.' : ''
    var msgText = tag + '. ' + msg
    clearTimeout(annT); annT = setTimeout(function () { if (msgText !== text) { text = msgText; byId('announce').textContent = msgText } }, 700)
    chart.setAttribute('aria-label', 'Modelled day. ' + msgText)
  }

  function update() { build(); paintBreakers(); paintKnobs(); G.carry(S); draw() }

  // ---- time of day
  var tIn = byId('t'), playing = 0, raf = 0
  tIn.addEventListener('input', function () { t = +tIn.value; cursor() })
  var playBtn = byId('play'), reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduce) playBtn.hidden = true
  playBtn.addEventListener('click', function () {
    if (playing) { playing = 0; cancelAnimationFrame(raf); playBtn.textContent = 'Play the day'; return }
    playing = 1; playBtn.textContent = 'Stop'; var last = performance.now(); if (t >= 24) t = 0
    ;(function frame(now) { t += (now - last) / 1000 * 2; last = now; if (t >= 24) { t = 24; playing = 0; playBtn.textContent = 'Play the day'; tIn.value = t; cursor(); return } tIn.value = t; cursor(); raf = requestAnimationFrame(frame) })(last)
  })

  // ---- assumptions table and tiles
  var rows = [
    ['Peak sun hours', M.sun.psh + ' h', 'Hours of full-strength sun (1,000 W per square metre) that equal the real day. Set by the slider; 3 to 6 is common, your place and season decide.'],
    ['Panel derate', Math.round(M.derate * 100) + '%', 'Real panel output after heat, dust, wiring and charger losses, against the label rating.'],
    ['Sunrise and sunset', M.sun.rise + ':00 and ' + M.sun.set + ':00', 'The day is modelled as a smooth half-sine of sun between these hours.'],
    ['Inverter efficiency', Math.round(M.inverter.efficiency * 100) + '%', 'AC loads cost 1 / 0.9 times their watts at the battery.'],
    ['Inverter standby', M.inverter.standbyW + ' W', 'Power an inverter uses just by being on, counted all day when any AC load is switched on.'],
    ['LiFePO4 usable depth', Math.round(M.chemistries.lifepo4.dod * 100) + '%', 'How far the model lets it drain before calling it too deep; charge efficiency ' + Math.round(M.chemistries.lifepo4.chargeEfficiency * 100) + '%.'],
    ['Lead-acid usable depth', Math.round(M.chemistries.lead.dod * 100) + '%', 'Deeper discharge shortens lead-acid life; charge efficiency ' + Math.round(M.chemistries.lead.chargeEfficiency * 100) + '%.'],
    ['Sizing margin', M.sizing.margin + 'x and ' + M.sizing.autonomyDays + ' days', 'Panels sized 25% over the daily need; the battery covers two days with no sun.']
  ]
  document.querySelector('#assume tbody').innerHTML = rows.map(function (r) { return '<tr><th scope="row">' + esc(r[0]) + '</th><td class="n">' + esc(r[1]) + '</td><td>' + esc(r[2]) + '</td></tr>' }).join('')
  var tiles = [['basics.html', 'Basics', 'Volts, amps, ohms and watts, with calculators you can try'], ['solar.html', 'Solar', 'Panel ratings, strings, and why cold weather raises voltage'], ['system.html', 'Size it', 'Loads to panels, battery, wire and fuse, with the arithmetic shown'], ['multimeters.html', 'Multimeter', 'What every setting measures, and the readings to expect'], ['safety.html', 'Safety', 'The limits of this guide, and what to hand to a professional']]
  byId('tiles').innerHTML = tiles.map(function (x) { return '<li><a class="carry" href="' + x[0] + '"><b>' + esc(x[1]) + '</b><span>' + esc(x[2]) + '</span></a></li>' }).join('')

  update(); G.carry(S)
})
