import { RhythmIcon } from '../metronome/RhythmIcon'
import { RHYTHMS, rhythmLabel, type RhythmId } from '../../lib/metronome'
import { panelClassName } from './panelStyles'

type SubdivisionPanelProps = {
  beatsPerMeasure: number
  beatRhythms: RhythmId[]
  activeRhythmBeatIndex: number
  onActiveRhythmBeatIndexChange: (beatIndex: number) => void
  onRhythmChange: (rhythmId: RhythmId) => void
}

export function SubdivisionPanel({
  beatsPerMeasure,
  beatRhythms,
  activeRhythmBeatIndex,
  onActiveRhythmBeatIndexChange,
  onRhythmChange,
}: SubdivisionPanelProps) {
  return (
    <section
      className={`${panelClassName} md:col-span-2 xl:col-span-1`}
      aria-labelledby="rhythm-panel-title"
    >
      <div>
        <p className="text-xs font-semibold uppercase text-sky-600">Subdivision</p>
        <h2 id="rhythm-panel-title" className="mt-1 text-2xl font-semibold text-slate-950">
          细分节奏
        </h2>
      </div>

      <div
        className="mt-6 grid gap-2"
        style={{ gridTemplateColumns: `repeat(${beatsPerMeasure}, minmax(0, 1fr))` }}
      >
        {beatRhythms.map((rhythmId, beatIndex) => {
          const isSelectedBeat = activeRhythmBeatIndex === beatIndex
          return (
            <button
              key={`${beatIndex}-${rhythmId}`}
              type="button"
              className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
                isSelectedBeat
                  ? 'border-sky-300 bg-sky-100 text-sky-800'
                  : 'border-sky-100 bg-white text-slate-600 hover:bg-sky-50'
              }`}
              onClick={() => onActiveRhythmBeatIndexChange(beatIndex)}
            >
              {beatIndex + 1} · {rhythmLabel(rhythmId)}
            </button>
          )
        })}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
        {RHYTHMS.map((rhythm) => {
          const isActiveRhythm = beatRhythms[activeRhythmBeatIndex] === rhythm.id
          return (
            <button
              key={rhythm.id}
              type="button"
              className={`flex min-h-28 flex-col items-center justify-center gap-2 rounded-md border px-3 py-3 text-center transition ${
                isActiveRhythm
                  ? 'border-teal-300 bg-teal-50 text-teal-700 shadow-[0_0_0_4px_rgba(20,184,166,0.08)]'
                  : 'border-sky-100 bg-white text-slate-600 hover:border-sky-200 hover:bg-sky-50'
              }`}
              onClick={() => onRhythmChange(rhythm.id)}
              aria-pressed={isActiveRhythm}
            >
              <RhythmIcon rhythmId={rhythm.id} />
              <span className="text-sm font-semibold">{rhythm.label}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}