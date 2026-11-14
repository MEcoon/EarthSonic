export type SonificationControls = {
  toneHz: number
  modulationRateHz: number
  amplitude: number
  pan: number
  interpretation: string
}

export type SoundPresetId = 'ambient' | 'piano' | 'electronic' | 'minimal'

export type SoundPreset = {
  id: SoundPresetId
  name: string
  description: string
}

export const soundPresets: SoundPreset[] = [
  { id: 'ambient', name: 'Ambient', description: 'A soft, filtered tone with a gentle harmonic layer.' },
  { id: 'piano', name: 'Piano', description: 'A rounded, harmonic piano-style tone; it preserves the same image-feature mappings.' },
  { id: 'electronic', name: 'Electronic', description: 'A brighter sawtooth tone with the same image-feature mappings.' },
  { id: 'minimal', name: 'Minimal', description: 'A simple sine tone with no added harmonic layer.' },
]
