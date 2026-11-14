import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ArrowUpRight, Check, CircleHelp, Sparkles, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EarthGlobe } from '../components/earth/EarthGlobe'
import { PageContainer } from '../components/layout/PageContainer'
import { datasets } from '../data/datasets'
import { useSonification } from '../audio/SonificationContext'
import './ExplorePage.css'

const SCORE_KEY = 'earthsonic.discover.score.v1'
const CLUE_TITLE = 'EarthSonic sound clue · NASA #3912'
const choices = ['Rendered red–blue visual balance', 'Smoothed rendered-pixel change per source-video second', 'Rendered image brightness']
const correctAnswer = choices[0]
const readScore = () => { try { return Number(localStorage.getItem(SCORE_KEY) ?? 0) || 0 } catch { return 0 } }

export function ExplorePage() {
  const dataset = datasets[0]
  const { isPlaying, trackTitle, mediaStatus, mediaError, loadDataset, start, pause, restart } = useSonification()
  const [score, setScore] = useState(readScore)
  const [heard, setHeard] = useState(false)
  const [answer, setAnswer] = useState('')
  const [answered, setAnswered] = useState(false)
  const timeoutRef = useRef<number | null>(null)
  const trackTitleRef = useRef(trackTitle)
  const pauseRef = useRef(pause)
  trackTitleRef.current = trackTitle
  pauseRef.current = pause

  useEffect(() => {
    loadDataset(dataset, false, true)
    return () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
      if (trackTitleRef.current === CLUE_TITLE) void pauseRef.current()
    }
  }, [dataset.id])

  const isCluePlaying = isPlaying && trackTitle === CLUE_TITLE
  const playClue = async () => {
    if (mediaStatus !== 'ready') return
    setHeard(false)
    setAnswer('')
    setAnswered(false)
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
    if (isPlaying) await pause()
    try {
      restart()
      await start(CLUE_TITLE)
      timeoutRef.current = window.setTimeout(() => {
        void pause()
        setHeard(true)
      }, 10_000)
    } catch { /* The shared Studio player reports media errors in its status and remains available. */ }
  }
  const pauseClue = async () => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
    await pause()
    setHeard(true)
  }
  const submitAnswer = (choice: string) => {
    if (!heard || answered) return
    setAnswer(choice)
    setAnswered(true)
    if (choice === correctAnswer) {
      const nextScore = score + 1
      setScore(nextScore)
      try { localStorage.setItem(SCORE_KEY, String(nextScore)) } catch { /* Keep the score for this visit if storage is unavailable. */ }
    }
  }

  return <div className="explore-page">
    <section className="explore-intro" aria-labelledby="explore-title">
      <PageContainer className="explore-intro-inner">
        <div className="explore-intro-copy">
          <span className="explore-kicker"><i aria-hidden="true" /> NASA SVS #3912 <span aria-hidden="true">/</span> A PLANET IN MOTION</span>
          <h1 id="explore-title">An ocean<br /><em>in motion.</em></h1>
        </div>
        <div className="explore-intro-aside">
          <p>Find your bearings on Earth, explore NASA&apos;s global ocean-current visualization, and learn how rendered pixels become sound.</p>
          <nav className="explore-waypoints" aria-label="Explore this page">
            <a href="#interactive-earth"><span>01</span>Interactive Earth</a>
            <a href="#nasa-visualization"><span>02</span>NASA visualization</a>
            <a href="#guess-ocean"><span>03</span>Guess the ocean</a>
            <a href="#science-guide"><span>04</span>Science Guide</a>
          </nav>
        </div>
      </PageContainer>
    </section>

    <section className="explore-globe-section" id="interactive-earth" aria-labelledby="earth-heading">
      <PageContainer>
        <header className="explore-section-heading explore-earth-heading">
          <span className="explore-section-index">01 <i /> INTERACTIVE EARTH</span>
          <div><h2 id="earth-heading">Find a place to begin.</h2><p>Choose a highlighted region to orient your exploration of NASA #3912.</p></div>
        </header>
        <EarthGlobe />
      </PageContainer>
    </section>

    <section className="explore-source-section" id="nasa-visualization" aria-labelledby="nasa-source-heading">
      <PageContainer>
        <header className="explore-section-heading explore-source-heading">
          <span className="explore-section-index">02 <i /> THE NASA VISUALIZATION</span>
          <h2 id="nasa-source-heading">Global Sea Surface Currents<br /><em>and Temperature.</em></h2>
          <p>ECCO2-modeled sea surface current flows, colored by corresponding sea surface temperature. A historical visualization, not a live feed.</p>
        </header>
        <figure className="explore-source-image">
          <img src={dataset.previewImage} alt="NASA SVS #3912 rendered visualization of global sea surface currents colored by sea surface temperature." loading="lazy" />
          <figcaption><span>NASA SVS #3912 · GLOBAL OCEAN</span><span>RENDERED VISUALIZATION</span></figcaption>
        </figure>
        <div className="explore-source-details">
          <div className="explore-source-meta">
            <div><span>VISUALIZATION PERIOD</span><p>March 25, 2007 – March 3, 2008</p></div>
            <div><span>MODEL ATTRIBUTION</span><p>ECCO2 · joint MIT/JPL project</p></div>
            <a href={dataset.sourceUrl} target="_blank" rel="noreferrer">Open the NASA source record <ArrowUpRight size={16} aria-hidden="true" /></a>
          </div>
          <div className="explore-color-scale">
            <div><span className="explore-section-index">SOURCE COLOR KEY</span><h3>Sea surface temperature</h3><p>The NASA legend labels a 0–32 °C range. Pixel colors sampled by EarthSonic are rendered display values, not calibrated pointwise temperatures.</p></div>
            <figure><img src={dataset.colorLegend.image} alt="NASA source color legend for sea surface temperature, from blue near 0 degrees Celsius through green and yellow to red near 32 degrees." loading="lazy" /><figcaption>{dataset.colorLegend.items.map((item) => <span key={item}>{item}</span>)}</figcaption></figure>
          </div>
          <p className="explore-attribution">{dataset.attribution} NASA source video, still image and color legend are packaged with this project.</p>
        </div>
      </PageContainer>
    </section>

    <section className="explore-quiz-section" id="guess-ocean" aria-labelledby="quiz-section-heading">
      <PageContainer>
        <header className="explore-section-heading explore-quiz-heading">
          <span className="explore-section-index">03 <i /> LISTEN · GUESS · LEARN</span>
          <div><h2 id="quiz-section-heading">Listen for the pattern.</h2><p>A short clue tests your understanding of EarthSonic&apos;s visual-to-sound mapping.</p></div>
        </header>
        <section className="guess-game" aria-labelledby="guess-heading">
          <div className="guess-game-intro">
            <div className="quiz-progress-copy"><span>ROUND 01 / 01</span><span>{answered ? 'COMPLETE' : heard ? 'READY TO ANSWER' : 'LISTEN FIRST'}</span></div>
            <div className="quiz-progress-track" role="progressbar" aria-label="Quiz round progress" aria-valuemin={0} aria-valuemax={1} aria-valuenow={answered ? 1 : 0}><span style={{ transform: `scaleX(${answered ? 1 : 0})` }} /></div>
            <h3 id="guess-heading">Which visual feature shapes the pitch?</h3>
            <p>Listen to the clue, then choose the rendered-image feature mapped artistically to tone frequency.</p>
            <div className="score-chip"><Sparkles size={15} aria-hidden="true" /><span>YOUR SCORE</span><b>{score}</b></div>
          </div>
          <div className="guess-game-main">
            <div className="challenge-bar">
              <div><span className="explore-section-index">NASA #3912 · {mediaStatus.toUpperCase()}</span><p>{mediaStatus === 'ready' ? heard ? 'The 10-second clue is ready for your answer.' : 'Play the clue, listen, and choose the feature mapped to pitch.' : mediaStatus === 'error' ? mediaError || 'The NASA source could not be loaded.' : 'Loading the NASA video and preparing its first frame…'}</p></div>
              <button className="button button-primary" type="button" disabled={mediaStatus !== 'ready'} onClick={() => void (isCluePlaying ? pauseClue() : playClue())}>{isCluePlaying ? 'Pause clue' : heard ? 'Play clue again' : 'Play 10-second clue'}</button>
            </div>
            {mediaStatus === 'error' && <p className="game-error" role="status">{mediaError} <a href={dataset.sourceUrl} target="_blank" rel="noreferrer">Open NASA source <ArrowUpRight size={14} aria-hidden="true" /></a></p>}
            <div className="guess-options" role="group" aria-label="Choose the visual feature that shapes pitch">{choices.map((choice) => <button key={choice} type="button" className={`${answer === choice ? 'chosen' : ''} ${answered && choice === correctAnswer ? 'correct' : ''} ${answered && answer === choice && answer !== correctAnswer ? 'incorrect' : ''}`} aria-pressed={answer === choice} disabled={!heard || answered} onClick={() => submitAnswer(choice)}>{answered && choice === correctAnswer ? <Check size={17} aria-hidden="true" /> : answered && answer === choice ? <X size={17} aria-hidden="true" /> : <CircleHelp size={17} aria-hidden="true" />}<span>{choice}</span></button>)}</div>
            {answered && <div className="answer-reveal" aria-live="polite" aria-atomic="true"><span className="explore-section-index">{answer === correctAnswer ? 'THAT’S RIGHT' : 'THE CORRECT MAPPING'}</span><h3>Rendered red–blue visual balance → artistic pitch mapping</h3><p>The red–blue balance is calculated from rendered pixels and mapped to tone frequency. It is a visual feature, not a calibrated sea-surface temperature measurement. Other image-derived cues shape sound level, stereo position and modulation.</p><div className="answer-links"><a href={dataset.sourceUrl} target="_blank" rel="noreferrer">NASA source record <ArrowUpRight size={15} aria-hidden="true" /></a><Link to="/studio">Explore the mapping in Studio <ArrowRight size={15} aria-hidden="true" /></Link><button type="button" onClick={() => { setHeard(false); setAnswered(false); setAnswer('') }}>Try again <ArrowRight size={15} aria-hidden="true" /></button></div></div>}
          </div>
        </section>
      </PageContainer>
    </section>

    <section className="explore-guide-section" id="science-guide" aria-labelledby="science-guide-heading">
      <PageContainer>
        <header className="explore-section-heading explore-guide-heading">
          <span className="explore-section-index">04 <i /> SCIENCE GUIDE</span>
          <h2 id="science-guide-heading">What the image can tell us.<br /><em>And what it cannot.</em></h2>
        </header>
        <ol className="science-guide-steps">
          <li><span className="guide-number">01</span><div><span className="guide-label">THE SOURCE</span><h3>NASA visualization</h3><p>{dataset.description} The displayed flow and color represent model output; this is a historical visualization, not a live data feed.</p></div></li>
          <li><span className="guide-number">02</span><div><span className="guide-label">THE ANALYSIS</span><h3>Rendered image features</h3><p>EarthSonic samples selected features from rendered video frames. Brightness, color balance and image change are computed from pixels; they are not direct ECCO2 numerical measurements.</p></div></li>
          <li><span className="guide-number">03</span><div><span className="guide-label">THE SOUND</span><h3>Artistic sound mapping</h3><p>Selected visual features control pitch, sound level, stereo position and modulation. The generated sound is an artistic interpretation, not recorded ocean audio.</p><ul className="guide-mappings">{dataset.sonification.map((item) => <li key={item.input}><span>{item.input}</span><b>{item.output}</b></li>)}</ul></div></li>
        </ol>
        <p className="science-guide-limit">Rendering, interpolation, compression and sample spacing can affect image-derived features. No local current-speed estimate or pointwise temperature value is produced.</p>
        <a className="guide-source-link" href={dataset.sourceUrl} target="_blank" rel="noreferrer">Read NASA SVS #3912 <ArrowUpRight size={15} aria-hidden="true" /></a>
      </PageContainer>
    </section>
  </div>
}
