/* The virtual multimeter's rules. Pure functions, no DOM: world() turns the simulation at one moment (plus a fault scenario) into the voltages
   and currents of a small cabin circuit; read() says what a multimeter with a given dial, red-lead jack and probe positions would display, and
   when it would blow its fuse. Values are illustrative (data/battery.json), not measurements of any real battery. */
(function (root) {
  'use strict'
  var M = {}
  // the places a probe can touch
  M.NODES = [
    { id: 'bat+', label: 'Battery positive post', grp: 'Battery' }, { id: 'bat-', label: 'Battery negative post', grp: 'Battery' },
    { id: 'lug', label: 'Cable lug on the positive post', grp: 'Battery' },
    { id: 'fuse_in', label: 'Main fuse, battery side', grp: 'Main fuse' }, { id: 'fuse_out', label: 'Main fuse, inverter side', grp: 'Main fuse' },
    { id: 'cab_bat', label: 'Cable run, battery end', grp: 'Cable run' }, { id: 'cab_inv', label: 'Cable run, inverter end', grp: 'Cable run' },
    { id: 'gap1', label: 'Gap in the negative lead, battery side', grp: 'Negative lead' }, { id: 'gap2', label: 'Gap in the negative lead, load side', grp: 'Negative lead' },
    { id: 'pv+', label: 'Solar panel positive', grp: 'Solar panels' }, { id: 'pv-', label: 'Solar panel negative', grp: 'Solar panels' },
    { id: 'ac_l', label: 'Inverter outlet, live', grp: 'Inverter outlet' }, { id: 'ac_n', label: 'Inverter outlet, neutral', grp: 'Inverter outlet' },
    { id: 'el1', label: 'Spare heating element, end 1', grp: 'Spare element' }, { id: 'el2', label: 'Spare heating element, end 2', grp: 'Spare element' }
  ]
  M.DIALS = ['off', 'dcv', 'acv', 'ohm', 'cont', 'amp']
  M.SCENARIOS = { normal: 'Everything works', blownFuse: 'The inverter is dead', corroded: 'Lights dim when the pump runs', panelOpen: 'The batteries are not charging' }

  function interp(curve, pct) {          // curve: [[pct, volts], ...] from high to low
    pct = Math.max(0, Math.min(100, pct))
    for (var i = 0; i < curve.length - 1; i++) {
      var a = curve[i], b = curve[i + 1]
      if (pct <= a[0] && pct >= b[0]) return b[1] + (a[1] - b[1]) * (pct - b[0]) / (a[0] - b[0])
    }
    return curve[curve.length - 1][1]
  }
  M.ocv = function (B, chem, soc, sysV) { return interp(B.ocv12[chem], soc * 100) * sysV / 12 }
  M.rint = function (B, chem, ah, sysV) { return B.rintOhmAh[chem] / ah * sysV / 12 }

  /* world(): the circuit at one moment.
     in: { B (battery.json), chem, sysV, ah, soc, batW (battery bus power, + charging), servedW, solarUsedW, solarW, solarPeakW, acOn, region: {v,hz},
           panel: {voc, vmp}, cableOhm, isolate, panelDisc, scenario } */
  M.world = function (i) {
    var B = i.B, sc = B.scene, w = { nodes: {}, live: {}, I: 0, iLoad: 0, charging: false, regulating: false, acV: 0, acHz: 0, acOn: false }
    var ocv = M.ocv(B, i.chem, i.soc, i.sysV), rint = M.rint(B, i.chem, i.ah, i.sysV)
    var cut = i.isolate || i.scenario === 'blownFuse'                       // the load side is dead
    var iLoad = (cut || i.acOn === false) ? 0 : Math.max(0, i.servedW) / Math.max(ocv, 1)          // amps the loads draw through the fuse and the cable
    var panelOn = !i.isolate && !i.panelDisc && i.scenario !== 'panelOpen' && i.solarW > 1
    var iBat = i.isolate ? 0 : i.batW / Math.max(ocv, 1)                      // net current at the battery posts: + charging, - discharging
    if (i.scenario === 'blownFuse') iBat = Math.max(0, iBat)                   // the loads are cut off; only the panel can still charge
    var cv = B.charge12[i.chem], vt
    var charging = panelOn && iBat > 0.05, regulating = panelOn && !charging && (i.wasteW || 0) > 1   // regulating: the battery is full and the controller holds the voltage
    if (charging || regulating) vt = (i.soc < B.absorbUntil && charging ? cv.absorb : cv.float) * i.sysV / 12
    else vt = ocv + Math.min(0, iBat) * rint                                  // discharging lowers the terminal voltage
    var rCorr = i.scenario === 'corroded' ? sc.corrodedOhm : 0.0005
    var vLug = vt - iLoad * rCorr
    var vFuseOut = i.scenario === 'blownFuse' ? 0 : vLug - iLoad * sc.fuseOhm
    var vCabInv = i.scenario === 'blownFuse' ? 0 : vFuseOut - iLoad * i.cableOhm
    var f = i.solarPeakW > 0 ? Math.min(1, i.solarW / i.solarPeakW) : 0, n = i.sysV / 12, pv = 0
    if (i.solarW > 1 && !i.isolate) pv = (charging ? n * i.panel.vmp * (0.92 + 0.08 * f) : n * i.panel.voc * (0.85 + 0.15 * f))   // disconnected, or held off by the controller: near open circuit
    var acOn = i.acOn !== false && !cut
    w.nodes = { 'bat+': vt, 'bat-': 0, lug: vLug, fuse_in: vLug, fuse_out: vFuseOut, cab_bat: vFuseOut, cab_inv: vCabInv, gap1: 0, gap2: 0, 'pv+': pv, 'pv-': 0, el1: 0, el2: 0 }
    w.ac = { ac_l: acOn ? i.region.v : 0, ac_n: 0 }; w.acV = acOn ? i.region.v : 0; w.acHz = i.region.hz; w.acOn = acOn
    w.I = iLoad; w.iLoad = iLoad; w.iBat = iBat; w.charging = charging; w.regulating = regulating
    w.cableOhm = i.cableOhm; w.rFuse = sc.fuseOhm; w.fuseBlown = i.scenario === 'blownFuse'
    w.elementOhm = sc.elementOhm; w.linkOhm = sc.linkOhm
    w.live = { 'bat+': 1, 'bat-': 1, lug: 1, fuse_in: 1, fuse_out: !cut, cab_bat: !cut, cab_inv: !cut, gap1: !cut, gap2: !cut, 'pv+': pv > 0, 'pv-': pv > 0, ac_l: acOn, ac_n: acOn, el1: 0, el2: 0 }
    w.isolate = !!i.isolate; w.cut = cut
    return w
  }

  function isAc(id) { return id === 'ac_l' || id === 'ac_n' }
  function pot(w, id) { return isAc(id) ? w.ac[id] : w.nodes[id] }
  // resistance between two nodes with the power off; null = no path (OL); 'live' = a source is involved
  function resistance(w, a, b) {
    if (a === b) return 0
    var p = [a, b].sort().join('|')
    var src = { 'bat+': 1, 'bat-': 1, 'pv+': 1, 'pv-': 1 }
    if (p === 'el1|el2') return w.elementOhm                      // the spare element is not connected to anything
    if (src[a] || src[b]) return 'live'                           // a battery or a panel is a source
    if (isAc(a) || isAc(b)) return w.acOn ? 'live' : null
    if (!w.isolate) return 'live'                                 // the DC bus is energised until the isolator is open
    if (p === 'fuse_in|fuse_out') return w.fuseBlown ? null : w.rFuse
    if (p === 'cab_bat|cab_inv') return w.cableOhm
    if (p === 'gap1|gap2') return w.linkOhm
    if (p === 'cab_bat|fuse_out') return 0
    if (p === 'fuse_in|lug') return 0
    return null                                                   // separate pieces with the isolator open: no path between them
  }

  function fmtV(v) { var a = Math.abs(v); return (v < 0 ? '-' : '') + (a >= 100 ? a.toFixed(1) : a >= 10 ? a.toFixed(2) : a.toFixed(3)) }
  function fmtOhm(r) { return r >= 1000 ? (r / 1000).toFixed(2) + ' k' : r >= 100 ? r.toFixed(1) : r >= 10 ? r.toFixed(2) : r.toFixed(3) }

  /* read(): setup = { dial, jack ('v' or 'a'), red, black (node ids or ''), rel (bool) }, B = battery.json, w = world().
     returns { display, unit, mode, beep, blown, warn, note, value } */
  M.read = function (s, B, w) {
    var m = B.meter, out = { display: '', unit: '', mode: s.dial, beep: false, blown: false, warn: '', note: '', value: null }
    if (s.dial === 'off') { out.display = ''; out.note = (s.red || s.black) ? 'The probes are placed, but the meter is off. Turn the dial to a setting.' : 'The meter is off. Turn the dial to a setting.'; return out }
    if (!s.red || !s.black) { out.display = '---'; out.note = 'Put both probes on the circuit.'; return out }
    var pa = pot(w, s.red), pb = pot(w, s.black), dv = pa - pb
    // red lead in the 10 A socket while measuring anything but current: the socket is a near-short through a 10 A fuse
    if (s.jack === 'a' && s.dial !== 'amp') {
      if (Math.abs(dv) > 0.5 && (s.dial === 'dcv' || s.dial === 'acv' || s.dial === 'ohm' || s.dial === 'cont')) { out.blown = true; out.display = '0.00'; out.warn = 'Red lead in the 10 A socket while the probes touch points ' + fmtV(Math.abs(dv)) + ' V apart: the socket is almost a short circuit, and the meter\'s ' + m.fuseA + ' A fuse blew.'; return out }
      out.display = s.dial === 'dcv' || s.dial === 'acv' ? '0.000' : 'OL'; out.unit = s.dial === 'dcv' || s.dial === 'acv' ? 'V' : ''; out.note = 'The red lead is in the 10 A socket: voltage, resistance and continuity need the V ohm socket.'; return out
    }
    if (s.dial === 'dcv') {
      if (isAc(s.red) || isAc(s.black)) { out.display = '0.000'; out.unit = 'V'; out.note = 'DC volts ignores an AC supply.'; return out }
      out.value = dv; out.display = fmtV(dv); out.unit = 'V DC'
      if (dv < -0.05) out.note = 'Minus sign: the red probe is on the lower-voltage point. The probes are reversed.'
      if ((s.red === 'bat+' && s.black === 'bat-') && (w.charging || w.regulating)) out.note = 'While a panel charges the battery, the charge controller sets this voltage (' + (w.regulating ? 'float: the battery is full' : 'absorption') + '). It is not the battery\'s resting voltage.'
      return out
    }
    if (s.dial === 'acv') {
      var da = Math.abs((isAc(s.red) ? w.ac[s.red] : 0) - (isAc(s.black) ? w.ac[s.black] : 0))
      out.value = isAc(s.red) && isAc(s.black) ? da : 0; out.display = fmtV(out.value); out.unit = 'V AC'
      if (!(isAc(s.red) && isAc(s.black))) out.note = 'AC volts reads about zero on a DC circuit.'
      return out
    }
    if (s.dial === 'ohm' || s.dial === 'cont') {
      var r = resistance(w, s.red, s.black)
      if (r === 'live') { out.display = 'OL'; out.unit = 'ohm'; out.warn = 'This part of the circuit is live. Resistance and continuity only work with the power off, and a live circuit can damage the meter. Use the isolator, then try again.'; return out }
      if (r === null) { out.display = 'OL'; out.unit = 'ohm'; out.note = 'Open: there is no path between the probes.'; return out }
      var shown = r + (s.rel ? 0 : m.leadOhm)
      out.value = shown; out.display = fmtOhm(shown); out.unit = 'ohm'
      if (s.dial === 'cont') { out.mode = 'cont'; out.beep = shown < m.beepBelowOhm; out.note = out.beep ? 'The meter beeps: there is a path.' : 'No beep: the resistance is too high.' }
      if (!s.rel && r < 1) out.note = (out.note ? out.note + ' ' : '') + 'The test leads add about ' + m.leadOhm + ' ohm; press REL with the probes together to subtract it.'
      return out
    }
    if (s.dial === 'amp') {
      var series = (s.red === 'gap1' && s.black === 'gap2') || (s.red === 'gap2' && s.black === 'gap1')
      if (series) {
        if (s.jack !== 'a') { out.display = '0.00'; out.unit = 'A'; out.note = 'The red lead is in the V ohm socket: it has almost no current path, so the circuit is now open and the load side has lost power.'; out.opened = true; return out }
        if (w.iLoad > m.fuseA) { out.blown = true; out.display = '0.00'; out.unit = 'A'; out.warn = 'The current is ' + w.iLoad.toFixed(1) + ' A and the meter\'s fuse is ' + m.fuseA + ' A: it blew. Use a clamp meter for currents above the meter\'s rating.'; return out }
        var cur = w.iLoad; out.value = cur; out.display = cur.toFixed(cur >= 10 ? 2 : 3); out.unit = 'A DC'
        out.note = 'This is the current the loads draw, in the lead that returns it to the battery' + (w.charging ? '. The panel is charging the battery at the same time, so the battery\'s own net current is different.' : '.')
        return out
      }
      // current mode across anything else: the meter is a 0.01 ohm shunt across the voltage difference
      var vAbs = Math.abs(dv)
      if (vAbs / m.shuntOhm > m.fuseA) { out.blown = true; out.display = '0.00'; out.unit = 'A'; out.warn = 'Current mode across ' + fmtV(vAbs) + ' V is a short circuit through the meter\'s ' + m.fuseA + ' A fuse. A real battery bank can supply hundreds of amps here; the fuse is what saved you. Current goes in series, in a gap in the lead.'; return out }
      out.value = vAbs / m.shuntOhm; out.display = out.value.toFixed(3); out.unit = 'A'; out.note = 'There is no gap in the circuit here, so this reading is not a circuit current.'; return out
    }
    return out
  }
  M.fmtV = fmtV

  if (typeof module !== 'undefined' && module.exports) module.exports = M
  else root.Meter = M
})(typeof window !== 'undefined' ? window : globalThis)
