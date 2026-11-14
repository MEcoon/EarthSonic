import { useEffect, useState } from 'react'
import { ArrowDown, ArrowRight, AudioLines, Globe2, Pause, Play, Waves } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageContainer } from '../components/layout/PageContainer'
import { SectionHeader } from '../components/ui/SectionHeader'

export function HomePage() {
  const [speaking, setSpeaking] = useState(false)
  const [speechMessage, setSpeechMessage] = useState('Turn it on from Accessibility to reduce visual decoration and hear a summary of the current page.')
  useEffect(() => () => { window.speechSynthesis?.cancel() }, [])

  const toggleSpeechPreview = () => {
    if (!('speechSynthesis' in window)) {
      setSpeechMessage('Spoken summaries are not supported in this browser.')
      return
    }
    if (speaking) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
      return
    }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance('EarthSonic helps you explore NASA visualization number 3912, global sea surface currents and temperature, through sight and sound. Listen to a sound interpretation derived from video pixels and learn how visible patterns shape the audio.')
    utterance.rate = 0.92
    utterance.onstart = () => { setSpeaking(true); setSpeechMessage('Spoken preview is playing.') }
    utterance.onend = () => { setSpeaking(false); setSpeechMessage('Spoken preview finished.') }
    utterance.onerror = () => { setSpeaking(false); setSpeechMessage('Spoken preview could not play. Use the Accessibility settings for another page summary.') }
    window.speechSynthesis.speak(utterance)
  }

  return <>
    <section className="hero page-container">
      <div className="hero-copy">
        <span className="eyebrow"><span className="status-dot" /> NASA SVS #3912 · OCEAN SONIFICATION</span>
        <h1>WHAT DOES<br />OUR OCEAN <span>SOUND LIKE?</span></h1>
        <p>Explore NASA’s global sea surface currents and temperature visualization through sight and sound. Hear an interpretation derived from rendered video features.</p>
        <div className="hero-actions"><Link className="button button-primary" to="/explore">Explore the ocean <ArrowRight size={17} /></Link><a className="button button-quiet" href="#how-it-works">Discover how it works <ArrowDown size={16} /></a></div>
        <span className="hero-tagline">Science has a sound.</span>
      </div>
      <div className="hero-visual" aria-label="NASA #3912 global ocean current and temperature visualization, with decorative orbital lines" role="img">
        <div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="earth-globe"><div className="earth-shade" /><div className="earth-grid" /></div>
        <div className="visual-coordinate coordinate-one">BLUE MARBLE · NASA</div><div className="visual-coordinate coordinate-two">LISTEN / EXPLORE</div>
        <div className="wave-ring wave-a" /><div className="wave-ring wave-b" />
      </div>
    </section>
    <PageContainer className="intro-strip"><span className="eyebrow">A NEW WAY TO EXPERIENCE NASA #3912</span><p>Patterns in one ocean visualization can be seen—and heard.</p></PageContainer>
    <section className="featured-section page-container">
      <div className="featured-header"><SectionHeader eyebrow="NASA SVS #3912">One visualization. Many ways to listen.</SectionHeader><Link className="text-link" to="/explore">Explore NASA #3912 <ArrowRight size={15} /></Link></div>
      <p className="nasa-credit-note">NASA #3912 visualizes ECCO2-modeled sea surface currents colored by temperature. EarthSonic samples the rendered video pixels; it does not load the underlying numerical fields.</p>
    </section>
    <section className="feature-section page-container" id="how-it-works">
      <SectionHeader eyebrow="SEE · HEAR · UNDERSTAND">Explore Earth in another dimension.</SectionHeader>
      <div className="feature-grid">
        <article className="feature-item"><Globe2 /><span className="eyebrow">01 / SEE</span><h3>Explore the ocean</h3><p>Inspect NASA #3912 with source-grounded scientific context.</p></article>
        <article className="feature-item"><AudioLines /><span className="eyebrow">02 / HEAR</span><h3>Listen to patterns</h3><p>Experience visual data as sound, with mappings that are explained as you listen.</p></article>
        <article className="feature-item"><Waves /><span className="eyebrow">03 / UNDERSTAND</span><h3>Make new connections</h3><p>Use multiple senses to notice change and learn what each sound represents.</p></article>
      </div>
    </section>
    <section className="pipeline-section page-container">
      <SectionHeader eyebrow="HOW EARTHSONIC WORKS">From a NASA visualization to sound.</SectionHeader>
      <ol className="pipeline-list" aria-label="EarthSonic sonification process">
        <li><span>01</span><b>VISUAL</b><small>View NASA SVS #3912</small></li><li><span>02</span><b>ANALYZE</b><small>Sample rendered image features</small></li><li><span>03</span><b>TRANSLATE</b><small>Artistically map image features to sound</small></li><li><span>04</span><b>LISTEN</b><small>Hear the interpretation and its limits</small></li>
      </ol>
      <p className="pipeline-note">This experience samples rendered video pixels. It does not sonify original ECCO2 numerical fields, current speed, or calibrated temperature measurements.</p>
    </section>
    <section className="accessibility-preview page-container">
      <div><span className="eyebrow">SCIENCE FOR EVERYONE</span><h2>Earth science belongs to everyone.</h2><p>Audio-first exploration, spoken context, clear controls, and text descriptions offer more ways to understand the science.</p></div>
      <div className="eyes-preview"><span className="eyebrow">CLOSE YOUR EYES MODE · SPOKEN PREVIEW</span><div className="preview-player"><button className="preview-play" type="button" onClick={toggleSpeechPreview} aria-label={speaking ? 'Stop spoken preview' : 'Play spoken preview'}>{speaking ? <Pause size={14} /> : <Play size={14} />}</button><div><b>{speaking ? 'Speaking the introduction' : 'Listen to the explanation'}</b><small>Browser speech · short EarthSonic introduction</small></div></div><small className="preview-note" role="status">{speechMessage}</small></div>
    </section>
    <section className="next-step page-container"><div><span className="eyebrow">THE EARTHSONIC EXPERIENCE</span><h2>Begin with curiosity.</h2><p>Explore NASA #3912 and learn how rendered-image features shape its sound.</p></div><Link className="button button-outline" to="/explore">Start exploring <ArrowRight size={17} /></Link></section>
  </>
}
