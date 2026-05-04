const RHYTHM_OFFSETS = {
  quarter: [0],
  eighth: [0, 0.5],
  sixteenth: [0, 0.25, 0.5, 0.75],
  sixteenthEighthSixteenth: [0, 0.25, 0.75],
  dottedFront: [0, 0.75],
  dottedBack: [0, 0.25],
  triplet: [0, 1 / 3, 2 / 3],
  swing: [0, 2 / 3],
}

const TONE_PROFILES = [
  null,
  { frequencyRatio: 0.86, gain: 0.17, overtoneGain: 0.08, biteGain: 0.02, duration: 0.052 },
  { frequencyRatio: 1, gain: 0.18, overtoneGain: 0.2, biteGain: 0.045, duration: 0.043 },
  { frequencyRatio: 1.16, gain: 0.18, overtoneGain: 0.36, biteGain: 0.075, duration: 0.036 },
]

const MASTER_VOLUME_BOOST = 3

class MetronomeProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.config = {
      bpm: 60,
      volume: 1,
      beatsPerMeasure: 4,
      beatToneLevels: [2, 2, 2, 2],
      beatRhythms: ['quarter', 'quarter', 'quarter', 'quarter'],
      accentFirstBeat: true,
      sound: 'classic',
    }
    this.isPlaying = false
    this.beatIndex = 0
    this.subdivisionIndex = 0
    this.nextTickFrame = 0
    this.clicks = []
    this.port.onmessage = (event) => this.handleMessage(event.data)
  }

  handleMessage(message) {
    if (message.type === 'config') {
      this.applyConfig(message.config)
    }

    if (message.type === 'start') {
      this.isPlaying = true
      this.beatIndex = 0
      this.subdivisionIndex = 0
      this.nextTickFrame = currentFrame + Math.floor(sampleRate * 0.035)
    }

    if (message.type === 'stop') {
      this.isPlaying = false
      this.clicks = []
    }
  }

  applyConfig(config) {
    const beatsPerMeasure = this.clamp(Math.round(config.beatsPerMeasure || 4), 2, 4)
    const rawVolume = Number(config.volume)
    this.config = {
      bpm: this.clamp(Number(config.bpm) || 60, 30, 300),
      volume: this.clamp(Number.isFinite(rawVolume) ? rawVolume : 1, 0, 1),
      beatsPerMeasure,
      beatToneLevels: this.normalizeToneLevels(
        config.beatToneLevels || config.beatStrengths,
        beatsPerMeasure,
      ),
      beatRhythms: this.normalizeRhythms(config.beatRhythms, beatsPerMeasure),
      accentFirstBeat: Boolean(config.accentFirstBeat),
      sound: config.sound || 'classic',
    }
    this.beatIndex = this.clamp(this.beatIndex, 0, beatsPerMeasure - 1)
  }

  normalizeToneLevels(toneLevels, beatsPerMeasure) {
    return Array.from({ length: beatsPerMeasure }, (_unused, index) =>
      this.clamp(Math.round(toneLevels?.[index] ?? 2), 0, 3),
    )
  }

  normalizeRhythms(rhythms, beatsPerMeasure) {
    return Array.from({ length: beatsPerMeasure }, (_unused, index) => {
      const rhythm = rhythms?.[index] || 'quarter'
      return RHYTHM_OFFSETS[rhythm] ? rhythm : 'quarter'
    })
  }

  clamp(value, minValue, maxValue) {
    return Math.min(maxValue, Math.max(minValue, value))
  }

  getOffsetsForBeat(beatIndex) {
    return RHYTHM_OFFSETS[this.config.beatRhythms[beatIndex]] || RHYTHM_OFFSETS.quarter
  }

  triggerTick(frame) {
    const toneLevel = this.config.beatToneLevels[this.beatIndex] ?? 2
    const toneProfile = TONE_PROFILES[toneLevel]
    const isPrimarySubdivision = this.subdivisionIndex === 0
    const isAccent =
      isPrimarySubdivision && this.beatIndex === 0 && this.config.accentFirstBeat

    if (toneProfile) {
      const baseFrequency = isAccent ? 1760 : isPrimarySubdivision ? 1280 : 920
      const frequency = baseFrequency * toneProfile.frequencyRatio
      const gain = toneProfile.gain * (isAccent ? 1.28 : isPrimarySubdivision ? 1 : 0.56)
      const durationFrames = Math.floor(
        sampleRate * (isPrimarySubdivision ? toneProfile.duration : toneProfile.duration * 0.62),
      )
      this.clicks.push({
        frame,
        durationFrames,
        frequency,
        gain: gain * this.config.volume * MASTER_VOLUME_BOOST,
        overtoneGain: toneProfile.overtoneGain,
        biteGain: toneProfile.biteGain,
      })
    }

    this.port.postMessage({
      type: 'tick',
      beatIndex: this.beatIndex,
      subdivisionIndex: this.subdivisionIndex,
    })
  }

  advanceTick() {
    const beatDurationFrames = (60 / this.config.bpm) * sampleRate
    const offsets = this.getOffsetsForBeat(this.beatIndex)
    const currentOffset = offsets[this.subdivisionIndex] ?? 0

    if (this.subdivisionIndex < offsets.length - 1) {
      const nextOffset = offsets[this.subdivisionIndex + 1]
      this.subdivisionIndex += 1
      this.nextTickFrame += (nextOffset - currentOffset) * beatDurationFrames
      return
    }

    const nextBeatIndex = (this.beatIndex + 1) % this.config.beatsPerMeasure
    const nextOffsets = this.getOffsetsForBeat(nextBeatIndex)
    this.nextTickFrame += (1 - currentOffset + (nextOffsets[0] ?? 0)) * beatDurationFrames
    this.beatIndex = nextBeatIndex
    this.subdivisionIndex = 0
  }

  renderClicks(frame) {
    let output = 0

    for (const click of this.clicks) {
      const age = frame - click.frame
      if (age < 0 || age >= click.durationFrames) {
        continue
      }

      const progress = age / click.durationFrames
      const envelope = (1 - progress) ** 3
      const phase = (Math.PI * 2 * click.frequency * age) / sampleRate
      const bite = Math.sin(phase * 5.7 + Math.sin(age * 0.17)) * click.biteGain
      const tone =
        Math.sin(phase) * (1 - click.overtoneGain) +
        Math.sin(phase * 2.01) * click.overtoneGain +
        bite
      output += tone * envelope * click.gain
    }

    return this.clamp(output, -1, 1)
  }

  process(_inputs, outputs) {
    const output = outputs[0]
    const leftChannel = output[0]
    const rightChannel = output[1] || leftChannel
    const blockEndFrame = currentFrame + leftChannel.length

    for (let sampleIndex = 0; sampleIndex < leftChannel.length; sampleIndex += 1) {
      const frame = currentFrame + sampleIndex

      while (this.isPlaying && this.nextTickFrame <= frame) {
        this.triggerTick(this.nextTickFrame)
        this.advanceTick()
      }

      const sample = this.renderClicks(frame)
      leftChannel[sampleIndex] = sample
      rightChannel[sampleIndex] = sample
    }

    this.clicks = this.clicks.filter(
      (click) => blockEndFrame < click.frame + click.durationFrames,
    )

    return true
  }
}

registerProcessor('metronome-processor', MetronomeProcessor)