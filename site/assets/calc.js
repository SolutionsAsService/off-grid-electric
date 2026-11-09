/* Calculators for the learning pages. Each is rendered into a <div data-calc="name">. They call assets/power.js and print the formula
   and the numbers used. Nothing is stored; the values you type are not sent anywhere. */
OG.boot(function (G) {
  'use strict'
  var P = G.P, M = G.model, A = G.appliances, S = G.state, esc = G.esc, fmt = G.fmt
  function num(id, allowNegative) { var v = parseFloat(document.getElementById(id).value); return isFinite(v) && (allowNegative || v >= 0) ? v : NaN }
  function f(id, label, val, attrs) { return '<div class="field"><label for="' + id + '">' + esc(label) + '</label><input id="' + id + '" type="number" inputmode="decimal" value="' + val + '"' + (attrs || '') + '></div>' }
  function sel(id, label, opts, val) { return '<div class="field"><label for="' + id + '">' + esc(label) + '</label><select id="' + id + '">' + opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(val) ? ' selected' : '') + '>' + esc(o[1]) + '</option>' }).join('') + '</select></div>' }
  function bind(root, fn) { root.addEventListener('input', fn); root.addEventListener('change', fn); fn() }
  function R(el, html) { el.innerHTML = html }
  var out = function (id) { return document.getElementById(id) }
  function nice(n, d) { return isFinite(n) ? fmt(n, d === undefined ? (Math.abs(n) >= 100 ? 0 : Math.abs(n) >= 10 ? 1 : 2) : d) : 'enter a number' }

  var C = {}

  // ---- Ohm's law and power: any two known, the rest follow
  C.ohm = function (el) {
    R(el, '<h3>Ohm\'s law and power</h3><div class="fields">' + sel('o-mode', 'What do you know?', [['vi', 'Volts and amps'], ['vr', 'Volts and ohms'], ['ir', 'Amps and ohms'], ['wv', 'Watts and volts']], 'vi') + f('o-a', 'First', 12, ' step="any"') + f('o-b', 'Second', 10, ' step="any"') + '</div><p class="result" id="o-out" aria-live="polite"></p><p class="small" id="o-note"></p>')
    var names = { vi: ['Volts (V)', 'Amps (A)'], vr: ['Volts (V)', 'Ohms'], ir: ['Amps (A)', 'Ohms'], wv: ['Watts (W)', 'Volts (V)'] }
    bind(el, function () {
      var m = out('o-mode').value, a = num('o-a'), b = num('o-b'), v, i, r, w
      el.querySelector('label[for="o-a"]').textContent = names[m][0]; el.querySelector('label[for="o-b"]').textContent = names[m][1]
      if (m === 'vi') { v = a; i = b; r = P.ohmR(v, i); w = P.power(v, i) } else if (m === 'vr') { v = a; r = b; i = P.ohmI(v, r); w = P.power(v, i) } else if (m === 'ir') { i = a; r = b; v = P.ohmV(i, r); w = P.power(v, i) } else { w = a; v = b; i = P.current(w, v); r = P.ohmR(v, i) }
      out('o-out').innerHTML = [['Volts', v, 'V'], ['Amps', i, 'A'], ['Ohms', r, 'ohm'], ['Watts', w, 'W']].map(function (x) { return x[0] + ' <b>' + nice(x[1]) + '</b> ' + x[2] }).join(' · ')
      out('o-note').textContent = 'V = I x R, W = V x I. For a heater or a lamp these hold exactly; for motors and electronics on AC the current and voltage can be out of step, so watts are lower than volts times amps (the power factor).'
    })
  }

  // ---- inverter current at 12, 24 and 48 V
  C.inverter = function (el) {
    R(el, '<h3>How many amps does an inverter pull from the battery?</h3><div class="fields">' + f('i-w', 'AC watts delivered', 1000, ' min="1" step="50"') + f('i-e', 'Inverter efficiency, %', Math.round(M.inverter.efficiency * 100), ' min="50" max="100"') + '</div><div class="tblwrap"><table class="t"><caption>Battery current for the load above</caption><thead><tr><th scope="col">Battery voltage</th><th scope="col" class="n">Ideal, no losses</th><th scope="col" class="n">With the efficiency above</th></tr></thead><tbody id="i-body"></tbody></table></div><p class="small">Amps = watts / efficiency / volts. The same power at a higher system voltage is a smaller current, which means thinner wire, smaller fuses and less voltage drop.</p>')
    bind(el, function () {
      var w = num('i-w'), e = num('i-e') / 100
      out('i-body').innerHTML = [12, 24, 48].map(function (v) { return '<tr><th scope="row">' + v + ' V</th><td class="n">' + nice(P.inverterAmps(w, v, 1)) + ' A</td><td class="n">' + nice(P.inverterAmps(w, v, e)) + ' A</td></tr>' }).join('')
    })
  }

  // ---- energy: watts x hours
  C.energy = function (el) {
    R(el, '<h3>Watts, hours and watt-hours</h3><div class="fields">' + f('e-w', 'Watts', 120, ' min="0" step="any"') + f('e-h', 'Hours per day', 5, ' min="0" max="24" step="any"') + '</div><p class="result" id="e-out" aria-live="polite"></p><p class="small">Energy (Wh) = power (W) x time (h). A battery stores watt-hours, not watts: 100 Ah at 12 V is 1,200 Wh.</p>')
    bind(el, function () { var w = num('e-w'), h = num('e-h'), wh = P.energy(w, h); out('e-out').innerHTML = '<b>' + nice(wh) + '</b> Wh a day (' + nice(wh / 1000, 2) + ' kWh) · a 12 V battery would give up ' + nice(P.batteryAh(wh, 12)) + ' Ah for it' })
  }

  // ---- a solar string
  C.string = function (el) {
    var ex = M.panel.examples
    R(el, '<h3>Build a string and check the cold-morning voltage</h3><div class="fields">' + sel('s-p', 'Panel', Object.keys(ex).map(function (k) { return [k, ex[k].label] }), 'large') + f('s-n', 'Panels in series', 2, ' min="1" max="20" step="1"') + f('s-m', 'Strings in parallel', 1, ' min="1" max="10" step="1"') + f('s-t', 'Coldest expected temperature, C', -10, ' step="1"') + f('s-c', 'Charge controller maximum input, V', 100, ' min="1" step="1"') + '</div><div class="tblwrap"><table class="t"><caption>The string</caption><thead><tr><th scope="col">Quantity</th><th scope="col" class="n">Value</th><th scope="col">Meaning</th></tr></thead><tbody id="s-body"></tbody></table></div><p class="result" id="s-out" role="status"></p><p class="small">Cold Voc = Voc x (1 + b x (T - 25)), with b = ' + M.panel.betaPerC + ' per degree C, a typical value for crystalline silicon. Use the figures on your own panel\'s datasheet.</p>')
    bind(el, function () {
      var p = ex[out('s-p').value], n = Math.max(1, Math.round(num('s-n'))), m = Math.max(1, Math.round(num('s-m'))), T = num('s-t', true), cmax = num('s-c')
      var s = P.string(p, n, m), cold = P.vocCold(s.voc, T, M.panel.betaPerC)
      out('s-body').innerHTML = [['Voc at 25 C, open circuit', s.voc, 'V', 'The voltage across the string with nothing connected, at the standard test temperature. It is present whenever there is light, and it rises when the panels are colder.'], ['Vmp, at maximum power', s.vmp, 'V', 'The voltage while the controller is drawing full power.'], ['Imp', s.imp, 'A', 'Current at maximum power (strings in parallel add).'], ['Isc, short circuit', s.isc, 'A', 'The most the string can push into a fault.'], ['Power at the label rating', s.w, 'W', 'Vmp x Imp x panels, at standard test conditions.'], ['Voc at the coldest temperature', cold, 'V', 'Voltage rises as panels get colder.']].map(function (r) { return '<tr><th scope="row">' + r[0] + '</th><td class="n">' + nice(r[1], 1) + ' ' + r[2] + '</td><td>' + r[3] + '</td></tr>' }).join('')
      var st = P.stringStatus(cold, cmax)
      out('s-out').innerHTML = (st.state === 'ok' ? '<b>Within limit</b> ' : st.state === 'tight' ? '<b>Too close</b> ' : '<b>Over the limit</b> ') + 'The cold-morning Voc is ' + nice(cold, 1) + ' V against a controller maximum of ' + nice(cmax, 0) + ' V' + (st.state === 'over' ? '. This string could destroy the controller on a cold, clear morning. Use fewer panels in series.' : ' (' + nice(st.headroomV, 1) + ' V, ' + nice(st.headroomPct, 1) + '% of headroom).' + (st.state === 'tight' ? ' That is under 10%: a colder night than you planned, or a panel that reads high, would put it over. Leave a margin, and check your panel datasheet\'s own temperature coefficient.' : ' Real panels vary and cold snaps happen; keep a margin.'))
    })
  }

  // ---- the loads budget and sizing
  C.budget = function (el) {
    R(el, '<h3>Your daily energy budget</h3><div class="tblwrap"><table class="t"><caption>Switch loads on or off in the Simulator; they carry here</caption><thead><tr><th scope="col">Load</th><th scope="col" class="n">Watts</th><th scope="col" class="n">Hours</th><th scope="col" class="n">Wh at the battery</th></tr></thead><tbody id="b-body"></tbody><tfoot><tr><th scope="row" colspan="3">Total per day</th><td class="n" id="b-tot"></td></tr></tfoot></table></div><p class="small" id="b-note"></p>')
    var on = A.filter(function (a) { return S.l.indexOf(a.id) !== -1 }), rows = '', total = 0, anyAc = false
    on.forEach(function (a) { var h = a.to > a.from ? a.to - a.from : 24 - a.from + a.to, wh = a.w * h / (a.ac ? M.inverter.efficiency : 1); total += wh; if (a.ac) anyAc = true; rows += '<tr><th scope="row">' + esc(a.name) + (a.ac ? ' (AC)' : ' (DC)') + '</th><td class="n">' + fmt(a.w) + '</td><td class="n">' + fmt(h, h % 1 ? 2 : 0) + '</td><td class="n">' + fmt(wh) + '</td></tr>' })
    if (anyAc) { total += M.inverter.standbyW * 24; rows += '<tr><th scope="row">Inverter standby</th><td class="n">' + M.inverter.standbyW + '</td><td class="n">24</td><td class="n">' + fmt(M.inverter.standbyW * 24) + '</td></tr>' }
    out('b-body').innerHTML = rows || '<tr><td colspan="4">No loads are switched on. Open the Simulator and flip some breakers.</td></tr>'
    out('b-tot').textContent = fmt(total) + ' Wh'
    out('b-note').textContent = 'AC loads are divided by the inverter efficiency (' + Math.round(M.inverter.efficiency * 100) + '%) because the battery supplies more than the appliance receives.'
    C._dayBus = total
  }
  C.sizing = function (el) {
    R(el, '<h3>Panels and battery for that budget</h3><div class="fields">' + f('z-psh', 'Peak sun hours', S.sun, ' min="1" max="8" step="0.5"') + sel('z-c', 'Battery type', Object.keys(M.chemistries).map(function (k) { return [k, M.chemistries[k].label] }), S.c) + sel('z-v', 'System voltage', [[12, '12 V'], [24, '24 V'], [48, '48 V']], S.v) + f('z-d', 'Days without sun to cover', M.sizing.autonomyDays, ' min="1" max="7" step="1"') + '</div><div class="tblwrap"><table class="t"><caption>The arithmetic</caption><tbody id="z-body"></tbody></table></div><p class="small">These are rules of thumb with printed margins. They are a starting point for a conversation with an installer, not a design.</p>')
    bind(el, function () {
      var day = C._dayBus || 0, psh = num('z-psh'), ch = M.chemistries[out('z-c').value], v = +out('z-v').value, d = num('z-d')
      var rec = P.recommend(day, psh, M.derate, M.sizing.margin, d, ch.dod, v), pw = rec.panelW, bw = rec.batteryWh, ahN = rec.batteryAh
      out('z-body').innerHTML = [
        ['Daily need at the battery', nice(day) + ' Wh', 'from the table above'],
        ['Panel watts', nice(pw) + (isFinite(pw) ? ' W (about ' + fmt(P.roundUp(pw, 50)) + ' W in whole panels)' : ''), nice(day) + ' / (' + psh + ' h x ' + M.derate + ') x ' + M.sizing.margin + ' margin'],
        ['Battery energy', nice(bw) + ' Wh', nice(day) + ' x ' + d + ' days / ' + ch.dod + ' usable'],
        ['Battery capacity', nice(ahN) + (isFinite(ahN) ? ' Ah at ' + v + ' V (about ' + fmt(P.roundUp(ahN, 25)) + ' Ah)' : ''), nice(bw) + ' Wh / ' + v + ' V'],
        ['Charge current at noon, at most', nice(pw / v) + ' A', 'panel watts / battery volts, before losses']
      ].map(function (r) { return '<tr><th scope="row">' + r[0] + '</th><td class="n">' + r[1] + '</td><td>' + esc(r[2]) + '</td></tr>' }).join('')
    })
  }

  // ---- wire voltage drop (AWG and metric sizes)
  function sizes() {
    var a = G.awg.map(function (r) { var d = 0.127 * Math.pow(92, (36 - r.n) / 39), area = Math.PI * d * d / 4; return { key: 'awg' + r.awg, label: 'AWG ' + r.awg + ' (' + area.toFixed(1) + ' mm2)', ohmsPerM: P.ohmsPerMetreFromPerKft(r.ohmsPerKft) } })
    var m = G.metric.map(function (mm) { return { key: 'mm' + mm, label: mm + ' mm2', ohmsPerM: 0.01724 / mm } })
    return a.concat(m).sort(function (x, y) { return y.ohmsPerM - x.ohmsPerM })
  }
  C.wire = function (el) {
    var all = sizes()
    R(el, '<h3>Is this wire thick enough?</h3><div class="fields">' + f('w-a', 'Current, amps', 40, ' min="0" step="any"') + f('w-l', 'One-way length', 5, ' min="0" step="any"') + sel('w-u', 'Length in', [['m', 'metres'], ['ft', 'feet']], 'm') + f('w-v', 'System voltage', S.v, ' min="1" step="1"') + sel('w-g', 'Copper wire size', all.map(function (z) { return [z.key, z.label] }), 'mm16') + '</div><div class="tblwrap"><table class="t"><caption>Voltage drop for every size</caption><thead><tr><th scope="col">Size</th><th scope="col" class="n">Drop, volts</th><th scope="col" class="n">Drop, % of system</th><th scope="col">Against ' + M.wire.dropTargetPct + '%</th></tr></thead><tbody id="w-body"></tbody></table></div><p class="result" id="w-out" role="status"></p><p class="small">Drop = 2 x length x current x resistance per metre (both conductors carry the current). Resistance is for copper at 20 C; a hot wire is a little higher. Staying under about ' + M.wire.dropTargetPct + '% is common guidance, not a rule. <strong>This is voltage drop only.</strong> How much current a wire can carry safely, and what fuse protects it, depends on insulation, temperature, bundling and your local code; ask an electrician.</p>')
    bind(el, function () {
      var a = num('w-a'), l = num('w-l') * (out('w-u').value === 'ft' ? 0.3048 : 1), v = num('w-v'), pick = out('w-g').value
      var rows = all.map(function (z) { var drop = P.voltageDrop(a, l, z.ohmsPerM), p = 100 * drop / v; return { key: z.key, label: z.label, drop: drop, pct: p, ok: P.wireStatus(p, M.wire.dropTargetPct) === 'within' } })
      out('w-body').innerHTML = rows.map(function (r) { return '<tr' + (r.key === pick ? ' aria-current="true"' : '') + '><th scope="row">' + r.label + (r.key === pick ? ' (chosen)' : '') + '</th><td class="n">' + nice(r.drop, 2) + '</td><td class="n">' + nice(r.pct, 1) + '%</td><td>' + (r.ok ? 'drop ok' : 'drop over') + '</td></tr>' }).join('')
      var c = rows.filter(function (r) { return r.key === pick })[0], first = rows.filter(function (r) { return r.ok }).pop()
      var thin = rows.filter(function (r) { return r.ok })
      out('w-out').innerHTML = isFinite(a) && isFinite(l) && isFinite(v) && v > 0 ? (a > 30 ? '<b>First: voltage drop is not the wire\'s current rating.</b> At ' + nice(a, 0) + ' A the wire\'s rating and a fault current matter more, and a thin wire that passes the drop test can overheat; an electrician sets the size. ' : '') + '<b>' + nice(c.pct, 1) + '%</b> drop with ' + c.label + ' (' + nice(c.drop, 2) + ' V of ' + nice(v, 0) + ' V). ' + (c.ok ? 'That is within ' + M.wire.dropTargetPct + '%.' : thin.length ? 'The thinnest size in this table within ' + M.wire.dropTargetPct + '% drop is ' + thin[0].label + ' (for the drop only).' : 'No size in this table is within ' + M.wire.dropTargetPct + '% at this current and length: raise the system voltage or shorten the run.') + ' A fuse on the positive conductor near the battery should be at least ' + fmt(Math.ceil(P.fuseAmps(a))) + ' A (125% of this current, rounded up) and no more than the wire is rated for; this tool does not check the wire\'s rating.' : 'Enter numbers above zero.'
    })
  }

  // ---- data-driven tables
  function table(el, caption, head, rows) { R(el, '<div class="tblwrap"><table class="t"><caption>' + esc(caption) + '</caption><thead><tr>' + head.map(function (h, i) { return '<th scope="col"' + (i && /^[0-9]/.test(rows[0][i]) ? ' class="n"' : '') + '>' + esc(h) + '</th>' }).join('') + '</tr></thead><tbody>' + rows.map(function (r) { return '<tr><th scope="row">' + esc(r[0]) + '</th>' + r.slice(1).map(function (c, i) { return '<td' + (/^[0-9]/.test(c) ? ' class="n"' : '') + '>' + esc(c) + '</td>' }).join('') + '</tr>' }).join('') + '</tbody></table></div>') }
  C.regions = function (el, d) { table(el, 'Mains supply by region (nominal)', ['Region', 'Voltage', 'Frequency', 'Note'], d.regions.map(function (r) { return [r.name, r.v, r.hz, r.note] })) }
  C.rest = function (el, d) {
    var rows = d.lead.map(function (r) { return [r.soc + '%', P.restVolts(r.v12, 12).toFixed(1) + ' V', P.restVolts(r.v12, 24).toFixed(1) + ' V', P.restVolts(r.v12, 48).toFixed(1) + ' V'] })
    table(el, 'Flooded lead-acid, resting for several hours (approximate)', ['State of charge', '12 V battery', '24 V bank', '48 V bank'], rows)
  }

  var needsData = ['regions', 'rest']
  var els = document.querySelectorAll('[data-calc]')
  var order = ['budget', 'sizing']
  Array.prototype.slice.call(els).sort(function (a, b) { return order.indexOf(a.getAttribute('data-calc')) - order.indexOf(b.getAttribute('data-calc')) }).forEach(function (el) {
    var k = el.getAttribute('data-calc')
    if (needsData.indexOf(k) !== -1) { fetch('data/' + (k === 'regions' ? 'regions' : 'rest') + '.json').then(function (r) { return r.json() }).then(function (d) { C[k](el, d) }) }
    else if (C[k]) C[k](el)
  })
})
