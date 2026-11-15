import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, AudioLines, Database, Info, Maximize2, Minimize2, Pause, Play, Repeat, RotateCcw, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { getDataset } from '../data/datasets'
import { getOceanRegion } from '../data/oceanRegions'
import { PageContainer } from '../components/layout/PageContainer'
import { AudioVisualizers } from '../audio/AudioVisualizers'
import { DEFAULT_SONIFICATION_MAPPING_SETTINGS, soundPresets } from '../audio/types'
import { useSonification } from '../audio/SonificationContext'
import { LiveDataSoundMonitor } from '../components/studio/LiveDataSoundMonitor'
import './StudioPage.css'

const percent = (value: number) => `${Math.round(value * 100)}%`
const fmtTime = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`
const DEFAULT_VOLUME = 0.42
const DEFAULT_MODULATION_INTENSITY = 0.7
const DEFAULT_SMOOTHING_SECONDS = 0.12

export function StudioPage() {
  const [searchParams] = useSearchParams()
  const dataset = getDataset(searchParams.get('dataset'))
  const selectedRegion = getOceanRegion(searchParams.get('region'))
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaWrapRef = useRef<HTMLDivElement>(null)
  const mirrorSeekingRef = useRef(false)
  const mirrorSyncTargetRef = useRef<number | null>(null)
  const pendingMirrorSeekTimeRef = useRef<number | null>(null)
  const pendingTimelineSeekTimeRef = useRef<number | null>(null)
  const timelineDraggingRef = useRef(false)
  const mirrorPausedForBufferingRef = useRef(false)
  const previousPlayingRef = useRef(false)
  const [audioError, setAudioError] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [fullscreenError, setFullscreenError] = useState('')
  const [playbackRate, setPlaybackRate] = useState(1)
  const [timelineDraftTime, setTimelineDraftTime] = useState<number | null>(null)
  const { isPlaying, audioStatus, audioError: sharedAudioError, muted, volume, modulationIntensity, smoothing, preset, isLooping, metrics, currentTime: playbackTime, duration: videoDuration,
    mediaStatus, mediaError, start, pause, restart, loadDataset, seek, setPlaybackRate: setSharedPlaybackRate,
    getVideoElement, mappingSettings, sonificationOutput, updateMappingSettings, setVolume, setMuted, toggleMute, setModulationIntensity, setSmoothing, setPreset, setLooping } = useSonification()
  const activeProfile = soundPresets.find((item) => item.id === preset) ?? soundPresets[0]
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
    mirror.loop = isLooping
    const playbackJustStarted = isPlaying && !previousPlayingRef.current
    const pendingMirrorSeekTime = pendingMirrorSeekTimeRef.current
    if (mirrorSeekingRef.current && pendingMirrorSeekTime !== null && Math.abs(playbackTime - pendingMirrorSeekTime) < 0.12) {
      mirrorSeekingRef.current = false
      pendingMirrorSeekTimeRef.current = null
    }
    const pendingTimelineSeekTime = pendingTimelineSeekTimeRef.current
    const timelineSeekConfirmed = pendingTimelineSeekTime !== null && Math.abs(playbackTime - pendingTimelineSeekTime) < 0.12
    const mirrorResumingFromBuffer = isPlaying && mediaStatus === 'ready' && mirrorPausedForBufferingRef.current
    const pendingExplicitSeek = pendingTimelineSeekTime !== null || pendingMirrorSeekTimeRef.current !== null || mirrorSeekingRef.current
    const canCorrectDrift = isPlaying && mediaStatus === 'ready' && !timelineDraggingRef.current && !pendingExplicitSeek && !mirror.paused && mirror.readyState >= 2
    const driftCorrectionNeeded = canCorrectDrift && Math.abs(mirror.currentTime - playbackTime) > 0.45
    // Use provider timeupdates as sparse checkpoints. Only correct substantial drift,
    // and never while a user seek is pending or the shared source is buffering.
    const shouldAlignMediaTime = !isPlaying || playbackJustStarted || timelineSeekConfirmed || driftCorrectionNeeded || mirrorResumingFromBuffer
    if (shouldAlignMediaTime && !mirrorSeekingRef.current && mirror.readyState >= 1 && Number.isFinite(playbackTime) && Math.abs(mirror.currentTime - playbackTime) > 0.2) {
      mirrorSyncTargetRef.current = playbackTime
      mirror.currentTime = playbackTime
    }
    if (isPlaying && mediaStatus === 'buffering') {
      if (!mirror.paused) {
        mirrorPausedForBufferingRef.current = true
        mirror.pause()
      }
    } else if (isPlaying && mirror.paused) {
      mirrorPausedForBufferingRef.current = false
      void mirror.play().catch(() => undefined)
    } else if (!isPlaying && !mirror.paused) {
      mirrorPausedForBufferingRef.current = false
      mirror.pause()
    }
    previousPlayingRef.current = isPlaying
  }, [isPlaying, playbackTime, playbackRate, dataset.mediaUrl, timelineDraftTime, mediaStatus, isLooping])

  useEffect(() => {
    const pendingTime = pendingTimelineSeekTimeRef.current
    if (!timelineDraggingRef.current && pendingTime !== null && Math.abs(playbackTime - pendingTime) < 0.12) {
      pendingTimelineSeekTimeRef.current = null
      setTimelineDraftTime(null)
    }
  }, [playbackTime])

  useEffect(() => {
    if (audioStatus === 'running') setAudioError('')
  }, [audioStatus])

  const toggleSonification = async () => {
    const recoveringSuspendedAudio = isPlaying && audioStatus === 'suspended' && mediaStatus !== 'buffering'
    if (isPlaying && !recoveringSuspendedAudio) {
      await pause()
      return
    }
    if (!metrics) return
    setAudioError('')
    try {
      await start(dataset.title)
    } catch {
      await pause()
      setAudioError('Video or audio playback was blocked. Check browser media permissions and try Play again.')
    }
  }

  const restartFromBeginning = async () => {
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
  const resetSoundSettings = () => {
    setPreset('calm-ocean')
    setVolume(DEFAULT_VOLUME)
    setMuted(false)
    setModulationIntensity(DEFAULT_MODULATION_INTENSITY)
    setSmoothing(DEFAULT_SMOOTHING_SECONDS)
    updateMappingSettings(DEFAULT_SONIFICATION_MAPPING_SETTINGS)
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
      <span className={`studio-playing-state ${isPlaying && audioStatus === 'running' && mediaStatus === 'ready' ? 'is-playing' : ''}`} aria-live="polite"><i />{mediaStatus === 'error' ? 'SOURCE UNAVAILABLE' : mediaStatus === 'buffering' ? 'VIDEO BUFFERING · SOUND HELD' : isPlaying && audioStatus === 'suspended' ? 'AUDIO SUSPENDED · PRESS PLAY TO RESUME' : isPlaying ? 'PLAYING · VIDEO + SONIFICATION' : mediaStatus === 'ready' ? 'READY TO PLAY' : 'LOADING NASA SOURCE'}</span>
    </header>

    {selectedRegion && <aside className="studio-region-context" aria-label="Explore region context">
      <div><span className="eyebrow">EXPLORE CONTEXT · APPROXIMATE REGION</span><h2>{selectedRegion.name}</h2><p>{selectedRegion.ocean}. The coordinates are not independently validated against the NASA video. Studio continues to play the global SVS #3912 visualization; no region-specific crop, data values, or sound are available.</p></div>
      <Link className="studio-region-change" to={`/explore?region=${encodeURIComponent(selectedRegion.id)}#interactive-earth`}>Change region <ArrowUpRight size={15} aria-hidden="true" /></Link>
    </aside>}

    <section className="studio-workspace" aria-label="NASA visualization and sonification workspace">
      <div className="studio-workspace-grid">
        <section className="studio-video-pane" aria-labelledby="studio-story-title">
          <div className="studio-media-heading"><div><span className="eyebrow">{dataset.category.toUpperCase()} · NASA SVS #3912</span><h2 id="studio-story-title">{dataset.title}</h2></div><span className="source-badge"><Database size={14} /> NASA</span></div>
          <div className="source-video-wrap" ref={mediaWrapRef}>
            {mediaStatus !== 'error' ? <video ref={videoRef} className="source-video" muted playsInline preload="metadata" loop={isLooping} src={dataset.mediaUrl} poster={dataset.previewImage}
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
              onPause={(event) => {
                if (mirrorPausedForBufferingRef.current) { mirrorPausedForBufferingRef.current = false; return }
                if (event.currentTarget.paused && isPlaying) void pause()
              }}
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
              onEnded={() => { if (!isLooping && isPlaying) void pause() }}
              aria-label={`${dataset.title}, synchronized muted view of the NASA visualization`} />
            : <div className="media-error" role="status"><Info size={22} /><b>NASA media could not be loaded.</b><p>{mediaError || 'The packaged video could not be decoded or sampled. Check browser media support, then retry the source.'}</p><a href={dataset.sourceUrl} target="_blank" rel="noreferrer">Open NASA source <ArrowUpRight size={15} /></a><button type="button" onClick={() => loadDataset(dataset, false)}>Retry packaged video</button></div>}
            {mediaStatus !== 'error' && <button className="video-fullscreen-overlay" type="button" onClick={() => void toggleFullscreen()} aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>{isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}<span>{isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}</span></button>}
            {fullscreenError && <p className="fullscreen-error" role="status">{fullscreenError}</p>}
          </div>

          <div className="studio-transport" aria-label="Synchronized video and sonification controls">
            <button className="button button-primary studio-play-control" type="button" disabled={!metrics || mediaStatus === 'error'} onClick={() => void toggleSonification()} aria-label={isPlaying && audioStatus === 'suspended' && mediaStatus !== 'buffering' ? 'Resume sonification audio' : isPlaying ? 'Pause video and sonification' : 'Play video and sonification'}>{isPlaying && !(audioStatus === 'suspended' && mediaStatus !== 'buffering') ? <Pause size={17} /> : <Play size={17} />}<span>{isPlaying && audioStatus === 'suspended' && mediaStatus !== 'buffering' ? 'Resume sound' : isPlaying ? 'Pause' : 'Play sonification'}</span></button>
            <button className="studio-restart-control" type="button" disabled={!metrics || mediaStatus === 'error'} onClick={() => void restartFromBeginning()} aria-label="Restart synchronized video and sonification from the beginning" title="Restart from the beginning"><RotateCcw size={16} /><span>Restart</span></button>
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
          <div className="studio-video-options" aria-label="Playback speed and advanced controls">
            <label className="video-speed"><span>Speed</span><select value={playbackRate} onChange={(event) => setVideoRate(Number(event.target.value))} aria-label="Video playback speed"><option value={0.5}>0.5×</option><option value={0.75}>0.75×</option><option value={1}>1×</option><option value={1.25}>1.25×</option><option value={1.5}>1.5×</option><option value={2}>2×</option></select></label>
            <button className={`studio-loop-control ${isLooping ? 'is-enabled' : ''}`} type="button" aria-label={isLooping ? 'Disable loop' : 'Enable loop'} aria-pressed={isLooping} onClick={() => setLooping(!isLooping)}><Repeat size={15} /><span>Loop</span></button>
            <details className="studio-advanced-frame-controls">
              <summary title="Show advanced frame navigation">Advanced Controls</summary>
              <div className="studio-advanced-frame-content"><div className="video-frame-tools"><button type="button" disabled={!videoDuration} onClick={() => stepFrame(-1)} aria-label="Step backward by one video frame" title="Step backward by one video frame"><SkipBack size={14} /><span>Previous frame</span></button><button type="button" disabled={!videoDuration} onClick={() => stepFrame(1)} aria-label="Step forward by one video frame" title="Step forward by one video frame"><span>Next frame</span><SkipForward size={14} /></button></div><p>Source is 30 fps; browser seek precision can vary.</p></div>
            </details>
          </div>
          <div className="studio-playback-volume" role="group" aria-label="Sonification volume controls"><span className="eyebrow">VOLUME</span><div className="studio-volume-row"><button className="audio-icon-control" type="button" onClick={toggleMute} aria-label={muted ? 'Unmute sonification' : 'Mute sonification'} aria-pressed={muted}>{muted ? <VolumeX size={16} /> : <Volume2 size={16} />}</button><label className="audio-volume-control"><span className="sr-only">Sonification volume</span><input type="range" min="0" max="1" step="0.01" value={volume} onChange={(event) => setVolume(Number(event.target.value))} /></label><span className="audio-volume-value">{Math.round(volume * 100)}%</span></div></div>
          <div className="studio-video-caption"><span>{dataset.temporalCoverage.label}</span><span>Rendered ECCO2 visualization</span></div>
        </section>

        <div className="studio-side-rail">
        <section className="studio-audio-pane" aria-labelledby="studio-audio-heading">
          <div className="studio-audio-title"><div><span className="eyebrow"><AudioLines size={14} aria-hidden="true" /> BROWSER AUDIO</span><h2 id="studio-audio-heading">Sonification</h2></div><span className={`studio-audio-state ${audioStatus === 'running' ? 'is-playing' : ''}`}>{mediaStatus === 'buffering' && isPlaying ? 'BUFFERING' : audioStatus === 'running' ? 'ACTIVE' : audioStatus === 'suspended' ? 'SUSPENDED' : isPlaying ? 'RETRY AUDIO' : 'PAUSED'}</span></div>
          <p className="studio-audio-explainer">The main Play control starts the NASA video and its browser-generated sound together.</p>
          <div className="studio-audio-settings">
            <label className="preset-select"><span className="eyebrow">SOUND PROFILE</span><select value={preset} onChange={(event) => setPreset(event.target.value as typeof preset)}>{soundPresets.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <MappingSlider label="Modulation depth" description="How strongly the low-frequency oscillator changes the tone level" min={0} max={100} step={1} value={Math.round(modulationIntensity * 100)} suffix="%" onChange={(value) => setModulationIntensity(value / 100)} />
            <MappingSlider label="Smoothing" description="Audio parameter response time; higher values change more gradually" min={20} max={500} step={10} value={Math.round(smoothing * 1000)} suffix=" ms" onChange={(value) => setSmoothing(value / 1000)} />
          </div>
          <div className="studio-profile-note"><p><b>{activeProfile.name}:</b> {activeProfile.description}</p><p>Profiles alter the synthesized timbre and modulation depth only. Names describe artistic sound choices, not actual ocean conditions. The same frame and settings produce the same mapping values.</p><button className="studio-reset-control" type="button" onClick={resetSoundSettings}><RotateCcw size={14} aria-hidden="true" /> Reset sound settings</button></div>
          {(sharedAudioError || audioError) && <p className="audio-error" role="status">{sharedAudioError || audioError}</p>}
          <AudioVisualizers />
        </section>
        </div>
      </div>
    </section>

    <LiveDataSoundMonitor metrics={metrics} output={sonificationOutput} mediaStatus={mediaStatus} audioStatus={audioStatus} isPlaying={isPlaying} mediaError={mediaError} />

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
            <div className="mapping-lab-heading"><p>Adjust how strongly the selected image features influence the sound. This changes the listening scale, not the source visualization.</p><button type="button" onClick={() => updateMappingSettings(DEFAULT_SONIFICATION_MAPPING_SETTINGS)} aria-label="Restore default sound mapping"><RotateCcw size={14} />Reset</button></div>
            <div className="mapping-sliders-grid">
              <MappingSlider label="Artistic pitch range" description="Rendered red–blue balance → tone frequency" min={100} max={700} step={10} value={mappingSettings.pitchSpan} suffix=" Hz span" onChange={(value) => updateMappingSettings({ pitchSpan: value })} />
              <MappingSlider label="Modulation-rate scale" description="Smoothed image change per source-video second → modulation rate" min={50} max={200} step={10} value={mappingSettings.pulseSensitivity * 100} suffix="%" onChange={(value) => updateMappingSettings({ pulseSensitivity: value / 100 })} />
              <MappingSlider label="Sound intensity" description="Rendered image brightness → artistic sound level" min={50} max={150} step={10} value={mappingSettings.intensity} suffix="%" onChange={(value) => updateMappingSettings({ intensity: value })} />
              <MappingSlider label="Stereo width" description="Left–right image brightness balance → stereo position" min={0} max={100} step={5} value={mappingSettings.stereoWidth} suffix="%" onChange={(value) => updateMappingSettings({ stereoWidth: value })} />
              <MappingSlider label="Stereo balance offset" description="Shift the frame-driven stereo position left or right" min={-100} max={100} step={5} value={mappingSettings.stereoBalance} suffix="%" onChange={(value) => updateMappingSettings({ stereoBalance: value })} />
            </div>
          </div>
        </details>
      </div>
    </section>
  </PageContainer>
}

function RegionMetric({ label, value }: { label: string; value?: number }) {
  return <div className="region-metric"><span>{label}</span><b>{value === undefined ? '—' : percent(value)}</b><i><em style={{ width: value === undefined ? '0%' : percent(value) }} /></i></div>
}

function MappingSlider({ label, description, min, max, step, value, suffix, onChange }: { label: string; description: string; min: number; max: number; step: number; value: number; suffix: string; onChange: (value: number) => void }) {
  return <label className="mapping-slider"><span><b>{label}</b><output>{value}{suffix}</output></span><small>{description}</small><input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} aria-label={label} /></label>
}
