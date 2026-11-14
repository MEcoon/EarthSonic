export type FrameMetrics = {
  sampleIndex: number
  frameTimeSeconds: number
  sourceSize: { width: number; height: number }
  samplingBasis: 'rendered-video-pixels'
  scientificMeasurementsAvailable: false
  brightness: number
  averageRgb: { red: number; green: number; blue: number }
  dominantColors: { hex: string; share: number }[]
  regions: { northwest: number; northeast: number; southwest: number; southeast: number }
  warmCoolBalance: number
  spatialDetail: number
  leftRightBalance: number
  frameChange: number
}

export type PreviousFrame = { pixels: Uint8ClampedArray; width: number; height: number; sampleIndex: number }

const SAMPLE_WIDTH = 96
const SAMPLE_HEIGHT = 48
const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const colorBinCenter = (bucket: number) => Math.round(((bucket + 0.5) / 4) * 255)
const toHex = (red: number, green: number, blue: number) => `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`

/** Samples a downsized video frame. Returned color and motion features describe the rendering, not geophysical measurements. */
export function analyzeRenderedVideoFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  previous?: PreviousFrame,
): { metrics: FrameMetrics; previous: PreviousFrame } {
  if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
    throw new Error('The NASA video frame is not ready to sample yet.')
  }
  canvas.width = SAMPLE_WIDTH
  canvas.height = SAMPLE_HEIGHT
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Canvas frame analysis is unavailable in this browser.')
  context.drawImage(video, 0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT)
  let pixels: Uint8ClampedArray
  try {
    pixels = context.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT).data
  } catch {
    throw new Error('The NASA video can play, but its host does not allow pixel sampling from this page (cross-origin access).')
  }

  let lightTotal = 0
  let redTotal = 0
  let greenTotal = 0
  let blueTotal = 0
  let edgeTotal = 0
  let leftLightTotal = 0
  let rightLightTotal = 0
  let changeTotal = 0
  let validChangePixels = 0
  const colorCounts = new Map<number, number>()
  const regionTotals = { northwest: 0, northeast: 0, southwest: 0, southeast: 0 }
  const regionCounts = { northwest: 0, northeast: 0, southwest: 0, southeast: 0 }
  const luma = new Float32Array(SAMPLE_WIDTH * SAMPLE_HEIGHT)
  for (let y = 0; y < SAMPLE_HEIGHT; y++) {
    for (let x = 0; x < SAMPLE_WIDTH; x++) {
      const pixel = (y * SAMPLE_WIDTH + x) * 4
      const r = pixels[pixel] / 255
      const g = pixels[pixel + 1] / 255
      const b = pixels[pixel + 2] / 255
      const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b
      luma[y * SAMPLE_WIDTH + x] = gray
      lightTotal += gray
      if (x < SAMPLE_WIDTH / 2) leftLightTotal += gray
      else rightLightTotal += gray
      redTotal += r
      greenTotal += g
      blueTotal += b
      const redBucket = Math.min(3, Math.floor(r * 4))
      const greenBucket = Math.min(3, Math.floor(g * 4))
      const blueBucket = Math.min(3, Math.floor(b * 4))
      const colorKey = redBucket * 16 + greenBucket * 4 + blueBucket
      colorCounts.set(colorKey, (colorCounts.get(colorKey) ?? 0) + 1)
      const region = `${y < SAMPLE_HEIGHT / 2 ? 'north' : 'south'}${x < SAMPLE_WIDTH / 2 ? 'west' : 'east'}` as keyof typeof regionTotals
      regionTotals[region] += gray
      regionCounts[region]++
      if (x > 0) edgeTotal += Math.abs(gray - luma[y * SAMPLE_WIDTH + x - 1])
      if (y > 0) edgeTotal += Math.abs(gray - luma[(y - 1) * SAMPLE_WIDTH + x])
      if (previous && previous.width === SAMPLE_WIDTH && previous.height === SAMPLE_HEIGHT) {
        changeTotal += (Math.abs(pixels[pixel] - previous.pixels[pixel]) + Math.abs(pixels[pixel + 1] - previous.pixels[pixel + 1]) + Math.abs(pixels[pixel + 2] - previous.pixels[pixel + 2])) / (3 * 255)
        validChangePixels++
      }
    }
  }
  const count = SAMPLE_WIDTH * SAMPLE_HEIGHT
  const dominantColors = [...colorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key, pixelsInBin]) => {
      const redBucket = Math.floor(key / 16)
      const greenBucket = Math.floor((key % 16) / 4)
      const blueBucket = key % 4
      return {
        hex: toHex(colorBinCenter(redBucket), colorBinCenter(greenBucket), colorBinCenter(blueBucket)),
        share: pixelsInBin / count,
      }
    })
  return {
    metrics: {
      sampleIndex: (previous?.sampleIndex ?? 0) + 1,
      frameTimeSeconds: video.currentTime,
      sourceSize: { width: video.videoWidth, height: video.videoHeight },
      samplingBasis: 'rendered-video-pixels',
      scientificMeasurementsAvailable: false,
      brightness: clamp01(lightTotal / count),
      averageRgb: { red: Math.round(redTotal / count * 255), green: Math.round(greenTotal / count * 255), blue: Math.round(blueTotal / count * 255) },
      dominantColors,
      regions: {
        northwest: regionTotals.northwest / regionCounts.northwest,
        northeast: regionTotals.northeast / regionCounts.northeast,
        southwest: regionTotals.southwest / regionCounts.southwest,
        southeast: regionTotals.southeast / regionCounts.southeast,
      },
      warmCoolBalance: clamp01((redTotal / count - blueTotal / count + 1) / 2),
      spatialDetail: clamp01(edgeTotal / (count * 2) * 2.5),
      leftRightBalance: clamp01((leftLightTotal / (SAMPLE_HEIGHT * SAMPLE_WIDTH / 2) - rightLightTotal / (SAMPLE_HEIGHT * SAMPLE_WIDTH / 2) + 1) / 2),
      frameChange: validChangePixels ? clamp01(changeTotal / validChangePixels * 2) : 0,
    },
    previous: { pixels: new Uint8ClampedArray(pixels), width: SAMPLE_WIDTH, height: SAMPLE_HEIGHT, sampleIndex: (previous?.sampleIndex ?? 0) + 1 },
  }
}
