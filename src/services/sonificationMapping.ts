import type { FrameMetrics } from './frameAnalysis'
import { mapRange } from './normalization'
import type { SonificationControls } from '../audio/types'

export type { SonificationControls } from '../audio/types'

// This is an artistic input range for the sonification, not a scientific threshold.
export const IMAGE_CHANGE_RATE_REFERENCE_PER_VIDEO_SECOND = 0.5

/** Map perceptual features of rendered video pixels to audio controls, not physical measurements. */
export function mapFrameToSound(metrics: FrameMetrics): SonificationControls {
  return {
    toneHz: mapRange(metrics.warmCoolBalance, { min: 0, max: 1 }, { min: 170, max: 520 }),
    // Preserve the old 0.5–5 Hz sound range, but drive it from smoothed image change per source-video second.
    modulationRateHz: mapRange(
      Math.min(1, Math.max(0, (metrics.imageChangeRatePerVideoSecond ?? 0) / IMAGE_CHANGE_RATE_REFERENCE_PER_VIDEO_SECOND)),
      { min: 0, max: 1 },
      { min: 0.5, max: 5 },
    ),
    amplitude: mapRange(metrics.brightness, { min: 0, max: 1 }, { min: 0.3, max: 0.85 }),
    pan: mapRange(metrics.leftRightBalance, { min: 0, max: 1 }, { min: -0.75, max: 0.75 }),
    interpretation: 'Artistic sound mapping: image brightness controls level, rendered red–blue visual balance controls pitch, rendered left–right brightness balance controls stereo position, and smoothed rendered-pixel change per source-video second controls modulation rate. These are image-derived features, not physical measurements.',
  }
}
