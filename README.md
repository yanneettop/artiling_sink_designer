# Artiling Sink Designer

Internal parametric design tool for configuring bespoke Artiling porcelain sinks and producing clear client and fabrication previews.

## Features

- Parametric overall dimensions, rims, basin depth and fall
- Circular, linear and concealed linear drain configurations
- Tap, drawer and back-upstand options
- Interactive 3D preview
- Dimensioned top, front, side and axonometric technical views
- Client presentation sheet
- PNG, SVG and PDF export
- Local project saving and recent-project start screen

## Development

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev
```

The development server is provided by Vite.

## Production build

```bash
npm run build
npm run preview
```

The production output is generated in `dist/` and is not committed to the repository.

## Data storage

Saved designs are stored locally in the browser using `localStorage`. The application currently has no external database or authentication layer.
