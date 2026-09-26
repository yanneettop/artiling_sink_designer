# Artiling Sink Designer

Internal sales, design and pricing tool for bespoke Artiling porcelain sinks.

## Features

- Guided configuration: dimensions → construction → vanity & extras → material → site & service → pricing controls
- Live estimate using the Artiling Portfolio / Standard pricing framework, with review levels
  (high confidence / review recommended / Artan confirmation required)
- Quote review: itemised breakdown, margin floor, readiness checklist, exclusions, copyable client summary
- Parametric geometry: rims, single front-to-back fall, drains, tap holes, multiple basins, drawers, upstand
- 3D, top, section, front and axonometric views; client presentation sheet
- PNG, SVG and PDF export
- Designs saved in the browser; the working design autosaves and survives a refresh

## Pricing

All rates live in `src/pricing/rates.ts` and the calculation in `src/pricing/engine.ts`.
Source: `Artiling_Sink_Pricing.pdf` and the "Pricing Rules" / "Developer Spec" sheets of
`Artiling_Sink_Pricing_Calculator.xlsx`. Values marked `CONFIRM` are interpretations awaiting sign-off.
Do not change a rate without confirmation from Ioannis / Artan.

## Development

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev
```

```bash
npm test          # pricing, geometry, validation and storage tests
npm run lint
npm run typecheck
npm run build
```

## Data storage

Saved designs and the working draft are stored in the browser's `localStorage`. There is no server,
database or authentication. Clearing site data removes them.
