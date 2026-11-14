# EarthSonic

EarthSonic is an interactive, accessible sonification experience centered exclusively on NASA SVS #3912, **Global Sea Surface Currents and Temperature**.

NASA source: [NASA SVS #3912](https://svs.gsfc.nasa.gov/3912/)

## Run locally

Requirements: Node.js 20 or newer.

```sh
npm install
npm run dev
```

Build and preview:

```sh
npm run build
npm run preview
```

## Experience

- **Home** introduces the ocean-focused project and the image-derived audio method.
- **Explore** presents the #3912 visualization, ocean regions, and source information.
- **Studio** plays the NASA video, analyzes sampled frames, and maps rendered color, brightness, frame change, and left/right balance to audio.
- **Earth Radio** provides an ocean-only listening station, player controls, local favorites, and playlists.
- **Discover** includes a short listening quiz and a local, source-grounded Earth Interpreter.
- **About** explains the processing pipeline, science boundaries, accessibility features, and limitations.

The application uses React, TypeScript, Vite, Tailwind CSS, React Router, Three.js, Canvas, Web Audio, Framer Motion, Lucide React, and Zustand.

## Scientific data status

NASA #3912 shows ECCO2 modeled sea-surface current flows colored by corresponding sea-surface temperature. Its assembled visualization spans **2007-03-25 12:00 UTC through 2008-03-03 12:00 UTC**. NASA documents a temperature legend from 0 °C (blue) through 32 °C (red) and credits NASA/Goddard Space Flight Center Scientific Visualization Studio.

The current working sonification analyzes a small sample of pixels from the NASA-rendered video. Pixel color balance affects tone height; frame-to-frame image change affects pulse density; image brightness affects sound intensity; and left/right brightness balance affects stereo position. These are image-derived cues, not original ECCO2 numerical measurements. The project does not calculate current speed or calibrated pointwise temperature.

NASA's #3912 page says it does not store the data sets themselves. ECCO2's official product information identifies ECCO Cube92 as the legacy ECCO2 product; NASA/JPL's ECCO Drive is the candidate access point for original model fields. The numerical files have **not yet been downloaded or integrated**. Do not describe the current player as numerical-data sonification.

## Accessibility

The site includes keyboard-operable navigation and controls, text alternatives, visible focus, high contrast, reduced motion, adjustable text size, spoken page summaries, and a Close Your Eyes Mode. Audio begins from a user action and the core story remains labeled with its source and interpretation limits.

## Verification and remaining delivery

- `npm run build` passed during the previous implementation stage; rerun after current changes.
- Local Chrome verification confirmed that NASA #3912 video loaded in Studio, frame sampling ran, and sonification playback started.
- Before submission, rerun the build and browser checks across all routes, keyboard operation, responsive layouts, and audio/media error states.
- Remaining launch items: evaluate/download matching ECCO2 fields where access permits; integrate numerical fields only after validating units and temporal coverage; publish the website; prepare a public demo of no more than 7 slides or 30 seconds; and complete submission links and AI-use disclosures.

## Source and attribution

- NASA SVS #3912: https://svs.gsfc.nasa.gov/3912/
- ECCO product information: https://ecco-group.org/products.htm
- ECCO Drive (ECCO2 data access candidate): https://ecco.jpl.nasa.gov/drive/files/ECCO2/
- NASA imagery and video are attributed to NASA/Goddard Space Flight Center Scientific Visualization Studio.
- EarthSonic code was AI-assisted; disclose this in the challenge project details.
