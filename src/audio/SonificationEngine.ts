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
  private preset: SoundPresetId = 'ambient'
  private muted = false
  private volume = 0.42

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
    this.pulseDepth.gain.value = 0.14
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
    this.tone.start()
    this.overtone.start()
    this.pulse.start()
    this.applyPreset(this.preset)
  }

  async play() { await this.context.resume() }
  async pause() { if (this.context.state === 'running') await this.context.suspend() }
  async close() { await this.context.close() }

  setMapping(controls: SonificationControls) {
    const now = this.context.currentTime
    this.tone.frequency.setTargetAtTime(controls.toneHz, now, 0.06)
    this.overtone.frequency.setTargetAtTime(controls.toneHz * 2, now, 0.06)
    this.pulse.frequency.setTargetAtTime(controls.pulseDensityHz, now, 0.08)
    this.mappingGain.gain.setTargetAtTime(Math.max(0, Math.min(1, controls.amplitude)), now, 0.08)
    this.panner.pan.setTargetAtTime(controls.pan, now, 0.08)
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
    if (preset === 'minimal') {
      this.tone.type = 'sine'
      this.overtoneGain.gain.setTargetAtTime(0, now, 0.08)
      this.toneFilter.frequency.setTargetAtTime(1800, now, 0.08)
    } else if (preset === 'piano') {
      this.tone.type = 'triangle'
      this.overtone.type = 'sine'
      this.overtoneGain.gain.setTargetAtTime(0.13, now, 0.08)
      this.toneFilter.frequency.setTargetAtTime(3200, now, 0.08)
    } else if (preset === 'electronic') {
      this.tone.type = 'sawtooth'
      this.overtone.type = 'square'
      this.overtoneGain.gain.setTargetAtTime(0.055, now, 0.08)
      this.toneFilter.frequency.setTargetAtTime(6200, now, 0.08)
    } else {
      this.tone.type = 'sine'
      this.overtone.type = 'triangle'
      this.overtoneGain.gain.setTargetAtTime(0.1, now, 0.08)
      this.toneFilter.frequency.setTargetAtTime(1400, now, 0.08)
    }
  }

  readFrequencyData(target: Uint8Array) { this.analyser.getByteFrequencyData(target) }
  readWaveformData(target: Uint8Array) { this.analyser.getByteTimeDomainData(target) }
  getFrequencyBinCount() { return this.analyser.frequencyBinCount }
  getWaveformLength() { return this.analyser.fftSize }
}
