import type { AudioStatus, MediaStatus } from '../../audio/SonificationContext'
import type { SonificationOutput } from '../../audio/types'
import type { FrameMetrics } from '../../services/frameAnalysis'
import { soundPresets } from '../../audio/types'
import './LiveDataSoundMonitor.css'

type Props = {
  metrics: FrameMetrics | null
  output: SonificationOutput | null
  mediaStatus: MediaStatus
  audioStatus: AudioStatus
  isPlaying: boolean
  mediaError: string
}

type MonitorMetric = {
  id: 'brightness' | 'balance' | 'pan' | 'change'
  name: string
  value: string
  detail: string
  progress?: number
  outputName: string
  outputValue: string
  outputDetail: string
  connection: string
}

const percent = (value: number) => `${(value * 100).toFixed(1)}%`
const signed = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(2)}`
const panPosition = (value: number) => Math.abs(value) < 0.05 ? 'center' : value < 0 ? 'left' : 'right'

export function LiveDataSoundMonitor({ metrics, output, mediaStatus, audioStatus, isPlaying, mediaError }: Props) {
  const activeOutput = output?.mapping
  const unavailable = mediaStatus === 'error'
  const buffering = mediaStatus === 'buffering'
  const outputFresh = isPlaying && audioStatus === 'running' && mediaStatus === 'ready'
  const profile = output && soundPresets.find((item) => item.id === output.preset)
  const sampleState = unavailable
    ? 'Source unavailable · last accepted values are shown as stale'
    : buffering
      ? 'Buffering · holding the last accepted frame and sound target'
      : mediaStatus === 'loading'
        ? metrics ? 'Loading NASA source · previous accepted frame is stale' : 'Loading the NASA video and waiting for a readable frame'
      : !metrics
        ? 'Waiting for the first readable NASA frame'
        : isPlaying
          ? 'Sampling from shared playback · event-driven cadence'
          : 'Paused · showing the latest accepted frame'

  const rows: MonitorMetric[] = [
    {
      id: 'brightness', name: 'Image brightness', value: metrics ? percent(metrics.brightness) : '—',
      detail: 'Mean Rec. 709 rendered-pixel luminance, normalized 0–1.', progress: metrics?.brightness,
      outputName: 'Amplitude · mapped gain', outputValue: activeOutput ? activeOutput.amplitude.toFixed(3) : '—',
      outputDetail: 'Linear gain target from 0–1; master volume is separate.',
      connection: 'Brighter rendered pixels raise the mapped gain.',
    },
    {
      id: 'balance', name: 'Red–blue visual balance', value: metrics ? percent(metrics.warmCoolBalance) : '—',
      detail: 'Normalized difference of the mean rendered red and blue channels, 0–1.', progress: metrics?.warmCoolBalance,
      outputName: 'Pitch · oscillator frequency', outputValue: activeOutput ? `${activeOutput.toneHz.toFixed(1)} Hz` : '—',
      outputDetail: 'Tone frequency target after the Studio pitch-range setting.',
      connection: 'The pixel color balance selects the artistic tone pitch.',
    },
    {
      id: 'pan', name: 'Left–right brightness balance', value: metrics ? percent(metrics.leftRightBalance) : '—',
      detail: 'Normalized contrast between mean luminance in the image’s left and right halves, 0–1.', progress: metrics?.leftRightBalance,
      outputName: 'Stereo pan', outputValue: activeOutput ? `${signed(activeOutput.pan)} · ${panPosition(activeOutput.pan)}` : '—',
      outputDetail: 'Pan target from −1 (left) through 0 (center) to +1 (right).',
      connection: 'A screen-space brightness balance shifts stereo position.',
    },
    {
      id: 'change', name: 'Smoothed image-change rate',
      value: metrics?.imageChangeRatePerVideoSecond == null ? 'Baseline pending' : `${metrics.imageChangeRatePerVideoSecond.toFixed(3)} / video second`,
      detail: 'Mean normalized RGB difference per elapsed source-video second, smoothed; no fixed upper bound.',
      outputName: 'Modulation rate', outputValue: activeOutput ? `${activeOutput.modulationRateHz.toFixed(2)} Hz` : '—',
      outputDetail: 'Oscillator rate target after the Studio modulation scale.',
      connection: 'Faster image change raises the pulse rate; it is not current speed.',
    },
  ]

  const outputState = unavailable
    ? 'Unavailable'
    : buffering
      ? 'Buffering · output held'
      : mediaStatus === 'loading'
        ? 'Loading source · output held'
      : audioStatus === 'error'
        ? 'Audio unavailable'
      : outputFresh
        ? 'Live sound targets'
        : activeOutput
          ? isPlaying ? 'Audio suspended · last targets' : 'Last scheduled targets · paused'
          : metrics
            ? 'Ready · press Play to start sound'
            : 'Waiting for a frame'

  return <section className="studio-live-monitor" aria-labelledby="live-monitor-heading">
    <header className="live-monitor-heading">
      <div><span className="eyebrow">LIVE IMAGE ANALYSIS · SONIFICATION</span><h2 id="live-monitor-heading">Live Data-to-Sound Monitor</h2><p>Follow how NASA’s rendered ocean visualization shapes the synthesized sound.</p></div>
      <div className={`live-monitor-status${outputFresh ? ' is-active' : ''}`}>
        <span className="live-monitor-status-dot" aria-hidden="true" />{outputState}
      </div>
    </header>

    <p className="live-monitor-science-note">These values describe sampled rendered pixels from NASA SVS #3912. They are not direct ECCO2 numerical measurements, local ocean temperatures, or measured current velocities. Audio is an artistic interpretation generated in the browser.</p>

    <div className="live-monitor-grid" aria-label="Image analysis, mapping, and sound output">
      <h3 className="live-monitor-column-heading">Image analysis</h3>
      <h3 className="live-monitor-column-heading">Visual-to-audio connection</h3>
      <h3 className="live-monitor-column-heading">Sonification output</h3>
      {rows.map((row, index) => <div className={`live-monitor-row${unavailable || buffering || mediaStatus === 'loading' || !outputFresh ? ' is-stale' : ''}`} key={row.id}>
        <div className="live-monitor-source">
          <span className="live-monitor-row-index">0{index + 1}</span>
          <div className="live-monitor-metric-copy"><b>{row.name}</b><strong>{row.value}</strong><small>{row.detail}</small>
            {row.progress !== undefined && <div className="live-monitor-meter" role="meter" aria-label={`${row.name}, normalized from zero to one`} aria-valuemin={0} aria-valuemax={1} aria-valuenow={row.progress} aria-valuetext={row.value}><span style={{ width: `${row.progress * 100}%` }} /></div>}
          </div>
        </div>
        <div className="live-monitor-connection"><span className="live-monitor-connection-label">{row.name} <span aria-hidden="true">→</span> {row.outputName}</span><p>{row.connection}</p><span className="live-monitor-connection-line" aria-hidden="true" /></div>
        <div className="live-monitor-output">
          <b>{row.outputName}</b><strong>{row.outputValue}</strong><small>{row.outputDetail}</small>
        </div>
      </div>)}
    </div>

    <div className="live-monitor-footer">
      <div className="live-monitor-sample-status">
        <span className="live-monitor-sample-dot" key={metrics?.sampleIndex ?? 'empty'} aria-hidden="true" />
        <span>{sampleState}</span>
        {unavailable && mediaError && <small>{mediaError}</small>}
        {metrics && <small>Sample #{metrics.sampleIndex} · {metrics.sourceSize.width} × {metrics.sourceSize.height}px{metrics.sampleIntervalMilliseconds !== null ? ` · ${Math.round(metrics.sampleIntervalMilliseconds)} ms wall interval` : ''}{metrics.sampleIntervalVideoSeconds !== null ? ` · ${metrics.sampleIntervalVideoSeconds.toFixed(3)} s video interval` : ''}</small>}
      </div>
      {output && <div className="live-monitor-profile" aria-label="Additional current audio-engine targets">
        <span>{profile?.name ?? output.preset}</span>
        <small>Filter {output.filterCutoffHz} Hz · overtone gain {output.overtoneGain.toFixed(3)} · mix gain {output.mixGain.toFixed(3)} · modulation-depth gain {output.modulationDepthGain.toFixed(3)} · smoothing {Math.round(output.smoothingSeconds * 1000)} ms · master volume {Math.round(output.masterVolume * 100)}%{output.muted ? ' · muted' : ''}</small>
      </div>}
    </div>

    <p className="live-monitor-cadence">Sampling is event-driven with a 240 ms gate during ordinary playback, so some displayed video frames are skipped. Browser event timing can vary. Seeking resets the image-change baseline. The visible Studio video is a synchronized muted mirror; it can briefly differ from the sampled frame.</p>
  </section>
}
