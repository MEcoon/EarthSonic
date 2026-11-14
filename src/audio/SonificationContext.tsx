import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react'
import { SonificationEngine } from './SonificationEngine'
import type { SonificationControls, SoundPresetId } from './types'

type SonificationContextValue = {
  isPlaying: boolean
  muted: boolean
  volume: number
  trackTitle: string
  hasTrack: boolean
  preset: SoundPresetId
  start: () => Promise<void>
  pause: () => Promise<void>
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
  const [isPlaying, setIsPlaying] = useState(false)
  const [muted, setMutedState] = useState(false)
  const [volume, setVolumeState] = useState(0.42)
  const [trackTitle, setTrackTitle] = useState('Earth science sonification')
  const [hasTrack, setHasTrack] = useState(false)
  const [preset, setPresetState] = useState<SoundPresetId>('ambient')

  const ensureEngine = () => {
    if (!engineRef.current) {
      engineRef.current = new SonificationEngine()
      engineRef.current.setVolume(volume)
      engineRef.current.setMuted(muted)
      engineRef.current.applyPreset(preset)
    }
    return engineRef.current
  }
  const start = async () => { await ensureEngine().play(); setIsPlaying(true) }
  const pause = async () => { if (engineRef.current) await engineRef.current.pause(); setIsPlaying(false) }
  const setMapping = (mapping: SonificationControls) => engineRef.current?.setMapping(mapping)
  const setVolume = (value: number) => { const next = Math.max(0, Math.min(1, value)); setVolumeState(next); engineRef.current?.setVolume(next) }
  const toggleMute = () => { const next = !muted; setMutedState(next); engineRef.current?.setMuted(next) }
  const setPreset = (value: SoundPresetId) => { setPresetState(value); engineRef.current?.applyPreset(value) }

  const selectTrack = (title: string) => { setTrackTitle(title); setHasTrack(true) }
  const getEngine = useCallback(() => engineRef.current, [])
  useEffect(() => () => { void engineRef.current?.close() }, [])

  return <SonificationContext.Provider value={{ isPlaying, muted, volume, trackTitle, hasTrack, preset, start, pause, setMapping, setTrackTitle: selectTrack, setVolume, toggleMute, setPreset, getEngine }}>{children}</SonificationContext.Provider>
}

export function useSonification() {
  const value = useContext(SonificationContext)
  if (!value) throw new Error('useSonification must be used inside SonificationProvider.')
  return value
}
