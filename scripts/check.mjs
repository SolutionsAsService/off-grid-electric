// The gate: node scripts/check.mjs
//  - pages: links and anchors, no external request (two named links excepted), no inline script or style, balanced markup, nothing after </html>,
//    no emoji, banned claims, descriptions and favicons
//  - the model (site/assets/power.js): worked examples recomputed independently, energy conservation in the simulation, a no-sun and a no-load case
//  - the data: wire resistances recomputed from AWG diameters, appliance schedules, battery rest voltage scaling, region fields
//  - every number printed in the page text that comes from the model is recomputed and compared
//  - the theme: contrast of text and accent colours in the dark and the light scheme, and the --sun accent mix; minimum SVG text sizes
//  - vercel.json: the headers and no catch-all rewrite
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const site = path.join(root, 'site')
const read = (f) => fs.readFileSync(path.join(site, f), 'utf8')
const problems = []
const bad = (m) => problems.push(m)
const require = createRequire(import.meta.url)
const P = require(path.join(site, 'assets/power.js'))
const model = JSON.parse(read('data/model.json'))
const apps = JSON.parse(read('data/appliances.json'))
const awg = JSON.parse(read('data/awg.json')).rows
const close = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b))

// ---------------------------------------------------------------- pages
const pages = fs.readdirSync(site).filter((f) => f.endsWith('.html'))
const ALLOWED = ['https://github.com/SolutionsAsService/off-grid-electric']
const BANNED = ['complete guide', 'complete digital multimeter', 'mastering', 'from the ground up', 'designing reliable', 'beginner to advanced', 'single most useful', 'state-of-the-art', 'cutting-edge', 'world-class', 'one-stop', 'doctor\'s stethoscope']
for (const p of pages) {
  const html = read(p)
  if (!/^<!DOCTYPE html>/i.test(html)) bad(`${p}: no doctype`)
  if (!/<\/html>\s*$/.test(html)) bad(`${p}: text after </html>`)
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const u = m[1]
    if (/^(#|mailto:|data:)/.test(u)) continue
    if (/^https?:/.test(u)) { if (!ALLOWED.includes(u) && u !== 'https://demo.ultimatebusinessmachines.com/portfolio') bad(`${p}: external reference ${u}`); continue }
    const f = u.split('#')[0].split('?')[0]
    if (f && !fs.existsSync(path.join(site, f))) bad(`${p}: dead link ${u}`)
    const hash = u.split('#')[1]
    if (hash && f && f.endsWith('.html') && !new RegExp(`id="${hash}"`).test(read(f))) bad(`${p}: dead anchor ${u}`)
  }
  if (/<script(?![^>]*\ssrc=)[^>]*>/.test(html)) bad(`${p}: inline script`)
  if (/\sstyle="/.test(html) || /<style[\s>]/.test(html)) bad(`${p}: inline style`)
  if (!/<meta name="description"/.test(html)) bad(`${p}: no meta description`)
  if (!/<link rel="icon"/.test(html)) bad(`${p}: no favicon`)
  if (/\p{Extended_Pictographic}/u.test(html)) bad(`${p}: emoji in the page`)
  if (/```/.test(html)) bad(`${p}: stray code fence`)
  const text = html.replace(/<script[\s\S]*?<\/script>|<[^>]+>/g, ' ').toLowerCase()
  for (const w of BANNED) if (text.includes(w)) bad(`${p}: banned phrase "${w}"`)
  // balanced structural tags
  for (const tag of ['main', 'section', 'div', 'table', 'ul', 'ol', 'thead', 'tbody', 'tr']) {
    const open = (html.match(new RegExp(`<${tag}[\\s>]`, 'g')) || []).length, close = (html.match(new RegExp(`</${tag}>`, 'g')) || []).length
    if (open !== close) bad(`${p}: ${open} <${tag}> but ${close} </${tag}>`)
  }
  if (!/<h1[\s>]/.test(html) && p !== 'index.html') bad(`${p}: no h1`)
}
for (const f of fs.readdirSync(path.join(site, 'assets'))) {
  const src = read('assets/' + f)
  if (f.endsWith('.js') && /\b(XMLHttpRequest|sendBeacon|WebSocket|EventSource|localStorage|sessionStorage|document\.cookie|indexedDB|eval\()/.test(src)) bad(`assets/${f}: network call to another site, storage or eval`)
  if (f.endsWith('.js')) for (const m of src.matchAll(/fetch\(\s*([^)]+)\)/g)) if (!/^'data\/|^url$|^'data\/' \+/.test(m[1].trim())) bad(`assets/${f}: fetch of ${m[1].trim()} (only data/ is allowed)`)
  if (f.endsWith('.css') && /@import|url\(\s*['"]?https?:/.test(src)) bad(`assets/${f}: external reference`)
}

// ---------------------------------------------------------------- the model, recomputed independently
if (P.power(12, 10) !== 120) bad('model: 12 V x 10 A should be 120 W')
if (!close(P.current(1000, 12), 1000 / 12)) bad('model: 1000 W at 12 V')
if (!close(P.inverterAmps(1000, 12, 1), 83.33333333333333) || !close(P.inverterAmps(1000, 12, 0.9), 92.5925925925926)) bad('model: inverter amps (83.3 A ideal, 92.6 A at 90%)')
if (!close(P.inverterAmps(1000, 48, 1), P.inverterAmps(1000, 12, 1) / 4)) bad('model: 48 V should carry a quarter of the 12 V current')
if (!close(P.ohmI(12, 4), 3) || !close(P.ohmV(2, 6), 12) || !close(P.ohmR(12, 3), 4)) bad('model: Ohm\'s law')
if (P.energy(120, 5) !== 600) bad('model: 120 W x 5 h should be 600 Wh')
{ // a day's energy and a day of sun
  const sun = (w) => { let s = 0; for (let t = 0; t < 24; t += 0.01) s += P.sunWatts(t, w, model.sun.psh, model.derate, model.sun.rise, model.sun.set) * 0.01; return s }
  if (Math.abs(sun(400) - 400 * model.sun.psh * model.derate) / 1350 > 0.002) bad(`model: the sun curve should integrate to panel W x sun hours x derate (got ${sun(400).toFixed(1)}, want 1350)`)
  if (P.sunWatts(5, 400, 4.5, 0.75, 6, 18) !== 0 || P.sunWatts(19, 400, 4.5, 0.75, 6, 18) !== 0) bad('model: no sun before sunrise or after sunset')
  if (!close(P.sunWatts(12, 400, 4.5, 0.75, 6, 18), 1350 * Math.PI / 24)) bad('model: noon peak should be E x pi / 24')
}
if (!close(P.dailyWh([{ w: 40, hours: 24, ac: true }, { w: 24, hours: 5, ac: false }], 0.9), 40 * 24 / 0.9 + 120)) bad('model: dailyWh')
if (!close(P.panelWatts(2000, 4.5, 0.75, 1.25), 2000 / (4.5 * 0.75) * 1.25) || !close(P.batteryWh(2000, 2, 0.8), 5000) || !close(P.batteryAh(5000, 12), 5000 / 12)) bad('model: sizing')
{ // wire: 10 A, 10 m one way, AWG 10 at 0.9989 ohm per 1000 ft, on 12 V
  const r = P.ohmsPerMetreFromPerKft(0.9989), drop = P.voltageDrop(10, 10, r)
  if (!close(drop, 2 * 10 * 10 * 0.9989 / 304.8, 1e-12) || Math.abs(100 * drop / 12 - 5.46) > 0.01) bad(`model: voltage drop (got ${drop.toFixed(4)} V, ${(100 * drop / 12).toFixed(2)}%)`)
}
if (!close(P.vocCold(44.6, -10, -0.003), 44.6 * 1.105) || Math.abs(P.vocCold(44.6, -10, -0.003) - 49.283) > 1e-9) bad('model: cold Voc of 44.6 V at -10 C should be 49.283 V')
{ const s = P.string({ voc: 44.6, vmp: 37.2, imp: 10.75, isc: 11.4 }, 2, 3); if (!close(s.voc, 89.2) || !close(s.isc, 34.2) || !close(s.imp, 32.25) || !close(s.w, 37.2 * 10.75 * 6)) bad('model: string arithmetic (2 in series, 3 in parallel)') }

// ---------------------------------------------------------------- the simulation
const base = { panelW: 400, psh: 4.5, derate: 0.75, rise: 6, set: 18, batV: 12, batAh: 200, dod: 0.8, chgEff: 0.95, invEff: 0.9, invStandbyW: 10, loads: [{ w: 60, ac: true, from: 0, to: 24 }, { w: 24, ac: false, from: 18, to: 23 }] }
{ // an independent naive simulation (written here, not imported) must agree with P.simulate on three scenarios
  const naive = (s, days) => {
    const dt = 1 / 12, cap = s.batV * s.batAh; let E = cap, last
    for (let d = 0; d < days; d++) {
      last = { gen: 0, load: 0, unmet: 0, min: 1 }
      for (let i = 0; i < 288; i++) {
        const t = i * dt
        const span = s.set - s.rise, peak = s.panelW * s.psh * s.derate * Math.PI / (2 * span)
        const gen = t > s.rise && t < s.set ? peak * Math.sin(Math.PI * (t - s.rise) / span) : 0
        let load = s.loads.some((l) => l.ac) ? s.invStandbyW : 0
        for (const l of s.loads) if (l.from <= l.to ? (t >= l.from && t < l.to) : (t >= l.from || t < l.to)) load += l.ac ? l.w / s.invEff : l.w
        const net = gen - load
        if (net >= 0) E = Math.min(cap, E + net * dt * s.chgEff)
        else { const need = -net * dt; if (E >= need) E -= need; else { last.unmet += need - E; E = 0 } }
        last.gen += gen * dt; last.load += load * dt; last.min = Math.min(last.min, E / cap)
      }
    }
    return last
  }
  for (const sc of [base, { ...base, panelW: 900, batAh: 100 }, { ...base, panelW: 100, loads: [...base.loads, { w: 1500, ac: true, from: 12, to: 12.25 }] }]) {
    const a = P.simulate(sc, 4, 5).totals, b = naive(sc, 4)
    if (Math.abs(a.gen - b.gen) > 1e-6 || Math.abs(a.load - b.load) > 1e-6 || Math.abs(a.unmet - b.unmet) > 1e-6 || Math.abs(a.minSoc - b.min) > 1e-9) bad('simulation: disagrees with the independent naive simulation')
  }
  const t = P.simulate(base, 4, 5).totals
  if (!close(t.gen, 1350, 1e-3)) bad(`simulation: a 400 W array at 4.5 sun hours and a 0.75 derate makes 1350 Wh (got ${t.gen.toFixed(1)})`)
  if (!close(t.load, (60 / 0.9 + 10) * 24 + 24 * 5, 1e-9)) bad(`simulation: load energy (got ${t.load.toFixed(1)})`)
  if (P.simulate(base, 4, 5).soc.some((x) => x < -1e-12 || x > 1 + 1e-12)) bad('simulation: state of charge left [0, 1]')
}
{ // no sun: 100 W DC all day on 1200 Wh, starting full, loses the second half of the day
  const r = P.simulate({ ...base, panelW: 0, batAh: 100, loads: [{ w: 100, ac: false, from: 0, to: 24 }] }, 1, 5)
  if (Math.abs(r.totals.unmet - 1200) > 1e-6 || Math.abs(r.totals.blackoutH - 12) > 0.1) bad(`simulation: 100 W for 24 h from 1200 Wh leaves 1200 Wh unmet over 12 h (got ${r.totals.unmet.toFixed(1)} Wh, ${r.totals.blackoutH.toFixed(2)} h)`)
}
{ // no load: nothing is drawn, the battery stays full and wastes the sun
  const r = P.simulate({ ...base, loads: [] }, 2, 5)
  if (r.totals.minSoc !== 1 || r.totals.unmet !== 0 || r.totals.load !== 0) bad('simulation: with no loads the battery should stay full')
}
{ // more panels never make things worse; more load never makes them better
  const m = (o) => P.simulate({ ...base, ...o }, 3, 5).totals.minSoc
  if (m({ panelW: 800 }) < m({ panelW: 400 }) - 1e-12) bad('simulation: more panel should not lower the minimum charge')
  if (m({ loads: [...base.loads, { w: 500, ac: true, from: 0, to: 24 }] }) > m({}) + 1e-12) bad('simulation: more load should not raise the minimum charge')
}

// ---------------------------------------------------------------- the helpers the pages share, and the checks behind the verdict
if (P.roundUp(740, 50) !== 750 || P.roundUp(750, 50) !== 750 || P.roundUp(416, 25) !== 425 || P.roundUp(425, 25) !== 425) bad('model: roundUp')
if (!close(P.fuseAmps(40), 50)) bad('model: the fuse should be at least 125% of the continuous current')
if (!close(P.restVolts(12.7, 24), 25.4) || !close(P.restVolts(12.7, 48), 50.8)) bad('model: a 24 V bank rests at twice and a 48 V bank at four times the 12 V figure')
{ const r = P.recommend(1997, 4.5, 0.75, 1.25, 2, 0.8, 12); if (!close(r.panelW, 1997 / (4.5 * 0.75) * 1.25) || !close(r.batteryWh, 1997 * 2 / 0.8) || !close(r.batteryAh, 1997 * 2 / 0.8 / 12)) bad('model: recommend') }
{ const a = P.stringStatus(98.6, 100), b = P.stringStatus(89.2, 100), c = P.stringStatus(101, 100); if (a.state !== 'tight' || b.state !== 'ok' || c.state !== 'over') bad('model: a string within 10% of the controller limit is "tight", over the limit is "over"') }
if (P.wireStatus(2.9, 3) !== 'within' || P.wireStatus(3.1, 3) !== 'over') bad('model: wireStatus')
{
  const mk = (o) => ({ panelW: 800, psh: 4.5, derate: 0.75, rise: 6, set: 18, batV: 12, batAh: 200, dod: 0.8, chgEff: 0.95, invEff: 0.9, invStandbyW: 10, loads: [{ w: 40, ac: true, from: 0, to: 24 }], ...o })
  const run = (o, lim) => { const s = mk(o), sim = P.simulate(s, 3, 5); return { s, sim, c: P.checks(s, sim, { maxC: 1, invRatingW: 2000, watch: 0.8, ...lim }) } }
  // every flow balances: served = solar used - battery bus power, and never exceeds demand
  { const { sim } = run({ loads: [{ w: 1500, ac: true, from: 12, to: 12.25 }, { w: 40, ac: true, from: 0, to: 24 }] }); for (let i = 0; i < sim.t.length; i++) { if (Math.abs(sim.served[i] - (sim.solar[i] - sim.waste[i] - sim.batBus[i])) > 1e-6 || sim.served[i] > sim.load[i] + 1e-6 || sim.waste[i] < -1e-9) { bad(`simulation: flows do not balance at step ${i}`); break } } }
  { const { sim } = run({ panelW: 0, batAh: 20 }); const k = sim.unmet.findIndex((u) => u > 0); if (k < 0 || sim.served[k] >= sim.load[k]) bad('simulation: a blackout step must serve less than the demand') }
  const dflt = run({}); if (dflt.c.label !== 'OK') bad(`checks: a 40 W fridge on 800 W and 200 Ah should be OK (got ${dflt.c.label})`)
  if (run({ loads: [] }).c.label !== 'IDLE') bad('checks: no loads is IDLE')
  if (run({ panelW: 0, batAh: 20, loads: [{ w: 100, ac: false, from: 0, to: 24 }] }).c.label !== 'NO POWER') bad('checks: an empty battery is NO POWER')
  if (run({ panelW: 800, batAh: 100, dod: 0.8, loads: [{ w: 90, ac: false, from: 18, to: 6 }] }).c.label !== 'TOO DEEP') bad('checks: a battery below its floor is TOO DEEP')
  { const k = run({ batAh: 200, loads: [{ w: 1500, ac: true, from: 12, to: 12.25 }, { w: 40, ac: true, from: 0, to: 24 }] }, { maxC: 0.25 }); if (k.c.label !== 'OVERLOAD' || k.c.current.state !== 'fail') bad('checks: 1,700 W from a 200 Ah lead-acid battery at 0.25C (50 A) must be an OVERLOAD'); if (!close(k.c.current.limitA, 50) || Math.abs(k.c.current.amps - (1500 / 0.9 + 10 + 40 / 0.9) / 12) > 1e-6) bad('checks: peak battery amps = bus watts / volts, limit = C x Ah') }
  { const k = run({ loads: [{ w: 2500, ac: true, from: 12, to: 12.25 }] }, {}); if (k.c.inverter.state !== 'fail' || k.c.label !== 'OVERLOAD') bad('checks: 2,500 W of AC on a 2,000 W inverter must be an OVERLOAD') }
  { const k = run({ loads: [{ w: 1700, ac: true, from: 12, to: 12.25 }] }, {}); if (k.c.inverter.state !== 'watch') bad('checks: 1,700 W on a 2,000 W inverter (85%) should be WATCH') }
}

// ---------------------------------------------------------------- the reviewed design constants (change them on purpose: update here too)
{
  const pin = (what, got, want) => { if (JSON.stringify(got) !== JSON.stringify(want)) bad(`model.json: ${what} is ${JSON.stringify(got)}, the reviewed value is ${JSON.stringify(want)}`) }
  pin('derate', model.derate, 0.75); pin('sun', [model.sun.rise, model.sun.set, model.sun.psh], [6, 18, 4.5])
  pin('inverter', [model.inverter.efficiency, model.inverter.standbyW, model.inverter.ratingW], [0.9, 10, 2000])
  pin('lifepo4', [model.chemistries.lifepo4.dod, model.chemistries.lifepo4.chargeEfficiency, model.chemistries.lifepo4.maxDischargeC], [0.8, 0.95, 1])
  pin('lead-acid', [model.chemistries.lead.dod, model.chemistries.lead.chargeEfficiency, model.chemistries.lead.maxDischargeC], [0.5, 0.85, 0.25])
  pin('sizing', [model.sizing.margin, model.sizing.autonomyDays], [1.25, 2]); pin('panel beta', model.panel.betaPerC, -0.003); pin('wire target', model.wire.dropTargetPct, 3); pin('watch fraction', model.checks.watchFraction, 0.8)
  pin('appliance watts', apps.map((a) => [a.id, a.w, a.ac]), [['fridge', 40, true], ['lights', 24, false], ['router', 12, false], ['laptop', 50, true], ['pump', 60, false], ['tv', 80, true], ['microwave', 1500, true], ['kettle', 1800, true]])
  const regions = JSON.parse(read('data/regions.json')).regions
  pin('mains', regions.map((r) => [r.name, r.v, r.hz]), [['United States and Canada', '120 V', '60 Hz'], ['United Kingdom', '230 V', '50 Hz'], ['Most of the European Union', '230 V', '50 Hz'], ['Australia', '230 V', '50 Hz'], ['India', '230 V', '50 Hz'], ['Japan', '100 V', '50 Hz east, 60 Hz west']])
  pin('rest voltages (12 V, flooded lead-acid)', JSON.parse(read('data/rest.json')).lead.map((r) => [r.soc, r.v12]), [[100, 12.7], [75, 12.4], [50, 12.2], [25, 12], [0, 11.8]])
}

// ---------------------------------------------------------------- the data
for (const r of awg) { // the wire table, recomputed from the AWG diameter formula and copper's resistivity at 20 C
  const d = 0.127 * 92 ** ((36 - r.n) / 39), area = Math.PI * d * d / 4, calc = 1.724e-8 * 304.8 / (area * 1e-6)
  if (Math.abs(calc / r.ohmsPerKft - 1) > 0.005) bad(`awg.json: AWG ${r.awg} is ${r.ohmsPerKft} but the diameter formula gives ${calc.toFixed(4)}`)
}
for (let i = 1; i < awg.length; i++) if (!(awg[i].ohmsPerKft < awg[i - 1].ohmsPerKft)) bad('awg.json: thicker wire should have lower resistance, in order')
for (const a of apps) {
  if (!(a.w > 0) || !(a.from >= 0 && a.from < 24 && a.to > 0 && a.to <= 24)) bad(`appliances.json: ${a.id} has a bad watts or schedule`)
  if (!a.name || typeof a.ac !== 'boolean') bad(`appliances.json: ${a.id} needs a name and an ac flag`)
}
if (!(model.derate > 0 && model.derate < 1) || !(model.inverter.efficiency > 0 && model.inverter.efficiency < 1)) bad('model.json: derate and efficiency should be between 0 and 1')
for (const [k, c] of Object.entries(model.chemistries)) if (!(c.dod > 0 && c.dod <= 1 && c.chargeEfficiency > 0 && c.chargeEfficiency <= 1)) bad(`model.json: ${k} depth or efficiency out of range`)
{
  const rest = JSON.parse(read('data/rest.json')).lead
  for (let i = 1; i < rest.length; i++) if (!(rest[i].v12 < rest[i - 1].v12 && rest[i].soc < rest[i - 1].soc)) bad('rest.json: voltage and charge should fall together')
  if (rest[0].v12 < 12.6 || rest[0].v12 > 12.8) bad('rest.json: a full flooded lead-acid battery rests at 12.6 to 12.8 V')
  const regions = JSON.parse(read('data/regions.json')).regions
  if (!regions.some((r) => /Japan/.test(r.name)) || !regions.every((r) => r.name && r.v && r.hz)) bad('regions.json: every region needs name, voltage and frequency, and Japan must be listed')
}

// ---------------------------------------------------------------- numbers printed in the page text
const text = (f) => read(f).replace(/<script[\s\S]*?<\/script>|<[^>]+>/g, ' ').replace(/\s+/g, ' ')
const must = (f, re, want, what, tol = 0.005) => {
  const m = text(f).match(re)
  if (!m) { bad(`${f}: expected a sentence about ${what}`); return }
  const got = parseFloat(m[1].replace(/,/g, ''))
  if (!(Math.abs(got - want) <= tol * Math.max(1, Math.abs(want)))) bad(`${f}: ${what} prints ${m[1]} but recomputes to ${want}`)
}
must('solar.html', /400 x 4\.5 x 0\.75 = ([\d,]+) Wh/, 400 * 4.5 * 0.75, '400 W x 4.5 h x 0.75')
must('solar.html', /series make ([\d.]+) V at 25 C/, 44.6 * 2, 'two 44.6 V panels in series')
must('multimeters.html', /read ([\d.]+) V\./, 44.6 * 2, 'two 44.6 V panels in series on the meter page')
must('basics.html', /= ([\d.]+) A, and more once/, Math.round(1000 / 12), '1000 W at 12 V', 0.01)
must('basics.html', /= (\d+) Wh\./, 120 * 5, '120 W for 5 hours')
must('acdc.html', /120 V RMS peaks at about (\d+) V/, 120 * Math.SQRT2, 'the 120 V peak', 0.01)
must('acdc.html', /230 V RMS at about (\d+) V/, 230 * Math.SQRT2, 'the 230 V peak', 0.01)
must('acdc.html', /costs the battery about (\d+) W/, 100 / model.inverter.efficiency, 'a 100 W AC load at the inverter efficiency', 0.01)
must('acdc.html', /which is (\d+) Wh a day/, model.inverter.standbyW * 24, 'the inverter standby energy')
if (!new RegExp(`assumes ${Math.round(model.inverter.efficiency * 100)}%`).test(text('acdc.html'))) bad('acdc.html: the inverter efficiency printed should match model.json')
if (!new RegExp(`this site assumes ${model.inverter.standbyW} W`).test(text('acdc.html'))) bad('acdc.html: the inverter standby printed should match model.json')
if (!new RegExp(`derate of ${model.derate}`).test(text('solar.html'))) bad('solar.html: the derate printed should match model.json')
if (!/89\.2/.test(text('multimeters.html'))) bad('multimeters.html: the series-string example should read 89.2 V')
if (!/13\.3 to 13\.6 V/.test(text('multimeters.html')) || !/nearly flat/.test(text('multimeters.html'))) bad('multimeters.html: the LiFePO4 note should give its resting voltage and say it is nearly flat')

// ---------------------------------------------------------------- the theme
{
  const css = read('assets/site.css')
  const block = (re) => { const m = css.match(re); return m ? m[1] : '' }
  const tokens = (b) => Object.fromEntries([...b.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]))
  const dark = tokens(block(/:root \{([^}]*)\}/)), light = { ...dark, ...tokens(block(/prefers-color-scheme: light\) \{\s*:root \{([^}]*)\}/)) }
  const lin = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  const lum = (h) => { const c = lin(h); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] }
  const cr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
  const toLab = (h) => { const [r, g, b] = lin(h); const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b); return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s] }
  const toHex = ([L, A, B]) => { const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3, m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3, s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3; const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s]; return '#' + rgb.map((v) => { v = Math.min(Math.max(v, 0), 1); v = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055; return Math.round(v * 255).toString(16).padStart(2, '0') }).join('') }
  for (const [scheme, t] of [['dark', dark], ['light', light]]) {
    for (const n of ['bg', 'card', 'ink', 'ink2', 'volt', 'volt-text', 'warm', 'copper', 'sky', 'danger', 'ok', 'on-volt', 'on-accent', 'on-ok', 'on-danger']) if (!t[n]) bad(`site.css: ${scheme} token --${n} is missing`)
    if (!['bg', 'card', 'ink', 'ink2', 'volt', 'volt-text', 'warm', 'copper', 'sky', 'danger', 'ok', 'on-volt', 'on-accent', 'on-ok', 'on-danger'].every((n) => t[n])) continue
    for (const n of ['ink', 'ink2']) for (const g of ['bg', 'card']) if (cr(t[n], t[g]) < 4.5) bad(`site.css: ${scheme} --${n} on --${g} is ${cr(t[n], t[g]).toFixed(2)}:1 (needs 4.5)`)
    for (const n of ['volt-text', 'copper', 'sky', 'danger', 'ok']) for (const g of ['bg', 'card']) if (cr(t[n], t[g]) < 4.5) bad(`site.css: ${scheme} --${n} on --${g} is ${cr(t[n], t[g]).toFixed(2)}:1 (needs 4.5)`)
    if (cr(t['on-volt'], t.volt) < 7) bad(`site.css: ${scheme} dark text on --volt is ${cr(t['on-volt'], t.volt).toFixed(2)}:1 (needs 7)`)
    // the accent follows --sun: an OKLab mix of --sky and --volt; text in the accent sits on the ground and dark text sits on the accent
    const P1 = toLab(t.sky), Q = toLab(t.warm)
    for (const sunv of [0, 0.25, 0.5, 0.75, 1]) {
      const mix = toHex(P1.map((v, i) => v * (1 - sunv) + Q[i] * sunv))
      if (cr(mix, t.bg) < 4.5) bad(`site.css: ${scheme} accent at --sun ${sunv} (${mix}) is ${cr(mix, t.bg).toFixed(2)}:1 on the ground (needs 4.5)`)
      if (cr(t['on-accent'], mix) < 4.5) bad(`site.css: ${scheme} text on the accent at --sun ${sunv} (${mix}) is ${cr(t['on-accent'], mix).toFixed(2)}:1 (needs 4.5)`)
    }
  }
  if (!/--accent:\s*color-mix\(in oklab,\s*var\(--sky\)[^;]*var\(--warm\)\)/.test(css)) bad('site.css: --accent is not a mix of --sky and --warm in oklab')
  // The two landing pictures are drawn in real pixels (viewBox = the container's width, redrawn on resize), so the CSS font sizes are the sizes read.
  const hc = read('assets/home.css'), hj = read('assets/home.js')
  const sizes = [...hc.matchAll(/#(?:hero|chart)[^{]*\{[^}]*?font(?:-size)?:\s*(?:[0-9]+ )?(\d+)px/g)].map((m) => +m[1])
  if (!sizes.length || sizes.some((z) => z < 12)) bad(`home.css: SVG text under 12 px (${sizes.join(', ')})`)
  if (!/clientWidth/.test(hj) || !/setAttribute\('viewBox', '0 0 ' \+ W/.test(hj)) bad('home.js: the pictures must be drawn in pixels from the container width')
  for (const [a, b] of [['ok', 'on-ok'], ['danger', 'on-danger']]) for (const [scheme, t] of [['dark', dark], ['light', light]]) if (t[a] && t[b] && cr(t[a], t[b]) < 4.5) bad(`site.css: ${scheme} status tag text --${b} on --${a} is ${cr(t[a], t[b]).toFixed(2)}:1 (needs 4.5)`)
}

// ---------------------------------------------------------------- the safety notices must stay
for (const f of ['solar.html', 'system.html', 'basics.html', 'acdc.html', 'multimeters.html']) if (!/safety\.html/.test(read(f))) bad(`${f}: no link to the safety page`)
if (!/Not a design/.test(read('safety.html')) || !/qualified electrician/.test(read('safety.html'))) bad('safety.html: the not-a-design notice and the electrician advice must stay')
if (!/live whenever there is light/.test(read('solar.html'))) bad('solar.html: the warning that panels are live in any light must stay')
if (!/CAT/.test(text('multimeters.html')) || !/DC voltage/.test(text('multimeters.html'))) bad('multimeters.html: the CAT note and its DC caveat must stay')

// ---------------------------------------------------------------- deploy config
{
  const v = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'))
  if ((v.rewrites || []).length) bad('vercel.json: no rewrites (unknown paths must 404)')
  { const v2 = JSON.parse(fs.readFileSync(path.join(site, 'vercel.json'), 'utf8')); if (JSON.stringify(v2.headers) !== JSON.stringify(v.headers)) bad('site/vercel.json: headers should match the root vercel.json (the site deploys from either root)') }
  const hs = Object.fromEntries((v.headers || []).flatMap((h) => h.headers.map((x) => [x.key, x.value])))
  for (const k of ['Content-Security-Policy', 'X-Content-Type-Options', 'Referrer-Policy', 'Strict-Transport-Security']) if (!hs[k]) bad(`vercel.json: missing ${k}`)
  if (hs['Content-Security-Policy'] && /unsafe-inline|unsafe-eval|\*/.test(hs['Content-Security-Policy'])) bad('vercel.json: the Content-Security-Policy allows inline code or a wildcard')
}

if (problems.length) { console.error(problems.join('\n')); process.exit(1) }
console.log(`OK: ${pages.length} pages, ${apps.length} appliances, ${awg.length} wire sizes checked against AWG geometry`)
