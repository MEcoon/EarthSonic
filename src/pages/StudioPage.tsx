import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Database, Info, Maximize2, Minimize2, Pause, Play, Repeat, RotateCcw, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react'
import { datasets } from '../data/datasets'
import type { FrameMetrics } from '../services/frameAnalysis'
import { IMAGE_CHANGE_RATE_REFERENCE_PER_VIDEO_SECOND, mapFrameToSound } from '../services/sonificationMapping'
import { PageContainer } from '../components/layout/PageContainer'
import { AudioVisualizers } from '../audio/AudioVisualizers'
import { soundPresets } from '../audio/types'
import { useSonification } from '../audio/SonificationContext'

const percent = (value: number) => `${Math.round(value * 100)}%`
const fmtTime = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`
const defaultMapping = { pitchSpan: 350, pulseSensitivity: 1, intensity: 100, stereoWidth: 100 }

export function StudioPage() {
  const dataset = datasets[0]
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaWrapRef = useRef<HTMLDivElement>(null)
  const mirrorSeekingRef = useRef(false)
  const [audioError, setAudioError] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [fullscreenError, setFullscreenError] = useState('')
  const [playbackRate, setPlaybackRate] = useState(1)
  const [mappingSettings, setMappingSettings] = useState(defaultMapping)
  const { isPlaying, muted, volume, preset, isLooping, metrics, currentTime: playbackTime, duration: videoDuration,
    mediaStatus, mediaError, start, pause, loadDataset, seek, setPlaybackRate: setSharedPlaybackRate,
    getVideoElement, setMapping, setVolume, toggleMute, setPreset, setLooping } = useSonification()
  const toSoundMapping = (frame: FrameMetrics) => {
    const base = mapFrameToSound(frame)
    return {
      ...base,
      toneHz: 170 + frame.warmCoolBalance * mappingSettings.pitchSpan,
      modulationRateHz: Math.max(0.2, base.modulationRateHz * mappingSettings.pulseSensitivity),
      amplitude: Math.min(1, base.amplitude * mappingSettings.intensity / 100),
      pan: base.pan * mappingSettings.stereoWidth / 100,
    }
  }
  const controls = metrics ? toSoundMapping(metrics) : null

  useEffect(() => { loadDataset(dataset, false, true) }, [dataset.id])

  useEffect(() => {
    const syncFullscreenState = () => setIsFullscreen(document.fullscreenElement === mediaWrapRef.current)
    const exitFullscreenOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || document.fullscreenElement !== mediaWrapRef.current) return
      event.preventDefault()
      void document.exitFullscreen().catch(() => setFullscreenError('Fullscreen could not be exited. Try the fullscreen control again.'))
    }
    document.addEventListener('fullscreenchange', syncFullscreenState)
    document.addEventListener('keydown', exitFullscreenOnEscape)
    syncFullscreenState()
    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreenState)
      document.removeEventListener('keydown', exitFullscreenOnEscape)
    }
  }, [])

  useEffect(() => {
    const mirror = videoRef.current
    if (!mirror) return
    mirror.playbackRate = playbackRate
    if (!mirrorSeekingRef.current && mirror.readyState >= 1 && Number.isFinite(playbackTime) && Math.abs(mirror.currentTime - playbackTime) > 0.2) mirror.currentTime = playbackTime
    if (isPlaying && mirror.paused) void mirror.play().catch(() => undefined)
    else if (!isPlaying && !mirror.paused) mirror.pause()
  }, [isPlaying, playbackTime, playbackRate, dataset.mediaUrl])

  useEffect(() => {
    if (isPlaying && metrics) setMapping(toSoundMapping(metrics))
  }, [isPlaying, metrics, mappingSettings.pitchSpan, mappingSettings.pulseSensitivity, mappingSettings.intensity, mappingSettings.stereoWidth])

  const toggleSonification = async () => {
    if (isPlaying) {
      await pause()
      return
    }
    if (!metrics) return
    setAudioError('')
    setMapping(toSoundMapping(metrics))
    try {
      await start(dataset.title)
    } catch {
      await pause()
      setAudioError('Audio or the packaged NASA video could not start. Check browser audio permission and media support.')
    }
  }

  const seekVideo = (seconds: number) => {
    seek(seconds)
  }

  const stepFrame = (direction: -1 | 1) => {
    seek(playbackTime + direction / 30)
  }
  const setVideoRate = (rate: number) => {
    setPlaybackRate(rate)
    setSharedPlaybackRate(rate)
  }
  const toggleFullscreen = async () => {
    const container = mediaWrapRef.current
    if (!container) return
    setFullscreenError('')
    try {
      if (document.fullscreenElement === container) {
        await document.exitFullscreen()
      } else if (document.fullscreenEnabled && container.requestFullscreen) {
        await container.requestFullscreen()
      } else {
        setFullscreenError('Fullscreen is not available in this browser.')
      }
    } catch {
      setFullscreenError('Fullscreen could not be changed. Check browser permissions and try again.')
    }
  }

  return <PageContainer className="studio-page">
    <header className="studio-page-header"><div><span className="eyebrow">NASA SVS #3912 · SCIENTIFIC ENGINE</span><h1>Sonification Studio</h1><p>Inspect the source visualization and see exactly which rendered-frame features are being sampled.</p></div></header>

    <div className="studio-grid">
      <section className="studio-media-column" aria-labelledby="studio-story-title">
        <div className="studio-media-heading"><div><span className="eyebrow">{dataset.category.toUpperCase()}</span><h2 id="studio-story-title">{dataset.title}</h2></div><span className="source-badge"><Database size={13} /> NASA SVS</span></div>
        <div className="source-video-wrap" ref={mediaWrapRef}>
          {mediaStatus !== 'error' ? <video ref={videoRef} className="source-video" controls muted playsInline preload="metadata" src={dataset.mediaUrl} poster={dataset.previewImage}
            onLoadedMetadata={(event) => { event.currentTarget.playbackRate = playbackRate; const source = getVideoElement(); if (source && Math.abs(event.currentTarget.currentTime - source.currentTime) > 0.2) event.currentTarget.currentTime = source.currentTime; if (isPlaying) void event.currentTarget.play().catch(() => undefined) }}
            onPlay={(event) => { if (!isPlaying) { seek(event.currentTarget.currentTime); void start(dataset.title).catch(() => setAudioError('Audio could not start. Check browser audio permission.')) } }}
            onPause={(event) => { if (event.currentTarget.paused && isPlaying) void pause() }}
            onSeeking={() => { mirrorSeekingRef.current = true }}
            onSeeked={(event) => { mirrorSeekingRef.current = false; seek(event.currentTarget.currentTime) }}
            onEnded={() => { if (isPlaying) void pause() }}
            aria-label={`${dataset.title}, synchronized muted view of the NASA visualization`} />
          : <div className="media-error" role="status"><Info size={20} /><b>NASA media could not be loaded.</b><p>The packaged video could not be decoded or sampled. Check browser media support, then retry the source.</p><a href={dataset.sourceUrl} target="_blank" rel="noreferrer">Open NASA source <ArrowUpRight size={14} /></a><button type="button" onClick={() => loadDataset(dataset, false)}>Retry packaged video</button></div>}
          {mediaStatus !== 'error' && <button className="video-fullscreen-overlay" type="button" onClick={() => void toggleFullscreen()} aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>{isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}<span>{isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}</span></button>}
          {fullscreenError && <p className="fullscreen-error" role="status">{fullscreenError}</p>}
        </div>
        {mediaStatus !== 'error' && <div className="video-tools" aria-label="Visualization playback tools">
          <div className="video-frame-tools"><button type="button" disabled={!videoDuration} onClick={() => stepFrame(-1)} aria-label="Step back one video frame"><SkipBack size={14} />Frame</button><button type="button" disabled={!videoDuration} onClick={() => stepFrame(1)} aria-label="Step forward one video frame">Frame<SkipForward size={14} /></button></div>
          <label className="video-speed"><span>Speed</span><select value={playbackRate} onChange={(event) => setVideoRate(Number(event.target.value))} aria-label="Video playback speed"><option value={0.5}>0.5×</option><option value={0.75}>0.75×</option><option value={1}>1×</option><option value={1.25}>1.25×</option><option value={1.5}>1.5×</option><option value={2}>2×</option></select></label>
        </div>}
        {mediaStatus !== 'error' && <div className="video-timeline">
          <label htmlFor="studio-video-position"><span>VISUALIZATION POSITION</span><output>{fmtTime(playbackTime)}</output></label>
          <input id="studio-video-position" type="range" min="0" max={videoDuration || 1} step="0.01" value={Math.min(playbackTime, videoDuration || 1)} onChange={(event) => seekVideo(Number(event.target.value))} disabled={!videoDuration} aria-label="Seek NASA visualization" />
          <div className="video-timeline-foot"><span>Position within the source video</span><span>{fmtTime(videoDuration)}</span></div>
        </div>}
        <div className="source-facts"><span><b>TIME SPAN</b>{dataset.temporalCoverage.label}</span><span><b>DATA BASIS</b>Rendered visualization</span><span><b>PROVIDER</b>{dataset.attribution}</span></div>
        <a className="source-page-link" href={dataset.sourceUrl} target="_blank" rel="noreferrer">NASA visualization record <ArrowUpRight size={14} /></a>
      </section>

      <aside className="analysis-column" aria-label="Live rendered frame analysis">
        <div className="analysis-panel-heading"><div><span className="eyebrow">PIXEL ANALYSIS</span><h2>Frame profile</h2></div><span className={`analysis-live ${metrics ? 'is-active' : mediaStatus === 'error' ? 'is-error' : ''}`}><i />{metrics ? 'SAMPLING' : mediaStatus === 'error' ? 'UNAVAILABLE' : 'WAITING'}</span></div>
        <p className="analysis-disclaimer">This panel measures properties of rendered video pixels. It does not read NASA’s underlying numerical model data.</p>
        {mediaError && mediaStatus === 'error' && <div className="analysis-error" role="status">{mediaError}</div>}
        <div className="metric-list">
          <Metric label="Rendered image brightness" value={metrics ? percent(metrics.brightness) : '—'} progress={metrics?.brightness} />
          <Metric label="Rendered red–blue visual balance" value={metrics ? percent(metrics.warmCoolBalance) : '—'} progress={metrics?.warmCoolBalance} />
          <Metric label="Rendered-pixel image-change rate · normalized RGB difference / video second" value={metrics?.imageChangeRatePerVideoSecond == null ? '—' : `${metrics.imageChangeRatePerVideoSecond.toFixed(3)} / s`} progress={metrics?.imageChangeRatePerVideoSecond == null ? undefined : Math.min(1, metrics.imageChangeRatePerVideoSecond / IMAGE_CHANGE_RATE_REFERENCE_PER_VIDEO_SECOND)} />
          <Metric label="Left–right rendered-image brightness balance" value={metrics ? percent(metrics.leftRightBalance) : '—'} progress={metrics?.leftRightBalance} />
          <p className="analysis-disclaimer">The image-change rate is the mean absolute rendered RGB difference per elapsed source-video second, smoothed with a 0.5-second exponential time constant. It is still a visual change feature, not current speed. The first sample after loading or seeking has no rate until a later sample provides a positive video-time interval{metrics?.sampleIntervalVideoSeconds == null ? '.' : ` (last interval ${metrics.sampleIntervalVideoSeconds.toFixed(3)} source-video seconds; ${metrics.sampleIntervalMilliseconds == null ? 'wall interval unavailable' : `${Math.round(metrics.sampleIntervalMilliseconds)} ms wall time`}).`}</p>
          <p className="analysis-disclaimer">These four image-derived features feed the sound mapping. Other sampled properties below are retained for inspection and do not affect audio.</p>
        </div>
        <section className="frame-details" aria-label="Additional sampled frame properties">
          <div className="frame-detail-line"><span>AVERAGE RENDERED-PIXEL RGB CHANNEL VALUES · 0–255</span><b>{metrics ? `R ${metrics.averageRgb.red} · G ${metrics.averageRgb.green} · B ${metrics.averageRgb.blue}` : 'Waiting for a frame'}</b></div>
          <p className="analysis-disclaimer">RGB values are averages of encoded display pixels. Red–blue visual balance is (mean red − mean blue + 1) ÷ 2; it is not calibrated temperature.</p>
          <div className="frame-detail-line"><span>SPATIAL PIXEL VARIATION INDEX</span><b>{metrics ? percent(metrics.spatialDetail) : '—'}</b><small>Mean adjacent-pixel luma differences, scaled and clamped; image detail only.</small></div>
          <div className="frame-detail-line"><span>LEGACY IMAGE CHANGE INDEX · DIAGNOSTIC ONLY</span><b>{metrics ? percent(metrics.frameChange) : '—'}</b><small>Mean absolute RGB difference between accepted samples × 2, clamped 0–100; its value depends on the sample interval and is not used for sound.</small></div>
          <div className="frame-detail-line"><span>TOP RENDERED-PIXEL COLOR BINS · 4 LEVELS PER CHANNEL</span><small>Top 3 of 64 RGB bins; shares are fractions of sampled pixels.</small></div>
          <div className="dominant-colors">{metrics ? metrics.dominantColors.map((color) => <div key={color.hex}><i aria-hidden="true" style={{ backgroundColor: color.hex }} /><code>{color.hex}</code><span>{percent(color.share)}</span></div>) : <span className="frame-detail-empty">Not sampled</span>}</div>
          <div className="frame-detail-line"><span>RENDERED-IMAGE QUADRANT BRIGHTNESS</span><small>Screen-space corners (top/bottom, left/right), not geographic regions.</small></div>
          <div className="region-grid">{(['northwest', 'northeast', 'southwest', 'southeast'] as const).map((region) => <RegionMetric key={region} label={region.replace('north', 'N ').replace('south', 'S ').replace('west', 'W').replace('east', 'E')} value={metrics?.regions[region]} />)}</div>
        </section>
        <div className="mapping-preview"><span className="eyebrow">IMAGE FEATURES → SOUND PARAMETERS</span>
          {controls ? <><div className="mapping-preview-row"><span>Rendered red–blue visual balance</span><b>{Math.round(controls.toneHz)} Hz artistic pitch mapping</b></div><div className="mapping-preview-row"><span>Smoothed image-change rate per source-video second</span><b>{controls.modulationRateHz.toFixed(1)} Hz amplitude modulation</b></div><div className="mapping-preview-row"><span>Rendered image brightness</span><b>{Math.round(controls.amplitude * 100)}% artistic sound level</b></div><div className="mapping-preview-row"><span>Rendered left–right image brightness balance</span><b>{controls.pan.toFixed(2)} stereo position</b></div></> : <p className="mapping-placeholder">{mediaStatus === 'error' ? 'A frame profile is unavailable because the packaged NASA video could not be played or sampled.' : 'Play or seek the NASA video to calculate a rendered-frame profile.'}</p>}
          <p className="mapping-note">All controls are artistic mappings of rendered-pixel features, not ECCO2 measurements. The base mapping scales image-change rate to 0.5–5 Hz; the mapping-lab slider adjusts that rate. The reference range is a creative choice, not a scientific threshold.</p>
        </div>
        <section className="mapping-lab" aria-labelledby="mapping-lab-heading">
          <div className="mapping-lab-heading"><div><span className="eyebrow">MAPPING LAB</span><h3 id="mapping-lab-heading">Shape the translation</h3></div><button type="button" onClick={() => setMappingSettings(defaultMapping)} aria-label="Restore default sound mapping"><RotateCcw size={14} />Reset</button></div>
          <p>Adjust how strongly rendered image features affect the sound. This changes the listening scale, not the source visualization.</p>
          <MappingSlider label="Artistic pitch range" description="Rendered red–blue visual balance → tone frequency" min={100} max={700} step={10} value={mappingSettings.pitchSpan} suffix=" Hz span" onChange={(value) => setMappingSettings((current) => ({ ...current, pitchSpan: value }))} />
          <MappingSlider label="Modulation-rate scale" description="Smoothed rendered-pixel change per source-video second → amplitude-modulation rate" min={50} max={200} step={10} value={mappingSettings.pulseSensitivity * 100} suffix="%" onChange={(value) => setMappingSettings((current) => ({ ...current, pulseSensitivity: value / 100 }))} />
          <MappingSlider label="Sound intensity" description="Rendered image brightness → artistic sound level" min={50} max={150} step={10} value={mappingSettings.intensity} suffix="%" onChange={(value) => setMappingSettings((current) => ({ ...current, intensity: value }))} />
          <MappingSlider label="Stereo width" description="Rendered left–right brightness balance → stereo position" min={0} max={100} step={5} value={mappingSettings.stereoWidth} suffix="%" onChange={(value) => setMappingSettings((current) => ({ ...current, stereoWidth: value }))} />
        </section>
        {metrics && <div className="frame-timestamp"><span>VIDEO TIME</span><b>{fmtTime(metrics.frameTimeSeconds)}</b><span>SAMPLE INDEX</span><b>#{metrics.sampleIndex}</b><span>{metrics.sourceSize.width} × {metrics.sourceSize.height} source pixels · analyzed at 96 × 48</span></div>}
      </aside>
    </div>

    <section className="audio-engine-panel" aria-label="Data-driven audio controls">
      <div className="audio-engine-heading"><div><span className="eyebrow">WEB AUDIO API · IMAGE-DERIVED LISTENING</span><h2>Hear this visualization.</h2><p>Artistic pitch follows rendered red–blue visual balance. Amplitude-modulation rate follows smoothed rendered-pixel change per source-video second. Sound level follows rendered image brightness. Stereo position follows rendered left–right image brightness balance. These are image-derived cues, not scientific measurements.</p></div>
        <button className="button button-primary sonification-toggle" disabled={!metrics || mediaStatus === 'error'} onClick={() => void toggleSonification()}>{isPlaying ? <Pause size={16} /> : <Play size={16} />}{isPlaying ? 'Pause sonification' : 'Play with sonification'}</button>
      </div>
      {audioError && <p className="audio-error" role="status">{audioError}</p>}
      <div className="audio-controls-row">
        <label className="preset-select"><span className="eyebrow">RENDERING STYLE</span><select value={preset} onChange={(event) => setPreset(event.target.value as typeof preset)}>{soundPresets.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <p className="preset-note">Presets change timbre only. The dataset-to-sound relationships stay the same.</p>
        <button className="audio-icon-control" type="button" aria-label={isLooping ? 'Disable loop' : 'Enable loop'} aria-pressed={isLooping} title={isLooping ? 'Loop enabled' : 'Loop disabled'} onClick={() => setLooping(!isLooping)}><Repeat size={17} /></button>
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
