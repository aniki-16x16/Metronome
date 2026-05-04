import { useEffect, useMemo, useState } from 'react'
import { GlobalPanel } from './components/panels/GlobalPanel'
import { SubdivisionPanel } from './components/panels/SubdivisionPanel'
import { TransportPanel } from './components/panels/TransportPanel'
import { useMetronomeEngine } from './hooks/useMetronomeEngine'
import {
  type AudioConfig,
  DEFAULT_BPM,
  DEFAULT_VOLUME,
  type RhythmId,
  type SoundId,
  createRhythms,
  createToneLevels,
} from './lib/metronome'
import { clamp } from './lib/number'
import {
  loadMetronomePanelSettings,
  saveMetronomePanelSettings,
} from './lib/settings-storage'

function App() {
  const [initialSettings] = useState(() => loadMetronomePanelSettings())

  const [bpm, setBpm] = useState(initialSettings.bpm || DEFAULT_BPM)
  const [volume, setVolume] = useState(initialSettings.volume ?? DEFAULT_VOLUME)
  const [beatsPerMeasure, setBeatsPerMeasure] = useState(initialSettings.beatsPerMeasure)
  const [beatUnit, setBeatUnit] = useState(initialSettings.beatUnit)
  const [sound, setSound] = useState<SoundId>(initialSettings.sound)
  const [accentFirstBeat, setAccentFirstBeat] = useState(initialSettings.accentFirstBeat)
  const [beatToneLevels, setBeatToneLevels] = useState(
    initialSettings.beatToneLevels.length > 0
      ? initialSettings.beatToneLevels
      : createToneLevels(initialSettings.beatsPerMeasure),
  )
  const [beatRhythms, setBeatRhythms] = useState(
    initialSettings.beatRhythms.length > 0
      ? initialSettings.beatRhythms
      : createRhythms(initialSettings.beatsPerMeasure),
  )
  const [activeRhythmBeatIndex, setActiveRhythmBeatIndex] = useState(
    initialSettings.activeRhythmBeatIndex,
  )

  const audioConfig = useMemo<AudioConfig>(
    () => ({
      bpm,
      beatsPerMeasure,
      beatToneLevels,
      beatRhythms,
      accentFirstBeat,
      sound,
      volume,
    }),
    [accentFirstBeat, beatRhythms, beatToneLevels, beatsPerMeasure, bpm, sound, volume],
  )

  const {
    isPlaying,
    currentBeatIndex,
    elapsedSeconds,
    audioNotice,
    startMetronome,
    pauseMetronome,
    resetMetronome,
  } = useMetronomeEngine(audioConfig)

  const changeBeatsPerMeasure = (nextBeatsPerMeasure: number) => {
    setBeatsPerMeasure(nextBeatsPerMeasure)
    setBeatToneLevels((currentToneLevels) => {
      const nextToneLevels = createToneLevels(nextBeatsPerMeasure)
      currentToneLevels.slice(0, nextBeatsPerMeasure).forEach((toneLevel, index) => {
        nextToneLevels[index] = toneLevel
      })
      return nextToneLevels
    })
    setBeatRhythms((currentRhythms) => {
      const nextRhythms = createRhythms(nextBeatsPerMeasure)
      currentRhythms.slice(0, nextBeatsPerMeasure).forEach((rhythm, index) => {
        nextRhythms[index] = rhythm
      })
      return nextRhythms
    })
    setActiveRhythmBeatIndex((currentIndex) =>
      clamp(currentIndex, 0, nextBeatsPerMeasure - 1),
    )
  }

  const updateBeatToneLevel = (beatIndex: number, levelIndex: number) => {
    setBeatToneLevels((currentToneLevels) =>
      currentToneLevels.map((toneLevel, index) => {
        if (index !== beatIndex) {
          return toneLevel
        }

        const requestedToneLevel = levelIndex + 1
        return toneLevel === 1 && requestedToneLevel === 1 ? 0 : requestedToneLevel
      }),
    )
  }

  const updateRhythm = (rhythmId: RhythmId) => {
    setBeatRhythms((currentRhythms) =>
      currentRhythms.map((rhythm, index) =>
        index === activeRhythmBeatIndex ? rhythmId : rhythm,
      ),
    )
  }

  useEffect(() => {
    saveMetronomePanelSettings({
      bpm,
      volume,
      beatsPerMeasure,
      beatUnit,
      sound,
      accentFirstBeat,
      beatToneLevels,
      beatRhythms,
      activeRhythmBeatIndex,
    })
  }, [
    accentFirstBeat,
    activeRhythmBeatIndex,
    beatRhythms,
    beatToneLevels,
    beatUnit,
    beatsPerMeasure,
    bpm,
    sound,
    volume,
  ])

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#f7fbff_0%,#eefbf7_48%,#fff8fb_100%)] px-4 py-4 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100svh-2rem)] w-full max-w-[1480px] grid-cols-1 content-center items-center gap-4 md:grid-cols-2 xl:grid-cols-3">
        <GlobalPanel
          bpm={bpm}
          volume={volume}
          onBpmChange={setBpm}
          onVolumeChange={setVolume}
          beatsPerMeasure={beatsPerMeasure}
          beatUnit={beatUnit}
          sound={sound}
          accentFirstBeat={accentFirstBeat}
          onBeatsPerMeasureChange={changeBeatsPerMeasure}
          onBeatUnitChange={setBeatUnit}
          onSoundChange={setSound}
          onAccentFirstBeatChange={setAccentFirstBeat}
        />

        <TransportPanel
          beatsPerMeasure={beatsPerMeasure}
          beatToneLevels={beatToneLevels}
          currentBeatIndex={currentBeatIndex}
          isPlaying={isPlaying}
          elapsedSeconds={elapsedSeconds}
          audioNotice={audioNotice}
          onToneLevelChange={updateBeatToneLevel}
          onStart={startMetronome}
          onPause={pauseMetronome}
          onReset={resetMetronome}
        />

        <SubdivisionPanel
          beatsPerMeasure={beatsPerMeasure}
          beatRhythms={beatRhythms}
          activeRhythmBeatIndex={activeRhythmBeatIndex}
          onActiveRhythmBeatIndexChange={setActiveRhythmBeatIndex}
          onRhythmChange={updateRhythm}
        />
      </div>
    </main>
  )
}

export default App
