import type { SonificationControls, SoundPresetId } from './types'

/** Small local Web Audio synthesizer. Mapping inputs describe the rendered video, not physical measurements. */
export class SonificationEngine {
  private context: AudioContext
  private tone: OscillatorNode
  private overtone: OscillatorNode
  private pulse: OscillatorNode
  private toneGain: GainNode
  private overtoneGain: GainNode
  private pulseDepth: GainNode
  private mix: GainNode
  private toneFilter: BiquadFilterNode
  private mappingGain: GainNode
  private panner: StereoPannerNode
  private volumeNode: GainNode
  private analyser: AnalyserNode
  private preset: SoundPresetId = 'calm-ocean'
  private muted = false
  private volume = 0.42
  private modulationIntensity = 0.7
  private smoothingSeconds = 0.12
  private profileModulationDepth = 0.08
  private closed = false
  private stateListeners = new Set<(state: AudioContextState) => void>()
  private readonly handleContextStateChange = () => {
    for (const listener of this.stateListeners) listener(this.context.state)
  }

  constructor() {
    const AudioContextConstructor = window.AudioContext
    this.context = new AudioContextConstructor()
    this.tone = this.context.createOscillator()
    this.overtone = this.context.createOscillator()
    this.pulse = this.context.createOscillator()
    this.toneGain = this.context.createGain()
    this.overtoneGain = this.context.createGain()
    this.pulseDepth = this.context.createGain()
    this.mix = this.context.createGain()
    this.toneFilter = this.context.createBiquadFilter()
    this.mappingGain = this.context.createGain()
    this.panner = this.context.createStereoPanner()
    this.volumeNode = this.context.createGain()
    this.analyser = this.context.createAnalyser()

    this.tone.type = 'sine'
    this.overtone.type = 'triangle'
    this.pulse.type = 'square'
    this.tone.frequency.value = 260
    this.overtone.frequency.value = 520
    this.pulse.frequency.value = 1.5
    this.toneGain.gain.value = 0.7
    this.overtoneGain.gain.value = 0.1
    this.pulseDepth.gain.value = this.profileModulationDepth * this.modulationIntensity
    this.mix.gain.value = 0.55
    this.toneFilter.type = 'lowpass'
    this.toneFilter.frequency.value = 1400
    this.toneFilter.Q.value = 0.7
    this.mappingGain.gain.value = 0.55
    this.volumeNode.gain.value = this.volume
    this.analyser.fftSize = 256
    this.analyser.smoothingTimeConstant = 0.78

    this.tone.connect(this.toneGain)
    this.pulse.connect(this.pulseDepth)
    this.pulseDepth.connect(this.toneGain.gain)
    this.overtone.connect(this.overtoneGain)
    this.toneGain.connect(this.mix)
    this.overtoneGain.connect(this.mix)
    this.mix.connect(this.toneFilter)
    this.toneFilter.connect(this.mappingGain)
    this.mappingGain.connect(this.panner)
    this.panner.connect(this.volumeNode)
    this.volumeNode.connect(this.analyser)
    this.analyser.connect(this.context.destination)
    this.context.addEventListener('statechange', this.handleContextStateChange)
    this.tone.start()
    this.overtone.start()
    this.pulse.start()
    this.applyPreset(this.preset)
  }

  async play() {
    await this.context.resume()
    if (this.context.state !== 'running') throw new Error('The browser kept the audio context suspended.')
  }
  async pause() { if (this.context.state === 'running') await this.context.suspend() }
  subscribeState(listener: (state: AudioContextState) => void) {
    this.stateListeners.add(listener)
    listener(this.context.state)
    return () => this.stateListeners.delete(listener)
  }
  async close() {
    if (this.closed) return
    this.closed = true
    this.context.removeEventListener('statechange', this.handleContextStateChange)
    this.stateListeners.clear()
    for (const oscillator of [this.tone, this.overtone, this.pulse]) {
      try { oscillator.stop() } catch { /* It may already be stopped during teardown. */ }
      oscillator.disconnect()
    }
    for (const node of [this.toneGain, this.overtoneGain, this.pulseDepth, this.mix, this.toneFilter, this.mappingGain, this.panner, this.volumeNode, this.analyser]) node.disconnect()
    if (this.context.state !== 'closed') await this.context.close()
  }

  setMapping(controls: SonificationControls) {
    const now = this.context.currentTime
    this.tone.frequency.setTargetAtTime(controls.toneHz, now, this.smoothingSeconds)
    this.overtone.frequency.setTargetAtTime(controls.toneHz * 2, now, this.smoothingSeconds)
    this.pulse.frequency.setTargetAtTime(controls.modulationRateHz, now, this.smoothingSeconds)
    this.mappingGain.gain.setTargetAtTime(Math.max(0, Math.min(1, controls.amplitude)), now, this.smoothingSeconds)
    this.panner.pan.setTargetAtTime(controls.pan, now, this.smoothingSeconds)
  }

  setModulationIntensity(value: number) {
    this.modulationIntensity = Math.max(0, Math.min(1, value))
    this.pulseDepth.gain.setTargetAtTime(this.profileModulationDepth * this.modulationIntensity, this.context.currentTime, this.smoothingSeconds)
  }

  setSmoothing(value: number) {
    this.smoothingSeconds = Math.max(0.02, Math.min(0.5, value))
  }

  setVolume(value: number) {
    this.volume = Math.max(0, Math.min(1, value))
    this.volumeNode.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.context.currentTime, 0.04)
  }

  setMuted(muted: boolean) {
    this.muted = muted
    this.volumeNode.gain.setTargetAtTime(muted ? 0 : this.volume, this.context.currentTime, 0.04)
  }

  applyPreset(preset: SoundPresetId) {
    this.preset = preset
    const now = this.context.currentTime
    const profile = {
      'calm-ocean': { overtone: 0.055, filter: 920, mix: 0.48, modulationDepth: 0.055, analyserSmoothing: 0.88 },
      'deep-ocean': { overtone: 0.095, filter: 680, mix: 0.52, modulationDepth: 0.085, analyserSmoothing: 0.84 },
      'dynamic-currents': { overtone: 0.17, filter: 2850, mix: 0.56, modulationDepth: 0.19, analyserSmoothing: 0.72 },
      experimental: { overtone: 0.22, filter: 5200, mix: 0.54, modulationDepth: 0.27, analyserSmoothing: 0.62 },
    }[preset]
    const transition = 0.16
    this.profileModulationDepth = profile.modulationDepth
    this.overtoneGain.gain.setTargetAtTime(profile.overtone, now, transition)
    this.toneFilter.frequency.setTargetAtTime(profile.filter, now, transition)
    this.mix.gain.setTargetAtTime(profile.mix, now, transition)
    this.pulseDepth.gain.setTargetAtTime(this.profileModulationDepth * this.modulationIntensity, now, transition)
    this.analyser.smoothingTimeConstant = profile.analyserSmoothing
  }

  readFrequencyData(target: Uint8Array) { this.analyser.getByteFrequencyData(target) }
  readWaveformData(target: Uint8Array) { this.analyser.getByteTimeDomainData(target) }
  getFrequencyBinCount() { return this.analyser.frequencyBinCount }
  getWaveformLength() { return this.analyser.fftSize }
}
