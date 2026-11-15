import type { FrameMetrics } from './frameAnalysis'
import { mapRange } from './normalization'
import { DEFAULT_SONIFICATION_MAPPING_SETTINGS, type SonificationControls, type SonificationMappingSettings } from '../audio/types'

export type { SonificationControls } from '../audio/types'

// This is an artistic input range for the sonification, not a scientific threshold.
export const IMAGE_CHANGE_RATE_REFERENCE_PER_VIDEO_SECOND = 0.5

/** Map perceptual features of rendered video pixels to audio controls, not physical measurements. */
export function mapFrameToSound(metrics: FrameMetrics, settings: SonificationMappingSettings = DEFAULT_SONIFICATION_MAPPING_SETTINGS): SonificationControls {
  return {
    toneHz: 170 + metrics.warmCoolBalance * settings.pitchSpan,
    // The reference scale is artistic. A custom sensitivity changes the mapped output, not the image metric.
    modulationRateHz: Math.max(0.2, mapRange(
      Math.min(1, Math.max(0, (metrics.imageChangeRatePerVideoSecond ?? 0) / IMAGE_CHANGE_RATE_REFERENCE_PER_VIDEO_SECOND)),
      { min: 0, max: 1 },
      { min: 0.5, max: 5 },
    ) * settings.pulseSensitivity),
    amplitude: Math.min(1, mapRange(metrics.brightness, { min: 0, max: 1 }, { min: 0.3, max: 0.85 }) * settings.intensity / 100),
    pan: Math.max(-1, Math.min(1, mapRange(metrics.leftRightBalance, { min: 0, max: 1 }, { min: -0.75, max: 0.75 }) * settings.stereoWidth / 100 + settings.stereoBalance / 100 * 0.75)),
    interpretation: 'Artistic sound mapping: image brightness controls level, rendered red–blue visual balance controls pitch, rendered left–right brightness balance controls stereo position, and smoothed rendered-pixel change per source-video second controls modulation rate. These are image-derived features, not physical measurements.',
  }
}
