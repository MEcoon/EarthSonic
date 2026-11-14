# Earth Jukebox — Product Brief

## One-sentence description

EarthSonic helps people explore NASA SVS #3912—the global sea-surface current and temperature visualization—through a carefully explained sound interpretation.

## Audience

Curious members of the public, students, educators, and blind or low-vision visitors who want another way to explore Earth science.

## The problem

Earth science visualizations can be rich and informative, but people who cannot easily see them may miss important patterns. Visuals can also make changes difficult to notice at a glance. Sound can provide another way to follow those patterns, when the mapping is clear and the interpretation is described honestly.

## The core experience

1. Choose an Earth science story.
2. See the NASA visualization and read a short description of its data and source.
3. Play, pause, restart, seek through, and adjust the volume of its sonification.
4. Follow a plain-language explanation of how features in the visualization influence the sound.

## Version-one scope

- Use only NASA SVS #3912 and its underlying ECCO2 model source throughout the site. Do not add unrelated NASA visualizations or other scientific datasets.
- Deliver one complete story using the verified NASA visualization and its published source information.
- Keep the visualization and generated sound synchronized during playback and seeking.
- Provide clear play, pause, restart, timeline, and volume controls.
- Explain what the sound represents and distinguish data-driven mappings from artistic choices.
- Include accessible text descriptions and keyboard-operable controls.
- Work at common desktop and mobile screen sizes.
- Clearly identify any illustrative or simulated material; do not present it as NASA data.

## Selected story

Start with NASA's **Global Sea Surface Currents and Temperature** visualization. It offers moving current patterns and temperature colors that can support an understandable sound mapping. Confirm the best media format and exact mapping in Step 3 before implementation.

## Step 1 decision: focused first release

The first release will complete this one story before adding a catalog. The core journey is: open the NASA visualization, play and seek through its sonification, understand the mapping and its limitations, and follow the direct NASA source and credit.

## Source verification

NASA SVS identifies this as item **3912**, released March 16, 2012. It visualizes **sea-surface current flows colored by corresponding sea-surface temperature**. The rendering uses surface flows from ECCO2 model output, which synthesizes satellite and in-situ observations using MITgcm. The assembled visualization covers **2007-03-25 12:00 UTC through 2008-03-03 12:00 UTC**. NASA's page describes the temperature legend as blue at 0°C, green at 10–20°C, yellow at about 25°C, and red at 32°C. NASA's requested credit is **NASA/Goddard Space Flight Center Scientific Visualization Studio**.

Source: [NASA SVS — Global Sea Surface Currents and Temperature](https://svs.gsfc.nasa.gov/3912/).

NASA lists an assembled **960×540 WebM (14.9 MB)**, a **640×320 M4V (12.1 MB)**, and larger MP4 options. EarthSonic now stores the 960×540 WebM locally, along with NASA's preview still and temperature color bar, under `public/nasa/ocean-currents/`. The WebM keeps a practical balance between image size and download size. Local browser playback and frame analysis were previously confirmed.

NASA's SVS page states that it identifies the datasets used but does not store the datasets themselves. It identifies ECCO2 as the model source. NASA/ECCO product documentation lists **ECCO Cube92** as the legacy ECCO2 product; ECCO Drive is the candidate access point for matching model fields. The numerical files are not yet downloaded or integrated. Before using them, verify variable names, units, spatial grid, and coverage matching the 2007–2008 visualization.

### Data and sonification boundary

For version one, treat the displayed animation as a rendered scientific visualization. Unless the underlying ECCO2 numerical data is separately acquired and integrated, any values extracted from video frames are **image-derived proxies**, not direct ocean measurements. The sound should be synchronized to the video's playback time, and the interface should state which visible features drive each sound parameter. Do not imply that the synthesized audio is a recording of the ocean or a direct playback of raw current measurements.

## Out of scope for version one

- A large catalog of stories.
- User accounts, profiles, or social features.
- Requiring an AI model download to use the main experience.
- Claims that the app provides scientific measurements when it is interpreting rendered imagery.

## Product principles

- **Clear:** Visitors can tell what they are looking at and hearing.
- **Accessible:** The experience does not depend on sight alone, and controls work with keyboard and screen readers.
- **Grounded:** Every NASA visualization has a source, date/context, and credit.
- **Musical with purpose:** Sound is pleasant enough to explore while preserving a clear relationship to the data.
- **Honest:** Limitations and artistic choices are explained in plain language.
- **Focused:** Complete one strong story before adding more.

## Success criteria

A first-time visitor can choose the featured story, start and control its sonification, understand at least one data-to-sound mapping, and find the NASA source without help. The same core flow is usable on a phone and with a keyboard.

## Decisions to confirm during implementation

- Whether the 960×540 WebM plays reliably in target browsers, and which accessible fallback is needed.
- Whether the first sonification is explicitly based on rendered video frames or upgraded to use underlying scientific data.
- The final mapping between visual/data features and sound parameters.
- Whether image upload remains in the first release or moves to a later version; it is secondary to completing the NASA story.

## Delivery status and next work

The website is now focused exclusively on NASA #3912 across Home, Explore, Studio, Earth Radio, Discover, and About. Its current audio is explicitly image-derived. Next, acquire a suitable ECCO2 Cube92 subset if access permits, validate it against NASA #3912's time span and legend, and integrate only verified variables with units and limitations. Keep image-feature cues clearly labeled until numerical integration is complete.

## Competition submission requirements for the final stage

- Prepare a public project link with no password, permission request, or registration requirement.
- Prepare a public project demonstration as either a slide deck of at most 7 slides including title/introduction, or a video no longer than 30 seconds.
- Write the project details covering purpose, operation, benefits/impact, tools, creative choices, and factors considered.
- Disclose Super Intelligence use accurately. EarthSonic code has been AI-assisted; list that use in the project description/metadata as requested. If any AI-generated image or video is added, visibly watermark it. If any AI-generated audio is added, identify it in description and metadata. Do not use, contain, or modify NASA branding in generated media.
- List every NASA dataset/resource used with a descriptive link text and full public URL. Also list other data, code, text, imagery, and tools used, with publicly accessible links.
- Before submission, verify that the public demo and project links work without sign-in and that the demo length/slide limit is met.
