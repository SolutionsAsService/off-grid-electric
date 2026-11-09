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
    var E = cap, out = { t: [], solar: [], load: [], soc: [], unmet: [] }
    var totals = { gen: 0, charged: 0, wasted: 0, load: 0, unmet: 0, minSoc: 1, blackoutH: 0 }
    var anyAc = s.loads.some(function (l) { return l.ac })
    for (var d = 0; d < days; d++) {
      var last = d === days - 1
      if (last) { totals = { gen: 0, charged: 0, wasted: 0, load: 0, unmet: 0, minSoc: 1, blackoutH: 0 } }
      for (var i = 0; i < n; i++) {
        var t = i * dt, gen = P.sunWatts(t, s.panelW, s.psh, s.derate, s.rise, s.set), load = anyAc ? (s.invStandbyW || 0) : 0
        s.loads.forEach(function (l) {
          var on = l.from <= l.to ? (t >= l.from && t < l.to) : (t >= l.from || t < l.to)
          if (on) load += l.w / (l.ac ? s.invEff : 1)
        })
        var net = gen - load, charged = 0, wasted = 0, unmet = 0
        if (net >= 0) {
          var room = cap - E, want = net * dt * s.chgEff
          charged = Math.min(room, want); wasted = (want - charged) / s.chgEff; E += charged
        } else {
          var need = -net * dt, have = E
          if (have >= need) { E -= need } else { unmet = need - have; E = 0 }
        }
        if (last) {
          totals.gen += gen * dt; totals.charged += charged; totals.wasted += wasted; totals.load += load * dt; totals.unmet += unmet
          if (unmet > 0) totals.blackoutH += dt
          totals.minSoc = Math.min(totals.minSoc, E / cap)
          out.t.push(t); out.solar.push(gen); out.load.push(load); out.soc.push(E / cap); out.unmet.push(unmet)
        }
      }
    }
    out.totals = totals; out.capWh = cap; out.floor = 1 - s.dod
    return out
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = P
  else root.Power = P
})(typeof window !== 'undefined' ? window : globalThis)
