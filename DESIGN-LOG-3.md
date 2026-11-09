# DESIGN-LOG 3: the meter becomes a lab (probes, readings, diagnosis)

Run type: Extend. Mode: Adaptive. Tools: Node, Playwright (Chromium, mouse and CDP touch), the gate. The grade is not kept in this repository. Brief: "make the meter like a lab thing: attach probes, get readings, diagnose an off-grid system, keep improving".

## Traversal Plan
Seed (stated first): *a lab is something you handle: you attach leads, take readings, write them down and reach a conclusion that the readings support.* Moves: L1 draggable probe tips on leads from a drawn meter body (touch, mouse, keyboard); L2 case files with a hidden fault the circuit does not show; L3 a notebook and a diagnosis that must be supported by a recorded reading; L4 two new faults (a broken negative lead, a failed cell) and a gate that proves every case is solvable and unambiguous.

### Frontier (after R0)
- OPEN: probes are chosen from lists; the page teaches faults by labelling them.
- DEFERRED earlier: draggable probes (now taken), a stock of spare fuses.
- DEFERRED now: a guided first reading; a continuity test case; a bus margin so leads never cross a caption; running `meterpage.js` inside the gate.

## R0 premortem (measured)
Before the run: probes only by two select lists; one fault at a time, named in a select ("What is wrong?"), so nothing to diagnose; the notebook did not exist; 5 faults needed 5 distinct readings and the gate tested 0 of them as cases.

## Decision Records
- **L1 (BREAK)** The leads are physical: a yellow meter body with COM, V ohm and 10 A jacks; the red lead plugs into the chosen jack; two tips drag onto the numbered points and snap within 34 px, or lift off when dropped on nothing. Selects stay as the accessible route; tips are also keyboard operable.
- **L2 (KEEP-THE-RULE)** A case file is data (`cases.json`): symptom, hidden scenario, time, loads, and the evidence that proves it. The gate runs each case's evidence through the meter, requires that it fits no other fault and not a healthy system, and pins scenario to diagnosis.
- **L3 (KEEP-THE-RULE)** A diagnosis closes the case only if at least one reading is recorded. Wrong answers are cheap but counted. A correct one reveals the circuit's true state.
- **L4 (KEEP-THE-RULE)** New physics lives in `meter.js` and is gated: a broken negative lead reads the full battery voltage across the gap; a failed cell rests low and trips the inverter.

## Panel Reports
Seats (same extend panel): Debord, Krug, Cairo, Tufte (dotted pair Debord-Krug).

### Panel, WHOLE, round R1  (artifact examined: http://localhost:8132/multimeters.html after L1 to L4)
| Critic | Anchor used | Observed in the work | Verdict PASS/OBJECT | Requested change |
|---|---|---|---|---|
| Critic: Provocation (Debord) | The Society of the Spectacle | the diagnosis list was in case order (answer N was option N); the notebook accepted "no points / ---"; a correct answer was one coloured sentence and focus fell to the body | OBJECT | shuffle with decoys, refuse non-readings, make the answer an event |
| Critic: Usability (Krug) | Don't Make Me Think | touch drags ended in pointercancel; the sticky reading was 203 px and covered 30 of 45 points; focus dropped to the body after every case repaint; Case files sat 1,227 px down | OBJECT | touch-action on the svg, an LCD-only sticky, restore focus, keep per-case state |
| Critic: Evidence (Cairo) | How Charts Lie | case 5 showed the panel-not-connected signature; case 3 was ambiguous from 12:45 to 16:45 while the slider was live; symptoms quoted 90% and 80% that the sim said were 64% and 44%; 11 of 19 mutants survived | OBJECT | solvable and unambiguous cases, no unverifiable numbers, lock the time, gate scenario to diagnosis |
| Critic: Evidence graphic (Tufte) | The Visual Display of Quantitative Information | lead length 123 to 385 px for the same meaning; leads crossed captions on 8 of 15 targets at 375; the seated tip covered the point number; case-mode blanks unexplained | OBJECT | route leads under the text, move the tip off the number, a key that says values are withheld |

### Panel, WHOLE, round R2  (artifact examined: http://localhost:8132/multimeters.html after the R1 resolutions; all 4 seats re-seated)
| Critic | Anchor used | Observed in the work | Verdict PASS/OBJECT | Requested change |
|---|---|---|---|---|
| Critic: Provocation (Debord) | The Society of the Spectacle | tick and flash on landing, two tones on a correct call, 3 dead segments revealed; focus after a correct call was still the body; no label for the fault | PASS | label the fault, keep focus (both then fixed) |
| Critic: Usability (Krug) | Don't Make Me Think | touch drag works; sticky LCD 46 px; tips focusable; state kept per case; focus still dropped after a correct submit and after the last hint | OBJECT | keep focus (fixed and re-measured) |
| Critic: Evidence (Cairo) | How Charts Lie | F1 to F6 resolved; 10 of 25 mutants survive, mostly meterpage.js behaviour; any recorded reading closes a case | PASS | a reading inside an evidence band (advisory) |
| Critic: Evidence graphic (Tufte) | The Visual Display of Quantitative Information | the red lead still crosses a caption or figure on 13 of 15 targets at 1280; the tip covered the figure under the point on 8 of 15 | OBJECT | tip moved above-right of the point (fixed); leads lighter |

