import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ArrowRight, ArrowUpRight, Check, CircleHelp, RotateCcw, Sparkles, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DatasetAudioSource, type DatasetAudioHandle } from '../audio/DatasetAudioSource'
import { useSonification } from '../audio/SonificationContext'
import { datasets, getDataset } from '../data/datasets'
import { PageContainer } from '../components/layout/PageContainer'
import { SectionHeader } from '../components/ui/SectionHeader'

const SCORE_KEY = 'earthsonic.discover.score.v1'
const choices = ['Rendered warm–cool color balance', 'Frame-to-frame image change', 'Neither image feature']
const answerByDataset: Record<string, string> = { 'ocean-currents': 'Rendered warm–cool color balance' }
const mappingText = 'Rendered warm–cool color balance controls tone height. Frame-to-frame pixel change controls pulse density. These are visual cues, not direct temperature or current-speed readings.'

function readScore() {
  try { return Number(localStorage.getItem(SCORE_KEY) ?? 0) || 0 } catch { return 0 }
}

export function DiscoverPage() {
  const [datasetId, setDatasetId] = useState(datasets[0].id)
  const dataset = getDataset(datasetId)
  const sourceRef = useRef<DatasetAudioHandle>(null)
  const timeoutRef = useRef<number | null>(null)
  const { isPlaying, trackTitle } = useSonification()
  const [sourceStatus, setSourceStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [sourceMessage, setSourceMessage] = useState('Choose Prepare clue to load a NASA visualization.')
  const [loadChallenge, setLoadChallenge] = useState(false)
  const [heard, setHeard] = useState(false)
  const [answer, setAnswer] = useState('')
  const [answered, setAnswered] = useState(false)
  const [score, setScore] = useState(readScore)
  const [guideDatasetId, setGuideDatasetId] = useState(datasets[0].id)
  const [question, setQuestion] = useState('')
  const [guideAnswer, setGuideAnswer] = useState('')
  const [guideSource, setGuideSource] = useState('')
  const guideDataset = getDataset(guideDatasetId)
  const isRoundPlaying = isPlaying && trackTitle === `Mystery Earth · ${dataset.title}`

  useEffect(() => () => { if (timeoutRef.current) window.clearTimeout(timeoutRef.current) }, [])

  const playChallenge = async () => {
    if (!sourceRef.current?.ready) return
    setHeard(false)
    setAnswer('')
    setAnswered(false)
    try {
      await sourceRef.current.play(`Mystery Earth · ${dataset.title}`)
      timeoutRef.current = window.setTimeout(() => {
        void sourceRef.current?.pause()
        setHeard(true)
      }, 10_000)
    } catch {
      setSourceStatus('error')
      setSourceMessage('Audio or NASA video playback could not start.')
    }
  }
  const pauseChallenge = async () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    await sourceRef.current?.pause()
    setHeard(true)
  }
  const submitAnswer = (choice: string) => {
    if (!heard || answered) return
    setAnswer(choice)
    setAnswered(true)
    if (choice === answerByDataset[dataset.id]) {
      const next = score + 1
      setScore(next)
      localStorage.setItem(SCORE_KEY, String(next))
    }
  }
  const nextRound = async () => {
    if (isRoundPlaying) await pauseChallenge()
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    setDatasetId(datasets[0].id)
    setLoadChallenge(false)
    setHeard(false); setAnswer(''); setAnswered(false); setSourceStatus('loading'); setSourceMessage('Choose Prepare clue to load a NASA visualization.')
  }
  const replay = async () => {
    if (!sourceRef.current?.ready) return
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    await sourceRef.current.restart()
    await playChallenge()
  }

  const buildAnswer = (prompt: string) => {
    const text = prompt.toLowerCase()
    const vars = guideDataset.variables.map((variable) => variable.label).join(', ')
    let response: string
    if (/pitch|tone|sound|hear|mapping/.test(text)) {
      response = `For this visualization, ${guideDataset.sonification.map((mapping) => `${mapping.input} maps to ${mapping.output.toLowerCase()}`).join('; ')}. ${guideDataset.sonification.map((mapping) => mapping.interpretation).join(' ')}`
    } else if (/color|colour|legend/.test(text)) {
      response = `${guideDataset.colorLegend.label}${guideDataset.colorLegend.items.length ? `: ${guideDataset.colorLegend.items.join('; ')}.` : ''} ${guideDataset.variables.map((variable) => variable.notes).join(' ')}`
    } else if (/region|place|location|here/.test(text)) {
      response = `This source is a ${guideDataset.category.toLowerCase()} visualization. It shows ${guideDataset.description.toLowerCase()} It does not provide a local value for a selected region in this experience.`
    } else {
      response = `${guideDataset.description} The documented variables are ${vars}. ${guideDataset.providerUpdate} ${guideDataset.limitations[0]}`
    }
    setGuideAnswer(response)
    setGuideSource(guideDataset.sourceUrl)
  }
  const submitQuestion = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (question.trim()) buildAnswer(question.trim()) }
  const quickQuestions = useMemo(() => ['What am I hearing?', 'Why did the pitch change?', 'What does this color represent?', 'What is happening in this region?', 'Explain this simply.'], [])

  return <PageContainer className="discover-page">
    <header className="discover-header"><span className="eyebrow">NASA SVS #3912 · LISTEN · GUESS · LEARN</span><h1>Discover the ocean by sound.</h1><p>Listen to a short sound derived from the NASA ocean-current visualization, then identify which rendered feature controls pitch.</p></header>

    <section className="guess-game" aria-labelledby="guess-heading">
      <div className="guess-game-intro"><span className="eyebrow">01 · GUESS THE OCEAN</span><h2 id="guess-heading">What controls the pitch?</h2><p>Each clue samples NASA #3912. The sound follows rendered pixels and is not a direct measurement.</p><div className="score-chip"><Sparkles size={14} /> SCORE <b>{score}</b></div></div>
      <div className="guess-game-main">
        <DatasetAudioSource key={dataset.id} ref={sourceRef} dataset={dataset} shouldLoad={loadChallenge} onStatus={(state, message) => { setSourceStatus(state); setSourceMessage(message ?? (state === 'ready' ? 'NASA frame ready. Start listening when you are.' : 'Preparing the NASA source frame…')) }} />
        <div className="challenge-bar"><div><span className="eyebrow">OCEAN SOUND CLUE · {loadChallenge ? sourceStatus.toUpperCase() : 'STANDBY'}</span><p>{sourceStatus === 'ready' ? 'Listen to the 10-second sound clue, then choose what controls its pitch.' : sourceMessage}</p></div>{!loadChallenge ? <button className="button button-outline" onClick={() => setLoadChallenge(true)}>Prepare clue</button> : sourceStatus === 'error' ? <><button className="button button-outline" onClick={() => sourceRef.current?.load()}>Retry NASA source</button><button className="button button-quiet" onClick={() => void nextRound()}>Replay setup</button></> : <button className="button button-primary" disabled={sourceStatus !== 'ready'} onClick={() => void (isRoundPlaying ? pauseChallenge() : playChallenge())}>{isRoundPlaying ? 'Pause clue' : heard ? 'Play clue again' : 'Play 10-second clue'}</button>}</div>
        {sourceStatus === 'error' && <p className="game-error" role="status">{sourceMessage} <a href={dataset.sourceUrl} target="_blank" rel="noreferrer">NASA source page <ArrowUpRight size={13} /></a></p>}
        <div className="guess-options" role="group" aria-label="Guess the Earth sound">{choices.map((choice) => <button key={choice} className={`${answer === choice ? 'chosen' : ''} ${answered && choice === answerByDataset[dataset.id] ? 'correct' : ''} ${answered && answer === choice && answer !== answerByDataset[dataset.id] ? 'incorrect' : ''}`} disabled={!heard || answered} onClick={() => submitAnswer(choice)}>{answered && choice === answerByDataset[dataset.id] ? <Check size={15} /> : answered && answer === choice ? <X size={15} /> : <CircleHelp size={15} />}{choice}</button>)}</div>
        {answered && <div className="answer-reveal" aria-live="polite"><span className="eyebrow">{answer === answerByDataset[dataset.id] ? 'THAT’S RIGHT' : 'HERE’S THE MAPPING'}</span><h3>{dataset.title}</h3><p>{dataset.description}</p><p><b>What the sound followed:</b> {mappingText}</p><p className="answer-date">{dataset.temporalCoverage.label} · {dataset.attribution}</p><div className="answer-links"><a href={dataset.sourceUrl} target="_blank" rel="noreferrer">NASA source <ArrowUpRight size={13} /></a><Link to={`/studio?story=${dataset.id}`}>Open the Studio <ArrowRight size={13} /></Link><button onClick={() => void nextRound()}>Try again <ArrowRight size={13} /></button><button onClick={() => void replay()} disabled={sourceStatus !== 'ready'}><RotateCcw size={13} /> Replay clue</button></div></div>}
      </div>
    </section>

    <section className="interpreter-section" aria-labelledby="interpreter-heading">
      <div className="interpreter-heading"><span className="eyebrow">02 · EARTH INTERPRETER</span><h2 id="interpreter-heading">Ask about the science.</h2><p>A local guide grounded in the selected NASA record and the stated sonification mapping. No AI service is connected.</p></div>
      <div className="interpreter-panel"><label className="interpreter-dataset"><span className="eyebrow">SELECTED DATASET</span><select value={guideDatasetId} onChange={(event) => { setGuideDatasetId(event.target.value); setGuideAnswer(''); setGuideSource('') }}>{datasets.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
        <div className="quick-questions" aria-label="Suggested questions">{quickQuestions.map((item) => <button key={item} onClick={() => { setQuestion(item); buildAnswer(item) }}>{item}</button>)}</div>
        <form className="interpreter-form" onSubmit={submitQuestion}><label className="sr-only" htmlFor="earth-question">Ask about this visualization</label><input id="earth-question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about this visualization…" /><button type="submit" disabled={!question.trim()}>Ask</button></form>
        {guideAnswer && <div className="interpreter-answer" aria-live="polite"><span className="eyebrow">SOURCE-GROUNDED EXPLANATION</span><p>{guideAnswer}</p><a href={guideSource} target="_blank" rel="noreferrer">Read the NASA source <ArrowUpRight size={13} /></a></div>}
      </div>
    </section>

    <section className="discovery-facts"><SectionHeader eyebrow="03 · SCIENTIFIC DISCOVERIES">A little more context.</SectionHeader><div className="fact-grid">{datasets.map((item) => <article key={item.id} className="fact-card"><span className="eyebrow">{item.category.toUpperCase()} · {item.temporalCoverage.label}</span><h3>{item.title}</h3><p>{item.description}</p><p className="fact-limit">{item.variables[0].notes}</p><a href={item.sourceUrl} target="_blank" rel="noreferrer">Explore NASA source <ArrowUpRight size={13} /></a></article>)}</div></section>
  </PageContainer>
}
