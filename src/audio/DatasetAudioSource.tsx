import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { DatasetConfig } from '../data/datasets'
import { analyzeRenderedVideoFrame, type FrameMetrics, type PreviousFrame } from '../services/frameAnalysis'
import { mapFrameToSound } from '../services/sonificationMapping'
import { useSonification } from './SonificationContext'

export type DatasetAudioHandle = {
  ready: boolean
  metrics: FrameMetrics | null
  duration: number
  currentTime: number
  play: (trackTitle: string) => Promise<void>
  pause: () => Promise<void>
  restart: () => Promise<void>
  seek: (seconds: number) => void
  load: () => void
}

export const DatasetAudioSource = forwardRef<DatasetAudioHandle, {
  dataset: DatasetConfig
  onStatus: (status: 'loading' | 'ready' | 'error', message?: string) => void
  onProgress?: (currentTime: number, duration: number) => void
  loop?: boolean
  shouldLoad?: boolean
}>(function DatasetAudioSource({ dataset, onStatus, onProgress, loop = false, shouldLoad = false }, ref) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const previousRef = useRef<PreviousFrame | undefined>(undefined)
  const lastSampleRef = useRef(0)
  const [metrics, setMetrics] = useState<FrameMetrics | null>(null)
  const [duration, setDuration] = useState(0)
  const { isPlaying, start, pause, setMapping, setTrackTitle } = useSonification()

  useEffect(() => {
    previousRef.current = undefined
    lastSampleRef.current = 0
    setMetrics(null)
    setDuration(0)
    onStatus('loading')
  }, [dataset.id])

  const sampleFrame = (force = false) => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    if (!force && performance.now() - lastSampleRef.current < 240) return
    lastSampleRef.current = performance.now()
    try {
      const result = analyzeRenderedVideoFrame(video, canvas, previousRef.current)
      previousRef.current = result.previous
      setMetrics(result.metrics)
      if (isPlaying) setMapping(mapFrameToSound(result.metrics))
      onStatus('ready')
      onProgress?.(video.currentTime, video.duration || 0)
    } catch (error) {
      if (error instanceof Error && !error.message.includes('not ready')) onStatus('error', error.message)
    }
  }

  const begin = async (title: string) => {
    const video = videoRef.current
    if (!video || !metrics) throw new Error('The source frame is not ready yet.')
    setTrackTitle(title)
    setMapping(mapFrameToSound(metrics))
    if (video.ended) video.currentTime = 0
    await Promise.all([start(), video.play()])
  }
  const stop = async () => {
    videoRef.current?.pause()
    await pause()
  }
  const restart = async () => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = 0
    previousRef.current = undefined
    sampleFrame(true)
    if (isPlaying) await video.play()
  }
  const load = () => {
    const video = videoRef.current
    if (!video) return
    video.preload = 'auto'
    video.load()
    onStatus('loading', 'Loading NASA source frames…')
  }
  const seek = (seconds: number) => {
    const video = videoRef.current
    if (!video || !Number.isFinite(video.duration)) return
    video.currentTime = Math.max(0, Math.min(video.duration, seconds))
  }

  useImperativeHandle(ref, () => ({
    ready: Boolean(metrics), metrics, duration, currentTime: videoRef.current?.currentTime ?? 0,
    play: begin, pause: stop, restart, seek, load,
  }), [metrics, duration, isPlaying, dataset.id])

  useEffect(() => { if (shouldLoad) load() }, [dataset.id, shouldLoad])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (!isPlaying && !video.paused) video.pause()
  }, [isPlaying])

  return <>
    <video ref={videoRef} className="hidden-data-video" preload={shouldLoad ? 'auto' : 'none'} loop={loop} crossOrigin="anonymous" poster={dataset.previewImage}
      onLoadedMetadata={(event) => { const length = event.currentTarget.duration || 0; setDuration(length); onProgress?.(0, length) }}
      onLoadedData={() => sampleFrame(true)} onCanPlay={() => sampleFrame(true)} onTimeUpdate={() => sampleFrame()} onSeeked={() => sampleFrame(true)}
      onError={() => onStatus('error', 'NASA source media did not load. Check the connection or open the linked NASA page.')}
      onEnded={() => { void pause() }} aria-hidden="true" tabIndex={-1}>
      <source src={dataset.mediaUrl} type={dataset.mediaType} />
    </video>
    <canvas ref={canvasRef} className="analysis-canvas" aria-hidden="true" />
  </>
})
