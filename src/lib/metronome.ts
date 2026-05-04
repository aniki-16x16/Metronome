export const MIN_BPM = 30
export const MAX_BPM = 300
export const DEFAULT_BPM = 60
export const DEFAULT_VOLUME = 1

export const BEAT_OPTIONS = [2, 3, 4] as const
export const BEAT_UNIT_OPTIONS = [4] as const
export const SOUND_OPTIONS = [{ id: 'classic', label: '经典木鱼点' }] as const

export type RhythmId =
  | 'quarter'
  | 'eighth'
  | 'sixteenth'
  | 'sixteenthEighthSixteenth'
  | 'dottedFront'
  | 'dottedBack'
  | 'triplet'
  | 'swing'

export type SoundId = (typeof SOUND_OPTIONS)[number]['id']

export type AudioConfig = {
  bpm: number
  beatsPerMeasure: number
  beatToneLevels: number[]
  beatRhythms: RhythmId[]
  accentFirstBeat: boolean
  sound: SoundId
  volume: number
}

export type WorkletMessage = {
  type: 'tick'
  beatIndex: number
  subdivisionIndex: number
}

export const RHYTHMS: Array<{ id: RhythmId; label: string; shortLabel: string }> = [
  { id: 'quarter', label: '四分', shortLabel: '四' },
  { id: 'eighth', label: '八分', shortLabel: '八' },
  { id: 'sixteenth', label: '十六分', shortLabel: '十六' },
  { id: 'sixteenthEighthSixteenth', label: '16-8-16', shortLabel: '16-8-16' },
  { id: 'dottedFront', label: '前附点', shortLabel: '前附' },
  { id: 'dottedBack', label: '后附点', shortLabel: '后附' },
  { id: 'triplet', label: '三连音', shortLabel: '三连' },
  { id: 'swing', label: 'swing', shortLabel: 'sw' },
]

export function createToneLevels(beatsPerMeasure: number) {
  return Array.from({ length: beatsPerMeasure }, () => 2)
}

export function createRhythms(beatsPerMeasure: number) {
  return Array.from({ length: beatsPerMeasure }, () => 'quarter' as RhythmId)
}

export function formatDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function rhythmLabel(rhythmId: RhythmId) {
  return RHYTHMS.find((rhythm) => rhythm.id === rhythmId)?.shortLabel ?? '四'
}