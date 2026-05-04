import {
  BEAT_OPTIONS,
  BEAT_UNIT_OPTIONS,
  DEFAULT_BPM,
  DEFAULT_VOLUME,
  MAX_BPM,
  MIN_BPM,
  RHYTHMS,
  SOUND_OPTIONS,
  createRhythms,
  createToneLevels,
  type RhythmId,
  type SoundId,
} from './metronome'
import { clamp } from './number'

const METRONOME_SETTINGS_STORAGE_KEY = 'metronome:settings:v1'

export type MetronomePanelSettings = {
  bpm: number
  volume: number
  beatsPerMeasure: number
  beatUnit: number
  sound: SoundId
  accentFirstBeat: boolean
  beatToneLevels: number[]
  beatRhythms: RhythmId[]
  activeRhythmBeatIndex: number
}

function createDefaultSettings(): MetronomePanelSettings {
  return {
    bpm: DEFAULT_BPM,
    volume: DEFAULT_VOLUME,
    beatsPerMeasure: 4,
    beatUnit: 4,
    sound: 'classic',
    accentFirstBeat: true,
    beatToneLevels: createToneLevels(4),
    beatRhythms: createRhythms(4),
    activeRhythmBeatIndex: 0,
  }
}

function normalizeToneLevels(rawValue: unknown, beatsPerMeasure: number) {
  const baseToneLevels = createToneLevels(beatsPerMeasure)
  if (!Array.isArray(rawValue)) {
    return baseToneLevels
  }

  return baseToneLevels.map((_unused, index) =>
    clamp(Math.round(Number(rawValue[index]) || 0), 0, 3),
  )
}

function normalizeRhythms(rawValue: unknown, beatsPerMeasure: number) {
  const baseRhythms = createRhythms(beatsPerMeasure)
  if (!Array.isArray(rawValue)) {
    return baseRhythms
  }

  const rhythmSet = new Set(RHYTHMS.map((rhythm) => rhythm.id))
  return baseRhythms.map((_unused, index) => {
    const candidateRhythm = rawValue[index]
    return typeof candidateRhythm === 'string' && rhythmSet.has(candidateRhythm as RhythmId)
      ? (candidateRhythm as RhythmId)
      : 'quarter'
  })
}

function normalizeSettings(rawValue: unknown): MetronomePanelSettings {
  const defaultSettings = createDefaultSettings()
  if (!rawValue || typeof rawValue !== 'object') {
    return defaultSettings
  }

  const source = rawValue as Partial<Record<keyof MetronomePanelSettings, unknown>>

  const beatsPerMeasure = clamp(
    Math.round(Number(source.beatsPerMeasure) || defaultSettings.beatsPerMeasure),
    Math.min(...BEAT_OPTIONS),
    Math.max(...BEAT_OPTIONS),
  )

  const beatUnitOptions = BEAT_UNIT_OPTIONS as readonly number[]
  const beatUnit = beatUnitOptions.includes(source.beatUnit as number)
    ? (source.beatUnit as number)
    : defaultSettings.beatUnit

  const availableSounds = new Set(SOUND_OPTIONS.map((option) => option.id))
  const sound =
    typeof source.sound === 'string' && availableSounds.has(source.sound as SoundId)
      ? (source.sound as SoundId)
      : defaultSettings.sound

  const beatToneLevels = normalizeToneLevels(source.beatToneLevels, beatsPerMeasure)
  const beatRhythms = normalizeRhythms(source.beatRhythms, beatsPerMeasure)
  const rawVolume = Number(source.volume)
  const volume = Number.isFinite(rawVolume) ? rawVolume : DEFAULT_VOLUME
  const activeRhythmBeatIndex = clamp(
    Math.round(Number(source.activeRhythmBeatIndex) || 0),
    0,
    beatsPerMeasure - 1,
  )

  return {
    bpm: clamp(Math.round(Number(source.bpm) || DEFAULT_BPM), MIN_BPM, MAX_BPM),
    volume: clamp(volume, 0, 1),
    beatsPerMeasure,
    beatUnit,
    sound,
    accentFirstBeat:
      typeof source.accentFirstBeat === 'boolean'
        ? source.accentFirstBeat
        : defaultSettings.accentFirstBeat,
    beatToneLevels,
    beatRhythms,
    activeRhythmBeatIndex,
  }
}

export function loadMetronomePanelSettings(): MetronomePanelSettings {
  if (typeof window === 'undefined') {
    return createDefaultSettings()
  }

  try {
    const cachedSettings = window.localStorage.getItem(METRONOME_SETTINGS_STORAGE_KEY)
    if (!cachedSettings) {
      return createDefaultSettings()
    }

    return normalizeSettings(JSON.parse(cachedSettings))
  } catch {
    return createDefaultSettings()
  }
}

export function saveMetronomePanelSettings(settings: MetronomePanelSettings) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(METRONOME_SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Ignore storage write failures to avoid blocking core metronome behavior.
  }
}