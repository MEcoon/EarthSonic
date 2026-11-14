import { ArrowRight, ArrowUpRight, AudioLines, Check, Eye, Headphones, Keyboard, Microscope, Waves } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageContainer } from '../components/layout/PageContainer'
import { SectionHeader } from '../components/ui/SectionHeader'

const pipeline = [
  ['01', 'NASA source', 'Use a documented NASA visualization and retain its source record.'],
  ['02', 'Frame capture', 'Read a small sample from the frame currently rendered in the browser.'],
  ['03', 'Visual analysis', 'Measure visible brightness, color balance, spatial detail, and frame change.'],
  ['04', 'Normalization', 'Keep image features in bounded ranges for stable, repeatable mappings.'],
  ['05', 'Sound mapping', 'Map stated visual features to pitch, pulse density, sound intensity, and stereo position.'],
  ['06', 'Audio synthesis', 'Generate sound locally with the Web Audio API after a user action.'],
  ['07', 'Listen and compare', 'Keep the source context and mapping limits available while listening.'],
]
const technologies = ['React', 'TypeScript', 'Vite', 'Canvas API', 'Web Audio API', 'Three.js', 'NASA SVS', 'Tailwind CSS']

export function AboutPage() {
  return <PageContainer className="about-page">
    <header className="about-hero">
      <span className="eyebrow">METHODOLOGY · OPEN SCIENCE</span>
      <h1>Another way to experience <span>the ocean.</span></h1>
      <p>EarthSonic turns visual patterns in NASA SVS #3912—global sea surface currents and temperature—into an explained, interactive sound interpretation.</p>
      <span className="about-tagline"><AudioLines size={15} /> Listen to Our Planet.</span>
    </header>

    <section className="about-mission" aria-label="The problem and approach">
      <article><span className="eyebrow">THE PROBLEM</span><h2>Science is often presented through sight alone.</h2><p>Maps and animations can reveal complex patterns, but a visual-only experience can create barriers for people who are blind or have low vision, and can limit how anyone notices change.</p></article>
      <article><span className="eyebrow">THE APPROACH</span><h2>Give ocean patterns another channel.</h2><p>EarthSonic pairs this NASA ocean visualization with generated audio, clear controls, and source-grounded explanations so people can explore with both sight and sound.</p></article>
    </section>

    <section className="about-pipeline" aria-labelledby="about-pipeline-heading">
      <SectionHeader eyebrow="THE TECHNICAL PIPELINE">From a NASA frame to a sound.</SectionHeader>
      <ol className="about-pipeline-list" aria-label="NASA data-to-audio process">{pipeline.map(([number, title, description]) => <li key={number}><span className="about-pipeline-number">{number}</span><div><h3>{title}</h3><p>{description}</p></div>{number !== '07' && <span className="about-pipeline-link" aria-hidden="true"><ArrowRight size={15} /></span>}</li>)}</ol>
      <p className="about-pipeline-note">NASA’s #3912 page notes that it does not store the underlying dataset. The current demo analyzes rendered pixels; ECCO2 numerical fields are not integrated.</p>
    </section>

    <section className="about-technology" aria-labelledby="about-technology-heading">
      <div><span className="eyebrow">BUILT FOR THE BROWSER</span><h2 id="about-technology-heading">A modular scientific listening experience.</h2><p>The app separates NASA source metadata, frame analysis, sonification mappings, and audio synthesis so each step can be inspected and extended.</p></div>
      <ul className="technology-list">{technologies.map((technology) => <li key={technology}>{technology}</li>)}</ul>
    </section>

    <section className="about-integrity" aria-labelledby="about-integrity-heading">
      <div className="about-integrity-heading"><span className="eyebrow">SCIENTIFIC INTEGRITY</span><h2 id="about-integrity-heading">A sonification is an interpretation.</h2><p>EarthSonic does not claim to record ocean currents. It turns supported information into sound while keeping its source and limits visible.</p></div>
      <div className="integrity-grid">
        <article><span className="eyebrow">01 · ORIGINAL MEASUREMENTS</span><h3>Scientific values</h3><p>Measurements and model fields belong to their NASA source and are only shown as values when they are actually available to the experience.</p></article>
        <article><span className="eyebrow">02 · RENDERED VISUALIZATION</span><h3>Pixels in a frame</h3><p>Color and movement are visual encodings. The active demo samples rendered brightness, color balance, detail, and frame change.</p></article>
        <article><span className="eyebrow">03 · DERIVED ANALYSIS</span><h3>Perceptual features</h3><p>Frame features are normalized for the sound engine. They are not calibrated temperature or current speed.</p></article>
        <article><span className="eyebrow">04 · GENERATED AUDIO</span><h3>A repeatable mapping</h3><p>Pitch, pulse density, sound intensity, and stereo position follow documented image features. Timbre presets change waveform and filtering, not the mapping.</p></article>
      </div>
      <a className="about-source-link" href="https://svs.gsfc.nasa.gov/3912/" target="_blank" rel="noreferrer">NASA SVS #3912: Global Sea Surface Currents and Temperature <ArrowUpRight size={14} /></a>
    </section>

    <section className="about-accessibility" aria-labelledby="about-accessibility-heading">
      <div><span className="eyebrow">ACCESSIBLE BY DESIGN</span><h2 id="about-accessibility-heading">More than one way to explore.</h2><p>Open Accessibility in the global navigation to adjust the experience. Keyboard and assistive technology support remains available throughout the site.</p><Link className="button button-outline" to="/discover">Explore audio-first learning <ArrowRight size={15} /></Link></div>
      <ul>{[
        [Headphones, 'Audio-first controls and persistent playback'],
        [Keyboard, 'Keyboard navigation, skip link, and playback shortcuts'],
        [Eye, 'Text alternatives and Close Your Eyes Mode'],
        [Waves, 'High contrast, text scaling, and reduced motion settings'],
        [Microscope, 'Source links and plain-language science context'],
      ].map(([Icon, label]) => { const FeatureIcon = Icon as typeof Check; return <li key={String(label)}><FeatureIcon size={16} /><span>{String(label)}</span><Check size={14} className="about-feature-check" /></li> })}</ul>
    </section>
  </PageContainer>
}
