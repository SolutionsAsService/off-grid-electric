/* The virtual multimeter on the multimeter page. The cabin circuit comes from the same simulation as the landing (Power.simulate); meter.js decides
   what the meter shows. Drawn in real pixels (viewBox = width). Nothing is stored. */
OG.boot(function (G) {
  'use strict'
  var root = G.byId('vmeter'); if (!root) return
  var P = G.P, Mt = window.Meter, S = G.state, M = G.model, esc = G.esc, NS = 'http://www.w3.org/2000/svg'
  fetch('data/battery.json').then(function (r) { return r.json() }).then(function (B) { start(B) })

  function el(parent, name, attrs, text) { var e = document.createElementNS(NS, name); Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]) }); if (text !== undefined) e.textContent = text; if (parent) parent.appendChild(e); return e }
  function start(B) {
    var A = G.effective(), ch = M.chemistries[S.c]
    var params = { panelW: S.p, psh: S.sun, derate: M.derate, rise: M.sun.rise, set: M.sun.set, batV: S.v, batAh: S.ah, dod: ch.dod, chgEff: ch.chargeEfficiency, invEff: M.inverter.efficiency, invStandbyW: M.inverter.standbyW,
      loads: A.filter(function (a) { return S.l.indexOf(a.id) !== -1 }).map(function (a) { return { w: a.w, ac: a.ac, from: a.from, to: a.to } }) }
    var sim = P.simulate(params, 3, 15), peak = Math.max.apply(null, sim.solar.concat([1]))
    var awg = G.awg.filter(function (r) { return r.awg === B.scene.cableAwg })[0], cableOhm = awg.ohmsPerKft / 304.8 * B.scene.cableMetres
    var st = { dial: 'off', jack: 'v', red: '', black: '', lead: 'red', rel: false, blown: false, blowMsg: '', t: 12, scenario: 'normal', isolate: false, panelDisc: false, region: 'us', done: {} }
    var MISSIONS = [
      { id: 'dc', t: 'Read the battery voltage.', h: 'DC volts, red on the battery positive post, black on the negative.', ok: function (s, r) { return s.dial === 'dcv' && s.jack === 'v' && s.red === 'bat+' && s.black === 'bat-' && !r.blown } },
      { id: 'rev', t: 'Reverse the probes and see the minus sign.', h: 'Same dial, red on the negative post, black on the positive.', ok: function (s, r) { return s.dial === 'dcv' && s.red === 'bat-' && s.black === 'bat+' && r.value < -1 } },
      { id: 'ac', t: 'Read the inverter outlet.', h: 'AC volts, across live and neutral. Compare it with your region.', ok: function (s, r) { return s.dial === 'acv' && s.red && s.black && r.value > 50 } },
      { id: 'drop', t: 'Measure the voltage lost in the cable under load.', h: 'DC volts from the cable\'s battery end to its inverter end. This reads one conductor of the 5 m run; the sizing calculator doubles it for the round trip.', ok: function (s, r) { return s.dial === 'dcv' && s.jack === 'v' && ((s.red === 'cab_bat' && s.black === 'cab_inv') || (s.red === 'cab_inv' && s.black === 'cab_bat')) && Math.abs(r.value) > 0.005 } },
      { id: 'cur', t: 'Measure the battery current properly.', h: 'Leave the isolator closed. Put the red lead in the 10 A socket, dial to A, probes on the two ends of the gap in the negative lead, with a load running.', ok: function (s, r) { return s.dial === 'amp' && s.jack === 'a' && r.value !== null && Math.abs(r.value) > 0.05 && !r.blown } },
      { id: 'blow', t: 'Blow the meter\'s fuse on purpose (it is only a simulation).', h: 'Current mode, 10 A socket, probes across the battery posts. A real battery bank would melt the leads; the fuse is what saves the meter.', ok: function (s, r) { return r.blown && s.dial === 'amp' } },
      { id: 'fault', t: 'Find the dead part: the inverter is dead.', h: 'Choose "The inverter is dead", then measure DC volts to the negative post at each side of the main fuse. Then open the isolator and test the fuse with continuity.', ok: function (s, r) { return st.scenario === 'blownFuse' && s.dial === 'cont' && st.isolate && ((s.red === 'fuse_in' && s.black === 'fuse_out') || (s.red === 'fuse_out' && s.black === 'fuse_in')) && r.display === 'OL' } },
      { id: 'voc', t: 'See the panel open-circuit voltage, then its working voltage.', h: 'In sunshine, read the panel with its disconnect open (Voc), then closed (Vmp).', ok: function () { return st.done.voc1 && st.done.voc2 } }
    ]
    function idx() { return Math.min(sim.t.length - 1, Math.round(st.t * 4)) }
    function world() {
      var i = idx(), reg = B.ac[st.region], small = M.panel.examples.small
      return Mt.world({ B: B, chem: S.c, sysV: S.v, ah: S.ah, soc: sim.soc[i], batW: sim.batBus[i], servedW: sim.served[i], solarW: sim.solar[i], solarPeakW: peak, acOn: sim.unmet[i] <= 0, wasteW: sim.waste[i], region: reg, panel: small, cableOhm: cableOhm, isolate: st.isolate, panelDisc: st.panelDisc, scenario: st.scenario })
    }

    // ---- build the interface
    var COL = { 'pv+': [0, 0], 'pv-': [1, 0], el1: [4, 0], el2: [5, 0], 'bat+': [0, 1], lug: [1, 1], fuse_in: [2, 1], fuse_out: [3, 1], cab_bat: [4, 1], cab_inv: [5, 1], 'bat-': [0, 2], gap1: [1, 2], gap2: [2, 2], 'ac_l': [4, 2], 'ac_n': [5, 2] }
    var ORDER = Mt.NODES.slice().sort(function (a, b) { return COL[a.id][1] - COL[b.id][1] || COL[a.id][0] - COL[b.id][0] }); ORDER.forEach(function (n, k) { n.num = k + 1 })
    var BYID = {}; Mt.NODES.forEach(function (n) { BYID[n.id] = n })
    function opts(sel) { return '<option value="">(not touching anything)</option>' + ORDER.map(function (n) { return '<option value="' + n.id + '"' + (sel === n.id ? ' selected' : '') + '>' + n.num + ' · ' + esc(n.label) + '</option>' }).join('') }
    var DL = { off: 'OFF', dcv: 'V ⎓', acv: 'V ~', ohm: 'Ω', cont: 'Ω ))) beep', amp: 'A ⎓ 10 A' }
    root.innerHTML =
      '<div class="vm-grid">' +
      '<div class="vm-read"><div class="vm-lcd" id="vm-lcd" role="group" aria-label="Meter display"><span class="vm-mode" id="vm-mode"></span><span class="vm-num" id="vm-num"></span><span class="vm-unit" id="vm-unit"></span><span class="vm-beep" id="vm-beep" aria-hidden="true">BEEP</span><span class="vm-between" id="vm-between"></span></div>' +
      '<p class="vm-msg" id="vm-msg" role="status" aria-live="polite"></p></div>' +
      '<div class="vm-meter"><h3 class="vm-h">The meter</h3>' +
      '<div class="vm-dial" role="radiogroup" aria-label="Dial">' + Mt.DIALS.map(function (d) { return '<button type="button" role="radio" class="chip" data-dial="' + d + '" aria-checked="' + (d === st.dial) + '">' + DL[d] + '</button>' }).join('') + '</div>' +
      '<div class="vm-jacks" role="radiogroup" aria-label="Where the red lead is plugged in"><button type="button" role="radio" class="chip" data-jack="v" aria-checked="true">Red lead: V Ω socket</button><button type="button" role="radio" class="chip" data-jack="a" aria-checked="false">Red lead: 10 A socket</button></div>' +
      '<p class="small">The black lead is always in COM.</p>' +
      '<div class="field"><label for="vm-red">Red probe</label><select id="vm-red">' + opts('') + '</select></div>' +
      '<div class="field"><label for="vm-blk">Black probe</label><select id="vm-blk">' + opts('') + '</select></div>' +
      '<div class="chips"><button type="button" class="chip" id="vm-rel" aria-pressed="false">REL (zero the leads)</button><button type="button" class="chip" id="vm-snd" aria-pressed="true">Sound: on</button><button type="button" class="chip" id="vm-fuse" hidden>Replace the meter\'s fuse</button></div><p class="small" id="vm-blownct"></p></div>' +
      '<div class="vm-scene"><h3 class="vm-h">The circuit <span class="small" id="vm-next"></span></h3><svg id="vm-svg" role="group" aria-label="Fifteen numbered test points on a cabin power circuit. Each can be chosen with the probe lists above, or here with Tab and Enter."><title>A cabin power circuit with fifteen numbered test points, each showing the voltage a meter would read to the battery negative post</title></svg><p class="small" id="vm-status"></p>' +
      '<p class="small vm-key">Figures under the points: volts to the battery negative post. Dashed grey: no power. Solid: live. Ring R on a point: red probe. Ring B: black probe.</p>' +
      '<div class="vm-ctl"><div class="field"><label for="vm-sc">What is wrong?</label><select id="vm-sc">' + Object.keys(Mt.SCENARIOS).map(function (k) { return '<option value="' + k + '">' + esc(Mt.SCENARIOS[k]) + '</option>' }).join('') + '</select></div>' +
      '<div class="field"><label for="vm-t">Time of day <output id="vm-to">12:00</output></label><input id="vm-t" type="range" min="0" max="23.75" step="0.25" value="12"></div>' +
      '<div class="field"><label for="vm-rg">Mains supply</label><select id="vm-rg"><option value="us">120 V, 60 Hz</option><option value="eu">230 V, 50 Hz</option></select></div></div>' +
      '<div class="chips" role="group" aria-label="Switches"><button type="button" class="chip" id="vm-iso" aria-pressed="false">Battery isolator: closed</button><button type="button" class="chip" id="vm-pv" aria-pressed="false">Panel disconnect: closed</button></div>' +
      '<p class="small">Appliances, battery and sun come from the <a class="carry" href="index.html">Simulator</a>. The panel is one 12 V-class panel per 12 V of battery, in series (Voc 22.5 V, Vmp 18.4 V each), behind a controller. The numbers are illustrative.</p></div>' +
      '</div>' +
      '<div class="vm-miss"><h3 class="vm-h">Missions <output id="vm-count"></output></h3><ol id="vm-list"></ol></div><p class="sr" id="vm-say" role="status" aria-live="polite"></p>'
    var $ = G.byId, SND = true, blownCount = 0, ac
    // ---- sound: one click for a blown fuse, one short tone for a beep. Needs a gesture, which every control here is.
    function tone(freq, ms, type, vol) {
      if (!SND) return
      try { var A = window.AudioContext || window.webkitAudioContext; if (!A) return; ac = ac || new A(); var o = ac.createOscillator(), g = ac.createGain(); o.type = type || 'sine'; o.frequency.value = freq; g.gain.value = vol || 0.05; o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + ms / 1000) } catch (e) { /* no audio: the picture and words still say it */ }
    }
    // ---- the diagram
    var svg = $('vm-svg'), W = 0, nodeEls = {}, wireEls = {}, arrow, fuseX
    function layout() {
      var box = root.querySelector('.vm-scene'), cs = getComputedStyle(box), pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth)
      var nw = Math.max(240, Math.floor(box.clientWidth - pad + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth)) - 0); nw = Math.max(240, Math.floor(box.getBoundingClientRect().width - pad)); if (nw === W && nodeEls['bat+']) return; W = nw
      var m = 22, dx = (W - 2 * m) / 5, H = 240; svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('width', W); svg.setAttribute('height', H)
      while (svg.childNodes.length > 1) svg.removeChild(svg.lastChild)
      function X(c) { return m + dx * c } function Y(r) { return [28, 102, 176][r] }
      var wires = el(svg, 'g'), caps = el(svg, 'g'), pts = el(svg, 'g'); wireEls = {}; nodeEls = {}
      function line(a, b, cls) { var e = el(wires, 'path', { class: cls || 'vm-wire', d: 'M' + X(COL[a][0]) + ' ' + Y(COL[a][1]) + 'L' + X(COL[b][0]) + ' ' + Y(COL[b][1]) }); wireEls[a + '|' + b] = e }
      line('bat+', 'lug'); line('lug', 'fuse_in'); line('fuse_out', 'cab_bat'); line('cab_bat', 'cab_inv', 'vm-wire vm-cable'); line('bat-', 'gap1'); line('pv+', 'pv-'); line('el1', 'el2'); line('ac_l', 'ac_n'); line('gap2', 'ac_l')
      line('fuse_in', 'fuse_out'); fuseX = X(2.5)
      fuseBox = el(wires, 'rect', { class: 'vm-fuse', x: fuseX - 17, y: Y(1) - 9, width: 34, height: 18 }); fuseCross = el(wires, 'path', { class: 'vm-cross', d: 'M' + (fuseX - 12) + ' ' + (Y(1) - 6) + 'l24 12m0 -12l-24 12' })
      arrow = el(wires, 'path', { class: 'vm-arrow', d: 'M' + (X(4.5) - 7) + ' ' + (Y(1) - 20) + 'l12 0m-5 -5l5 5l-5 5' })
      function cap(c, r, t, anchor) { el(caps, 'text', { x: X(c), y: Y(r) + 48, 'text-anchor': anchor || 'middle', class: 'vm-cap' }, t) }
      var cw = W < 420
      cap(0, 0, 'Panel', 'start'); cap(4.5, 0, cw ? 'Spare' : 'Spare element'); cap(0, 1, 'Battery', 'start'); cap(2.5, 1, 'Main fuse'); cap(4.5, 1, cw ? '5 m cable' : '5 m of 6 AWG cable'); cap(1.5, 2, cw ? 'Neg. gap' : 'Gap in − lead'); cap(4.5, 2, 'Outlet')
      Mt.NODES.forEach(function (n) {
        var c = COL[n.id], g = el(pts, 'g', { 'data-node': n.id, class: 'vm-node', role: 'button', tabindex: 0, 'aria-label': 'Point ' + n.num + ', ' + n.label }); g.addEventListener('click', function () { setProbe(n.id) })
        g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setProbe(n.id) } })
        el(g, 'circle', { cx: X(c[0]), cy: Y(c[1]), r: 22, class: 'vm-hit' }); el(g, 'circle', { cx: X(c[0]), cy: Y(c[1]), r: 15, class: 'vm-pt' }); el(g, 'text', { x: X(c[0]), y: Y(c[1]) + 5, 'text-anchor': 'middle', class: 'vm-n' }, n.num)
        var ring = el(g, 'circle', { cx: X(c[0]), cy: Y(c[1]), r: 20, class: 'vm-ring', visibility: 'hidden' })
        var tag = el(g, 'text', { x: X(c[0]) + 19, y: Y(c[1]) + 4, class: 'vm-tag' }, ''), v = el(g, 'text', { x: X(c[0]), y: Y(c[1]) + 31, 'text-anchor': 'middle', class: 'vm-v' }, '')
        nodeEls[n.id] = { g: g, ring: ring, tag: tag, v: v, x: X(c[0]), y: Y(c[1]) }
      })
      paint()
    }
    var fuseBox, fuseCross
    function volts(w, id) { var v = BYID[id] && (id === 'ac_l' || id === 'ac_n') ? w.ac[id] : w.nodes[id]; if (id === 'el1' || id === 'el2') return ''; var a = Math.abs(v); return (id === 'ac_l' && v ? Math.round(v) + '~' : a < 0.0005 ? '0' : (v < 0 ? '-' : '') + (a >= 10 ? a.toFixed(2) : a.toFixed(3))) }
    function paint() {
      var w = world(); if (!nodeEls['bat+']) return
      Object.keys(nodeEls).forEach(function (id) {
        var n = nodeEls[id], r = st.red === id, b = st.black === id
        n.ring.setAttribute('visibility', r || b ? 'visible' : 'hidden'); n.ring.setAttribute('class', 'vm-ring ' + (r && b ? 'both' : r ? 'red' : 'blk'))
        n.tag.textContent = (r ? 'R' : '') + (b ? 'B' : ''); n.v.textContent = volts(w, id)
        n.g.setAttribute('class', 'vm-node' + (w.live[id] ? ' on' : ' off'))
        n.g.setAttribute('aria-label', 'Point ' + BYID[id].num + ', ' + BYID[id].label + (r ? ', red probe here' : '') + (b ? ', black probe here' : '') + ', ' + (volts(w, id) || 'not connected') + (volts(w, id) ? ' volts' : ''))
      })
      Object.keys(wireEls).forEach(function (k) { var a = k.split('|'), dead = !(w.live[a[0]] && w.live[a[1]]) || (k === 'fuse_in|fuse_out' ? w.fuseBlown : false); if (k === 'ac_l|ac_n' || k === 'gap2|ac_l' || k === 'pv+|pv-' || k === 'el1|el2') dead = !(w.live[a[0]]); wireEls[k].setAttribute('class', 'vm-wire' + (k === 'cab_bat|cab_inv' ? ' vm-cable' : '') + (dead ? ' dead' : '')) })
      fuseBox.setAttribute('class', 'vm-fuse' + (w.fuseBlown ? ' blown' : '')); fuseCross.setAttribute('visibility', w.fuseBlown ? 'visible' : 'hidden')
      arrow.setAttribute('visibility', w.iLoad > 0.01 ? 'visible' : 'hidden')
    }
    function setProbe(id) {
      var which = st.lead; if (which === 'red') { st.red = id; st.lead = 'black' } else { st.black = id; st.lead = 'red' }
      $('vm-red').value = st.red; $('vm-blk').value = st.black
      say((which === 'red' ? 'Red' : 'Black') + ' probe on point ' + BYID[id].num + ', ' + BYID[id].label + '.'); update()
    }
    function say(t) { $('vm-say').textContent = t }
    // ---- paint
    var lastBeep = false, lastBlown = false
    function update() {
      var w = world(), setup = { dial: st.dial, jack: st.jack, red: st.red, black: st.black, rel: st.rel }, r, justBlown = false
      if (st.blown && st.dial !== 'off') r = { display: '', unit: '', mode: st.dial, note: '', warn: st.blowMsg + ' The meter reads nothing until you replace its fuse.', value: null, beep: false, dead: true }
      else r = Mt.read(setup, B, w)
      if (r.blown && !st.blown) { st.blown = true; st.blowMsg = r.warn; blownCount++; justBlown = true }
      $('vm-num').textContent = r.display; $('vm-unit').textContent = r.unit; $('vm-mode').textContent = DL[st.dial]; $('vm-beep').classList.toggle('on', !!r.beep)
      $('vm-between').textContent = st.dial !== 'off' && st.red && st.black ? 'points ' + BYID[st.red].num + ' to ' + BYID[st.black].num : ''
      $('vm-lcd').classList.toggle('dead', !!r.dead || !!r.blown || st.blown)
      var msg = r.warn || r.note || ''; $('vm-msg').textContent = msg; $('vm-msg').className = 'vm-msg' + (r.warn ? ' bad' : '')
      $('vm-fuse').hidden = !st.blown; $('vm-blownct').textContent = blownCount ? 'Fuses blown so far: ' + blownCount + '.' : ''
      $('vm-lcd').setAttribute('aria-label', 'Meter display: ' + (r.display || 'blank') + ' ' + r.unit + (r.beep ? ', beeping' : ''))
      $('vm-next').textContent = '· next tap moves the ' + st.lead + ' probe'
      if (justBlown) { var mt = root.querySelector('.vm-meter'); mt.classList.remove('shake'); void mt.offsetWidth; mt.classList.add('shake'); tone(180, 160, 'square', 0.08); say('The meter fuse blew. ' + st.blowMsg) }
      if (r.beep && !lastBeep) tone(880, 140, 'square', 0.04)
      lastBeep = !!r.beep
      if (st.dial === 'dcv' && st.red === 'pv+' && st.black === 'pv-' && !r.blown && w.nodes['pv+'] > 1) { if (st.panelDisc) st.done.voc1 = 1; else st.done.voc2 = 1 }
      document.querySelectorAll('[data-dial]').forEach(function (b) { var on = b.getAttribute('data-dial') === st.dial; b.setAttribute('aria-checked', String(on)); b.setAttribute('tabindex', on ? '0' : '-1') })
      document.querySelectorAll('[data-jack]').forEach(function (b) { var on = b.getAttribute('data-jack') === st.jack; b.setAttribute('aria-checked', String(on)); b.setAttribute('tabindex', on ? '0' : '-1') })
      $('vm-rel').setAttribute('aria-pressed', String(st.rel)); $('vm-iso').setAttribute('aria-pressed', String(st.isolate)); $('vm-iso').textContent = 'Battery isolator: ' + (st.isolate ? 'OPEN (circuit dead)' : 'closed'); $('vm-pv').setAttribute('aria-pressed', String(st.panelDisc)); $('vm-pv').textContent = 'Panel disconnect: ' + (st.panelDisc ? 'OPEN' : 'closed')
      var i = idx(); $('vm-status').textContent = G.clock(st.t) + ': sun ' + G.fmt(sim.solar[i]) + ' W, loads ' + G.fmt(sim.served[i]) + ' W, battery ' + Math.round(sim.soc[i] * 100) + '%' + (w.isolate ? ', circuit isolated' : w.iBat > 0.05 ? ', charging at ' + w.iBat.toFixed(1) + ' A' : w.iBat < -0.05 ? ', supplying ' + Math.abs(w.iBat).toFixed(1) + ' A' : ', no net battery current') + (w.acOn ? '' : ', inverter off')
      MISSIONS.forEach(function (m) { if (!st.done[m.id] && m.ok(setup, r)) st.done[m.id] = 1 })
      var n = MISSIONS.filter(function (m) { return st.done[m.id] }).length
      $('vm-list').innerHTML = MISSIONS.map(function (m) { return '<li class="' + (st.done[m.id] ? 'done' : '') + '"><b>' + (st.done[m.id] ? 'Done · ' : '') + esc(m.t) + '</b><span>' + esc(m.h) + '</span></li>' }).join(''); $('vm-count').textContent = '(' + n + ' of ' + MISSIONS.length + ')'
      paint()
    }
    function roving(group) {
      group.addEventListener('keydown', function (e) {
        var keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }; if (!(e.key in keys)) return
        var bs = Array.prototype.slice.call(group.querySelectorAll('button')), k = bs.indexOf(document.activeElement); if (k === -1) return
        e.preventDefault(); var nb = bs[(k + keys[e.key] + bs.length) % bs.length]; nb.focus(); nb.click()
      })
    }
    roving(root.querySelector('.vm-dial')); roving(root.querySelector('.vm-jacks'))
    root.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return
      if (b.hasAttribute('data-dial')) { st.dial = b.getAttribute('data-dial') }
      else if (b.hasAttribute('data-jack')) { st.jack = b.getAttribute('data-jack') }
      else if (b.id === 'vm-rel') st.rel = !st.rel
      else if (b.id === 'vm-snd') { SND = !SND; b.setAttribute('aria-pressed', String(SND)); b.textContent = 'Sound: ' + (SND ? 'on' : 'off') }
      else if (b.id === 'vm-iso') st.isolate = !st.isolate
      else if (b.id === 'vm-pv') st.panelDisc = !st.panelDisc
      else if (b.id === 'vm-fuse') { st.blown = false; st.blowMsg = '' }
      update()
    })
    $('vm-red').addEventListener('change', function () { st.red = this.value; update() })
    $('vm-blk').addEventListener('change', function () { st.black = this.value; update() })
    $('vm-sc').addEventListener('change', function () { st.scenario = this.value; update() })
    $('vm-rg').addEventListener('change', function () { st.region = this.value; update() })
    $('vm-t').addEventListener('input', function () { st.t = +this.value; $('vm-to').textContent = G.clock(st.t); update() })
    window.addEventListener('resize', layout)
    layout(); update()
    window.__vm = { st: st, update: update, world: world, MISSIONS: MISSIONS }
  }
})
