# DESIGN-LOG 2: the interactive multimeter and the titling pass

Run type: Extend (with Polish on titling). Mode: Adaptive (a public reader who wants to learn, not a client). Tools: Node, Playwright (Chromium), the gate (`node scripts/check.mjs`). The grade is not kept in this repository.

## Traversal Plan
Seed (stated before the first move): *the multimeter page is static text; the thing it teaches, putting two probes on a circuit and reading what happens, is never done.* Moves: N1 a virtual meter whose circuit is the Simulator's circuit; N2 failures that teach (fuse, reversed probes, ohms on a live bus); N3 one titling scheme across nav, tab title, kicker and h1, with a learning path; N4 the gate extended to the meter's rules and the titles.

### Frontier (after R0)
- OPEN: no interactive meter; the page is six tables.
- OPEN: nav says "Size it", the page says "From loads to panels, battery and wire", the title says "Size it: panels, battery, wire"; five different names for one thing.
- OPEN: no order to the guide pages; no "on this page" list on an eight-section page.
- DEFERRED: draggable probes; a limited stock of spare fuses; diode, capacitance, temperature and NCV settings.

## R0 premortem (measured)
Measured before any change: `multimeters.html` is 6 tables and 0 interactive controls; titles, kickers, h1 and nav label agree on 1 of 6 guide pages; at 375 px the nav wraps to 2 rows (146 px of sticky header); the page has 8 h2 and no way to jump.

## Decision Records
- **N1 (BREAK)** The meter is not an illustration. `meter.js` is a pure function of (dial, red-lead socket, probe points, circuit); the circuit is the Simulator's own state at a chosen time of day. A wrong setting gives the wrong reading, or blows the meter's fuse.
- **N2 (KEEP-THE-RULE)** Illustrative numbers live in `data/battery.json`, labelled as such; the lead-acid curve is gated against `rest.json`.
- **N3 (KEEP-THE-RULE)** Titles: `Label: topic | Off-grid electric`, the label equal to the nav label; kicker `Step N of 5 · Label`; Safety is `Before you build`.
- **N4 (KEEP-THE-RULE)** The gate runs the meter's rules against independent figures and pins its constants; mutants of `meter.js` are run before each panel.

## Panel Reports
Seats from `pick_panel.py --run-type extend`: Debord, Krug, Cairo, Tufte (dotted pair Debord-Krug).

### Panel, WHOLE, round R1  (artifact examined: http://localhost:8132/multimeters.html after N1 to N4)
| Critic | Anchor used | Observed in the work | Verdict PASS/OBJECT | Requested change |
|---|---|---|---|---|
| Critic: Provocation (Debord) | The Society of the Spectacle | the blown fuse is a colour swap: 0 animations, no sound; the circuit drawing was identical for "everything works" and "the inverter is dead"; the explanation vanished on the next repaint | OBJECT | make the blow an event, draw the live state, keep the explanation until the fuse is replaced |
| Critic: Usability (Krug) | Don't Make Me Think | first action 1.9 screens down at 375 under a 146 px sticky header; TOC jumps landed under the header; 15 points not focusable and 27 px; radiogroups ignored arrow keys; OFF plus a tap gave no feedback | OBJECT | static header on phones, a collapsed TOC, real buttons, roving focus, a live message, a sticky reading |
| Critic: Evidence (Cairo) | How Charts Lie | cable drop 0.000 V from 07:30 to 17:00 (the cable ignored the load current while the panel charged); a dead battery still put 120 V on the outlet; a full battery in sun read the resting voltage; the hint "the wire calculator predicts this" was false (it doubles the length) | OBJECT | the cable carries the load current, float and dead-battery cases, correct the hint |
| Critic: Evidence graphic (Tufte) | The Visual Display of Quantitative Information | the diagram was byte-identical in every scenario: 0 of its ink carried a measurement; probe rings separable by hue only; the SVG drawn at 91% scale so 12 px text rendered at 10.9 px | OBJECT | print each point's volts, ink dead wires differently, R and B glyphs, real-pixel width, name the points on the LCD |

### Panel, WHOLE, round R2  (artifact examined: http://localhost:8132/multimeters.html after the R1 resolutions; all 4 seats re-seated)
| Critic | Anchor used | Observed in the work | Verdict PASS/OBJECT | Requested change |
|---|---|---|---|---|
| Critic: Provocation (Debord) | The Society of the Spectacle | one shake, a 180 Hz click, a dark LCD, a sound toggle; 7 dead segments and a crossed fuse when the inverter is dead; the explanation persists; reversed probes still carry no marker beyond the minus sign | PASS | mark the reversal (minor) |
| Critic: Usability (Krug) | Don't Make Me Think | at 375 the header is static and the TOC collapsed: the LCD sits at y=1049 (was 1300); 44 px hit areas; arrow keys work; the sticky reading is 148 px (21% of the viewport) | PASS | none blocking |
| Critic: Evidence (Cairo) | How Charts Lie | cable drop at noon 0.0267 V (was 0.000); float 13.50 V on a full battery; 18 of 28 gate mutants killed; with an empty battery the outlet read 0 V while the series meter still read 4 A | OBJECT | no load current when the inverter is off; kill the surviving mutants |
| Critic: Evidence graphic (Tufte) | The Visual Display of Quantitative Information | 15 values printed; SVG width equals rendered width at 1280, 375 and 320; the load arrow never reverses and the cable width does not show its drop; the R tag overlapped the "Spare element" caption | PASS | tag position (fixed); an arrow carrying amps (deferred) |

