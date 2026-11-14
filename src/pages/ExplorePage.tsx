import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ArrowUpRight, Check, CircleHelp, Sparkles, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EarthGlobe } from '../components/earth/EarthGlobe'
import { PageContainer } from '../components/layout/PageContainer'
import { SectionHeader } from '../components/ui/SectionHeader'
import { datasets } from '../data/datasets'
import { useSonification } from '../audio/SonificationContext'

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

  return <>
    <PageContainer className="explore-hero"><div><span className="eyebrow">NASA SVS #3912 · GLOBAL OCEAN</span><h1>Listen to the<br /><span>moving ocean.</span></h1><p>Explore NASA’s visualization of ECCO2-modeled sea surface currents colored by sea surface temperature. EarthSonic interprets rendered video pixels as sound.</p></div><div className="explore-coordinates"><span>ONE NASA VISUALIZATION</span><span>VIEW · LISTEN · LEARN</span></div></PageContainer>

    <PageContainer className="globe-section"><div className="globe-intro"><SectionHeader eyebrow="INTERACTIVE EARTH">Explore the ocean context.</SectionHeader><p>Rotate the globe or choose a highlighted ocean region to orient your exploration. Markers are entry points, not local measurements.</p></div><EarthGlobe /></PageContainer>

    <PageContainer className="gallery-section">
      <div className="gallery-header"><SectionHeader eyebrow="THE NASA SOURCE">One visualization. A year of modeled ocean flow.</SectionHeader></div>
      <article className="experience-card single-source-card">
        <div className="experience-image"><img src={dataset.previewImage} alt="NASA #3912 global sea surface current visualization colored by temperature" /><span className="experience-category">NASA SVS #3912</span></div>
        <div className="experience-card-copy"><div className="experience-meta"><span>{dataset.temporalCoverage.label}</span><span>{dataset.attribution}</span></div><h3>{dataset.title}</h3><p>{dataset.description}</p><div className="experience-card-actions"><Link className="experience-open" to="/studio">Open Studio <ArrowRight size={14} /></Link><a className="experience-source" href={dataset.sourceUrl} target="_blank" rel="noreferrer">NASA source record <ArrowUpRight size={13} /></a></div></div>
      </article>
    </PageContainer>

    <PageContainer className="discover-page">
      <header className="discover-header"><span className="eyebrow">LISTEN · GUESS · LEARN</span><h2>Guess the sound mapping.</h2><p>Hear a short sample from the shared NASA player, then identify which rendered-image feature artistically controls pitch.</p></header>
      <section className="guess-game" aria-labelledby="guess-heading">
        <div className="guess-game-intro"><span className="eyebrow">SOUND CLUE</span><h2 id="guess-heading">Which visual feature shapes the pitch?</h2><p>All choices describe rendered pixels. The audio is an artistic interpretation, not a direct measurement.</p><div className="score-chip"><Sparkles size={14} /> SCORE <b>{score}</b></div></div>
        <div className="guess-game-main">
          <div className="challenge-bar"><div><span className="eyebrow">NASA #3912 · {mediaStatus.toUpperCase()}</span><p>{mediaStatus === 'ready' ? heard ? 'The 10-second clue is ready for your answer.' : 'Play the clue, listen, and choose the feature mapped to pitch.' : mediaStatus === 'error' ? mediaError || 'The NASA source could not be loaded.' : 'Loading the NASA video and preparing its first frame…'}</p></div><button className="button button-primary" disabled={mediaStatus !== 'ready'} onClick={() => void (isCluePlaying ? pauseClue() : playClue())}>{isCluePlaying ? 'Pause clue' : heard ? 'Play clue again' : 'Play 10-second clue'}</button></div>
          {mediaStatus === 'error' && <p className="game-error" role="status">{mediaError} <a href={dataset.sourceUrl} target="_blank" rel="noreferrer">Open NASA source <ArrowUpRight size={13} /></a></p>}
          <div className="guess-options" role="group" aria-label="Guess the NASA sound mapping">{choices.map((choice) => <button key={choice} className={`${answer === choice ? 'chosen' : ''} ${answered && choice === correctAnswer ? 'correct' : ''} ${answered && answer === choice && answer !== correctAnswer ? 'incorrect' : ''}`} disabled={!heard || answered} onClick={() => submitAnswer(choice)}>{answered && choice === correctAnswer ? <Check size={15} /> : answered && answer === choice ? <X size={15} /> : <CircleHelp size={15} />}{choice}</button>)}</div>
          {answered && <div className="answer-reveal" aria-live="polite"><span className="eyebrow">{answer === correctAnswer ? 'THAT’S RIGHT' : 'HERE’S THE MAPPING'}</span><h3>{dataset.title}</h3><p><b>Pitch:</b> rendered red–blue visual balance is mapped artistically to tone frequency. It does not measure sea surface temperature.</p><p><b>Other sound controls:</b> image brightness maps to sound level; left–right brightness balance maps to stereo position; smoothed image-change rate maps to amplitude-modulation rate.</p><div className="answer-links"><a href={dataset.sourceUrl} target="_blank" rel="noreferrer">NASA source record <ArrowUpRight size={13} /></a><Link to="/studio">Open Studio <ArrowRight size={13} /></Link><button onClick={() => { setHeard(false); setAnswered(false); setAnswer('') }}>Try again <ArrowRight size={13} /></button></div></div>}
        </div>
      </section>

      <section className="discovery-facts science-guide" aria-labelledby="science-guide-heading"><SectionHeader eyebrow="SCIENCE GUIDE · NASA SVS #3912">Understand what you see and hear.</SectionHeader><h2 id="science-guide-heading" className="sr-only">Science Guide</h2>
        <div className="fact-grid">
          <article className="fact-card"><span className="eyebrow">01 · NASA VISUALIZATION</span><h3>What the source depicts</h3><p>{dataset.description}</p><p className="fact-limit">Coverage: {dataset.temporalCoverage.label}. This is a historical model visualization, not a live data feed.</p></article>
          <article className="fact-card"><span className="eyebrow">02 · SOURCE COLOR KEY</span><h3>{dataset.colorLegend.label}</h3><ul>{dataset.colorLegend.items.map((item) => <li key={item}>{item}</li>)}</ul><p className="fact-limit">EarthSonic samples displayed colors; it does not decode calibrated temperature values from the pixels.</p></article>
          <article className="fact-card"><span className="eyebrow">03 · EARTHSONIC ANALYSIS</span><h3>Rendered pixels become cues</h3><p>Canvas samples a small version of each video frame. Brightness, RGB balance, screen-side brightness, and image change are computed from those pixels.</p><p className="fact-limit">Rendering, interpolation, compression, and sample spacing can affect pixel features. None is a direct measurement of current speed or temperature.</p></article>
          <article className="fact-card"><span className="eyebrow">04 · ARTISTIC SOUND MAPPING</span><h3>How the sound responds</h3>{dataset.sonification.map((item) => <p key={item.input}><b>{item.input} → {item.output}.</b> {item.interpretation}</p>)}</article>
        </div>
        <a className="about-source-link" href={dataset.sourceUrl} target="_blank" rel="noreferrer">Read NASA SVS #3912 <ArrowUpRight size={14} /></a>
      </section>
    </PageContainer>
  </>
}
