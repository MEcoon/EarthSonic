import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, ArrowUpRight, Bookmark, Check, CircleHelp, Compass, Dice5, MapPin, RotateCcw, Sparkles, X } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { EarthGlobe } from '../components/earth/EarthGlobe'
import { ScienceGuide } from '../components/science/ScienceGuide'
import { PageContainer } from '../components/layout/PageContainer'
import { datasets, getDataset } from '../data/datasets'
import { getOceanRegion, oceanRegions } from '../data/oceanRegions'
import { oceanExpeditions } from '../data/oceanExpeditions'
import { DISCOVERIES_STORAGE_KEY, readDiscoveries, writeDiscoveries, type DiscoveriesStore } from '../services/discoveriesStorage'
import { MyDiscoveries } from '../components/discoveries/MyDiscoveries'
import { useSonification } from '../audio/SonificationContext'
import './ExplorePage.css'

const SCORE_KEY = 'earthsonic.discover.score.v1'
const CLUE_TITLE = 'EarthSonic sound clue · NASA #3912'
const choices = ['Rendered red–blue visual balance', 'Smoothed rendered-pixel change per source-video second', 'Rendered image brightness']
const correctAnswer = choices[0]
const readScore = () => { try { return Number(localStorage.getItem(SCORE_KEY) ?? 0) || 0 } catch { return 0 } }