## Resolutions
- Debord F1, F2, F3: ADAPT. Blow shakes the meter (reduced-motion respected), plays one click (Sound toggle), darkens the LCD; the circuit draws dead wires dashed and the fuse crossed; the explanation persists with a count of blown fuses.
- Debord F4: ADAPT. The meter body is yellow, the colour of the real instrument, in both schemes.
- Debord F5 (draggable probes) and limited spares: DEFERRED. Drag needs pointer and keyboard parity; a stock of spares is decoration until something is at stake.
- Krug F1, F2, F6, F7: ADAPT. Sticky header only from 720 px; the TOC is a `details`, collapsed on phones, with 44 px links; the reading is sticky above the controls.
- Krug F3, F4, F5: ADAPT. Points are `role=button` with names and values, 44 px hit areas; roving arrow keys on the dial and the socket group; an aria-live line says where each probe went.
- Krug F8: ADAPT. Safety's kicker is `Before you build`; the home kicker begins `Simulator`.
- Cairo F1, F7: ADAPT. The cable and fuse carry the load current; the series reading is the load current; the note says the battery's net current differs.
- Cairo F2: ADAPT. Hint says one conductor, doubled by the calculator.
- Cairo F3, N1: ADAPT. An empty battery switches the inverter off: no outlet voltage and no load current.
- Cairo F4: ADAPT (stated, not scaled). The page says the panel is one 12 V-class panel per 12 V of battery, behind a controller.
- Cairo F5, F6: ADAPT. A full battery in sun reads float and the panel near Voc; the note says the charger sets that voltage.
- Cairo F8: ADAPT. 29 mutants run; survivors killed with independent figures for Vmp/Voc scaling, joint, fuse and cable drops, thresholds, frequency. `meterpage.js` is exercised by the Playwright scripts, not the gate: DEFERRED.
- Tufte F1, F3, F4, F5, F6: ADAPT. Values under every point, dead wires dashed, R and B glyphs, real-pixel width, "points 5 to 11" on the LCD.
- Tufte F2 (arrow carrying amps and reversing), F7 (point names on the diagram): DEFERRED, cosmetic once the status line states the current.

## Anchor Ledger
Debord: spectacle, an image replacing the thing. Krug: don't make me think. Cairo: how charts lie. Tufte: graphical integrity.

## Deletion review and residual diff (Step 2f)
Deleted: the drop-down-only probe selection as the sole route (kept as the keyboard path); the original static intro line. Kept as is: all six static tables below the meter, which the tests of the page still require.

## Step 2g: figures re-measured at the final state
Battery terminal 13.17 V at 03:00 (LiFePO4, 200 Ah, 76%); cable drop 0.0267 V at noon and 0.0384 V at 21:00 (one conductor); AC 120 V; panel Voc 22.5 V and Vmp 18.4 V at 12 V; charging 14.20 V; float 13.50 V (lead, full). All recomputed by the gate from independent formulas.

## Stop test
- **S1** Frontier: no OPEN items; the deferred items carry reasons. Met.
- **S2** R2 re-seated all 4: Debord, Krug, Tufte PASS; Cairo OBJECT with two findings, fixed afterwards and measured (gate), not re-judged. Partly met.
- **S3** Two consecutive quiet WHOLE rounds: NOT met.
- **S4** Ambition push: from six tables to a working instrument whose failures teach. Measured: interactive controls 0 to 17; gate mutants killed 8 of 8 on the last run.
- **S5** Dotted edge Debord-Krug: both objected in R1 and both findings were adopted. Met.

## Double loop
The author's own model had the cable carrying only the battery's net current, so the meter read 0.000 V across a loaded cable all midday; only an evidence seat that swept the day found it. The widget is only as honest as the circuit behind it, so the gate now checks the circuit against independent figures, not just the readings.

## Carry-Forward Ledger
- An instrument that teaches by failing needs its failures to be events (motion, sound, persistent explanation), not a colour swap.
- A diagram that draws no measured quantity is a map; print the values and ink the live state.
- Sweep the model across the day before the panel: a reading that is right at one time of day can be zero at another.
- Collapse long tables of contents on a phone; a sticky header must not eat a fifth of the screen.
- Name a thing once: the nav label, the tab title, the kicker and the h1 should agree, and the gate should say so.

## Compliance Check
- [x] Mode and run type stated
- [x] Panel seated from `pick_panel.py`, every seat briefed from its `seats/` file
- [x] BREAK move taken (N1)
- [x] Decision Record per move
- [x] Panel Report per round, every critic citing something observed
- [x] Every OBJECT resolved ADAPT, OVERRULE or DEFERRED
- [ ] Every objecting seat re-judged after its last fix: Cairo was not
- [x] Every printed figure re-measured at the final state (Step 2g)
- [x] Double-loop paragraph written
- [x] Run recorded in the dada ledger (the grade is kept there, not in this repository)
