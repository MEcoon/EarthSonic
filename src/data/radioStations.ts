import { datasets } from './datasets'

export const radioStations = [
  {
    id: 'ocean', category: 'Ocean Radio', title: 'Currents & temperature', dataset: datasets[0],
    description: 'A pixel-based listening interpretation of NASA #3912: rendered ocean colors and frame changes control the sound.',
    accent: 'ocean',
  },
] as const

export const radioCategories = [
  { id: 'all', label: 'All experiences' },
  { id: 'Ocean Radio', label: 'Ocean Radio' },
] as const

export const unavailableRadioCategories: readonly { id: string; note: string }[] = []
