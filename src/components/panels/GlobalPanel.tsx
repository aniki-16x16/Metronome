import { type Dispatch, type SetStateAction } from 'react'
import { BpmControl } from '../tempo/BpmControl'
import { CheckboxField } from '../ui/CheckboxField'
import { OptionPicker, type PickerOption } from '../ui/OptionPicker'
import {
  BEAT_OPTIONS,
  BEAT_UNIT_OPTIONS,
  SOUND_OPTIONS,
  type SoundId,
} from '../../lib/metronome'
import { panelClassName } from './panelStyles'

const beatOptions: Array<PickerOption<number>> = BEAT_OPTIONS.map((option) => ({
  value: option,
  label: String(option),
}))

const beatUnitOptions: Array<PickerOption<number>> = BEAT_UNIT_OPTIONS.map((option) => ({
  value: option,
  label: String(option),
}))

const soundOptions: Array<PickerOption<SoundId>> = SOUND_OPTIONS.map((option) => ({
  value: option.id,
  label: option.label,
}))

type GlobalPanelProps = {
  bpm: number
  onBpmChange: Dispatch<SetStateAction<number>>
  beatsPerMeasure: number
  beatUnit: number
  sound: SoundId
  accentFirstBeat: boolean
  onBeatsPerMeasureChange: (beatsPerMeasure: number) => void
  onBeatUnitChange: (beatUnit: number) => void
  onSoundChange: (sound: SoundId) => void
  onAccentFirstBeatChange: (isEnabled: boolean) => void
}

export function GlobalPanel({
  bpm,
  onBpmChange,
  beatsPerMeasure,
  beatUnit,
  sound,
  accentFirstBeat,
  onBeatsPerMeasureChange,
  onBeatUnitChange,
  onSoundChange,
  onAccentFirstBeatChange,
}: GlobalPanelProps) {
  return (
    <section className={panelClassName} aria-labelledby="global-panel-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-teal-600">Global</p>
          <h1 id="global-panel-title" className="mt-1 text-2xl font-semibold text-slate-950">
            全局参数
          </h1>
        </div>
        <div className="rounded-md bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-700">
          {beatsPerMeasure}/{beatUnit}
        </div>
      </div>

      <BpmControl bpm={bpm} onBpmChange={onBpmChange} />

      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        <div className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-600">拍号</span>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <OptionPicker
              id="beats-per-measure"
              value={beatsPerMeasure}
              options={beatOptions}
              onChange={onBeatsPerMeasureChange}
            />
            <span className="text-xl font-semibold text-slate-300">/</span>
            <OptionPicker
              id="beat-unit"
              value={beatUnit}
              options={beatUnitOptions}
              onChange={onBeatUnitChange}
            />
          </div>
        </div>

        <div className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-600">音色</span>
          <OptionPicker id="sound" value={sound} options={soundOptions} onChange={onSoundChange} />
        </div>
      </div>

      <CheckboxField
        label="强调第一拍"
        checked={accentFirstBeat}
        onChange={onAccentFirstBeatChange}
      />
    </section>
  )
}