# Design log: Electricity Guide (DADA-lite, minimal run)

## Grade: C (first pass), then retried

The user graded the first pass a **C**, because the landing page had no unique, bold graphic: it was a styled version of the old page, with nothing you would remember. Lesson for cheap runs: even a one-pass redesign needs one signature visual on the landing page, and for a topic like electricity it should be cheap to draw.

**Retry:** the hero now has a large schematic drawn in inline SVG.
- Sun → solar panel → charge controller → 12 V battery → inverter → light bulb, wired in a closed loop.
- Current animates along the wires as hazard-yellow dashes, and the bulb pulses.
- Tags show the guide's own worked example: 12 V × 10 A = 120 W.
- Motion stops under prefers-reduced-motion.
- The figure sits in a hard-shadowed card beside the headline on desktop and below it on phones.
- Re-measured: no overflow and no contrast failures in light or dark.

## First pass

This was a deliberately cheap run, at the user's request: one pass, no critic panel, and the existing content and markup are kept. The previous version is on branch `legacy-2026-10-30`.

- **Concept:** an equipment rating plate.
  - A black header band with a hazard-yellow stripe, and a graph-paper hero.
  - Hazard yellow is used only as fills and bullets; copper is used for wiring accents.
  - Archivo for text and IBM Plex Mono for values.
  - The system diagram is drawn as a wiring run, and tables are set like spec sheets.
- **Fixes:**
  - The nav pointed to three pages that don't exist (AC vs DC, Solar, Off Grid). It now points to the matching sections on the home page.
  - The "Start learning" and "Explore off-grid systems" buttons now go to real anchors.
  - Added a skip link, `<main>` landmarks, dark mode, a favicon, a 404 page, and the static deploy layout (`site/` plus `vercel.json`).
- **Measured:**
  - Home, Multimeters and 404, at 1440 and 390 px, in light and dark.
  - No horizontal overflow, no AA contrast failures and no small targets.
- **Open:**
  - The home page is still one long page with sections. Splitting AC/DC, Solar and Off-grid into their own pages is the natural next step.
  - The OpenEdge deploy workflow in `.github/` was left untouched.
