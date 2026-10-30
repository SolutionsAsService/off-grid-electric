# Electricity Guide: from the ground up

A plain-language guide to electricity for off-grid solar: volts, amps and watts, AC and DC, solar panel ratings, how an off-grid system fits together, and a complete guide to using a digital multimeter.

## Layout

```
site/                  # the deployable static site
  index.html           # fundamentals, AC vs DC, solar, the off-grid system, multimeter basics
  pages/multimeters.html
  404.html
  css/style.css
  favicon.svg
index.html             # redirects to site/
vercel.json            # static deploy config (root and site/)
```

There is no build step. Edit the HTML in `site/` directly.

## Deploying

The repo deploys as a plain static site on Vercel or Shadw. `vercel.json` serves `site/` whether the project's root directory is blank or set to `site`.

## Contributing and licence

See [CONTRIBUTING.md](CONTRIBUTING.md). MIT licensed; see [LICENSE](LICENSE).
