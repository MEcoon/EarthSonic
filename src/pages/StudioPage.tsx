import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Database, Info, Maximize2, Pause, Play, RotateCcw, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { getDataset, datasets } from '../data/datasets'
import { analyzeRenderedVideoFrame, type FrameMetrics, type PreviousFrame } from '../services/frameAnalysis'
import { mapFrameToSound } from '../services/sonificationMapping'
import { PageContainer } from '../components/layout/PageContainer'
import { AudioVisualizers } from '../audio/AudioVisualizers'
import { soundPresets } from '../audio/types'
import { useSonification } from '../audio/SonificationContext'

const percent = (value: number) => `${Math.round(value * 100)}%`
const fmtTime = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`
const defaultMapping = { pitchSpan: 350, pulseSensitivity: 1, intensity: 100, stereoWidth: 100 }

export function StudioPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const dataset = getDataset(searchParams.get('story'))
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaWrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const previousRef = useRef<PreviousFrame | undefined>(undefined)
  const lastSampleAtRef = useRef(0)
  const [metrics, setMetrics] = useState<FrameMetrics | null>(null)
  const [analysisError, setAnalysisError] = useState('')
  const [mediaError, setMediaError] = useState(false)
  const [audioError, setAudioError] = useState('')
  const [playbackRate, setPlaybackRate] = useState(1)
  const [playbackTime, setPlaybackTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)
  const [mappingSettings, setMappingSettings] = useState(defaultMapping)
  const { isPlaying, muted, volume, preset, start, pause, setMapping, setTrackTitle, setVolume, toggleMute, setPreset } = useSonification()
  const toSoundMapping = (frame: FrameMetrics) => {
    const base = mapFrameToSound(frame)
    return {
      ...base,
      toneHz: 170 + frame.warmCoolBalance * mappingSettings.pitchSpan,
      pulseDensityHz: Math.max(0.2, base.pulseDensityHz * mappingSettings.pulseSensitivity),
      amplitude: Math.min(1, base.amplitude * mappingSettings.intensity / 100),
      pan: base.pan * mappingSettings.stereoWidth / 100,
    }
  }
  const controls = metrics ? toSoundMapping(metrics) : null

  useEffect(() => {
    if (isPlaying && metrics) setMapping(toSoundMapping(metrics))
  }, [isPlaying, metrics, mappingSettings.pitchSpan, mappingSettings.pulseSensitivity, mappingSettings.intensity, mappingSettings.stereoWidth])

  const sampleCurrentFrame = (force = false) => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    const now = performance.now()
    if (!force && now - lastSampleAtRef.current < 240) return
    lastSampleAtRef.current = now
    try {
      const result = analyzeRenderedVideoFrame(video, canvas, previousRef.current)
      previousRef.current = result.previous
      setMetrics(result.metrics)
      if (isPlaying) setMapping(toSoundMapping(result.metrics))
      setAnalysisError('')
    } catch (error) {
      if (error instanceof Error && !error.message.includes('not ready')) setAnalysisError(error.message)
    }
  }

  const toggleSonification = async () => {
    const video = videoRef.current
    if (isPlaying) {
      if (video && !video.paused) video.pause()
      await pause()
      return
    }
    if (!metrics) return
    setAudioError('')
    setTrackTitle(dataset.title)
    setMapping(toSoundMapping(metrics))
    if (video && video.ended) video.currentTime = 0
    try {
      const audioStart = start()
      const videoStart = video?.play()
      await Promise.all([audioStart, videoStart])
    } catch {
      await pause()
      setAudioError('Audio or NASA video playback could not start. Check browser audio permission and the NASA source connection.')
    }
  }

  const selectDataset = (id: string) => {
    previousRef.current = undefined
    lastSampleAtRef.current = 0
    setMetrics(null)
    setAnalysisError('')
    setMediaError(false)
    setMappingSettings(defaultMapping)
    setPlaybackTime(0)
    setVideoDuration(0)
    setSearchParams({ story: id })
  }

  const syncPlaybackTime = () => setPlaybackTime(videoRef.current?.currentTime ?? 0)
  const seekVideo = (seconds: number) => {
    const video = videoRef.current
    if (!video || !Number.isFinite(video.duration)) return
    video.currentTime = Math.max(0, Math.min(video.duration, seconds))
    setPlaybackTime(video.currentTime)
  }

  const stepFrame = (direction: -1 | 1) => {
    const video = videoRef.current
    if (!video || !Number.isFinite(video.duration)) return
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + direction / 30))
  }
  const setVideoRate = (rate: number) => {
    setPlaybackRate(rate)
    if (videoRef.current) videoRef.current.playbackRate = rate
  }
  const toggleFullscreen = () => {
    const container = mediaWrapRef.current
    if (!container) return
    if (document.fullscreenElement) void document.exitFullscreen()
    else void container.requestFullscreen?.()
  }

  return <PageContainer className="studio-page">
    <header className="studio-page-header"><div><span className="eyebrow">PHASE 3 · SCIENTIFIC ENGINE</span><h1>Sonification Studio</h1><p>Inspect the source visualization and see exactly which rendered-frame features are being sampled.</p></div>
      <label className="dataset-select-label"><span>NASA STORY</span><select value={dataset.id} onChange={(event) => selectDataset(event.target.value)} aria-label="Choose NASA visualization">{datasets.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
    </header>

    <div className="studio-grid">
      <section className="studio-media-column" aria-labelledby="studio-story-title">
        <div className="studio-media-heading"><div><span className="eyebrow">{dataset.category.toUpperCase()}</span><h2 id="studio-story-title">{dataset.title}</h2></div><span className="source-badge"><Database size={13} /> NASA SVS</span></div>
        <div className="source-video-wrap" ref={mediaWrapRef}>
          {!mediaError ? <video key={dataset.id} ref={videoRef} className="source-video" controls playsInline preload="metadata" crossOrigin="anonymous" poster={dataset.previewImage} onLoadedMetadata={(event) => { event.currentTarget.playbackRate = playbackRate; setVideoDuration(event.currentTarget.duration || 0); syncPlaybackTime() }} onTimeUpdate={() => { syncPlaybackTime(); sampleCurrentFrame() }} onSeeked={() => { syncPlaybackTime(); sampleCurrentFrame(true) }} onLoadedData={() => sampleCurrentFrame(true)} onPause={() => { if (isPlaying) void pause() }} onEnded={() => { void pause() }} onError={() => setMediaError(true)} aria-label={`${dataset.title}, NASA source visualization`}>
            <source src={dataset.mediaUrl} type={dataset.mediaType} />
            Your browser cannot play this NASA media file. Open the NASA source page instead.
          </video> : <div className="media-error" role="status"><Info size={20} /><b>NASA media could not be loaded.</b><p>Network access or this browser’s media support may be unavailable. The source link opens NASA’s official record.</p><a href={dataset.sourceUrl} target="_blank" rel="noreferrer">Open NASA source <ArrowUpRight size={14} /></a></div>}
          <canvas ref={canvasRef} className="analysis-canvas" aria-hidden="true" />
        </div>
        {!mediaError && <div className="video-tools" aria-label="Visualization playback tools">
          <div className="video-frame-tools"><button type="button" disabled={!videoDuration} onClick={() => stepFrame(-1)} aria-label="Step back one video frame"><SkipBack size={14} />Frame</button><button type="button" disabled={!videoDuration} onClick={() => stepFrame(1)} aria-label="Step forward one video frame">Frame<SkipForward size={14} /></button></div>
          <label className="video-speed"><span>Speed</span><select value={playbackRate} onChange={(event) => setVideoRate(Number(event.target.value))} aria-label="Video playback speed"><option value={0.5}>0.5×</option><option value={0.75}>0.75×</option><option value={1}>1×</option><option value={1.25}>1.25×</option><option value={1.5}>1.5×</option><option value={2}>2×</option></select></label>
          <button className="video-fullscreen" type="button" onClick={toggleFullscreen}><Maximize2 size={14} />Fullscreen</button>
        </div>}
        {!mediaError && <div className="video-timeline">
          <label htmlFor="studio-video-position"><span>VISUALIZATION POSITION</span><output>{fmtTime(playbackTime)}</output></label>
          <input id="studio-video-position" type="range" min="0" max={videoDuration || 1} step="0.01" value={Math.min(playbackTime, videoDuration || 1)} onChange={(event) => seekVideo(Number(event.target.value))} disabled={!videoDuration} aria-label="Seek NASA visualization" />
          <div className="video-timeline-foot"><span>Position within the source video</span><span>{fmtTime(videoDuration)}</span></div>
        </div>}
        <div className="source-facts"><span><b>TIME SPAN</b>{dataset.temporalCoverage.label}</span><span><b>DATA BASIS</b>Rendered visualization</span><span><b>PROVIDER</b>{dataset.attribution}</span></div>
        <a className="source-page-link" href={dataset.sourceUrl} target="_blank" rel="noreferrer">NASA visualization record <ArrowUpRight size={14} /></a>
      </section>

      <aside className="analysis-column" aria-label="Live rendered frame analysis">
        <div className="analysis-panel-heading"><div><span className="eyebrow">PIXEL ANALYSIS</span><h2>Frame profile</h2></div><span className={`analysis-live ${metrics ? 'is-active' : mediaError || analysisError ? 'is-error' : ''}`}><i />{metrics ? 'SAMPLING' : mediaError || analysisError ? 'UNAVAILABLE' : 'WAITING'}</span></div>
        <p className="analysis-disclaimer">This panel analyzes the rendered video frame. It does not read NASA’s underlying numerical model data.</p>
        {analysisError && <div className="analysis-error" role="status">{analysisError}</div>}
        <div className="metric-list">
          <Metric label="Average brightness" value={metrics ? percent(metrics.brightness) : '—'} progress={metrics?.brightness} />
          <Metric label="Warm–cool pixel balance" value={metrics ? percent(metrics.warmCoolBalance) : '—'} progress={metrics?.warmCoolBalance} />
          <Metric label="Spatial detail" value={metrics ? percent(metrics.spatialDetail) : '—'} progress={metrics?.spatialDetail} />
          <Metric label="Change since prior sample" value={metrics ? percent(metrics.frameChange) : '—'} progress={metrics?.frameChange} />
        </div>
        <section className="frame-details" aria-label="Additional sampled frame properties">
          <div className="frame-detail-line"><span>AVERAGE RGB · 0–255</span><b>{metrics ? `R ${metrics.averageRgb.red} · G ${metrics.averageRgb.green} · B ${metrics.averageRgb.blue}` : 'Waiting for a frame'}</b></div>
          <div className="frame-detail-line"><span>TOP COLOR BINS · 4 LEVELS PER CHANNEL</span></div>
          <div className="dominant-colors">{metrics ? metrics.dominantColors.map((color) => <div key={color.hex}><i aria-hidden="true" style={{ backgroundColor: color.hex }} /><code>{color.hex}</code><span>{percent(color.share)}</span></div>) : <span className="frame-detail-empty">Not sampled</span>}</div>
          <div className="frame-detail-line"><span>QUADRANT BRIGHTNESS</span><small>Rendered image only</small></div>
          <div className="region-grid">{(['northwest', 'northeast', 'southwest', 'southeast'] as const).map((region) => <RegionMetric key={region} label={region.replace('north', 'N ').replace('south', 'S ').replace('west', 'W').replace('east', 'E')} value={metrics?.regions[region]} />)}</div>
        </section>
        <div className="mapping-preview"><span className="eyebrow">DATA → SOUND PARAMETERS · RENDERED FRAME</span>
          {controls ? <><div className="mapping-preview-row"><span>Rendered color balance</span><b>{Math.round(controls.toneHz)} Hz tone</b></div><div className="mapping-preview-row"><span>Frame-to-frame change</span><b>{controls.pulseDensityHz.toFixed(1)} pulses/s</b></div><div className="mapping-preview-row"><span>Rendered brightness</span><b>{Math.round(controls.amplitude * 100)}% sound intensity</b></div><div className="mapping-preview-row"><span>Left–right image balance</span><b>{controls.pan.toFixed(2)} stereo position</b></div></> : <p className="mapping-placeholder">{mediaError ? 'A frame profile is unavailable because the NASA video did not load.' : 'Play or seek the NASA video to calculate a frame profile.'}</p>}
          <p className="mapping-note">These values define a perceptual mapping for generated audio. They are not physical measurements.</p>
        </div>
        <section className="mapping-lab" aria-labelledby="mapping-lab-heading">
          <div className="mapping-lab-heading"><div><span className="eyebrow">MAPPING LAB</span><h3 id="mapping-lab-heading">Shape the translation</h3></div><button type="button" onClick={() => setMappingSettings(defaultMapping)} aria-label="Restore default sound mapping"><RotateCcw size={14} />Reset</button></div>
          <p>Adjust how strongly rendered image features affect the sound. This changes the listening scale, not the source visualization.</p>
          <MappingSlider label="Pitch range" description="Warm–cool color balance → tone frequency" min={100} max={700} step={10} value={mappingSettings.pitchSpan} suffix=" Hz span" onChange={(value) => setMappingSettings((current) => ({ ...current, pitchSpan: value }))} />
          <MappingSlider label="Pulse tempo scale" description="Frame-to-frame image change → pulse density" min={50} max={200} step={10} value={mappingSettings.pulseSensitivity * 100} suffix="%" onChange={(value) => setMappingSettings((current) => ({ ...current, pulseSensitivity: value / 100 }))} />
          <MappingSlider label="Sound intensity" description="Rendered frame brightness → sound level" min={50} max={150} step={10} value={mappingSettings.intensity} suffix="%" onChange={(value) => setMappingSettings((current) => ({ ...current, intensity: value }))} />
          <MappingSlider label="Stereo width" description="Left–right brightness balance → stereo position" min={0} max={100} step={5} value={mappingSettings.stereoWidth} suffix="%" onChange={(value) => setMappingSettings((current) => ({ ...current, stereoWidth: value }))} />
        </section>
        {metrics && <div className="frame-timestamp"><span>VIDEO TIME</span><b>{fmtTime(metrics.frameTimeSeconds)}</b><span>SAMPLE INDEX</span><b>#{metrics.sampleIndex}</b><span>{metrics.sourceSize.width} × {metrics.sourceSize.height} source pixels · analyzed at 96 × 48</span></div>}
      </aside>
    </div>

    <section className="audio-engine-panel" aria-label="Data-driven audio controls">
      <div className="audio-engine-heading"><div><span className="eyebrow">WEB AUDIO API · IMAGE-DERIVED LISTENING</span><h2>Hear this visualization.</h2><p>Tone height follows rendered warm–cool color balance. Pulse density follows change between sampled frames. Sound intensity follows average brightness. Stereo position follows left–right brightness balance. These are image-derived cues, not scientific measurements.</p></div>
        <button className="button button-primary sonification-toggle" disabled={!metrics || mediaError} onClick={() => void toggleSonification()}>{isPlaying ? <Pause size={16} /> : <Play size={16} />}{isPlaying ? 'Pause sonification' : 'Play with sonification'}</button>
      </div>
      {audioError && <p className="audio-error" role="status">{audioError}</p>}
      <div className="audio-controls-row">
        <label className="preset-select"><span className="eyebrow">RENDERING STYLE</span><select value={preset} onChange={(event) => setPreset(event.target.value as typeof preset)}>{soundPresets.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <p className="preset-note">Presets change timbre only. The dataset-to-sound relationships stay the same.</p>
        <button className="audio-icon-control" onClick={toggleMute} aria-label={muted ? 'Unmute sonification' : 'Mute sonification'}>{muted ? <VolumeX size={17} /> : <Volume2 size={17} />}</button>
        <label className="audio-volume-control"><span className="sr-only">Sonification volume</span><input type="range" min="0" max="1" step="0.01" value={volume} onChange={(event) => setVolume(Number(event.target.value))} /></label>
        <span className="audio-volume-value">{Math.round(volume * 100)}%</span>
      </div>
      <AudioVisualizers />
    </section>

    <section className="transparency-panel"><div><span className="eyebrow">SCIENCE & TRANSPARENCY</span><h2>What this source shows</h2><p>{dataset.description}</p><p className="provider-note">{dataset.providerUpdate} {dataset.attribution}</p></div><div className="transparency-details"><div><b>Documented variables</b>{dataset.variables.map((variable) => <p key={variable.id}><strong>{variable.label}</strong>{variable.units && <small> · {variable.units}</small>}<span>{variable.notes}</span></p>)}</div><div><b>Source legend</b><p>{dataset.colorLegend.label}</p><img className="source-colorbar" src={dataset.colorLegend.image} alt="NASA sea surface temperature legend: blue 0 degrees Celsius, green 10 to 20, yellow about 25, red 32" />{dataset.colorLegend.items.length > 0 && <ul>{dataset.colorLegend.items.map((item) => <li key={item}>{item}</li>)}</ul>}</div><div><b>Interpretation limits</b><ul>{dataset.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul></div></div></section>
  </PageContainer>
}

function Metric({ label, value, progress }: { label: string; value: string; progress?: number }) {
  return <div className="metric-row"><div><span>{label}</span><b>{value}</b></div><div className="metric-track"><i style={{ width: progress === undefined ? '0%' : `${progress * 100}%` }} /></div></div>
}

function RegionMetric({ label, value }: { label: string; value?: number }) {
  return <div className="region-metric"><span>{label}</span><b>{value === undefined ? '—' : percent(value)}</b><i><em style={{ width: value === undefined ? '0%' : percent(value) }} /></i></div>
}

function MappingSlider({ label, description, min, max, step, value, suffix, onChange }: { label: string; description: string; min: number; max: number; step: number; value: number; suffix: string; onChange: (value: number) => void }) {
  return <label className="mapping-slider"><span><b>{label}</b><output>{value}{suffix}</output></span><small>{description}</small><input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} aria-label={label} /></label>
}
