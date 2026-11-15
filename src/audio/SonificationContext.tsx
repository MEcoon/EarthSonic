import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react'
import { analyzeRenderedVideoFrame, type FrameMetrics, type PreviousFrame } from '../services/frameAnalysis'
import { mapFrameToSound } from '../services/sonificationMapping'
import type { DatasetConfig } from '../data/datasets'
import { SonificationEngine } from './SonificationEngine'
import type { SonificationControls, SoundPresetId } from './types'

type MediaStatus = 'idle' | 'loading' | 'ready' | 'buffering' | 'error'
type AudioStatus = 'idle' | 'running' | 'suspended' | 'error'
type SonificationContextValue = {
  isPlaying: boolean
  audioStatus: AudioStatus
  audioError: string
  muted: boolean
  volume: number
  modulationIntensity: number
  smoothing: number
  trackTitle: string
  hasTrack: boolean
  preset: SoundPresetId
  activeDatasetId: string | null
  mediaStatus: MediaStatus
  mediaError: string
  metrics: FrameMetrics | null
  duration: number
  currentTime: number
  isLooping: boolean
  start: (title?: string) => Promise<void>
  pause: () => Promise<void>
  loadDataset: (dataset: DatasetConfig, loop?: boolean, preserveLoop?: boolean) => void
  seek: (seconds: number) => void
  restart: () => void
  setPlaybackRate: (rate: number) => void
  setLooping: (looping: boolean) => void
  getVideoElement: () => HTMLVideoElement | null
  setMapping: (mapping: SonificationControls) => void
  setTrackTitle: (title: string) => void
  setVolume: (value: number) => void
  setMuted: (muted: boolean) => void
  toggleMute: () => void
  setModulationIntensity: (value: number) => void
  setSmoothing: (seconds: number) => void
  setPreset: (preset: SoundPresetId) => void
  getEngine: () => SonificationEngine | null
}

const SonificationContext = createContext<SonificationContextValue | null>(null)

