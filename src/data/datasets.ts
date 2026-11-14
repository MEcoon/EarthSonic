export type DatasetVariable = {
  id: string
  label: string
  units: string | null
  availability: 'documented-in-source' | 'visible-in-rendering' | 'not-extracted'
  notes: string
}

export type DatasetConfig = {
  id: string
  title: string
  category: string
  description: string
  sourceUrl: string
  mediaUrl: string
  mediaType: 'video/webm' | 'video/mp4'
  previewImage: string
  attribution: string
  temporalCoverage: { start: string; end: string; label: string }
  providerUpdate: string
  variables: DatasetVariable[]
  colorLegend: { label: string; items: string[]; image: string }
  sonification: { input: string; output: string; interpretation: string }[]
  dataBasis: 'rendered-visualization'
  limitations: string[]
}

const nasa = 'https://svs.gsfc.nasa.gov'
export const datasets: DatasetConfig[] = [
  {
    id: 'ocean-currents',
    title: 'Global Sea Surface Currents and Temperature',
    category: 'Ocean circulation',
    description: 'NASA SVS visualization of ECCO2 modeled sea surface current flows, colored by corresponding sea surface temperature.',
    sourceUrl: `${nasa}/3912/`,
    mediaUrl: '/nasa/ocean-currents/videos/ecco2_sst_flow.webmhd.webm',
    mediaType: 'video/webm',
    previewImage: '/nasa/ocean-currents/images/global_ecco2_temperature_currents.jpg',
    attribution: 'NASA’s Scientific Visualization Studio; ECCO2 is a joint MIT/JPL project.',
    temporalCoverage: { start: '2007-03-25T12:00:00Z', end: '2008-03-03T12:00:00Z', label: 'Mar 25, 2007 – Mar 3, 2008' },
    providerUpdate: 'A historical model visualization; not a live data feed.',
    variables: [
      { id: 'surface-current-flow', label: 'Modeled surface current flow', units: null, availability: 'visible-in-rendering', notes: 'Flow paths are rendered from ECCO2 model output; velocity values are not extracted by this pixel-analysis demo.' },
      { id: 'sea-surface-temperature', label: 'Sea surface temperature', units: '°C in the NASA source legend', availability: 'documented-in-source', notes: 'The source color bar labels a range from 0 °C to 32 °C. The current implementation analyzes rendered color, not calibrated temperature values.' },
    ],
    colorLegend: { label: 'NASA source legend for sea surface temperature', image: '/nasa/ocean-currents/images/sst_ecco2_colorbar.png', items: ['Blue · about 0 °C', 'Green · about 10–20 °C', 'Yellow · about 25 °C', 'Red · about 32 °C'] },
    sonification: [
      { input: 'Rendered warm–cool visual color balance', output: 'Artistic pitch mapping', interpretation: 'A red–blue balance heuristic from rendered pixels is mapped to pitch. It is not a direct temperature measurement.' },
      { input: 'Smoothed rendered-pixel change per source-video second', output: 'Artistic amplitude-modulation rate', interpretation: 'Mean normalized RGB difference divided by elapsed source-video time and smoothed; this describes rendered image change, not current speed. The chosen sound scale is artistic.' },
      { input: 'Rendered image brightness', output: 'Sound intensity', interpretation: 'An image-derived loudness cue, not a physical ocean measurement.' },
      { input: 'Rendered left–right image brightness balance', output: 'Stereo position', interpretation: 'A visual balance cue, not a geographic location.' },
    ],
    dataBasis: 'rendered-visualization',
    limitations: [
      'Frame sampling reads colors from NASA’s rendered video; it does not access the original ECCO2 numerical fields.',
      'Video pixel colors may include rendering, interpolation, compression, and display effects.',
      'The diagnostic frame-change index compares adjacent accepted samples and depends on sample spacing. The sound uses a separate time-normalized rendered-image change rate based on video timestamps; it is reset at seeks and is not a current-speed estimate.',
      'No local current-speed estimate or pointwise temperature value is produced.',
      'The application must serve its packaged video asset successfully; the source record remains linked on NASA SVS.',
    ],
  },
]

export const getDataset = (id: string | null | undefined) => datasets.find((dataset) => dataset.id === id) ?? datasets[0]
