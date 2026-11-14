# Earth Jukebox — Prototype Audit

This audit compares the current prototype with [the product brief](product-brief.md). It records what to keep, change, or defer before adding more stories.

## Current prototype

The app is a self-contained HTML/CSS/JavaScript demo. It has a polished dark visual direction, three story cards, a canvas that generates illustrative fields, browser-based Web Audio synthesis, image upload and pixel analysis, and an optional CLIP image classifier.

## Keep

- **The focused listening-studio layout.** The visualization and player are already the center of the page.
- **Core playback controls.** Play/pause, restart, seek, skip, and volume are useful foundations.
- **Story cards.** They make the experience discoverable, though version one should feature one complete NASA story first.
- **Plain-language captions and mapping area.** Keep these, then make the mapping specific to each real story.
- **Image stays local.** The prototype says uploads remain on-device; preserve that if upload remains in scope.
- **Responsive layout and dark, Earth-inspired palette.** Keep the visual direction while improving hierarchy, readability, and mobile controls.

## Change before submission

1. **Replace simulated story fields with a real NASA visualization.** Current built-in visuals are procedurally generated (`app.js` drawing code); the UI labels them simulated (`index.html`). They are useful placeholders but cannot be presented as the NASA story itself.
2. **Use accurate story metadata.** Current titles, captions, date ranges, and map labels describe invented stories. Replace them with facts checked against the chosen NASA SVS page.
3. **Add per-story source and credit details.** The footer links to EIC generally, but the featured story needs a direct source link, credit, date range, and data description.
4. **Explain the actual sonification.** Current controls say temperature maps to pitch, ocean variability to texture, and time to tempo, but the generated preview uses synthetic fields and image color averages. Make displayed mappings match the code and explain when a sound is an artistic interpretation.
5. **Fix playback end and seeking behavior.** The timer resets elapsed time at the end without clearly stopping playback. Seeking and skip update the display but do not explicitly resynchronize scheduled audio. Define and implement predictable end, pause, seek, and restart behavior.
6. **Make accessibility labels and states consistent.** Story buttons need an initial selected state exposed to assistive technology. The small “i” control needs a useful accessible name and keyboard behavior, or should become visible explanatory text. Add reduced-motion handling for decorative animation and verify focus visibility.
7. **Simplify the first-run experience.** The optional CLIP classifier advertises a roughly 350 MB model download and requires serving the page over localhost. It is not necessary for the core sonification; defer it unless it directly supports a user goal.
8. **Clarify upload scope.** Upload is currently prominent, but it is not required for the curated NASA-story experience. Decide whether it stays in version one; if so, explain supported formats and limitations and keep it secondary to the featured story.

## Defer

- More built-in stories until the first real NASA story is complete.
- AI image classification unless there is a clear need and an acceptable download experience.
- Advanced synthesis controls, user accounts, and social features.

## Suggested version-one decision

- Feature one NASA SVS story, provisionally **Global Sea Surface Currents and Temperature**.
- Use a short, optimized media segment or selected frames rather than a huge full-resolution asset.
- Keep story selection extensible in the code, but show a single featured story until it is complete.
- Keep upload only if it can be finished without delaying source attribution, synchronized playback, and accessibility.

## Main risks to resolve in Step 3

- Whether the chosen NASA asset is suitable for extracting frames and synchronizing audio in the browser.
- Whether sonification uses rendered pixels or underlying scientific data; document the distinction.
- What the source page says about the visualization's colors and model/data provenance.
- How to credit and link the NASA visualization accurately.

## Audit complete when

The team agrees on the one-story version-one scope, knows which prototype features stay or move later, and has a list of source, playback, and accessibility gaps to resolve before launch.
