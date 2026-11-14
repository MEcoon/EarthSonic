import type { FrameMetrics } from './frameAnalysis'
import { mapRange } from './normalization'
import type { SonificationControls } from '../audio/types'

export type { SonificationControls } from '../audio/types'

/** Map perceptual features of rendered video pixels to audio controls, not physical measurements. */
export function mapFrameToSound(metrics: FrameMetrics): SonificationControls {
  return {
    toneHz: mapRange(metrics.warmCoolBalance, { min: 0, max: 1 }, { min: 170, max: 520 }),
    pulseDensityHz: mapRange(metrics.frameChange, { min: 0, max: 1 }, { min: 0.5, max: 5 }),
    amplitude: mapRange(metrics.brightness, { min: 0, max: 1 }, { min: 0.3, max: 0.85 }),
    pan: mapRange(metrics.leftRightBalance, { min: 0, max: 1 }, { min: -0.75, max: 0.75 }),
    interpretation: 'A preview mapping of rendered brightness, color balance, frame change, and left–right image balance. These image features are not physical measurements.',
  }
}
