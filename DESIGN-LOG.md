# DESIGN-LOG: Off-grid electric (complete DADA revamp of "Electricity Guide")

9 Nov 2026. Mode **Adaptive** (a public reader), run type **Full** with the **Landing** rule. Brief: "complete DADA revamp" of an electricity guide for off-grid solar, then add it to the portfolio. The repository already held an earlier one-pass run (no panel; the user's reaction was that its landing had no unique bold graphic, and a schematic was added afterwards). This run replaced the site. Grades are recorded in the dada ledger, not in this repository.
Panel seated by `pick_panel.py --mode adaptive --run-type full --project off-grid-electric --data-graphic` (8 seats, one agent each, three at a time, each filing a verdict file, each reading its own `seats/<id>.md`): Debord, Shklovsky, Holmes, Mace, Cairo, Tufte, Krug and the rotation seat Pater (Musical Structure, 0 rounds on record). Tools: Playwright, Node (the gate and a header-applying server).
**Stop conditions: S1 met, S2 partly met (R2 re-seated all 8: Shklovsky, Holmes, Tufte and Pater PASS; Debord, Cairo, Mace and Krug OBJECT with narrow findings that were all fixed afterwards and not re-judged), S3 NOT met, S4 met, S5 met.**

## Traversal Plan

Seed, **reconstructed after R0 from the moves actually taken, not chosen before them**: Stance `The Truthful Art (Alberto Cairo)`, Rule `Visual Hierarchy (Arnheim, Dondis)`, Breaker `Art as Technique (Viktor Shklovsky)`, counterpoint by dotted edge `crit_prov_debord -.->|attacks smoothness favored by| crit_use_krug`.
Chain: Cairo (every printed number is recomputed by code) -> Visual Hierarchy (the battery first, then the checks, then the chart) -> Shklovsky (make a day of electricity felt: one battery that breathes), counterpointed by Debord vs Krug.

### Frontier (after R0)
| Candidate | Reached via | From anchor | Status |
|---|---|---|---|
| F-a A working model (`power.js`) behind every number, with typical values printed | Krug R0, Debord R0 | seats | TAKEN (M1) |
| F-b Correct the guides: remove the errors found, put safety before wiring claims | Cairo R0 | Cairo seat | TAKEN (M2) |
| F-c The landing hero is one battery filling and draining through the day | Shklovsky R1 | Breaker | TAKEN (M3) |
| F-d A verdict made of four named checks and a list of what is not checked | Debord R1, Cairo R1 | seats | TAKEN (M4) |
| F-e A gate that tests the verdict logic, pins the reviewed constants and mutates | Cairo R1 | Cairo seat | TAKEN (M5) |
| F-f Pixel-true SVG text, accessible names and number fields | Holmes R1, Mace R1, Tufte R1 | seats | TAKEN (M6) |
| F-g A metric and 230 V appliance mode (Mace R1, R2) | Mace | seat | DEFERRED (wire sizes in mm2 and metres were added; the appliance list is still US-shaped) |
| F-h The guide pages restate the day curve as their own instrument (Pater R1, R2) | Pater | seat | DEFERRED (next: a mini battery trace on Size it) |
| F-i Small multiples for the day (Tufte R1 F10) | Tufte | seat | DEFERRED |
| F-j A sun-hours lookup by place; temperature and battery-age effects | R1 | seats | DEFERRED (out of scope; stated on the pages) |
| F-k Breakers physically inside the battery's frame; page colour from the charge, not the sun (Shklovsky R2) | Shklovsky | seat | DEFERRED |

## R0 premortem (measured)

Inherited site: two third-party hosts contacted at load (Google Fonts); 13 emoji used as icons; 0 scripts; a home page that promised "designing reliable off-grid energy systems" with no sizing method and no safety section; a schematic fixed at 12 V x 10 A = 120 W that responded to nothing. Cairo's audit of the multimeter page found: a stray code fence printed in the footer; unbalanced sections (Duty Cycle through Low Battery outside any container); "Split Phase 240 VAC" listed as a country; a "Giga" row whose example was "Power Transmission Systems"; two 44.6 V panels in series printed as 87 V (89.2); battery rest voltages printed for lead-acid with no chemistry (24 V as 25-26, 48 V as 50-54; a charging 13.8 V treated as a rest voltage); "18-50V+" for panels without Vmp or Voc; "continuity 0-2 ohm" given as fact; CAT ratings named without a meaning; Japan missing from the frequency table.

## Decision Records

## Move M1: A working model behind every number (KEEP-THE-RULE)
Depends on: none. Anchors: Stance The Truthful Art. Intent: `site/assets/power.js` (pure functions; no network or storage) holds Ohm's law, power, energy, inverter current, sizing, a half-sine sun curve scaled to panel W x peak sun hours x derate, a 5-minute battery simulation over three days, voltage drop, cold-weather Voc and string arithmetic. `site/data/model.json` holds every assumption (derate 0.75, inverter 90% with 10 W standby, LiFePO4 80% usable and 95% charge efficiency, lead-acid 50% and 85%, sizing margin 1.25 and 2 days); the pages print them beside every result. Alternatives rejected: static worked examples typed into prose (they drift). Consequence: nothing on the site is a measurement of the reader's system, and every page says so.

## Move M2: Correct the guides and put safety first (KEEP-THE-RULE)
Depends on: M1. Intent: the multimeter guide was rewritten (balanced markup, a chemistry-aware rest table generated from `data/rest.json`, a LiFePO4 note, a corrected prefix table, CAT ratings with a DC-string caveat, Japan in the regions table); Basics, AC and DC, Solar and Size it were written with calculators; every guide page carries a not-a-design notice and a link to `safety.html`. The two third-party font hosts and all emoji were removed.

## Move M3: The landing hero is one battery (BREAK)
Depends on: M1. Anchors: Breaker Art as Technique (Shklovsky) | Counterpoint Debord vs Krug. Intent: R1's Shklovsky said the first landing (a verdict box, a chart, a circuit strip) was a good dashboard and not a strange object. The hero is now a drawn battery as wide as the page: ten cells, the fill equal to the charge at the scrubbed time, a red dashed safe floor, a triangle at the day's lowest point; PANELS, a flow, the battery, a flow, LOADS; the flows are drawn from the simulation's own balances (solar used, sun wasted, battery power, load served, NOT SERVED in a blackout). A time scrubber and a Play button run the day; the page accent follows the sun (night blue to yellow or copper). On a phone the layout is stacked. Alternatives rejected: keep the chart and circuit as the hero. Consequence: flipping the microwave visibly drains the battery; the circuit strip was deleted.

## Move M4: Four checks and an honest "OK" (KEEP-THE-RULE)
Depends on: M1, M3. Intent: Debord found a green OK on a design the model could not fault, though it ignored current and inverter size. The verdict is now Energy, Depth, Battery current (peak served watts / volts against a typical C-rate: LiFePO4 1C, lead-acid 0.25C) and Inverter (peak served AC watts against a rating slider); labels IDLE, OK, NEAR LIMIT, TOO DEEP, OVERLOAD, NO POWER; the wording is "on paper the energy balance holds"; a line states what is not checked (wire, fuses, surge, string voltage, temperature, battery age); a purchase line gives panels and amp-hours from the same function Size it uses and says why the simulation can read OK while it asks for more.

## Move M5: A gate that tests the logic and pins the constants (KEEP-THE-RULE)
Depends on: M1, M4. Intent: `node scripts/check.mjs` recomputes the model's worked examples independently, compares `Power.simulate` with a naive simulation written in the gate on three scenarios, tests the flow balance at every step, tests every verdict scenario (empty, too deep, overload by current, overload by inverter, near limit, NO POWER outranks OVERLOAD), recomputes the wire table from the AWG diameter formula, recomputes every number printed in page text, pins every design constant, checks colour contrast of both schemes, status tags and the `--sun` accent mix, balances the markup and refuses stray text after `</html>`. Measured fixtures: seven mutants caught in the first build; after R1's report nine of ten new mutants had survived and the helpers were moved into `power.js` and pinned; in R2, 10 of 11 died, and the survivors (label order, the string-band boundary, fuse rounding, the metric constant) were pinned and killed.

## Move M6: Pixel-true pictures and accessible controls (KEEP-THE-RULE)
Depends on: M3. Intent: the hero and chart are drawn in real pixels (viewBox = container width, redrawn on resize), so their text is 12 px or more at 320, 375 and 1280; sliders have aria-valuetext and number fields; the chart's accessible name carries the values at the scrub time and a collapsed table lists the day; tables have a keyboard stop; status tags have per-scheme text colours; a Pause motion button and reduced motion stop the flows; the chart power axis is fixed by the chosen panels (a large load is clipped and labelled), potential, used and wasted sun are separate series.

## Panel Reports

### Panel, WHOLE, round R0  (artifact examined: the inherited site)
| Critic | Anchor used | Observed in the work | Verdict PASS/OBJECT | Requested change |
|---|---|---|---|---|
| Critic: Evidence (Cairo) | How Charts Lie | the 10 errors listed above; a stray code fence; the schematic is a fixed 120 W picture | OBJECT | run every number, name chemistries, balance the markup |
| Critic: Usability (Krug) | Don't Make Me Think | the h1 names a topic, not a reader; a cabin owner's path dead-ends (no sizing); nav items are anchors, not pages | OBJECT | one line naming the reader, a sizing page, a clear first action |
| Critic: Provocateur (Debord) | The Society of the Spectacle | "complete", "designing reliable systems" with no method or safety; emoji and a portfolio footer as branding | OBJECT | prove instead of promise; a safety section before wiring claims |

### Panel, WHOLE, round R1  (artifact examined: http://localhost:8132 after M1, M2 and the first landing)
| Critic | Anchor used | Observed in the work | Verdict PASS/OBJECT | Requested change |
|---|---|---|---|---|
| Critic: Provocateur (Debord) | The Society of the Spectacle | a green OK with wire, fuse, surge and string voltage unmodelled; a fuse figure shown beside a drop-only check; 750 W/425 Ah and 740 W/416 Ah on two pages | OBJECT | rename the verdict, list the unmodelled, one sizing number |
| Critic: Provocateur (Shklovsky) | Art as Technique | a good dashboard, not a strange object; the memorable thing is the colour shift; the circuit strip is below the fold | OBJECT | the battery as the full-width hero |
| Critic: Inclusion (Holmes) | Mismatch | light-scheme status tags at 3.1:1 and 3.0:1; chart text 8.4 to 10 px on a phone; the chart's accessible name never updates; no aria-valuetext; looping dashes with no pause | OBJECT | contrast, pixel text, live names, a pause control |
| Critic: Inclusion (Mace) | Principles of Universal Design | negative inputs print negative watts; AWG only, no mm2; jargon undefined at first use; no number fields | OBJECT | clamp inputs, metric sizes, a glossary, number fields |
| Critic: Evidence (Cairo) | How Charts Lie | all 8 values recomputed; the gate tested `power.js` only: 9 of 10 mutants survived; SVG text 9.5 px at 375; 19.6% printed as "20%, below its 20% floor" | OBJECT | gate the rendered logic, 11 px text, one-decimal rounding |
| Critic: Evidence (Tufte) | The Visual Display of Quantitative Information | the power axis rescaled 0-500 to 0-2,000 when the microwave flipped; the circuit drew delivered flows in a blackout; wasted sun not drawn | OBJECT | a fixed axis, flows from the model's balances, used versus wasted sun |
| Critic: Usability (Krug) | Don't Make Me Think | the answer to "what do I buy" is buried; breakers below the phone fold; the headline does not react to a flip | OBJECT | the purchase line beside the verdict, breakers first on a phone |
| Critic: Musical Structure (Pater) | The Renaissance | the 24 hour chart is a score; the spike rescales and flattens the sun; the motif does not travel to the guide pages | OBJECT | a fixed scale, night marked, the motif on every page |

### Panel, WHOLE, round R2  (artifact examined: http://localhost:8132 after the R1 resolutions; all 8 seats re-seated)
| Critic | Anchor used | Observed in the work | Verdict PASS/OBJECT | Requested change |
|---|---|---|---|---|
| Critic: Provocateur (Shklovsky) | Art as Technique | the battery is the strange object; Play makes the day felt; breakers still cards in a grid | PASS | a sticky hero, no legend collision, NEAR LIMIT label (done) |
| Critic: Inclusion (Holmes) | Mismatch | contrast, text px, live names, aria-valuetext, Pause, table stops all fixed; the sticky hero overlaps focus | PASS | scroll padding below the hero (done) |
| Critic: Evidence (Tufte) | The Visual Display of Quantitative Information | fixed axis, used and wasted sun, balanced flows, fill width equals charge | PASS | label the arrow width scale, hairline for zero flow (done) |
| Critic: Musical Structure (Pater) | The Renaissance | the hero is the theme; the axis is held; the motif still does not travel | PASS | a mini battery trace on Size it (deferred) |
| Critic: Provocateur (Debord) | The Society of the Spectacle | OVERLOAD fires on lead-acid and on a 1000 W inverter; OK shown beside a WATCH row; depth graded WATCH at 0%; battery current graded a hypothetical peak | OBJECT | NEAR LIMIT, depth FAIL at empty, grade what is served, wire caveat first (all done) |
| Critic: Evidence (Cairo) | How Charts Lie | 8 of 8 values recompute; 10 of 11 mutants die; text 10.4 px at 320; the fuse rounds down | OBJECT | 12 px at 320, round up, pin the survivors (all done) |
| Critic: Inclusion (Mace) | Principles of Universal Design | metric wire sizes and feet, number fields, glossary fixed; NaN in Size it captions; a negative watt entry; "Wh" not glossed | OBJECT | no NaN, reset bad entries, gloss Wh (all done) |
| Critic: Usability (Krug) | Don't Make Me Think | the purchase line is on the first screen; the hero reacts at once; breakers on a phone sit 1,320 px down | OBJECT | breakers right after the hero on a phone (done) |

Verdict files from R0 (3 of 3), R1 (8 of 8) and R2 (8 of 8) landed in the panel directories. The fixes made after the four R2 objections were measured by the conductor, not re-judged.

## Resolutions

| Seat(s): finding | Outcome |
|---|---|
| Cairo + Krug + Debord R0: the errors, no sizing method, promises without proof | ADAPT (M1, M2): a model, corrected guides, a safety page, no absolute claims |
| Shklovsky R1: the landing is a dashboard | ADAPT (M3): the battery hero; the circuit strip deleted |
| Debord R1: a green OK over unmodelled hazards | ADAPT (M4): four checks, "on paper", a "not checked here" line; OVERLOAD by current and by inverter |
| Debord R1 + Krug R1: two different sizing numbers | ADAPT: one `recommend()` and one rounding shared by the landing and Size it |
| Debord R2: OK beside WATCH; depth WATCH at empty; hypothetical peaks | ADAPT: NEAR LIMIT label; depth FAIL at empty; current and inverter graded on what is served |
| Debord R1/R2: a fuse figure without ampacity | ADAPT: the wire result leads with "voltage drop is not the wire's current rating" above 30 A; the fuse rounds up and says the rating is not checked |
| Cairo R1: 9 of 10 gate mutants survived | ADAPT (M5): helpers moved into `power.js`; constants pinned; the verdict scenarios tested; R2: 10 of 11 died, then the 4 survivors pinned and killed |
| Cairo R1/R2: text under 11 or 12 px on a phone | ADAPT (M6): pixel drawings, 12 px; minimum width 240 so 320 px phones hold 12 px |
| Cairo R1: 19.6% printed as 20% below a 20% floor; "the lights stay on" with lights off | ADAPT: one decimal near the floor; "the loads stay powered" |
| Cairo R1: Voc "highest at 25 C" | ADAPT: "Voc at 25 C ... it rises when the panels are colder"; a string within 10% of the limit reads "Too close" |
| Tufte R1: the axis rescales; the circuit lies in a blackout and a waste case | ADAPT (M6): a fixed axis from the panels, flows from the simulation's balances, used and wasted sun, NOT SERVED |
| Tufte R2: flow width scale unstated | ADAPT: stated under the scrubber; no-flow wires are hairlines |
| Holmes R1: light-scheme tags 3.1:1 and 3.0:1 | ADAPT: per-scheme tag text; the gate checks every tag pair (6.09 to 12.49) |
| Holmes R1: names, valuetext, tables, motion | ADAPT (M6): live titles, aria-valuetext, number fields, keyboard-stop tables, Pause motion |
| Holmes R2: the sticky hero overlaps focus | ADAPT: scroll-padding below the hero at that breakpoint |
| Mace R1: negative input, no mm2, jargon, no number fields | ADAPT: "enter a number" for negatives, 10 AWG and 11 metric sizes with feet, a glossary, paired number fields, editable watts |
| Mace R2: NaN in captions; bad entries; "Wh" | ADAPT: no NaN; invalid entries reset; "Wh (watt-hours)" at first use |
| Mace R1/R2: a metric and 230 V appliance mode | DEFERRED (F-g) |
| Krug R1: what to buy is buried | ADAPT: the purchase line sits in the verdict on the first screen |
| Krug R2: breakers far down on a phone | ADAPT: the controls were split; breakers come right after the hero on a phone |
| Pater R1/R2: the motif does not travel | DEFERRED (F-h) |
| Tufte R1 F10: small multiples | DEFERRED (F-i) |
| Shklovsky R2: breakers inside the battery's frame; colour from the charge | DEFERRED (F-k) |

## Anchor Ledger
| Anchor | Role | Status KEEP / ADAPT / SCRAP | Evidence | Replacement or note |
|---|---|---|---|---|
| The Truthful Art (Alberto Cairo) | Stance | KEEP | every printed number recomputed by the gate and by the seat, 8 of 8 | none |
| Visual Hierarchy (Arnheim, Dondis) | Rule | KEEP | battery, then checks, then chart; held at 1280 and 375 | none |
| Art as Technique (Viktor Shklovsky) | Breaker | KEEP | the battery hero earned a PASS from the seat that asked for it | the breakers inside the frame (deferred) |
| crit_prov_debord -.-> crit_use_krug | Counterpoint | KEEP | Debord stripped the false confidence, Krug moved the answer onto the first screen; both objected narrowly in R2 | none |

## Deletion review and residual diff (Step 2f)
Pre-existing elements and what they earned: Google Fonts (removed: two third-party hosts for a type face), 13 emoji icons (removed: a gate refuses them), the animated schematic (replaced: it showed a fixed picture; the hero draws the model), the "complete" and "mastering" claims (removed and linted), the stray code fence and unbalanced sections (fixed and gated), the earlier run's `panel/shots/` screenshots and measurement file (deleted: stale evidence of the earlier site), the footer portfolio link (kept, named in the gate, not checked live), the GitHub Actions deploy workflow (untouched). Retained-value ledger: the site's topic, its multimeter content (rewritten with the errors fixed), the MIT licence and the contributing guide (updated for the gate).

## Step 2g: figures re-measured at the final state
| Printed figure | Procedure | Final value | Result |
|---|---|---|---|
| default verdict: lowest 59.6% at about 07:20 | Cairo's own 1-minute simulation | matches | reproducible |
| 2,700 Wh made, 1,997 Wh used (default five loads), 652 Wh wasted | hand arithmetic and the gate's naive simulation | matches | reproducible |
| purchase line: 750 W and 425 Ah | 1,997 / (4.5 x 0.75) x 1.25 and 1,997 x 2 / 0.8 / 12, rounded up to 50 W and 25 Ah | 739.6 W and 416 Ah before rounding; Size it prints the same | reproducible |
| string: 98.6 V cold against 100 V | 2 x 44.6 V x (1 + 0.003 x 35) | 98.57 V; "Too close" at 1.4% headroom | reproducible |
| wire: AWG 6, 40 A, 5 m, 12 V | 2 x 5 x 40 x 0.3951 / 304.8 | 0.52 V, 4.3% | reproducible |
| flows at 12:00 and 19:00 | served = solar used - battery bus power | satisfied at both (Cairo, Tufte) | reproducible |
| AWG table | the diameter formula with copper at 1.724e-8 ohm m | within 0.03% on all 10 sizes | reproducible |
| battery fill width | fill px / inner px against the charge | 595.5 against 664 x 89.7% = 595.6 | reproducible (Tufte) |
| status tag contrast | computed in both schemes | 6.09 to 12.49 | reproducible |
| rendered SVG text | getComputedStyle at 320, 375, 1280 | 12 px or more after the 240 px minimum | reproducible |
| gate mutants | named mutants on a temp copy | 10 of 11 in R2, then the 4 survivors pinned and killed | reproducible |
| overflow and console errors | Playwright at 1280, 375 and 320 over 8 pages | none, none | reproducible |

## Stop test
- **S1** Frontier: no OPEN items; F-g to F-k are DEFERRED with reasons. Met.
- **S2** R2 re-seated all 8: Shklovsky, Holmes, Tufte and Pater PASS; Debord, Cairo, Mace and Krug OBJECT with narrow findings, all fixed afterwards and measured, not re-judged. Partly met.
- **S3** Two consecutive quiet WHOLE rounds: NOT met. R1 and R2 each produced ADAPT items.
- **S4** Ambition push: from a dashboard with a schematic to a hero that is one battery drawn to scale, with flows from the model's balances. Measured delta: verdict dimensions 1 to 4; gate mutants caught 1 of 10 to 10 of 11 and then 11 of 11; text on a phone 8.4 px to 12 px; sizing answers on the first screen 0 to 1; third-party hosts 2 to 0. Met.
- **S5** Dotted edges: Debord vs Krug sat in R0, R1 and R2 (both objected; both findings were adopted). Met.

## Double loop
The panel found what the author could not: a circuit that drew delivered power in a blackout (the graphic recomputed flows from the schedule instead of drawing the model's balances), a power axis that rescaled and erased the sun, a green OK that ignored current and inverter size, status tags at 3:1, and above all a gate that tested `power.js` while the pages' own logic and constants were unguarded (9 of 10 mutants survived). The process held where earlier runs had failed: the Rupture seat's finding (the battery) became the whole landing in R1 rather than a deferral. It failed in one place: the first build computed the hero's flows in the page script, outside the tested model, so the first R1 round found a model/graphic mismatch the gate could not see. Graph amendment: none to the graph; to the workflow: a graphic must draw only what the tested model returns, and the gate must be mutated before R1, not after it.

## Carry-Forward Ledger
- A graphic draws the model's returned balances; it never recomputes flows from the inputs.
- Move every decision the page makes (labels, rounding, thresholds, fuse factor) into the tested model, and pin the reviewed design constants in the gate; then mutate the gate before the first panel.
- A green verdict needs a list beside it of what it does not check, and its wording must say "on paper".
- Grade a limit on what is actually served, not a hypothetical peak; rank blackout above overload.
- Draw SVG in real pixels from the container width so text is the size it is written; set a minimum width so 320 px phones keep it.
- A fixed chart scale for the chosen system; clip and label what exceeds it.
- Status tags need per-scheme text colours; test every pair.
- The first action must sit within one scroll on a phone: split control groups so the breakers come first.
- A battery hero (one body whose fill is the quantity) beats a dashboard of the same data.
- Keep grades out of the project repository; the dada ledger holds them.

## Compliance Check
- [x] Tooling inventory done: Playwright, Node
- [x] Mode stated with the reason (Adaptive: public reader)
- [x] Panel seated from `pick_panel.py`, every seat briefed from its `seats/` file
- [ ] Seed with exact labels chosen before the first move: reconstructed afterwards (stated in the plan)
- [x] Run type stated (Full + Landing), no freeze broken
- [x] Landing leads with one bold graphic, complete in the first viewport at 1280x800 and 375x812 (the battery, scrubber and the top of the verdict)
- [x] BREAK move taken (M3)
- [x] Decision Record per move (M1-M6)
- [x] Panel Report per round, every critic citing something observed
- [x] Every OBJECT resolved ADAPT, OVERRULE or DEFERRED
- [ ] WHOLE rounds with S3 met: R0, R1, R2 run; S3 not met
- [ ] Every objecting seat re-judged after its last fix: Debord, Cairo, Mace and Krug were not
- [x] Every printed figure re-measured at the final state (Step 2g)
- [x] Anchor Ledger complete
- [x] Double-loop paragraph written
- [x] Run recorded in the dada ledger (the grade is kept there, not in this repository)
- [x] Final reply states mode, tools, stop conditions and what was skipped