export function SonificationProvider({ children }: PropsWithChildren) {
  const engineRef = useRef<SonificationEngine | null>(null)
  const engineStateCleanupRef = useRef<(() => void) | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const playbackRequestedRef = useRef(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const previousRef = useRef<PreviousFrame | undefined>(undefined)
  const lastSampleAtRef = useRef(0)
  const latestMetricsRef = useRef<FrameMetrics | null>(null)
  const resetChangeBaselineRef = useRef(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioStatus, setAudioStatus] = useState<AudioStatus>('idle')
  const [audioError, setAudioError] = useState('')
  const [muted, setMutedState] = useState(false)
  const [volume, setVolumeState] = useState(0.42)
  const [modulationIntensity, setModulationIntensityState] = useState(0.7)
  const [smoothing, setSmoothingState] = useState(0.12)
  const [trackTitle, setTrackTitleState] = useState('Earth science sonification')
  const [hasTrack, setHasTrack] = useState(false)
  const [preset, setPresetState] = useState<SoundPresetId>('calm-ocean')
  const [activeDatasetId, setActiveDatasetId] = useState<string | null>(null)
  const [mediaStatus, setMediaStatus] = useState<MediaStatus>('idle')
  const [mediaError, setMediaError] = useState('')
  const [metrics, setMetrics] = useState<FrameMetrics | null>(null)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isLooping, setIsLooping] = useState(false)

  const ensureEngine = () => {
    if (!engineRef.current) {
      engineRef.current = new SonificationEngine()
      engineStateCleanupRef.current = engineRef.current.subscribeState((state) => {
        if (state === 'running') setAudioStatus('running')
        else if (state === 'suspended') setAudioStatus(playbackRequestedRef.current ? 'suspended' : 'idle')
        else setAudioStatus('idle')
      })
      engineRef.current.setVolume(volume)
      engineRef.current.setMuted(muted)
      engineRef.current.applyPreset(preset)
      engineRef.current.setModulationIntensity(modulationIntensity)
      engineRef.current.setSmoothing(smoothing)
    }
    return engineRef.current
  }

  const sampleCurrentFrame = (force = false) => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    const now = performance.now()
    if (!force && now - lastSampleAtRef.current < 240) return
    lastSampleAtRef.current = now
    try {
      const result = analyzeRenderedVideoFrame(video, canvas, previousRef.current, now, resetChangeBaselineRef.current)
      resetChangeBaselineRef.current = false
      previousRef.current = result.previous
      latestMetricsRef.current = result.metrics
      setMetrics(result.metrics)
      if (isPlaying) engineRef.current?.setMapping(mapFrameToSound(result.metrics))
      setMediaStatus('ready')
      setMediaError('')
    } catch (error) {
      if (error instanceof Error && !error.message.includes('not ready')) {
        playbackRequestedRef.current = false
        setMediaError(error.message)
        setMediaStatus('error')
        video.pause()
        void engineRef.current?.pause()
        setIsPlaying(false)
      }
    }
  }

  const loadDataset = (dataset: DatasetConfig, loop = false, preserveLoop = false) => {
    const video = videoRef.current
    if (!video) return
    const sameDataset = activeDatasetId === dataset.id
    setActiveDatasetId(dataset.id)
    if (sameDataset && video.currentSrc) {
      if (!preserveLoop) { video.loop = loop; setIsLooping(loop) }
      if (mediaStatus === 'error') {
        setMediaStatus('loading')
        setMediaError('')
        video.load()
      }
      return
    }
    video.loop = loop
    setIsLooping(loop)
    playbackRequestedRef.current = false
    if (!video.paused) video.pause()
    void engineRef.current?.pause()
    setIsPlaying(false)
    previousRef.current = undefined
    resetChangeBaselineRef.current = false
    latestMetricsRef.current = null
    lastSampleAtRef.current = 0
    setMetrics(null)
    setDuration(0)
    setCurrentTime(0)
    setMediaError('')
    setMediaStatus('loading')
    video.src = dataset.mediaUrl
    video.poster = dataset.previewImage
    video.preload = 'auto'
    video.load()
  }

  const start = async (title?: string) => {
    const video = videoRef.current
    if (!video || !latestMetricsRef.current) throw new Error('The NASA visualization frame is not ready yet.')
    if (mediaStatus === 'error') throw new Error('The NASA video source is unavailable. Retry the source before starting playback.')
    playbackRequestedRef.current = true
    setAudioError('')
    if (title) {
      setTrackTitleState(title)
      setHasTrack(true)
    }
    if (video.ended) video.currentTime = 0
    let engine: SonificationEngine
    try {
      engine = ensureEngine()
      engine.setMapping(mapFrameToSound(latestMetricsRef.current))
    } catch (error) {
      playbackRequestedRef.current = false
      setAudioStatus('error')
      setAudioError('Browser audio could not be initialized. Check that audio is available, then try Play again.')
      throw error
    }
    try {
      await Promise.all([
        engine.play().catch((error) => {
          setAudioStatus('error')
          setAudioError('Your browser did not allow audio to start. Check site audio permission and try Play again.')
          throw error
        }),
        video.play().catch((error) => {
          const unsupported = error instanceof DOMException && error.name === 'NotSupportedError'
          if (unsupported) {
            setMediaError('This browser cannot play the packaged NASA video format. Try an up-to-date browser or open the NASA source record.')
            setMediaStatus('error')
          }
          throw error
        }),
      ])
      if (!playbackRequestedRef.current) {
        await engine.pause()
        return
      }
      setIsPlaying(true)
    } catch (error) {
      playbackRequestedRef.current = false
      video.pause()
      await engine.pause()
      setIsPlaying(false)
      throw error
    }
  }

  const pause = async () => {
    const wasRequested = playbackRequestedRef.current
    playbackRequestedRef.current = false
    videoRef.current?.pause()
    setIsPlaying(false)
    if (wasRequested) await engineRef.current?.pause()
  }
  const seek = (seconds: number) => {
    const video = videoRef.current
    if (!video || !Number.isFinite(video.duration)) return
    video.currentTime = Math.max(0, Math.min(video.duration, seconds))
  }
  const restart = () => {
    const video = videoRef.current
    if (!video) return
    previousRef.current = undefined
    resetChangeBaselineRef.current = true
    video.currentTime = 0
    setCurrentTime(0)
  }
  const setPlaybackRate = (rate: number) => { if (videoRef.current && Number.isFinite(rate)) videoRef.current.playbackRate = rate }
  const setLooping = (looping: boolean) => { if (videoRef.current) { videoRef.current.loop = looping; setIsLooping(looping) } }
  const setMapping = (mapping: SonificationControls) => engineRef.current?.setMapping(mapping)
  const setVolume = (value: number) => { const next = Math.max(0, Math.min(1, value)); setVolumeState(next); engineRef.current?.setVolume(next) }
  const setMuted = (value: boolean) => { setMutedState(value); engineRef.current?.setMuted(value) }
  const toggleMute = () => { const next = !muted; setMutedState(next); engineRef.current?.setMuted(next) }
  const setModulationIntensity = (value: number) => { const next = Math.max(0, Math.min(1, value)); setModulationIntensityState(next); engineRef.current?.setModulationIntensity(next) }
  const setSmoothing = (seconds: number) => { const next = Math.max(0.02, Math.min(0.5, seconds)); setSmoothingState(next); engineRef.current?.setSmoothing(next) }
  const setPreset = (value: SoundPresetId) => { setPresetState(value); engineRef.current?.applyPreset(value) }
  const setTrackTitle = (title: string) => { setTrackTitleState(title); setHasTrack(true) }
  const getEngine = useCallback(() => engineRef.current, [])
  const getVideoElement = useCallback(() => videoRef.current, [])

  useEffect(() => () => {
    playbackRequestedRef.current = false
    engineStateCleanupRef.current?.()
    videoRef.current?.pause()
    void engineRef.current?.close()
  }, [])

  return <SonificationContext.Provider value={{
    isPlaying, audioStatus, audioError, muted, volume, modulationIntensity, smoothing, trackTitle, hasTrack, preset, activeDatasetId, mediaStatus, mediaError, metrics, duration, currentTime, isLooping,
    start, pause, loadDataset, seek, restart, setPlaybackRate, setLooping, getVideoElement,
    setMapping, setTrackTitle, setVolume, setMuted, toggleMute, setModulationIntensity, setSmoothing, setPreset, getEngine,
  }}>
    {children}
    <video ref={videoRef} className="hidden-data-video" preload="none" crossOrigin="anonymous" aria-hidden="true" tabIndex={-1} loop={isLooping}
      onLoadStart={() => { setMediaStatus('loading'); setMediaError('') }}
      onLoadedMetadata={(event) => { setDuration(event.currentTarget.duration || 0); setCurrentTime(event.currentTarget.currentTime) }}
      onLoadedData={() => { setMediaStatus('ready'); sampleCurrentFrame(true) }}
      onCanPlay={() => { if (mediaStatus !== 'error') setMediaStatus('ready'); sampleCurrentFrame(true) }}
      onWaiting={() => { setMediaStatus('buffering'); if (playbackRequestedRef.current) void engineRef.current?.pause() }}
      onPlaying={() => {
        const recoveringFromBuffer = mediaStatus === 'buffering'
        setMediaStatus('ready')
        // Refresh the shared-frame mapping before audio resumes so recovery does
        // not briefly replay parameters from the last pre-buffer sample.
        if (recoveringFromBuffer) sampleCurrentFrame(true)
        if (playbackRequestedRef.current) void engineRef.current?.play().catch(() => {
          playbackRequestedRef.current = false
          setAudioStatus('error')
          setAudioError('The browser suspended audio and could not resume it. Press Play to try again.')
          setIsPlaying(false)
          videoRef.current?.pause()
        })
      }}
      onTimeUpdate={(event) => { setCurrentTime(event.currentTarget.currentTime); sampleCurrentFrame() }}
      onSeeking={() => { resetChangeBaselineRef.current = true }}
      onSeeked={(event) => { setCurrentTime(event.currentTarget.currentTime); sampleCurrentFrame(true) }}
      onPause={(event) => {
        // Pause events can arrive after an immediate resume; honor the element's current state.
        if (event.currentTarget.paused && playbackRequestedRef.current) {
          playbackRequestedRef.current = false
          setIsPlaying(false)
          void engineRef.current?.pause()
        }
      }}
      onEnded={(event) => { if (!event.currentTarget.loop) { playbackRequestedRef.current = false; setIsPlaying(false); void engineRef.current?.pause() } }}
      onError={(event) => {
        if (!event.currentTarget.currentSrc) return
        playbackRequestedRef.current = false
        const code = event.currentTarget.error?.code
        const message = code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
          ? 'This browser does not support the packaged NASA video format.'
          : code === MediaError.MEDIA_ERR_NETWORK
            ? 'The packaged NASA video could not be loaded. Check the local asset path or retry.'
            : 'The packaged NASA video could not be decoded or sampled by this browser.'
        setMediaError(message); setMediaStatus('error'); setIsPlaying(false); void engineRef.current?.pause()
      }} />
    <canvas ref={canvasRef} className="analysis-canvas shared-frame-canvas" aria-hidden="true" />
  </SonificationContext.Provider>
}

export function useSonification() {
  const value = useContext(SonificationContext)
  if (!value) throw new Error('useSonification must be used inside SonificationProvider.')
  return value
}