## Resolutions
- Debord F1, F2, F3, F4, F5, F6: ADAPT. Alphabetical list with two decoys; non-readings refused; ticks, flash and tones; a correct diagnosis needs a reading and reveals the circuit; jacks labelled and the red lead follows the socket; the fault is named in the status line.
- Krug F1 to F8: ADAPT. Touch-action on the svg; LCD-only sticky; tips focusable with arrow keys; focus restored; per-case state; smaller h1 and hidden lede on phones; hint button disabled at the end.
- Cairo F1 to F8: ADAPT. A tripped inverter leaves the panel charging; case 5 moved to the evening on its own schedule; case 3 has loads that leave a healthy battery charging at noon, and the slider is locked in a case; no percentages in symptoms (gate regex); "why" texts match the readings; the gate pins scenario to diagnosis and checks that each case's evidence fits no other fault.
- Cairo N1, N2: DEFERRED (advisory): a reading must lie inside an evidence band to close a case.
- Tufte F1, F3, F4, F5, F6, N1: ADAPT. Leads under the text, black dashed, tips off the number, a key that says values are withheld, the notebook shows point names, the tip moved above-right.
- Tufte F2 (leads still cross captions): DEFERRED. The leads are the physical metaphor; a margin bus would cost the direct drag and double the diagram height.
- Debord boldest change (the break physically drawn for each fault): DEFERRED. It is five SVG overlays; the reveal currently shows the fault's dead segments.

## Anchor Ledger
Debord: spectacle, a diagnosis mediated by a dropdown. Krug: don't make me think. Cairo: how charts lie. Tufte: graphical integrity.

## Deletion review and residual diff (Step 2f)
Deleted: the lone "What is wrong?" select as the only route to a fault (kept in Free play, hidden in Case files); the meter's "METER" label bar. Kept: the Missions of Free play.

## Step 2g: figures re-measured at the final state
Case 1 fuse inlet 13.2 V, outlet 0.000 V; case 2 joint drop 2.4 V at 9.6 A (0.25 ohm); case 3 battery 13.3 V and panel 22 V against 14.2 V and 18.4 V when healthy; case 4 gap 13.29 V; case 5 battery 10.9 V. Every one is gated against the meter. 

## Stop test
- **S1** Frontier: no OPEN items; DEFERRED items carry reasons. Met.
- **S2** R2 re-seated all 4: Debord and Cairo PASS; Krug and Tufte OBJECT with narrow findings, fixed and measured afterwards, not re-judged. Partly met.
- **S3** Two consecutive quiet WHOLE rounds: NOT met.
- **S4** Ambition push: from pick-a-line probes to a bench with leads, hidden faults and a notebook. Measured: cases 0 to 5; gate mutants of the case files killed on the swapped-diagnosis, text-number and any-time-slider cases.
- **S5** Dotted edge Debord-Krug: both objected in R1 and both findings were adopted. Met.

## Double loop
The author wrote five cases and was sure each was solvable; the evidence seat swept the day and found one case whose signature a healthy system reproduced all afternoon, one that displayed the wrong fault, and symptom numbers no reading could confirm. A teaching puzzle is a claim about the model; the gate now checks it the way it checks a figure.

## Carry-Forward Ledger
- A diagnosis exercise needs its evidence proved by the gate: solvable, unambiguous against every other fault and against a healthy system, and fixed in time.
- Never print in a symptom a number the learner cannot measure.
- Touch drags need `touch-action: none` on the svg, not on its children.
- Restore focus to the same control after repainting a panel, and keep a visitor's choice.
- Put the first action within one scroll on a phone: a compact sticky reading, a smaller h1.
- Leave the answer out of the picture until the learner commits to it, then reveal it.

## Compliance Check
- [x] Mode and run type stated
- [x] Panel seated from `pick_panel.py`, every seat briefed from its `seats/` file
- [x] BREAK move taken (L1)
- [x] Decision Record per move
- [x] Panel Report per round, every critic citing something observed
- [x] Every OBJECT resolved ADAPT, OVERRULE or DEFERRED
- [ ] Every objecting seat re-judged after its last fix: Krug and Tufte were not
- [x] Every printed figure re-measured at the final state (Step 2g)
- [x] Double-loop paragraph written
- [x] Run recorded in the dada ledger (the grade is kept there, not in this repository)
