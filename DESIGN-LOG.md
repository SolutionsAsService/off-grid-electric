# Design log: Electricity Guide (DADA-lite, minimal run)

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
