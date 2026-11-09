# Off-grid electric

A guide to electricity for off-grid solar, led by a working simulator. Flip appliances on and off, set panels, battery and sun hours, and watch a modelled day of solar power, load and battery charge, with the verdict computed from assumptions printed beside it.

## What is here

```
site/                    # the deployable static site (no build step)
  index.html             # the simulator: breaker panel, 24-hour chart, circuit strip, verdict
  basics.html            # volts, amps, ohms, watts, with calculators
  acdc.html              # AC and DC, mains by region, inverters
  solar.html             # panel ratings, peak sun hours, strings and cold-weather voltage
  system.html            # load budget, panels and battery, cable voltage drop
  multimeters.html       # every meter setting, readings to expect
  safety.html            # what this guide cannot do
  assets/power.js        # the model: every number comes from here
  data/                  # assumptions, appliances, wire table, rest voltages, regions
scripts/check.mjs        # the gate
scripts/serve.mjs        # serves site/ with the headers from vercel.json
vercel.json              # headers and static deploy config (root and site/)
```

## The model

All results come from `site/assets/power.js` (pure functions) and the typical values in `site/data/model.json`. Nothing is a measurement of your system: appliance watts, sun hours, efficiencies and battery depth limits are planning values, printed on the pages.

## Checking it

```
node scripts/check.mjs          # the gate
node scripts/serve.mjs 8132     # http://localhost:8132 with the Content-Security-Policy the site ships with
```

The gate recomputes every worked example printed in the page text, compares the simulation with an independent naive one, checks the wire table against AWG geometry, balances the markup, and tests the colour contrast of both themes.

## Safety

This is a learning tool, not a design. Wiring, fuses and battery banks must follow your local electrical code; see `site/safety.html`.

## Deploying

A plain static site on Vercel or Shadw. `vercel.json` serves `site/` from the repository root, and `site/vercel.json` serves it when the project's root directory is `site`. Both send the same security headers.

MIT licensed; see [LICENSE](LICENSE) and [CONTRIBUTING.md](CONTRIBUTING.md).
