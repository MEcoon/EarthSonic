# EarthSonic

EarthSonic is an interactive image-to-sound experience built around NASA Scientific Visualization Studio (SVS) #3912, **Global Sea Surface Currents and Temperature**. It analyzes rendered pixels from the NASA visualization and maps selected image features to locally synthesized sound.

- [NASA SVS #3912 source record](https://svs.gsfc.nasa.gov/3912/)
- [NASA Earth Information Center (EIC) gallery](https://svs.gsfc.nasa.gov/gallery/earth-information-center/) — the visualization is listed in the EIC gallery under “EIC Beauty Pieces.”

The source visualization depicts ECCO2-modeled sea-surface current flows colored by corresponding sea-surface temperature. Its historical visualization period is **March 25, 2007 12:00 UTC through March 3, 2008 12:00 UTC**. It is not a live feed.

## Application routes

The application has four routes:

- **Home (`/`)** — introduces the project and the visual-to-audio method.
- **Explore (`/explore`)** — presents an interactive Earth globe, approximate ocean-region entry points, NASA source material, and the Science Guide. **Ocean Expedition**, **My Discoveries**, and the one-round listening quiz are sections within Explore, not separate routes. Saved regions, personal notes, and completed expeditions use browser local storage.
- **Studio (`/studio`)** — plays the NASA visualization with frame analysis, sonification controls, and audio visualizers. A selected Explore region can be carried in the URL as context; it does not change the global video or create regional measurements or sound.
- **About (`/about`)** — explains the project, its method, and its limitations.

A persistent shared playback provider supplies the analysis video and generated audio across routes. Studio displays a separate muted video view synchronized to that shared playback source. Synchronization uses sparse checkpoints and drift correction; **frame-perfect correspondence is not guaranteed**.

## How the sonification works

EarthSonic draws accepted frames from the rendered NASA video to a browser Canvas at **96 × 48 pixels**. It calculates image features and maps four of them to audio controls:

| Rendered-image feature | Sound control |
| --- | --- |
| Image brightness | Amplitude / mapped sound level |
| Red–blue color balance | Pitch |
| Left–right brightness balance | Stereo pan |
| Smoothed image-change rate | Modulation rate |

Frame sampling is event-driven and has a **240 ms acceptance gate during ordinary playback** (a nominal maximum of about 4.17 accepted samples per second). Readiness and seek events can force additional samples. Sampling depends on browser media-event cadence and **does not analyze every video frame**.

The sound is synthesized locally with the **Web Audio API**. It is an artistic interpretation of rendered NASA pixels, not recorded ocean sound and not direct sonification of raw ECCO2 numerical fields. The project currently does not load raw ECCO2 field files, extract current velocities, or derive calibrated pointwise sea-surface temperatures from pixel colors. Pixel color, brightness, and image change remain rendered-image properties.

## Packaged NASA video

The local file is `public/nasa/ocean-currents/videos/ecco2_sst_flow.webmhd.webm`. Local inspection with `ffprobe` reports:

- Container: Matroska/WebM; video codec: VP8
- Dimensions: **1080 × 540**
- Average and nominal frame rate: **30 fps**
- Duration: **66.7 seconds**
- File size: **15,653,144 bytes**

NASA currently catalogs the matching filename at **960 × 540** and 14.9 MB on the [SVS #3912 page](https://svs.gsfc.nasa.gov/3912/). The local file’s transformation history and byte-for-byte provenance have not been established. The difference alone does not establish whether it was re-encoded, resized, or otherwise transformed. See [`public/nasa/ocean-currents/metadata/nasa-svs-3912.json`](public/nasa/ocean-currents/metadata/nasa-svs-3912.json) for the recorded local properties and uncertainty.

## Scientific and geographic limitations

- The analyzer reads pixels from NASA’s rendered video, not the original ECCO2 numerical fields.
- The NASA temperature color legend describes the source visualization; EarthSonic does not convert sampled RGB pixels into calibrated local temperatures.
- Pixel differences are not ocean-current speed or velocity.
- Explore region markers are approximate entry points and are not independently calibrated to the NASA raster. Region selection does not crop the source video or change the pixel analysis.
- Rendering, interpolation, compression, resampling, browser sampling cadence, and synchronization between the two video elements can affect the experience.

## Accessibility and verification status

The code includes keyboard controls for globe interaction, accessible names and status text for controls, text explanations of the mapping, and reduced-motion handling for the globe. **No complete accessibility audit or WCAG conformance test is claimed.** Browser and assistive-technology behavior should be tested on the target browsers and devices.

The production build command performs the TypeScript project build and Vite build. Browser playback, frame/audio synchronization, responsive behavior, and accessibility have not all been verified as a complete test suite. The repository does not document a public deployment URL or deployment configuration, so deployment status is **unverified**.

## Setup and commands

Use a supported Node.js release for the Vite version in `package.json`.

Install dependencies:

```sh
npm install
```

Start the development server:

```sh
npm run dev
```

Create a TypeScript-checked production build:

```sh
npm run build
```

Preview the production build locally:

```sh
npm run preview
```

The package uses React, TypeScript, Vite, React Router, Three.js, and Lucide React. Browser Canvas and Web Audio APIs provide frame analysis and sound synthesis. See [`package.json`](package.json) for the full dependency list and scripts.

## Sources and attribution

- **NASA SVS #3912 — Global Sea Surface Currents and Temperature:** [https://svs.gsfc.nasa.gov/3912/](https://svs.gsfc.nasa.gov/3912/)
- **NASA EIC gallery:** [https://svs.gsfc.nasa.gov/gallery/earth-information-center/](https://svs.gsfc.nasa.gov/gallery/earth-information-center/)
- **Packaged WebM catalog URL:** [NASA video asset](https://svs.gsfc.nasa.gov/vis/a000000/a003900/a003912/ecco2_sst_flow.webmhd.webm)
- NASA imagery and video are credited to NASA/Goddard Space Flight Center Scientific Visualization Studio. ECCO2 is the joint MIT/JPL project identified by NASA SVS.
- EarthSonic code was developed with AI assistance; disclose this in the challenge submission’s AI-use section.
