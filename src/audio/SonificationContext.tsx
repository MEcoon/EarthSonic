import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react'
import { analyzeRenderedVideoFrame, type FrameMetrics, type PreviousFrame } from '../services/frameAnalysis'
import { mapFrameToSound } from '../services/sonificationMapping'
import type { DatasetConfig } from '../data/datasets'
import { SonificationEngine } from './SonificationEngine'
import type { SonificationControls, SoundPresetId } from './types'

type MediaStatus = 'idle' | 'loading' | 'ready' | 'error'
type SonificationContextValue = {
  isPlaying: boolean
  muted: boolean
  volume: number
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
  toggleMute: () => void
  setPreset: (preset: SoundPresetId) => void
  getEngine: () => SonificationEngine | null
}

const SonificationContext = createContext<SonificationContextValue | null>(null)

export function SonificationProvider({ children }: PropsWithChildren) {
  const engineRef = useRef<SonificationEngine | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const previousRef = useRef<PreviousFrame | undefined>(undefined)
  const lastSampleAtRef = useRef(0)
  const latestMetricsRef = useRef<FrameMetrics | null>(null)
  const resetChangeBaselineRef = useRef(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [muted, setMutedState] = useState(false)
  const [volume, setVolumeState] = useState(0.42)
  const [trackTitle, setTrackTitleState] = useState('Earth science sonification')
  const [hasTrack, setHasTrack] = useState(false)
  const [preset, setPresetState] = useState<SoundPresetId>('ambient')
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
      engineRef.current.setVolume(volume)
      engineRef.current.setMuted(muted)
      engineRef.current.applyPreset(preset)
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
    if (title) {
      setTrackTitleState(title)
      setHasTrack(true)
    }
    if (video.ended) video.currentTime = 0
    ensureEngine().setMapping(mapFrameToSound(latestMetricsRef.current))
    try {
      await Promise.all([ensureEngine().play(), video.play()])
      setIsPlaying(true)
    } catch (error) {
      video.pause()
      await engineRef.current?.pause()
      setIsPlaying(false)
      throw error
    }
  }

  const pause = async () => {
    videoRef.current?.pause()
    await engineRef.current?.pause()
    setIsPlaying(false)
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
  const toggleMute = () => { const next = !muted; setMutedState(next); engineRef.current?.setMuted(next) }
  const setPreset = (value: SoundPresetId) => { setPresetState(value); engineRef.current?.applyPreset(value) }
  const setTrackTitle = (title: string) => { setTrackTitleState(title); setHasTrack(true) }
  const getEngine = useCallback(() => engineRef.current, [])
  const getVideoElement = useCallback(() => videoRef.current, [])

  useEffect(() => () => {
    videoRef.current?.pause()
    void engineRef.current?.close()
  }, [])

  return <SonificationContext.Provider value={{
    isPlaying, muted, volume, trackTitle, hasTrack, preset, activeDatasetId, mediaStatus, mediaError, metrics, duration, currentTime, isLooping,
    start, pause, loadDataset, seek, restart, setPlaybackRate, setLooping, getVideoElement,
    setMapping, setTrackTitle, setVolume, toggleMute, setPreset, getEngine,
  }}>
    {children}
    <video ref={videoRef} className="hidden-data-video" preload="none" crossOrigin="anonymous" aria-hidden="true" tabIndex={-1}
      onLoadStart={() => { setMediaStatus('loading'); setMediaError('') }}
      onLoadedMetadata={(event) => { setDuration(event.currentTarget.duration || 0); setCurrentTime(event.currentTarget.currentTime) }}
      onLoadedData={() => sampleCurrentFrame(true)} onCanPlay={() => sampleCurrentFrame(true)}
      onTimeUpdate={(event) => { setCurrentTime(event.currentTarget.currentTime); sampleCurrentFrame() }}
      onSeeking={() => { resetChangeBaselineRef.current = true }}
      onSeeked={(event) => { setCurrentTime(event.currentTarget.currentTime); sampleCurrentFrame(true) }}
      onPause={(event) => {
        // Pause events can arrive after an immediate resume; honor the element's current state.
        if (event.currentTarget.paused) { setIsPlaying(false); void engineRef.current?.pause() }
      }}
      onEnded={() => { setIsPlaying(false); void engineRef.current?.pause() }}
      onError={(event) => {
        if (!event.currentTarget.currentSrc) return
        const message = 'The packaged NASA video could not be loaded or decoded by this browser.'
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
