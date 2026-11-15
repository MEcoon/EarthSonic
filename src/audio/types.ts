export type SonificationControls = {
  toneHz: number
  modulationRateHz: number
  amplitude: number
  pan: number
  interpretation: string
}

export type SonificationMappingSettings = {
  pitchSpan: number
  pulseSensitivity: number
  intensity: number
  stereoWidth: number
  stereoBalance: number
}

export const DEFAULT_SONIFICATION_MAPPING_SETTINGS: SonificationMappingSettings = {
  pitchSpan: 350,
  pulseSensitivity: 1,
  intensity: 100,
  stereoWidth: 100,
  stereoBalance: 0,
}

export type SonificationOutput = {
  mapping: Pick<SonificationControls, 'toneHz' | 'modulationRateHz' | 'amplitude' | 'pan'> | null
  preset: SoundPresetId
  filterCutoffHz: number
  overtoneGain: number
  mixGain: number
  modulationDepthGain: number
  modulationIntensity: number
  smoothingSeconds: number
  masterVolume: number
  muted: boolean
}

export type SoundPresetId = 'calm-ocean' | 'deep-ocean' | 'dynamic-currents' | 'experimental'

export type SoundPreset = {
  id: SoundPresetId
  name: string
  description: string
}

export const soundPresets: SoundPreset[] = [
  { id: 'calm-ocean', name: 'Calm Ocean', description: 'A soft, low-pass tone with restrained harmonics and gentle modulation.' },
  { id: 'deep-ocean', name: 'Deep Ocean', description: 'A darker, rounded tone with a warm harmonic layer and slow modulation.' },
  { id: 'dynamic-currents', name: 'Dynamic Currents', description: 'A brighter tone with stronger harmonics and more pronounced modulation.' },
  { id: 'experimental', name: 'Experimental', description: 'A more vivid harmonic profile with a brighter filter and deeper modulation.' },
]