export function ExplorePage() {
  const dataset = datasets[0]
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedRegionId = searchParams.get('region')
  const requestedRegion = getOceanRegion(requestedRegionId)
  const selectedRegion = requestedRegion?.availabilityStatus === 'available'
    ? requestedRegion
    : oceanRegions.find((region) => region.availabilityStatus === 'available')
  const [surpriseMessage, setSurpriseMessage] = useState('')
  const [activeExpeditionId, setActiveExpeditionId] = useState<string | null>(null)
  const [expeditionStopIndex, setExpeditionStopIndex] = useState(0)
  const [expeditionComplete, setExpeditionComplete] = useState(false)
  const [discoveries, setDiscoveries] = useState<DiscoveriesStore>(readDiscoveries)
  const [storageAvailable, setStorageAvailable] = useState(() => {
    try { window.localStorage.getItem(DISCOVERIES_STORAGE_KEY); return true } catch { return false }
  })
  const [regionSaveMessage, setRegionSaveMessage] = useState('')
  const [completionMessage, setCompletionMessage] = useState('')
  const availableRegions = oceanRegions.filter((region) => region.availabilityStatus === 'available' && datasets.some((item) => item.id === region.datasetId))
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
  const activeExpedition = oceanExpeditions.find((item) => item.id === activeExpeditionId)
  const activeExpeditionRegion = activeExpedition ? getOceanRegion(activeExpedition.regionIds[expeditionStopIndex]) : undefined

  useEffect(() => {
    loadDataset(dataset, false, true)
    return () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
      if (trackTitleRef.current === CLUE_TITLE) void pauseRef.current()
    }
  }, [dataset.id])

  useEffect(() => {
    if (!selectedRegion || requestedRegionId === selectedRegion.id) return
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.set('region', selectedRegion.id)
      return next
    }, { replace: true })
  }, [requestedRegionId, selectedRegion, setSearchParams])

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== DISCOVERIES_STORAGE_KEY && event.key !== null) return
      setDiscoveries(readDiscoveries())
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const commitDiscoveries = (next: DiscoveriesStore) => {
    setDiscoveries(next)
    const persisted = writeDiscoveries(next)
    setStorageAvailable(persisted)
    return persisted
  }

  const toggleSavedRegion = (regionId: string) => {
    const isSaved = discoveries.savedRegions.some((item) => item.regionId === regionId)
    const next = isSaved
      ? { ...discoveries, savedRegions: discoveries.savedRegions.filter((item) => item.regionId !== regionId) }
      : { ...discoveries, savedRegions: [...discoveries.savedRegions, { regionId, savedAt: new Date().toISOString() }] }
    const persisted = commitDiscoveries(next)
    setRegionSaveMessage(isSaved
      ? `Removed ${getOceanRegion(regionId)?.name ?? 'region'} from saved regions.${persisted ? '' : ' This change may not persist after this visit.'}`
      : `Saved ${getOceanRegion(regionId)?.name ?? 'region'} to My Discoveries.${persisted ? '' : ' This change may not persist after this visit.'}`)
  }

  const saveRegionNote = (regionId: string, note: string) => {
    const notes = { ...discoveries.notes }
    if (note) notes[regionId] = note
    else delete notes[regionId]
    return commitDiscoveries({ ...discoveries, notes })
  }

  const deleteRegionNote = (regionId: string) => {
    const notes = { ...discoveries.notes }
    delete notes[regionId]
    return commitDiscoveries({ ...discoveries, notes })
  }

  const removeSavedRegion = (regionId: string) => commitDiscoveries({
    ...discoveries,
    savedRegions: discoveries.savedRegions.filter((item) => item.regionId !== regionId),
  })

  const recordExpeditionCompletion = (expeditionId: string, visitedRegionIds: string[]) => {
    const expedition = oceanExpeditions.find((item) => item.id === expeditionId)
    if (!expedition || expedition.regionIds.length === 0 || discoveries.completedExpeditions.some((item) => item.expeditionId === expeditionId)) {
      setCompletionMessage('This expedition is already in My Discoveries.')
      return
    }
    const record = { expeditionId, title: expedition.title, completedAt: new Date().toISOString(), visitedRegionIds: visitedRegionIds.filter((id) => expedition.regionIds.includes(id)) }
    commitDiscoveries({ ...discoveries, completedExpeditions: [...discoveries.completedExpeditions, record] })
    setCompletionMessage('Expedition saved to My Discoveries.')
  }

  const selectRegion = (regionId: string, preserveExpedition = false) => {
    const region = getOceanRegion(regionId)
    if (!region || region.availabilityStatus !== 'available' || !datasets.some((item) => item.id === region.datasetId)) return
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.set('region', region.id)
      return next
    }, { replace: true })
    if (!preserveExpedition && activeExpedition && activeExpedition.regionIds[expeditionStopIndex] !== region.id) {
      setActiveExpeditionId(null)
      setExpeditionComplete(false)
    }
    setSurpriseMessage('')
  }

  const chooseExpedition = (expeditionId: string) => {
    const expedition = oceanExpeditions.find((item) => item.id === expeditionId)
    const firstRegion = expedition?.regionIds[0] ? getOceanRegion(expedition.regionIds[0]) : undefined
    if (!expedition || !firstRegion || firstRegion.availabilityStatus !== 'available') return
    setActiveExpeditionId(expedition.id)
    setExpeditionStopIndex(0)
    setExpeditionComplete(false)
    setCompletionMessage('')
    selectRegion(firstRegion.id, true)
  }

  const moveExpedition = (direction: -1 | 1) => {
    if (!activeExpedition) return
    const nextIndex = expeditionStopIndex + direction
    if (nextIndex < 0) return
    if (nextIndex >= activeExpedition.regionIds.length) {
      recordExpeditionCompletion(activeExpedition.id, activeExpedition.regionIds.slice(0, expeditionStopIndex + 1))
      setExpeditionComplete(true)
      return
    }
    const nextRegion = getOceanRegion(activeExpedition.regionIds[nextIndex])
    if (!nextRegion) return
    setExpeditionStopIndex(nextIndex)
    setExpeditionComplete(false)
    selectRegion(nextRegion.id, true)
  }

  const exitExpedition = () => {
    setActiveExpeditionId(null)
    setExpeditionComplete(false)
  }

  const replayExpedition = () => {
    if (!activeExpedition) return
    setExpeditionStopIndex(0)
    setExpeditionComplete(false)
    setCompletionMessage('')
    const firstRegion = getOceanRegion(activeExpedition.regionIds[0])
    if (firstRegion) selectRegion(firstRegion.id, true)
  }

  const surpriseMe = () => {
    if (availableRegions.length === 0) {
      setSurpriseMessage('There are no available regions to explore right now.')
      return
    }
    const alternatives = availableRegions.length > 1
      ? availableRegions.filter((region) => region.id !== selectedRegion?.id)
      : availableRegions
    const next = alternatives[Math.floor(Math.random() * alternatives.length)]
    if (!next) return
    selectRegion(next.id)
    setSurpriseMessage(`Selected ${next.name}. Its marker coordinates are approximate and have not been validated against the NASA video.`)
  }

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
            <a href="#ocean-expedition"><span>02</span>Ocean Expedition</a>
            <a href="#my-discoveries"><span>03</span>My discoveries</a>
            <a href="#nasa-visualization"><span>04</span>NASA visualization</a>
            <a href="#guess-ocean"><span>05</span>Guess the ocean</a>
            <a href="#science-guide"><span>06</span>Science Guide</a>
          </nav>
        </div>
      </PageContainer>
    </section>

    <section className="explore-globe-section" id="interactive-earth" aria-labelledby="earth-heading">
      <PageContainer>
        <header className="explore-section-heading explore-earth-heading">
          <span className="explore-section-index">01 <i /> INTERACTIVE EARTH</span>
          <div><h2 id="earth-heading">Find a place to begin.</h2><p>Choose an approximate region entry point to explore the global NASA #3912 visualization. These markers are not validated video coordinates.</p></div>
        </header>
        <div className="explore-discovery-layout">
          <EarthGlobe selectedRegionId={selectedRegion?.id ?? ''} onRegionSelect={selectRegion} />
          <aside className="explore-region-panel" id="available-regions" aria-label="Ocean region explorer">
            <div className="region-panel-heading">
              <div><span className="explore-section-index"><Compass size={15} aria-hidden="true" /> REGION ENTRY POINTS</span><h3>Choose a region</h3></div>
              <span>{availableRegions.length} available</span>
            </div>
            <button className="region-surprise-button" type="button" onClick={surpriseMe} disabled={availableRegions.length === 0}><Dice5 size={17} aria-hidden="true" /> Surprise me</button>
            {surpriseMessage && <p className="region-surprise-status" role="status" aria-live="polite">{surpriseMessage}</p>}
            <div className="region-list" role="group" aria-label="Available ocean regions">
              {oceanRegions.map((region) => {
                const available = region.availabilityStatus === 'available' && datasets.some((item) => item.id === region.datasetId)
                return <button key={region.id} type="button" className="region-list-item" aria-pressed={selectedRegion?.id === region.id} disabled={!available} onClick={() => selectRegion(region.id)}>
                  <span className="region-marker-symbol" aria-hidden="true"><MapPin size={17} /></span>
                  <span className="region-list-copy"><b>{region.name}</b><small>{region.ocean} · {available ? 'Available' : 'Unavailable'}</small><span>{region.shortDescription}</span></span>
                  <span className="region-selected-indicator">{selectedRegion?.id === region.id ? 'Selected' : available ? 'Select' : 'Unavailable'}</span>
                </button>
              })}
              {availableRegions.length === 0 && <p className="region-empty-state">No regions are currently available. The global NASA visualization remains available in Studio.</p>}
            </div>

            {selectedRegion && <section className="region-information-card" aria-labelledby="selected-region-heading" aria-live="polite" aria-atomic="true">
              <span className="explore-section-index">SELECTED REGION</span>
              <h3 id="selected-region-heading">{selectedRegion.name}</h3>
              <p className="region-information-ocean">{selectedRegion.ocean}</p>
              <button className="region-save-button" type="button" aria-pressed={discoveries.savedRegions.some((item) => item.regionId === selectedRegion.id)} onClick={() => toggleSavedRegion(selectedRegion.id)}><Bookmark size={16} aria-hidden="true" fill={discoveries.savedRegions.some((item) => item.regionId === selectedRegion.id) ? 'currentColor' : 'none'} />{discoveries.savedRegions.some((item) => item.regionId === selectedRegion.id) ? 'Remove from My Discoveries' : 'Save region'}</button>
              {regionSaveMessage && <p className="region-save-feedback" role="status" aria-live="polite">{regionSaveMessage}</p>}
              <dl className="region-information-facts">
                <div><dt>APPROXIMATE MARKER</dt><dd>{Math.abs(selectedRegion.latitude)}° {selectedRegion.latitude < 0 ? 'S' : 'N'} · {Math.abs(selectedRegion.longitude)}° {selectedRegion.longitude < 0 ? 'W' : 'E'}</dd></div>
                <div><dt>COORDINATE STATUS</dt><dd>Approximate · not independently validated</dd></div>
                <div><dt>VISUALIZATION</dt><dd>NASA SVS #3912 · global view</dd></div>
              </dl>
              <p className="region-information-description">{selectedRegion.scientificDescription}</p>
              <p className="region-information-limit">No local temperature, current velocity, direction, depth, or region-specific sound is available. Selection does not change the global video or its pixel analysis.</p>
              <Link className="button button-primary region-explore-action" to={`/studio?${new URLSearchParams({ region: selectedRegion.id, dataset: selectedRegion.datasetId }).toString()}`}>Explore Region in Studio <ArrowRight size={16} aria-hidden="true" /></Link>
              <a className="region-source-link" href={getDataset(selectedRegion.datasetId).sourceUrl} target="_blank" rel="noreferrer">Open NASA source record <ArrowUpRight size={14} aria-hidden="true" /></a>
            </section>}
          </aside>
        </div>
      </PageContainer>
    </section>

    <section className="explore-expedition-section" id="ocean-expedition" aria-labelledby="expedition-heading">
      <PageContainer>
        <header className="explore-section-heading expedition-heading">
          <span className="explore-section-index">02 <i /> OCEAN EXPEDITION</span>
          <div><h2 id="expedition-heading">Follow a basin into the global view.</h2><p>Choose a guided introduction built from EarthSonic’s existing region entry points. These are approximate exploration markers, not locally sampled NASA measurements.</p></div>
        </header>
        {!activeExpedition ? <div className="expedition-overview" aria-label="Ocean expeditions">
          {oceanExpeditions.map((expedition) => {
            const available = expedition.regionIds.length > 0 && expedition.regionIds.every((id) => {
              const region = getOceanRegion(id)
              return region?.availabilityStatus === 'available'
            })
            return <article className={`expedition-card${available ? '' : ' expedition-card-unavailable'}`} key={expedition.id}>
              <span className="explore-section-index">{expedition.ocean.toUpperCase()}</span>
              <h3>{expedition.title}</h3>
              <p>{expedition.description}</p>
              <div className="expedition-card-meta"><span>{available ? `${expedition.regionIds.length} mapped stop` : 'Not yet mapped'}</span><span>{available ? 'Approximate entry point' : 'No existing region'}</span></div>
              <button className="button button-secondary expedition-start" type="button" disabled={!available} onClick={() => chooseExpedition(expedition.id)}>{available ? <>Start Expedition <ArrowRight size={16} aria-hidden="true" /></> : 'Journey unavailable yet'}</button>
            </article>
          })}
          <p className="expedition-science-note">The North Pacific and North Atlantic each currently have one region entry point, so their journeys are single-stop introductions. No Indian Ocean region exists in the current project data. The Southern Ocean is a separate basin and is not substituted.</p>
        </div> : <section className="expedition-active" aria-label={`${activeExpedition.title} progress`}>
          <div className="expedition-active-top"><div><span className="explore-section-index">GUIDED JOURNEY · {activeExpedition.ocean.toUpperCase()}</span><h3>{activeExpedition.title}</h3></div><button type="button" className="expedition-exit" onClick={exitExpedition}><X size={16} aria-hidden="true" /> Exit expedition</button></div>
          {expeditionComplete ? <div className="expedition-completion" role="status" aria-live="polite">
            <span className="explore-section-index">JOURNEY COMPLETE</span><h4>You explored the {activeExpedition.ocean} entry point.</h4>
            <p className="expedition-save-feedback">{completionMessage}</p>
            <p>Visited: {activeExpedition.regionIds.map((id) => getOceanRegion(id)?.name).filter(Boolean).join(' · ')}</p>
            <div className="expedition-actions"><button className="button button-secondary" type="button" onClick={replayExpedition}><RotateCcw size={16} aria-hidden="true" /> Replay journey</button><button className="button button-primary" type="button" onClick={exitExpedition}>Return to Explore <ArrowRight size={16} aria-hidden="true" /></button></div>
          </div> : activeExpeditionRegion ? <>
            <div className="expedition-progress-line"><span>STOP {String(expeditionStopIndex + 1).padStart(2, '0')} / {String(activeExpedition.regionIds.length).padStart(2, '0')}</span><span>{Math.round(((expeditionStopIndex + 1) / activeExpedition.regionIds.length) * 100)}% THROUGH STOPS</span></div>
            <div className="expedition-progress-track" role="progressbar" aria-label="Expedition progress" aria-valuemin={0} aria-valuemax={activeExpedition.regionIds.length} aria-valuenow={expeditionStopIndex + 1}><span style={{ transform: `scaleX(${(expeditionStopIndex + 1) / activeExpedition.regionIds.length})` }} /></div>
            <div className="expedition-stop-layout"><div className="expedition-route" aria-label="Expedition stops">{activeExpedition.regionIds.map((id, index) => { const region = getOceanRegion(id); return <div className={`expedition-route-stop${index === expeditionStopIndex ? ' is-current' : ''}`} key={id}><span>{String(index + 1).padStart(2, '0')}</span><b>{region?.name}</b></div> })}</div>
              <article className="expedition-stop-card"><span className="explore-section-index">CURRENT STOP</span><h4>{activeExpeditionRegion.name}</h4><p>{activeExpeditionRegion.scientificDescription}</p><p className="expedition-limit">The NASA video remains a global visualization. Region selection does not crop the video or generate region-specific audio.</p><Link className="button button-primary" to={`/studio?${new URLSearchParams({ region: activeExpeditionRegion.id, dataset: activeExpeditionRegion.datasetId }).toString()}`}>Listen in Studio <ArrowRight size={16} aria-hidden="true" /></Link></article></div>
            <div className="expedition-navigation"><button className="button button-secondary" type="button" disabled={expeditionStopIndex === 0} onClick={() => moveExpedition(-1)}><ArrowLeft size={16} aria-hidden="true" /> Previous Stop</button><button className="button button-primary" type="button" onClick={() => moveExpedition(1)}>{expeditionStopIndex === activeExpedition.regionIds.length - 1 ? 'Complete Journey' : 'Next Stop'} <ArrowRight size={16} aria-hidden="true" /></button></div>
          </> : null}
        </section>}
      </PageContainer>
    </section>

    <MyDiscoveries discoveries={discoveries} storageAvailable={storageAvailable} onSaveNote={saveRegionNote} onDeleteNote={deleteRegionNote} onRemoveRegion={removeSavedRegion} />

    <section className="explore-source-section" id="nasa-visualization" aria-labelledby="nasa-source-heading">
      <PageContainer>
        <header className="explore-section-heading explore-source-heading">
          <span className="explore-section-index">04 <i /> THE NASA VISUALIZATION</span>
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
          <span className="explore-section-index">05 <i /> LISTEN · GUESS · LEARN</span>
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

    <div id="science-guide"><PageContainer><ScienceGuide dataset={dataset} /></PageContainer></div>
  </div>
}
