export type OceanExpedition = {
  id: string
  title: string
  ocean: string
  description: string
  regionIds: string[]
}

/** Expedition routes reference existing region IDs only. */
export const oceanExpeditions: OceanExpedition[] = [
  { id: 'pacific', title: 'Pacific Journey', ocean: 'Pacific Ocean', description: 'Begin in the North Pacific and explore the global visualization from this approximate basin entry point.', regionIds: ['north-pacific'] },
  { id: 'atlantic', title: 'Atlantic Journey', ocean: 'Atlantic Ocean', description: 'Begin in the North Atlantic and follow its place within NASA’s global ocean visualization.', regionIds: ['north-atlantic'] },
  { id: 'indian', title: 'Indian Ocean Journey', ocean: 'Indian Ocean', description: 'This journey will become available when an Indian Ocean entry point is defined in the existing region data.', regionIds: [] },
]
