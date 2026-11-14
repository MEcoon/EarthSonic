import { useEffect, useState } from 'react'
import { ArrowDown, ArrowRight, AudioLines, Pause, Waves } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageContainer } from '../components/layout/PageContainer'
import './HomePage.css'

const sourceImage = '/nasa/ocean-currents/images/global_ecco2_temperature_currents.jpg'
const sourceVideo = '/nasa/ocean-currents/videos/ecco2_sst_flow.webmhd.webm'

export function HomePage() {
  const [speaking, setSpeaking] = useState(false)
  const [speechMessage, setSpeechMessage] = useState('')

  useEffect(() => () => { window.speechSynthesis?.cancel() }, [])

  const toggleSpeechSummary = () => {
    if (!('speechSynthesis' in window)) {
      setSpeechMessage('Spoken summaries are not supported in this browser.')
      return
    }
    if (speaking) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
      setSpeechMessage('Spoken summary stopped.')
      return
    }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance('EarthSonic explores NASA visualization number 3912, global sea surface currents and temperature, through sight and sound. NASA provides a rendered visualization of ECCO2 modeled ocean currents and temperature. EarthSonic analyzes visual features from the rendered video and maps selected features to sound as an artistic interpretation. It does not sonify the original numerical fields or represent actual ocean sounds.')
    utterance.rate = 0.92
    utterance.onstart = () => { setSpeaking(true); setSpeechMessage('Spoken summary is playing.') }
    utterance.onend = () => { setSpeaking(false); setSpeechMessage('Spoken summary finished.') }
    utterance.onerror = () => { setSpeaking(false); setSpeechMessage('Spoken summary could not play. Use the Accessibility settings for a page summary.') }
    window.speechSynthesis.speak(utterance)
  }

  return <div className="home-page">
    <section className="home-hero" aria-labelledby="home-title">
      <img className="home-hero-image" src={sourceImage} alt="NASA SVS #3912 visualization of global sea surface currents colored by modeled sea surface temperature." fetchPriority="high" />
      <div className="home-hero-inner page-container">
        <div className="home-hero-copy">
          <span className="home-eyebrow"><i aria-hidden="true" /> NASA SVS #3912 <span aria-hidden="true">/</span> AN EXPERIMENT IN LISTENING</span>
          <h1 id="home-title">THE OCEAN<br />HAS A <em>SOUND.</em></h1>
          <p>What if you could listen to the movement of our oceans? Explore NASA&apos;s global sea surface currents and temperature visualization through an experimental sound interpretation.</p>
          <div className="home-hero-actions">
            <Link className="home-cta home-cta-primary" to="/studio">Experience the ocean <ArrowRight size={18} aria-hidden="true" /></Link>
            <Link className="home-cta home-cta-secondary" to="/explore">Explore the science <ArrowDown size={17} aria-hidden="true" /></Link>
          </div>
          <p className="home-hero-disclaimer">An artistic interpretation of rendered pixels — not measured ocean sound.</p>
        </div>
        <div className="home-hero-caption" aria-hidden="true"><span>GLOBAL SURFACE CURRENTS</span><span>NASA / GODDARD SPACE FLIGHT CENTER</span></div>
      </div>
      <a className="home-scroll-cue" href="#experience"><span>SCROLL TO EXPLORE</span><ArrowDown size={15} aria-hidden="true" /></a>
    </section>

    <section className="home-experience page-container" id="experience" aria-labelledby="experience-title">
      <div className="home-section-heading">
        <span className="home-section-index">01 <i /> THE EXPERIENCE</span>
        <h2 id="experience-title">See the ocean.<br /><em>Hear its patterns.</em></h2>
      </div>
      <div className="home-experience-body">
        <p className="home-experience-lead">A year of modeled ocean movement, translated into a new way to pay attention.</p>
        <p>NASA&apos;s visualization shows global sea surface currents and temperature from the ECCO2 model. EarthSonic samples visual features from the rendered video, then maps selected features to sound parameters.</p>
        <p>The result is an experiment in listening to a scientific visualization. It is an artistic pixel-based sonification—not a direct reading of ECCO2 numerical fields or a recording of the ocean.</p>
      </div>
      <figure className="home-still">
        <img src={sourceImage} alt="Rendered NASA map showing global ocean current paths and the source visualization's color variation." loading="lazy" />
        <figcaption><span>NASA SVS #3912 · RENDERED VISUALIZATION</span><span>ECCO2 MODEL · 2007–2008</span></figcaption>
      </figure>
    </section>

    <section className="home-process" aria-labelledby="process-title">
      <PageContainer>
        <div className="home-process-header">
          <span className="home-section-index">02 <i /> HOW IT WORKS</span>
          <h2 id="process-title">From the image<br />to <em>the sound.</em></h2>
          <p>Three steps connect NASA&apos;s rendered image to an original, experimental sound.</p>
        </div>
        <ol className="home-steps">
          <li><span className="home-step-number">01</span><div><span className="home-step-label">THE SOURCE</span><h3>NASA visualization</h3><p>The source video visualizes ECCO2-modeled global sea surface currents and temperature.</p></div></li>
          <li><span className="home-step-number">02</span><div><span className="home-step-label">THE ANALYSIS</span><h3>Rendered image features</h3><p>EarthSonic samples selected visual features from rendered video frames. It does not read the model&apos;s numerical fields.</p></div></li>
          <li><span className="home-step-number">03</span><div><span className="home-step-label">THE INTERPRETATION</span><h3>Artistic sound mapping</h3><p>Image features shape pitch, level, stereo position and modulation. The sound is an artistic interpretation, not actual ocean audio.</p></div></li>
        </ol>
        <div className="home-summary-control">
          <button type="button" onClick={toggleSpeechSummary} aria-label={speaking ? 'Stop spoken summary' : 'Play spoken summary'}>{speaking ? <Pause size={16} aria-hidden="true" /> : <AudioLines size={17} aria-hidden="true" />}{speaking ? 'Stop spoken summary' : 'Listen to a spoken summary'}</button>
          <span role="status" aria-live="polite">{speechMessage}</span>
        </div>
      </PageContainer>
    </section>

    <section className="home-studio page-container" aria-labelledby="studio-preview-title">
      <div className="home-studio-copy">
        <span className="home-section-index">03 <i /> ENTER THE STUDIO</span>
        <h2 id="studio-preview-title">Close your eyes.<br /><em>Listen.</em></h2>
        <p>Watch the NASA visualization and hear how its rendered image features shape the sound. The Studio explains every mapping as you explore.</p>
        <Link className="home-cta home-cta-primary" to="/studio">Open the Studio <ArrowRight size={18} aria-hidden="true" /></Link>
        <span className="home-studio-note"><Waves size={15} aria-hidden="true" /> Sound is generated from image features in your browser.</span>
      </div>
      <figure className="home-video-frame">
        <video controls muted playsInline preload="none" poster={sourceImage} aria-label="Muted preview of the NASA SVS #3912 global sea surface currents and temperature visualization.">
          <source src={sourceVideo} type="video/webm" />
          Your browser does not support the NASA visualization video. <Link to="/studio">Open the Studio</Link>.
        </video>
        <figcaption><span>NASA SVS #3912 · MUTED PREVIEW</span><span>01:06</span></figcaption>
      </figure>
    </section>

    <section className="home-source" aria-labelledby="source-title">
      <PageContainer className="home-source-inner">
        <div><span className="home-section-index">04 <i /> THE NASA SOURCE</span><h2 id="source-title">One visualization.<br /><em>A world of motion.</em></h2></div>
        <div className="home-source-details">
          <span className="home-source-number">NASA SVS · 3912</span>
          <h3>Global Sea Surface Currents and Temperature</h3>
          <dl><div><dt>Visualization period</dt><dd>March 25, 2007 – March 3, 2008</dd></div><div><dt>Model attribution</dt><dd>ECCO2 · joint MIT/JPL project</dd></div><div><dt>NASA credit</dt><dd>NASA / Goddard Space Flight Center Scientific Visualization Studio</dd></div></dl>
          <a className="home-source-link" href="https://svs.gsfc.nasa.gov/3912/" target="_blank" rel="noreferrer">View the NASA source record <ArrowRight size={16} aria-hidden="true" /></a>
        </div>
      </PageContainer>
    </section>
  </div>
}
