import { useEffect, useRef } from 'react'
import { useSonification } from './SonificationContext'

export function AudioVisualizers() {
  const spectrumRef = useRef<HTMLCanvasElement>(null)
  const waveformRef = useRef<HTMLCanvasElement>(null)
  const levelRef = useRef<HTMLCanvasElement>(null)
  const { isPlaying, audioStatus, getEngine } = useSonification()
  const visualizerActive = isPlaying && audioStatus === 'running'

  useEffect(() => {
    const spectrumCanvas = spectrumRef.current
    const waveformCanvas = waveformRef.current
    const levelCanvas = levelRef.current
    if (!visualizerActive) {
      for (const canvas of [spectrumCanvas, waveformCanvas, levelCanvas]) {
        const context = canvas?.getContext('2d')
        if (!canvas || !context) continue
        context.setTransform(1, 0, 0, 1, 0, 0)
        context.clearRect(0, 0, canvas.width, canvas.height)
      }
      return
    }
    const engine = getEngine()
    if (!engine || !spectrumCanvas || !waveformCanvas || !levelCanvas) return
    const spectrumContext = spectrumCanvas.getContext('2d')
    const waveformContext = waveformCanvas.getContext('2d')
    const levelContext = levelCanvas.getContext('2d')
    if (!spectrumContext || !waveformContext || !levelContext) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const fit = (canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) => {
      const { width, height } = canvas.getBoundingClientRect()
      canvas.width = Math.max(1, Math.floor(width * dpr))
      canvas.height = Math.max(1, Math.floor(height * dpr))
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      return { width, height }
    }
    let spectrumSize = fit(spectrumCanvas, spectrumContext)
    let waveformSize = fit(waveformCanvas, waveformContext)
    let levelSize = fit(levelCanvas, levelContext)
    const resizeObserver = new ResizeObserver(() => {
      spectrumSize = fit(spectrumCanvas, spectrumContext)
      waveformSize = fit(waveformCanvas, waveformContext)
      levelSize = fit(levelCanvas, levelContext)
    })
    resizeObserver.observe(spectrumCanvas)
    resizeObserver.observe(waveformCanvas)
    const spectrum = new Uint8Array(engine.getFrequencyBinCount())
    const waveform = new Uint8Array(engine.getWaveformLength())
    let animation = 0
    let active = true
    const draw = () => {
      if (!active) return
      const s = spectrumSize
      const w = waveformSize
      const l = levelSize
      engine.readFrequencyData(spectrum)
      engine.readWaveformData(waveform)
      let squareTotal = 0
      waveform.forEach((sample) => {
        const amplitude = (sample - 128) / 128
        squareTotal += amplitude * amplitude
      })
      const rms = Math.min(1, Math.sqrt(squareTotal / waveform.length))
      spectrumContext.clearRect(0, 0, s.width, s.height)
      waveformContext.clearRect(0, 0, w.width, w.height)
      const barGap = 3
      const barWidth = Math.max(2, (s.width - (spectrum.length - 1) * barGap) / spectrum.length)
      spectrum.forEach((value, index) => {
        const barHeight = Math.max(2, value / 255 * s.height)
        spectrumContext.fillStyle = index > spectrum.length * 0.68 ? '#a78bfa' : '#38bdf8'
        spectrumContext.fillRect(index * (barWidth + barGap), s.height - barHeight, barWidth, barHeight)
      })
      waveformContext.beginPath()
      waveformContext.lineWidth = 1.5
      waveformContext.strokeStyle = '#4ade80'
      waveform.forEach((value, index) => {
        const x = index / (waveform.length - 1) * w.width
        const y = value / 255 * w.height
        if (index === 0) waveformContext.moveTo(x, y)
        else waveformContext.lineTo(x, y)
      })
      waveformContext.stroke()
      levelContext.clearRect(0, 0, l.width, l.height)
      levelContext.fillStyle = 'rgba(203, 213, 225, .12)'
      levelContext.fillRect(0, 0, l.width, l.height)
      const levelGradient = levelContext.createLinearGradient(0, 0, l.width, 0)
      levelGradient.addColorStop(0, '#38bdf8')
      levelGradient.addColorStop(1, '#4ade80')
      levelContext.fillStyle = levelGradient
      levelContext.fillRect(0, 0, l.width * rms, l.height)
      animation = window.requestAnimationFrame(draw)
    }
    draw()
    return () => { active = false; window.cancelAnimationFrame(animation); resizeObserver.disconnect() }
  }, [getEngine, visualizerActive])

  return <div className="audio-visualizers" aria-label="Audio output visualization">
    {!visualizerActive ? <p className="visualizer-empty">Waveform, spectrum and RMS level appear while the Web Audio engine is running.</p> : <>
      <div className="visualizer-block visualizer-level"><div><span className="eyebrow">AUDIO LEVEL</span><span className="visualizer-state">LIVE RMS</span></div><canvas ref={levelRef} aria-label="Live generated audio level, normalized from silence to full scale" role="img" /></div>
      <div className="visualizer-block"><div><span className="eyebrow">FREQUENCY SPECTRUM</span><span className="visualizer-state">LIVE ANALYSER</span></div><canvas ref={spectrumRef} aria-label="Live audio frequency spectrum from the Web Audio analyser" role="img" /></div>
      <div className="visualizer-block"><div><span className="eyebrow">WAVEFORM</span><span className="visualizer-state">LIVE ANALYSER</span></div><canvas ref={waveformRef} aria-label="Live generated audio waveform from the Web Audio analyser" role="img" /></div>
    </>}
  </div>
}
