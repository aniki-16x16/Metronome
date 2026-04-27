import { Pause, Play } from 'lucide-react'
import { formatDuration } from '../../lib/metronome'
import { panelClassName } from './panelStyles'

const toneColorClassNames = [
  'bg-emerald-200 shadow-inner shadow-emerald-100',
  'bg-teal-300 shadow-inner shadow-teal-200',
  'bg-cyan-400 shadow-inner shadow-cyan-300/70',
]

type TransportPanelProps = {
  beatsPerMeasure: number
  beatToneLevels: number[]
  currentBeatIndex: number
  isPlaying: boolean
  elapsedSeconds: number
  audioNotice: string
  onToneLevelChange: (beatIndex: number, levelIndex: number) => void
  onStart: () => void
  onPause: () => void
}

export function TransportPanel({
  beatsPerMeasure,
  beatToneLevels,
  currentBeatIndex,
  isPlaying,
  elapsedSeconds,
  audioNotice,
  onToneLevelChange,
  onStart,
  onPause,
}: TransportPanelProps) {
  const beatLabels = Array.from(
    { length: beatsPerMeasure },
    (_unused, index) => `第 ${index + 1} 拍`,
  )

  return (
    <section className={panelClassName} aria-labelledby="transport-panel-title">
      <div>
        <p className="text-xs font-semibold uppercase text-teal-600">Tone</p>
        <h2 id="transport-panel-title" className="mt-1 text-2xl font-semibold text-slate-950">
          播放控制
        </h2>
      </div>

      <div
        className="mt-7 grid gap-3"
        style={{ gridTemplateColumns: `repeat(${beatsPerMeasure}, minmax(0, 1fr))` }}
      >
        {beatLabels.map((label, beatIndex) => {
          const isCurrentBeat = currentBeatIndex === beatIndex && isPlaying
          return (
            <div
              key={label}
              className={`rounded-md border p-2 transition ${
                isCurrentBeat
                  ? 'border-teal-300 bg-teal-50 shadow-[0_0_0_4px_rgba(20,184,166,0.1)]'
                  : 'border-sky-100 bg-sky-50/50'
              }`}
            >
              <div className="mb-2 text-center text-xs font-semibold text-slate-500">
                {beatIndex + 1}
              </div>
              <div className="flex h-24 flex-col-reverse gap-1">
                {[0, 1, 2].map((levelIndex) => {
                  const isActiveLevel = beatToneLevels[beatIndex] > levelIndex
                  const toneColorClassName = toneColorClassNames[levelIndex]
                  return (
                    <button
                      key={levelIndex}
                      type="button"
                      className={`min-h-0 flex-1 rounded-sm border transition ${
                        isActiveLevel
                          ? `${toneColorClassName} border-white/70`
                          : 'border-sky-100 bg-white shadow-inner shadow-sky-100'
                      }`}
                      onClick={() => onToneLevelChange(beatIndex, levelIndex)}
                      aria-label={`${label} 音色层级 ${levelIndex + 1}`}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-8 flex justify-center gap-3">
        <button
          type="button"
          className="inline-flex h-14 min-w-32 items-center justify-center gap-2 rounded-md bg-teal-500 px-5 text-base font-semibold text-white shadow-[0_14px_30px_rgba(20,184,166,0.22)] transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-45"
          onClick={onStart}
          disabled={isPlaying}
        >
          <Play size={20} fill="currentColor" strokeWidth={2.2} />
          播放
        </button>
        <button
          type="button"
          className="inline-flex h-14 min-w-32 items-center justify-center gap-2 rounded-md border border-rose-100 bg-white px-5 text-base font-semibold text-rose-500 shadow-sm transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-45"
          onClick={onPause}
          disabled={!isPlaying}
        >
          <Pause size={20} fill="currentColor" strokeWidth={2.2} />
          暂停
        </button>
      </div>

      <div className="mt-7 text-center">
        <div className="font-mono text-5xl font-semibold leading-none text-slate-950">
          {formatDuration(elapsedSeconds)}
        </div>
        <div className="mt-2 text-xs font-semibold uppercase text-slate-400">Duration</div>
        {audioNotice && <p className="mt-4 text-sm font-medium text-rose-500">{audioNotice}</p>}
      </div>
    </section>
  )
}