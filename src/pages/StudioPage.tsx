import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, AudioLines, Database, Info, Maximize2, Minimize2, Pause, Play, Repeat, RotateCcw, SkipBack, SkipForward, Square, Volume2, VolumeX } from 'lucide-react'
import { datasets } from '../data/datasets'
import type { FrameMetrics } from '../services/frameAnalysis'
import { IMAGE_CHANGE_RATE_REFERENCE_PER_VIDEO_SECOND, mapFrameToSound } from '../services/sonificationMapping'
import { PageContainer } from '../components/layout/PageContainer'
import { AudioVisualizers } from '../audio/AudioVisualizers'
import { soundPresets } from '../audio/types'
import { useSonification } from '../audio/SonificationContext'
import './StudioPage.css'

const percent = (value: number) => `${Math.round(value * 100)}%`
const fmtTime = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`
const defaultMapping = { pitchSpan: 350, pulseSensitivity: 1, intensity: 100, stereoWidth: 100 }

export function StudioPage() {
  const dataset = datasets[0]
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaWrapRef = useRef<HTMLDivElement>(null)
  const mirrorSeekingRef = useRef(false)
  const mirrorSyncTargetRef = useRef<number | null>(null)
  const pendingMirrorSeekTimeRef = useRef<number | null>(null)
  const pendingTimelineSeekTimeRef = useRef<number | null>(null)
  const timelineDraggingRef = useRef(false)
  const previousPlayingRef = useRef(false)
  const [audioError, setAudioError] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [fullscreenError, setFullscreenError] = useState('')
  const [playbackRate, setPlaybackRate] = useState(1)
  const [timelineDraftTime, setTimelineDraftTime] = useState<number | null>(null)
  const [mappingSettings, setMappingSettings] = useState(defaultMapping)
  const { isPlaying, muted, volume, preset, isLooping, metrics, currentTime: playbackTime, duration: videoDuration,
    mediaStatus, mediaError, start, pause, restart, loadDataset, seek, setPlaybackRate: setSharedPlaybackRate,
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
    const playbackJustStarted = isPlaying && !previousPlayingRef.current
    const pendingMirrorSeekTime = pendingMirrorSeekTimeRef.current
    if (mirrorSeekingRef.current && pendingMirrorSeekTime !== null && Math.abs(playbackTime - pendingMirrorSeekTime) < 0.03) {
      mirrorSeekingRef.current = false
      pendingMirrorSeekTimeRef.current = null
    }
    const pendingTimelineSeekTime = pendingTimelineSeekTimeRef.current
    const timelineSeekConfirmed = pendingTimelineSeekTime !== null && Math.abs(playbackTime - pendingTimelineSeekTime) < 0.03
    // The two videos already advance on their own media clocks. Hard-syncing currentTime
    // on every provider timeupdate repeatedly seeks the visible video during active play,
    // which can cancel native timeline scrubbing. Align only on start, pause, or a confirmed
    // explicit seek; let both decoders run continuously between those points.
    const shouldAlignMediaTime = !isPlaying || playbackJustStarted || timelineSeekConfirmed
    if (shouldAlignMediaTime && !mirrorSeekingRef.current && mirror.readyState >= 1 && Number.isFinite(playbackTime) && Math.abs(mirror.currentTime - playbackTime) > 0.2) {
      mirrorSyncTargetRef.current = playbackTime
      mirror.currentTime = playbackTime
    }
    if (isPlaying && mirror.paused) void mirror.play().catch(() => undefined)
    else if (!isPlaying && !mirror.paused) mirror.pause()
    previousPlayingRef.current = isPlaying
  }, [isPlaying, playbackTime, playbackRate, dataset.mediaUrl, timelineDraftTime])

  useEffect(() => {
    const pendingTime = pendingTimelineSeekTimeRef.current
    if (!timelineDraggingRef.current && pendingTime !== null && Math.abs(playbackTime - pendingTime) < 0.03) {
      pendingTimelineSeekTimeRef.current = null
      setTimelineDraftTime(null)
    }
  }, [playbackTime])

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

  const stopSonification = async () => {
    await pause()
    restart()
  }

  const seekVideo = (seconds: number) => {
    seek(seconds)
  }

  const updateTimelineSeek = (seconds: number) => {
    pendingTimelineSeekTimeRef.current = seconds
    setTimelineDraftTime(seconds)
    seekVideo(seconds)
  }

  const releaseTimelineSeek = () => {
    timelineDraggingRef.current = false
    const pendingTime = pendingTimelineSeekTimeRef.current
    if (pendingTime !== null && Math.abs(playbackTime - pendingTime) < 0.03) {
      pendingTimelineSeekTimeRef.current = null
      setTimelineDraftTime(null)
    }
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
    <header className="studio-intro">
      <div><span className="eyebrow">NASA SVS #3912 · SONIFICATION LAB</span><h1>EarthSonic Studio</h1><p>Watch the visualization. Listen to the image.</p></div>
      <span className={`studio-playing-state ${isPlaying ? 'is-playing' : ''}`} aria-live="polite"><i />{isPlaying ? 'PLAYING · VIDEO + SONIFICATION' : mediaStatus === 'error' ? 'SOURCE UNAVAILABLE' : mediaStatus === 'ready' ? 'READY TO PLAY' : 'LOADING NASA SOURCE'}</span>
    </header>

    <section className="studio-workspace" aria-label="NASA visualization and sonification workspace">
      <div className="studio-workspace-grid">
        <section className="studio-video-pane" aria-labelledby="studio-story-title">
          <div className="studio-media-heading"><div><span className="eyebrow">{dataset.category.toUpperCase()} · NASA SVS #3912</span><h2 id="studio-story-title">{dataset.title}</h2></div><span className="source-badge"><Database size={14} /> NASA</span></div>
          <div className="source-video-wrap" ref={mediaWrapRef}>
            {mediaStatus !== 'error' ? <video ref={videoRef} className="source-video" muted playsInline preload="metadata" src={dataset.mediaUrl} poster={dataset.previewImage}
              onLoadedMetadata={(event) => {
                event.currentTarget.playbackRate = playbackRate
                const source = getVideoElement()
                if (source && Math.abs(event.currentTarget.currentTime - source.currentTime) > 0.2) {
                  mirrorSyncTargetRef.current = source.currentTime
                  event.currentTarget.currentTime = source.currentTime
                }
                if (isPlaying) void event.currentTarget.play().catch(() => undefined)
              }}
              onPlay={(event) => { if (!isPlaying) { seek(event.currentTarget.currentTime); void start(dataset.title).catch(() => setAudioError('Audio could not start. Check browser audio permission.')) } }}
              onPause={(event) => { if (event.currentTarget.paused && isPlaying) void pause() }}
              onSeeking={(event) => {
                const syncTarget = mirrorSyncTargetRef.current
                if (syncTarget !== null && Math.abs(event.currentTarget.currentTime - syncTarget) < 0.03) return
                mirrorSyncTargetRef.current = null
                mirrorSeekingRef.current = true
              }}
              onSeeked={(event) => {
                const target = event.currentTarget.currentTime
                const syncTarget = mirrorSyncTargetRef.current
                if (syncTarget !== null && Math.abs(target - syncTarget) < 0.03) {
                  mirrorSyncTargetRef.current = null
                  return
                }
                // Keep the mirror protected from stale provider timeupdates until the shared
                // video confirms this requested time; otherwise playback can snap it backward.
                pendingMirrorSeekTimeRef.current = target
                mirrorSeekingRef.current = true
                seek(target)
              }}
              onEnded={() => { if (isPlaying) void pause() }}
              aria-label={`${dataset.title}, synchronized muted view of the NASA visualization`} />
            : <div className="media-error" role="status"><Info size={22} /><b>NASA media could not be loaded.</b><p>The packaged video could not be decoded or sampled. Check browser media support, then retry the source.</p><a href={dataset.sourceUrl} target="_blank" rel="noreferrer">Open NASA source <ArrowUpRight size={15} /></a><button type="button" onClick={() => loadDataset(dataset, false)}>Retry packaged video</button></div>}
            {mediaStatus !== 'error' && <button className="video-fullscreen-overlay" type="button" onClick={() => void toggleFullscreen()} aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>{isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}<span>{isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}</span></button>}
            {fullscreenError && <p className="fullscreen-error" role="status">{fullscreenError}</p>}
          </div>

          <div className="studio-transport" aria-label="Synchronized video and sonification controls">
            <button className="button button-primary studio-play-control" type="button" disabled={!metrics || mediaStatus === 'error'} onClick={() => void toggleSonification()} aria-label={isPlaying ? 'Pause video and sonification' : 'Play video and sonification'}>{isPlaying ? <Pause size={17} /> : <Play size={17} />}<span>{isPlaying ? 'Pause' : 'Play sonification'}</span></button>
            <button className="studio-stop-control" type="button" disabled={!metrics || mediaStatus === 'error'} onClick={() => void stopSonification()} aria-label="Stop and return to the beginning"><Square size={15} /><span>Stop</span></button>
            <div className="studio-transport-time"><output>{fmtTime(playbackTime)}</output><span>/ {fmtTime(videoDuration)}</span></div>
          </div>
          <div className="studio-timeline">
            <input id="studio-video-position" type="range" min="0" max={videoDuration || 1} step="0.01" value={Math.min(timelineDraftTime ?? playbackTime, videoDuration || 1)}
              onPointerDown={() => { timelineDraggingRef.current = true }}
              onPointerUp={releaseTimelineSeek}
              onPointerCancel={releaseTimelineSeek}
              onKeyUp={releaseTimelineSeek}
              onBlur={releaseTimelineSeek}
              onChange={(event) => updateTimelineSeek(Number(event.target.value))}
              disabled={!videoDuration} aria-label="Seek NASA visualization" />
            <label htmlFor="studio-video-position">NASA visualization position</label>
          </div>
          <div className="studio-video-options" aria-label="Additional video controls">
            <div className="video-frame-tools"><button type="button" disabled={!videoDuration} onClick={() => stepFrame(-1)} aria-label="Step back one video frame"><SkipBack size={14} /><span>Frame</span></button><button type="button" disabled={!videoDuration} onClick={() => stepFrame(1)} aria-label="Step forward one video frame"><span>Frame</span><SkipForward size={14} /></button></div>
            <label className="video-speed"><span>Speed</span><select value={playbackRate} onChange={(event) => setVideoRate(Number(event.target.value))} aria-label="Video playback speed"><option value={0.5}>0.5×</option><option value={0.75}>0.75×</option><option value={1}>1×</option><option value={1.25}>1.25×</option><option value={1.5}>1.5×</option><option value={2}>2×</option></select></label>
            <button className={`studio-loop-control ${isLooping ? 'is-enabled' : ''}`} type="button" aria-label={isLooping ? 'Disable loop' : 'Enable loop'} aria-pressed={isLooping} onClick={() => setLooping(!isLooping)}><Repeat size={15} /><span>Loop</span></button>
          </div>
          <div className="studio-video-caption"><span>{dataset.temporalCoverage.label}</span><span>Rendered ECCO2 visualization</span></div>
        </section>

        <div className="studio-side-rail">
        <section className="studio-audio-pane" aria-labelledby="studio-audio-heading">
          <div className="studio-audio-title"><div><span className="eyebrow"><AudioLines size={14} aria-hidden="true" /> BROWSER AUDIO</span><h2 id="studio-audio-heading">Sonification</h2></div><span className={`studio-audio-state ${isPlaying ? 'is-playing' : ''}`}>{isPlaying ? 'ACTIVE' : 'PAUSED'}</span></div>
          <p className="studio-audio-explainer">The main Play control starts the NASA video and its browser-generated sound together.</p>
          <div className="studio-audio-settings">
            <label className="preset-select"><span className="eyebrow">SOUND PRESET</span><select value={preset} onChange={(event) => setPreset(event.target.value as typeof preset)}>{soundPresets.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <div className="studio-volume-row"><button className="audio-icon-control" type="button" onClick={toggleMute} aria-label={muted ? 'Unmute sonification' : 'Mute sonification'} aria-pressed={muted}>{muted ? <VolumeX size={16} /> : <Volume2 size={16} />}</button><label className="audio-volume-control"><span className="sr-only">Sonification volume</span><input type="range" min="0" max="1" step="0.01" value={volume} onChange={(event) => setVolume(Number(event.target.value))} /></label><span className="audio-volume-value">{Math.round(volume * 100)}%</span></div>
          </div>
          <p className="studio-preset-note">Presets change timbre only. The visual-feature mapping stays the same.</p>
          {audioError && <p className="audio-error" role="status">{audioError}</p>}
          <AudioVisualizers />
        </section>
        <section className="studio-analysis-section" aria-labelledby="studio-analysis-heading">
          <div className="studio-section-heading"><div><span className="eyebrow">LIVE IMAGE ANALYSIS</span><h2 id="studio-analysis-heading">Frame features</h2></div><span className={`analysis-live ${metrics ? 'is-active' : mediaStatus === 'error' ? 'is-error' : ''}`}><i />{metrics ? 'SAMPLING' : mediaStatus === 'error' ? 'UNAVAILABLE' : 'WAITING'}</span></div>
          {mediaError && mediaStatus === 'error' && <div className="analysis-error" role="status">{mediaError}</div>}
          <p className="studio-analysis-note">Rendered-pixel features at 96 × 48, not direct ocean measurements.</p>
          <div className="studio-metric-grid" aria-label="Four primary sonification inputs">
            <Metric number="01" label="Image brightness" mapping="Sound level" value={metrics ? percent(metrics.brightness) : '—'} progress={metrics?.brightness} />
            <Metric number="02" label="Red–blue balance" mapping="Artistic pitch" value={metrics ? percent(metrics.warmCoolBalance) : '—'} progress={metrics?.warmCoolBalance} />
            <Metric number="03" label="Left–right balance" mapping="Stereo position" value={metrics ? percent(metrics.leftRightBalance) : '—'} progress={metrics?.leftRightBalance} />
            <Metric number="04" label="Smoothed image change" mapping="Amplitude modulation" value={metrics?.imageChangeRatePerVideoSecond == null ? '—' : `${metrics.imageChangeRatePerVideoSecond.toFixed(3)} / video second`} progress={metrics?.imageChangeRatePerVideoSecond == null ? undefined : Math.min(1, metrics.imageChangeRatePerVideoSecond / IMAGE_CHANGE_RATE_REFERENCE_PER_VIDEO_SECOND)} />
          </div>
          <p className="studio-rate-note">Image-change rate is visual change, not current speed. Seeking resets its baseline.</p>
          {metrics && <div className="studio-sample-meta"><span>Sample #{metrics.sampleIndex}</span><span>{metrics.sourceSize.width} × {metrics.sourceSize.height}px</span>{metrics.sampleIntervalVideoSeconds !== null && <span>Interval {metrics.sampleIntervalVideoSeconds.toFixed(3)}s</span>}</div>}
        </section>
        </div>
      </div>
    </section>

    <section className="studio-science-section" aria-labelledby="studio-science-heading">
      <div className="studio-section-heading studio-science-heading"><div><span className="eyebrow">SCIENCE & ADVANCED DETAILS</span><h2 id="studio-science-heading">How image becomes sound</h2></div><p>EarthSonic listens to features of the NASA visualization as rendered on screen—not to the underlying ECCO2 fields.</p></div>
      <ol className="studio-process-list">
        <li><span>01</span><div><b>NASA visualization</b><p>{dataset.description}</p></div></li>
        <li><span>02</span><div><b>Rendered-frame analysis</b><p>EarthSonic samples image brightness, color balance, spatial balance and image change from video frames.</p></div></li>
        <li><span>03</span><div><b>Artistic sound mapping</b><p>Selected pixel features control pitch, sound level, stereo position and modulation in a browser synthesizer. The result is not recorded ocean sound.</p></div></li>
      </ol>
      <div className="studio-detail-list">
        <details className="studio-detail">
          <summary><span><span className="eyebrow">NASA SVS #3912</span><b>Dataset and source attribution</b></span><span className="detail-toggle">View details</span></summary>
          <div className="studio-detail-content studio-source-detail"><p>{dataset.providerUpdate} Visualization period: <b>{dataset.temporalCoverage.label}</b></p><p>{dataset.attribution}</p><a href={dataset.sourceUrl} target="_blank" rel="noreferrer">Open NASA visualization record <ArrowUpRight size={14} aria-hidden="true" /></a><div><b>NASA color legend · {dataset.colorLegend.label}</b><img className="source-colorbar" src={dataset.colorLegend.image} alt="NASA sea surface temperature legend: blue near 0 degrees Celsius, green and yellow in the middle, red near 32 degrees." /><ul>{dataset.colorLegend.items.map((item) => <li key={item}>{item}</li>)}</ul></div></div>
        </details>
        <details className="studio-detail">
          <summary><span><span className="eyebrow">INTERPRETATION</span><b>What these values do and do not mean</b></span><span className="detail-toggle">View limits</span></summary>
          <div className="studio-detail-content"><p>The values shown here describe rendered image pixels. RGB colors are not calibrated pointwise temperature readings, and image change is not measured ocean-current velocity.</p><ul>{dataset.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul></div>
        </details>
        <details className="studio-detail studio-diagnostics">
          <summary><span><span className="eyebrow">SECONDARY DIAGNOSTICS</span><b>Additional rendered-frame properties</b></span><span className="detail-toggle">{metrics ? 'Frame sampled' : 'Waiting for a frame'}</span></summary>
          <div className="studio-detail-content frame-details" aria-label="Additional sampled frame properties">
            <div className="frame-detail-line"><span>AVERAGE RENDERED-PIXEL RGB · 0–255</span><b>{metrics ? `R ${metrics.averageRgb.red} · G ${metrics.averageRgb.green} · B ${metrics.averageRgb.blue}` : 'Waiting for a frame'}</b></div>
            <div className="frame-detail-line"><span>SPATIAL PIXEL VARIATION</span><b>{metrics ? percent(metrics.spatialDetail) : '—'}</b><small>Mean adjacent-pixel luma differences, scaled and clamped.</small></div>
            <div className="frame-detail-line"><span>LEGACY IMAGE-CHANGE INDEX · NOT USED FOR SOUND</span><b>{metrics ? percent(metrics.frameChange) : '—'}</b><small>Mean absolute RGB difference between accepted samples × 2, clamped 0–100; depends on sample spacing.</small></div>
            <div className="frame-detail-line"><span>TOP RENDERED-PIXEL COLOR BINS</span><small>Top 3 of 64 RGB bins; shares are fractions of sampled pixels.</small></div>
            <div className="dominant-colors">{metrics ? metrics.dominantColors.map((color) => <div key={color.hex}><i aria-hidden="true" style={{ backgroundColor: color.hex }} /><code>{color.hex}</code><span>{percent(color.share)}</span></div>) : <span className="frame-detail-empty">Not sampled</span>}</div>
            <div className="frame-detail-line"><span>QUADRANT IMAGE BRIGHTNESS</span><small>Screen-space corners, not geographic regions.</small></div>
            <div className="region-grid">{(['northwest', 'northeast', 'southwest', 'southeast'] as const).map((region) => <RegionMetric key={region} label={region.replace('north', 'N ').replace('south', 'S ').replace('west', 'W').replace('east', 'E')} value={metrics?.regions[region]} />)}</div>
          </div>
        </details>
        <details className="studio-detail studio-mapping-lab">
          <summary><span><span className="eyebrow">OPTIONAL LISTENING CONTROLS</span><b>Adjust the sound mapping</b></span><span className="detail-toggle">Open mapping lab</span></summary>
          <div className="studio-detail-content">
            <div className="mapping-lab-heading"><p>Adjust how strongly the selected image features influence the sound. This changes the listening scale, not the source visualization.</p><button type="button" onClick={() => setMappingSettings(defaultMapping)} aria-label="Restore default sound mapping"><RotateCcw size={14} />Reset</button></div>
            <div className="mapping-sliders-grid">
              <MappingSlider label="Artistic pitch range" description="Rendered red–blue balance → tone frequency" min={100} max={700} step={10} value={mappingSettings.pitchSpan} suffix=" Hz span" onChange={(value) => setMappingSettings((current) => ({ ...current, pitchSpan: value }))} />
              <MappingSlider label="Modulation-rate scale" description="Smoothed image change per source-video second → modulation rate" min={50} max={200} step={10} value={mappingSettings.pulseSensitivity * 100} suffix="%" onChange={(value) => setMappingSettings((current) => ({ ...current, pulseSensitivity: value / 100 }))} />
              <MappingSlider label="Sound intensity" description="Rendered image brightness → artistic sound level" min={50} max={150} step={10} value={mappingSettings.intensity} suffix="%" onChange={(value) => setMappingSettings((current) => ({ ...current, intensity: value }))} />
              <MappingSlider label="Stereo width" description="Left–right image brightness balance → stereo position" min={0} max={100} step={5} value={mappingSettings.stereoWidth} suffix="%" onChange={(value) => setMappingSettings((current) => ({ ...current, stereoWidth: value }))} />
            </div>
          </div>
        </details>
      </div>
    </section>
  </PageContainer>
}

function Metric({ number, label, mapping, value, progress }: { number: string; label: string; mapping: string; value: string; progress?: number }) {
  return <div className="metric-row studio-metric"><div><span className="studio-metric-number">{number}</span><span className="studio-metric-copy"><span>{label}</span><small>→ {mapping}</small></span><b>{value}</b></div><div className="metric-track"><i style={{ width: progress === undefined ? '0%' : `${progress * 100}%` }} /></div></div>
}

function RegionMetric({ label, value }: { label: string; value?: number }) {
  return <div className="region-metric"><span>{label}</span><b>{value === undefined ? '—' : percent(value)}</b><i><em style={{ width: value === undefined ? '0%' : percent(value) }} /></i></div>
}

function MappingSlider({ label, description, min, max, step, value, suffix, onChange }: { label: string; description: string; min: number; max: number; step: number; value: number; suffix: string; onChange: (value: number) => void }) {
  return <label className="mapping-slider"><span><b>{label}</b><output>{value}{suffix}</output></span><small>{description}</small><input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} aria-label={label} /></label>
}
