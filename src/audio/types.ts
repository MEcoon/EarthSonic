export type SonificationControls = {
  toneHz: number
  modulationRateHz: number
  amplitude: number
  pan: number
  interpretation: string
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
