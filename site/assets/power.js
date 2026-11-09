/* The model behind every number on this site. Pure functions, no network, no storage.
   Units: volts V, amps A, watts W, watt-hours Wh, hours h, metres m, ohms (ohm). Every assumption is a named parameter (data/model.json)
   and is printed beside the result; nothing here is a measurement of your system. */
(function (root) {
  'use strict'
  var P = {}

  // ---- the four basic relations
  P.power = function (v, a) { return v * a }                     // W = V x A
  P.current = function (w, v) { return w / v }                   // A = W / V
  P.ohmV = function (a, r) { return a * r }                      // V = I x R
  P.ohmI = function (v, r) { return v / r }                      // I = V / R
  P.ohmR = function (v, a) { return v / a }                      // R = V / I
  P.energy = function (w, h) { return w * h }                    // Wh = W x h
  // current the battery supplies to an inverter that delivers `w` watts at efficiency `eff` (0-1)
  P.inverterAmps = function (w, v, eff) { return w / eff / v }

  // ---- loads: [{ w, hours, ac }] -> energy at the battery bus per day (Wh)
  P.dailyWh = function (loads, invEff) {
    return loads.reduce(function (sum, l) { return sum + l.w * l.hours / (l.ac ? invEff : 1) }, 0)
  }

  // ---- sizing from a daily energy figure (the reverse of the simulation, with named margins)
  P.panelWatts = function (dailyBusWh, psh, derate, margin) { return dailyBusWh / (psh * derate) * margin }
  P.batteryWh = function (dailyBusWh, autonomyDays, dod) { return dailyBusWh * autonomyDays / dod }
  P.batteryAh = function (wh, v) { return wh / v }

  // ---- the day: a half-sine of sun from `rise` to `set` hours, scaled so that its energy is panelW x psh x derate
  P.sunWatts = function (t, panelW, psh, derate, rise, set) {
    if (t <= rise || t >= set) return 0
    var span = set - rise, energy = panelW * psh * derate
    var peak = energy * Math.PI / (2 * span)                    // integral of peak*sin(pi*(t-rise)/span) over the span = peak * 2*span/pi
    return peak * Math.sin(Math.PI * (t - rise) / span)
  }

  // ---- voltage drop in a two-wire DC run: both conductors carry the current
  P.voltageDrop = function (amps, oneWayMetres, ohmsPerMetre) { return 2 * oneWayMetres * amps * ohmsPerMetre }
  P.ohmsPerMetreFromPerKft = function (ohmsPerKft) { return ohmsPerKft / 304.8 }

  // ---- solar string arithmetic
  P.vocCold = function (vocStc, tempC, betaPerC) { return vocStc * (1 + betaPerC * (tempC - 25)) }
  P.string = function (p, series, parallel) {
    return { voc: p.voc * series, vmp: p.vmp * series, imp: p.imp * parallel, isc: p.isc * parallel, w: p.vmp * p.imp * series * parallel }
  }

  /* Simulate battery energy over `days` days in `stepMin` minute steps and return the last day.
     s = { panelW, psh, derate, rise, set, batV, batAh, dod, chgEff, invEff, invStandbyW, loads: [{w, ac, from, to}] }
     A load runs between `from` and `to` (hours; may wrap midnight) at `w` watts. The battery starts full on day 1. */
  P.simulate = function (s, days, stepMin) {
    days = days || 3; stepMin = stepMin || 5
    var dt = stepMin / 60, n = Math.round(24 / dt), cap = s.batV * s.batAh
    var E = cap, out = { t: [], solar: [], load: [], ac: [], dc: [], soc: [], unmet: [], batBus: [], waste: [], served: [] }
    var totals = { gen: 0, charged: 0, wasted: 0, load: 0, unmet: 0, minSoc: 1, blackoutH: 0 }
    var anyAc = s.loads.some(function (l) { return l.ac })
    for (var d = 0; d < days; d++) {
      var last = d === days - 1
      if (last) { totals = { gen: 0, charged: 0, wasted: 0, load: 0, unmet: 0, minSoc: 1, blackoutH: 0 } }
      for (var i = 0; i < n; i++) {
        var t = i * dt, gen = P.sunWatts(t, s.panelW, s.psh, s.derate, s.rise, s.set), load = anyAc ? (s.invStandbyW || 0) : 0, acW = 0, dcW = 0
        s.loads.forEach(function (l) {
          var on = l.from <= l.to ? (t >= l.from && t < l.to) : (t >= l.from || t < l.to)
          if (on) { load += l.w / (l.ac ? s.invEff : 1); if (l.ac) acW += l.w; else dcW += l.w }
        })
        var net = gen - load, charged = 0, wasted = 0, unmet = 0, batW = 0, wasteW = 0
        if (net >= 0) {
          var room = cap - E, want = net * dt * s.chgEff
          charged = Math.min(room, want); wasted = (want - charged) / s.chgEff; E += charged
          batW = charged / s.chgEff / dt; wasteW = net - batW
        } else {
          var need = -net * dt, have = E
          if (have >= need) { E -= need; batW = net } else { unmet = need - have; E = 0; batW = -have / dt }
        }
        if (last) {
          totals.gen += gen * dt; totals.charged += charged; totals.wasted += wasted; totals.load += load * dt; totals.unmet += unmet
          if (unmet > 0) totals.blackoutH += dt
          totals.minSoc = Math.min(totals.minSoc, E / cap)
          out.t.push(t); out.solar.push(gen); out.load.push(load); out.ac.push(acW); out.dc.push(dcW); out.soc.push(E / cap); out.unmet.push(unmet); out.batBus.push(batW); out.waste.push(wasteW); out.served.push(load - unmet / dt)
        }
      }
    }
    out.totals = totals; out.capWh = cap; out.floor = 1 - s.dod
    return out
  }

  // ---- helpers the pages and the gate share (so a changed rule is tested where it lives)
  P.roundUp = function (x, step) { return Math.ceil(x / step - 1e-9) * step }
  P.fuseAmps = function (amps) { return amps * 1.25 }                              // at least 125% of the continuous current
  P.restVolts = function (v12, systemV) { return v12 * systemV / 12 }              // a 24 V bank is two 12 V batteries in series
  P.recommend = function (dayBusWh, psh, derate, margin, autonomyDays, dod, v) {
    var bw = P.batteryWh(dayBusWh, autonomyDays, dod)
    return { panelW: P.panelWatts(dayBusWh, psh, derate, margin), batteryWh: bw, batteryAh: P.batteryAh(bw, v) }
  }
  P.stringStatus = function (coldVoc, limitV) {            // 'over', 'tight' (under 10% headroom) or 'ok'
    var head = (limitV - coldVoc) / limitV
    return { state: head < 0 ? 'over' : head < 0.1 ? 'tight' : 'ok', headroomV: limitV - coldVoc, headroomPct: head * 100 }
  }
  P.wireStatus = function (dropPct, targetPct) { return dropPct <= targetPct ? 'within' : 'over' }

  /* The checks behind the verdict, from a simulation `sim` of scenario `s`, with limits { maxC, invRatingW, watch }.
     Not checked: wire, fuses, surge current, panel string voltage, temperature, battery age. */
  P.checks = function (s, sim, lim) {
    var tot = sim.totals, peakBus = Math.max.apply(null, sim.load.concat([0])), peakAc = Math.max.apply(null, sim.ac.concat([0]))
    var amps = peakBus / s.batV, limitA = lim.maxC * s.batAh
    var c = { energy: { state: tot.unmet > 0 ? 'fail' : 'ok', unmetWh: tot.unmet, blackoutH: tot.blackoutH }, depth: { state: tot.minSoc < sim.floor ? 'watch' : 'ok', minSoc: tot.minSoc, floor: sim.floor },
      current: { state: amps > limitA ? 'fail' : amps > lim.watch * limitA ? 'watch' : 'ok', amps: amps, limitA: limitA, peakBusW: peakBus },
      inverter: { state: peakAc > lim.invRatingW ? 'fail' : peakAc > lim.watch * lim.invRatingW ? 'watch' : 'ok', peakAcW: peakAc, ratingW: lim.invRatingW } }
    var anyLoad = s.loads.length > 0, label
    if (!anyLoad) label = 'IDLE'
    else if (c.energy.state === 'fail') label = 'NO POWER'
    else if (c.current.state === 'fail' || c.inverter.state === 'fail') label = 'OVERLOAD'
    else if (c.depth.state === 'watch') label = 'TOO DEEP'
    else label = 'OK'
    c.label = label
    return c
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = P
  else root.Power = P
})(typeof window !== 'undefined' ? window : globalThis)
