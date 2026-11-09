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
    var st = { dial: 'off', jack: 'v', red: '', black: '', lead: 'red', rel: false, blown: false, t: 12, scenario: 'normal', isolate: false, panelDisc: false, region: 'us', done: {} }
    var MISSIONS = [
      { id: 'dc', t: 'Read the battery voltage.', h: 'DC volts, red on the battery positive post, black on the negative.', ok: function (s, r) { return s.dial === 'dcv' && s.jack === 'v' && s.red === 'bat+' && s.black === 'bat-' && !r.blown } },
      { id: 'rev', t: 'Reverse the probes and see the minus sign.', h: 'Same dial, red on the negative post, black on the positive.', ok: function (s, r) { return s.dial === 'dcv' && s.red === 'bat-' && s.black === 'bat+' && r.value < -1 } },
      { id: 'ac', t: 'Read the inverter outlet.', h: 'AC volts, across live and neutral. Compare it with your region.', ok: function (s, r) { return s.dial === 'acv' && s.red && s.black && r.value > 50 } },
      { id: 'drop', t: 'Measure the voltage lost in the cable under load.', h: 'DC volts from the cable\'s battery end to its inverter end. This is the drop the wire calculator predicts.', ok: function (s, r) { return s.dial === 'dcv' && s.jack === 'v' && ((s.red === 'cab_bat' && s.black === 'cab_inv') || (s.red === 'cab_inv' && s.black === 'cab_bat')) && Math.abs(r.value) > 0.005 } },
      { id: 'cur', t: 'Measure the battery current properly.', h: 'Leave the isolator closed. Put the red lead in the 10 A socket, dial to A, probes on the two ends of the gap in the negative lead, with a load running.', ok: function (s, r) { return s.dial === 'amp' && s.jack === 'a' && r.value !== null && Math.abs(r.value) > 0.05 && !r.blown } },
      { id: 'blow', t: 'Blow the meter\'s fuse on purpose (it is only a simulation).', h: 'Current mode, 10 A socket, probes across the battery posts. A real battery bank would melt the leads; the fuse is what saves the meter.', ok: function (s, r) { return r.blown && s.dial === 'amp' } },
      { id: 'fault', t: 'Find the dead part: the inverter is dead.', h: 'Choose "The inverter is dead", then measure DC volts to the negative post at each side of the main fuse. Then open the isolator and test the fuse with continuity.', ok: function (s, r) { return st.scenario === 'blownFuse' && s.dial === 'cont' && st.isolate && ((s.red === 'fuse_in' && s.black === 'fuse_out') || (s.red === 'fuse_out' && s.black === 'fuse_in')) && r.display === 'OL' } },
      { id: 'voc', t: 'See the panel open-circuit voltage, then its working voltage.', h: 'In sunshine, read the panel with its disconnect open (Voc), then closed (Vmp).', ok: function () { return st.done.voc1 && st.done.voc2 } }
    ]
    function idx() { return Math.min(sim.t.length - 1, Math.round(st.t * 4)) }
    function world() {
      var i = idx(), reg = B.ac[st.region], small = M.panel.examples.small
      return Mt.world({ B: B, chem: S.c, sysV: S.v, ah: S.ah, soc: sim.soc[i], batW: sim.batBus[i], servedW: sim.served[i], solarW: sim.solar[i], solarPeakW: peak, acOn: true, region: reg, panel: small, cableOhm: cableOhm, isolate: st.isolate, panelDisc: st.panelDisc, scenario: st.scenario })
    }

    // ---- build the interface
    var COL = { 'pv+': [0, 0], 'pv-': [1, 0], el1: [4, 0], el2: [5, 0], 'bat+': [0, 1], lug: [1, 1], fuse_in: [2, 1], fuse_out: [3, 1], cab_bat: [4, 1], cab_inv: [5, 1], 'bat-': [0, 2], gap1: [1, 2], gap2: [2, 2], 'ac_l': [4, 2], 'ac_n': [5, 2] }
    var ORDER = Mt.NODES.slice().sort(function (a, b) { return COL[a.id][1] - COL[b.id][1] || COL[a.id][0] - COL[b.id][0] }); ORDER.forEach(function (n, k) { n.num = k + 1 })
    function opts(sel) { return '<option value="">(not touching anything)</option>' + ORDER.map(function (n) { return '<option value="' + n.id + '"' + (sel === n.id ? ' selected' : '') + '>' + n.num + ' · ' + esc(n.label) + '</option>' }).join('') }
    var DL = { off: 'OFF', dcv: 'V ⎓', acv: 'V ~', ohm: 'Ω', cont: 'Ω ))) beep', amp: 'A ⎓ 10 A' }
    root.innerHTML =
      '<div class="vm-grid">' +
      '<div class="vm-scene"><h3 class="vm-h">The circuit</h3><svg id="vm-svg" role="img" aria-labelledby="vm-svg-t"><title id="vm-svg-t">A cabin power circuit with fifteen numbered test points</title></svg><p class="small" id="vm-status"></p>' +
      '<div class="vm-ctl"><div class="field"><label for="vm-sc">What is wrong?</label><select id="vm-sc">' + Object.keys(Mt.SCENARIOS).map(function (k) { return '<option value="' + k + '">' + esc(Mt.SCENARIOS[k]) + '</option>' }).join('') + '</select></div>' +
      '<div class="field"><label for="vm-t">Time of day <output id="vm-to">12:00</output></label><input id="vm-t" type="range" min="0" max="23.75" step="0.25" value="12"></div>' +
      '<div class="field"><label for="vm-rg">Mains supply</label><select id="vm-rg"><option value="us">120 V, 60 Hz</option><option value="eu">230 V, 50 Hz</option></select></div></div>' +
      '<div class="chips" role="group" aria-label="Switches"><button type="button" class="chip" id="vm-iso" aria-pressed="false">Battery isolator: closed</button><button type="button" class="chip" id="vm-pv" aria-pressed="false">Panel disconnect: closed</button></div>' +
      '<p class="small">Appliances, battery and sun come from the <a class="carry" href="index.html">Simulator</a>; the numbers are illustrative.</p></div>' +
      '<div class="vm-meter"><h3 class="vm-h">The meter</h3>' +
      '<div class="vm-lcd" id="vm-lcd" role="group" aria-label="Meter display"><span class="vm-mode" id="vm-mode"></span><span class="vm-num" id="vm-num"></span><span class="vm-unit" id="vm-unit"></span><span class="vm-beep" id="vm-beep" aria-hidden="true">BEEP</span></div>' +
      '<p class="vm-msg" id="vm-msg" role="status" aria-live="polite"></p>' +
      '<div class="vm-dial" role="radiogroup" aria-label="Dial">' + Mt.DIALS.map(function (d) { return '<button type="button" role="radio" class="chip" data-dial="' + d + '" aria-checked="' + (d === st.dial) + '">' + DL[d] + '</button>' }).join('') + '</div>' +
      '<div class="vm-jacks" role="radiogroup" aria-label="Where the red lead is plugged in"><button type="button" role="radio" class="chip" data-jack="v" aria-checked="true">Red lead: V Ω socket</button><button type="button" role="radio" class="chip" data-jack="a" aria-checked="false">Red lead: 10 A socket</button></div>' +
      '<p class="small">The black lead is always in COM.</p>' +
      '<div class="field"><label for="vm-red">Red probe</label><select id="vm-red">' + opts('') + '</select></div>' +
      '<div class="field"><label for="vm-blk">Black probe</label><select id="vm-blk">' + opts('') + '</select></div>' +
      '<div class="chips"><button type="button" class="chip" id="vm-rel" aria-pressed="false">REL (zero the leads)</button><button type="button" class="chip" id="vm-fuse" hidden>Replace the meter\'s fuse</button></div></div>' +
      '</div>' +
      '<div class="vm-miss"><h3 class="vm-h">Missions <output id="vm-count"></output></h3><ol id="vm-list"></ol></div>'
    var $ = G.byId
    // ---- the diagram
    var svg = $('vm-svg'), W = 0
    var nodeEls = {}
    function layout() {
      var nw = Math.max(240, Math.round(root.querySelector('.vm-scene').clientWidth - 2)); if (nw === W && nodeEls['bat+']) return; W = nw
      var pad = 22, dx = (W - 2 * pad) / 5, H = 232; svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('width', W); svg.setAttribute('height', H)
      while (svg.childNodes.length > 1) svg.removeChild(svg.lastChild)
      function X(c) { return pad + dx * c } function Y(r) { return [40, 108, 176][r] }
      var wires = el(svg, 'g'), caps = el(svg, 'g'), pts = el(svg, 'g')
      function line(a, b, cls) { el(wires, 'path', { class: cls || 'vm-wire', d: 'M' + X(COL[a][0]) + ' ' + Y(COL[a][1]) + 'L' + X(COL[b][0]) + ' ' + Y(COL[b][1]) }) }
      line('bat+', 'lug'); line('lug', 'fuse_in'); line('fuse_out', 'cab_bat'); line('cab_bat', 'cab_inv', 'vm-wire vm-thick'); line('bat-', 'gap1'); line('pv+', 'pv-', 'vm-wire vm-dash'); line('el1', 'el2', 'vm-wire vm-dash'); line('ac_l', 'ac_n', 'vm-wire vm-dash'); line('gap2', 'ac_l', 'vm-wire vm-dash')
      el(wires, 'rect', { class: 'vm-fuse', x: X(2) + (dx - 34) / 2 + 0, y: 108 - 9, width: 34, height: 18 }); el(wires, 'path', { class: 'vm-wire', d: 'M' + X(2) + ' 108H' + X(3) })
      function cap(c, r, t, anchor) { el(caps, 'text', { x: X(c), y: Y(r) + 34, 'text-anchor': anchor || 'middle', class: 'vm-cap' }, t) }
      cap(0, 0, 'Panel', 'start'); cap(4.5, 0, 'Spare element'); cap(0, 1, 'Battery', 'start'); cap(2.5, 1, 'Main fuse'); cap(4.5, 1, W < 420 ? '5 m cable' : '5 m of 6 AWG cable'); cap(1.5, 2, 'Gap in − lead'); cap(4.5, 2, 'Outlet')
      Mt.NODES.forEach(function (n) {
        var c = COL[n.id], g = el(pts, 'g', { 'data-node': n.id, class: 'vm-node' }); g.addEventListener('click', function () { setProbe(n.id) })
        el(g, 'circle', { cx: X(c[0]), cy: Y(c[1]), r: 15, class: 'vm-pt' }); el(g, 'text', { x: X(c[0]), y: Y(c[1]) + 5, 'text-anchor': 'middle', class: 'vm-n' }, n.num)
        var ring = el(g, 'circle', { cx: X(c[0]), cy: Y(c[1]), r: 21, class: 'vm-ring', visibility: 'hidden' }); nodeEls[n.id] = { g: g, ring: ring }
      })
      paintProbes()
    }
    function paintProbes() {
      Object.keys(nodeEls).forEach(function (id) {
        var n = nodeEls[id], r = st.red === id, b = st.black === id
        n.ring.setAttribute('visibility', r || b ? 'visible' : 'hidden'); n.ring.setAttribute('class', 'vm-ring ' + (r && b ? 'both' : r ? 'red' : 'blk'))
        n.g.setAttribute('class', 'vm-node' + (r ? ' red' : '') + (b ? ' blk' : ''))
      })
    }
    function setProbe(id) {
      if (st.lead === 'red') { st.red = id; st.lead = 'black' } else { st.black = id; st.lead = 'red' }
      $('vm-red').value = st.red; $('vm-blk').value = st.black; update(); announce('Probe on ' + Mt.NODES.filter(function (n) { return n.id === id })[0].label)
    }
    function announce(t) { var s = $('vm-msg'); void s }
    // ---- paint
    function update() {
      var w = world(), setup = { dial: st.dial, jack: st.jack, red: st.red, black: st.black, rel: st.rel }, r
      if (st.blown && st.dial !== 'off') r = { display: '', unit: '', mode: st.dial, note: '', warn: 'The meter\'s fuse is blown: it reads nothing until you replace it.', value: null, beep: false, dead: true }
      else r = Mt.read(setup, B, w)
      if (r.blown) st.blown = true
      $('vm-num').textContent = r.display; $('vm-unit').textContent = r.unit; $('vm-mode').textContent = DL[st.dial]; $('vm-beep').classList.toggle('on', !!r.beep)
      $('vm-lcd').classList.toggle('dead', !!r.dead || r.blown)
      var msg = r.warn || r.note || ''; $('vm-msg').textContent = msg; $('vm-msg').className = 'vm-msg' + (r.warn ? ' bad' : '')
      $('vm-fuse').hidden = !st.blown; $('vm-lcd').setAttribute('aria-label', 'Meter display: ' + (r.display || 'blank') + ' ' + r.unit + (r.beep ? ', beeping' : ''))
      if (st.dial === 'dcv' && st.red === 'pv+' && st.black === 'pv-' && !r.blown && w.nodes['pv+'] > 1) { if (st.panelDisc) st.done.voc1 = 1; else st.done.voc2 = 1 }
      document.querySelectorAll('[data-dial]').forEach(function (b) { b.setAttribute('aria-checked', String(b.getAttribute('data-dial') === st.dial)) })
      document.querySelectorAll('[data-jack]').forEach(function (b) { b.setAttribute('aria-checked', String(b.getAttribute('data-jack') === st.jack)) })
      $('vm-rel').setAttribute('aria-pressed', String(st.rel)); $('vm-iso').setAttribute('aria-pressed', String(st.isolate)); $('vm-iso').textContent = 'Battery isolator: ' + (st.isolate ? 'OPEN (circuit dead)' : 'closed'); $('vm-pv').setAttribute('aria-pressed', String(st.panelDisc)); $('vm-pv').textContent = 'Panel disconnect: ' + (st.panelDisc ? 'OPEN' : 'closed')
      var i = idx(); $('vm-status').textContent = G.clock(st.t) + ': sun ' + G.fmt(sim.solar[i]) + ' W, load ' + G.fmt(sim.served[i]) + ' W, battery ' + Math.round(sim.soc[i] * 100) + '%' + (w.cut ? ', circuit isolated' : ', battery current ' + (w.iBat >= 0 ? '+' : '-') + Math.abs(w.iBat).toFixed(1) + ' A')
      MISSIONS.forEach(function (m) { if (!st.done[m.id] && m.ok(setup, r)) st.done[m.id] = 1 })
      var n = MISSIONS.filter(function (m) { return st.done[m.id] }).length
      $('vm-list').innerHTML = MISSIONS.map(function (m) { return '<li class="' + (st.done[m.id] ? 'done' : '') + '"><b>' + (st.done[m.id] ? 'Done · ' : '') + esc(m.t) + '</b><span>' + esc(m.h) + '</span></li>' }).join(''); $('vm-count').textContent = '(' + n + ' of ' + MISSIONS.length + ')'
      paintProbes()
    }
    root.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return
      if (b.hasAttribute('data-dial')) { st.dial = b.getAttribute('data-dial') }
      else if (b.hasAttribute('data-jack')) { st.jack = b.getAttribute('data-jack') }
      else if (b.id === 'vm-rel') st.rel = !st.rel
      else if (b.id === 'vm-iso') st.isolate = !st.isolate
      else if (b.id === 'vm-pv') st.panelDisc = !st.panelDisc
      else if (b.id === 'vm-fuse') st.blown = false
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
