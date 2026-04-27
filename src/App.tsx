import { useMemo, useState } from 'react'
import { GlobalPanel } from './components/panels/GlobalPanel'
import { SubdivisionPanel } from './components/panels/SubdivisionPanel'
import { TransportPanel } from './components/panels/TransportPanel'
import { useMetronomeEngine } from './hooks/useMetronomeEngine'
import {
  type AudioConfig,
  type RhythmId,
  type SoundId,
  createRhythms,
  createToneLevels,
} from './lib/metronome'
import { clamp } from './lib/number'

function App() {
  const [bpm, setBpm] = useState(96)
  const [beatsPerMeasure, setBeatsPerMeasure] = useState(4)
  const [beatUnit, setBeatUnit] = useState(4)
  const [sound, setSound] = useState<SoundId>('classic')
  const [accentFirstBeat, setAccentFirstBeat] = useState(true)
  const [beatToneLevels, setBeatToneLevels] = useState(() => createToneLevels(4))
  const [beatRhythms, setBeatRhythms] = useState(() => createRhythms(4))
  const [activeRhythmBeatIndex, setActiveRhythmBeatIndex] = useState(0)

  const audioConfig = useMemo<AudioConfig>(
    () => ({
      bpm,
      beatsPerMeasure,
      beatToneLevels,
      beatRhythms,
      accentFirstBeat,
      sound,
    }),
    [accentFirstBeat, beatRhythms, beatToneLevels, beatsPerMeasure, bpm, sound],
  )

  const {
    isPlaying,
    currentBeatIndex,
    elapsedSeconds,
    audioNotice,
    startMetronome,
    pauseMetronome,
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

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#f7fbff_0%,#eefbf7_48%,#fff8fb_100%)] px-4 py-4 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100svh-2rem)] w-full max-w-[1480px] grid-cols-1 content-center items-center gap-4 md:grid-cols-2 xl:grid-cols-3">
        <GlobalPanel
          bpm={bpm}
          onBpmChange={setBpm}
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
