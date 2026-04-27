import { Check, ChevronDown, Pause, Play, Minus, Plus } from 'lucide-react'
import {
  type Dispatch,
  type KeyboardEvent,
  type PointerEvent,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'

const MIN_BPM = 30
const MAX_BPM = 300
const TEMPO_STEP_WIDTH = 8
const TEMPO_MARK_WIDTH = 4
const TEMPO_OVERSCAN_STEPS = 48
const TEMPO_VALUES = Array.from(
  { length: MAX_BPM - MIN_BPM + 1 },
  (_unused, index) => MIN_BPM + index,
)
const TEMPO_TOTAL_WIDTH = (TEMPO_VALUES.length - 1) * TEMPO_STEP_WIDTH + TEMPO_MARK_WIDTH
const BEAT_OPTIONS = [2, 3, 4] as const
const BEAT_UNIT_OPTIONS = [4] as const
const SOUND_OPTIONS = [{ id: 'classic', label: '经典木鱼点' }] as const

type RhythmId =
  | 'quarter'
  | 'eighth'
  | 'sixteenth'
  | 'dottedFront'
  | 'dottedBack'
  | 'triplet'
  | 'swing'

type SoundId = (typeof SOUND_OPTIONS)[number]['id']

type AudioConfig = {
  bpm: number
  beatsPerMeasure: number
  beatToneLevels: number[]
  beatRhythms: RhythmId[]
  accentFirstBeat: boolean
  sound: SoundId
}

type PickerOption<T extends string | number> = {
  value: T
  label: string
}

type TempoDragState = {
  pointerId: number
  startX: number
  startScrollLeft: number
}

type TempoViewport = {
  scrollLeft: number
  width: number
}

type PickerPosition = {
  top: number
  left: number
  width: number
}

type WorkletMessage = {
  type: 'tick'
  beatIndex: number
  subdivisionIndex: number
}

const RHYTHMS: Array<{ id: RhythmId; label: string; shortLabel: string }> = [
  { id: 'quarter', label: '四分', shortLabel: '四' },
  { id: 'eighth', label: '八分', shortLabel: '八' },
  { id: 'sixteenth', label: '十六分', shortLabel: '十六' },
  { id: 'dottedFront', label: '前附点', shortLabel: '前附' },
  { id: 'dottedBack', label: '后附点', shortLabel: '后附' },
  { id: 'triplet', label: '三连音', shortLabel: '三连' },
  { id: 'swing', label: 'swing', shortLabel: 'sw' },
]

const panelClassName =
  'rounded-lg border border-sky-100 bg-white/90 p-5 shadow-[0_18px_50px_rgba(91,141,166,0.13)] backdrop-blur'
const pickerButtonClassName =
  'flex h-11 w-full items-center justify-between gap-2 rounded-md border border-sky-100 bg-white px-3 text-sm font-medium text-slate-700 shadow-inner shadow-sky-50 transition hover:border-teal-200 hover:bg-teal-50/60 focus:border-teal-300 focus:outline-none'
const iconButtonClassName =
  'inline-flex h-10 w-10 items-center justify-center rounded-md border border-sky-100 bg-white text-slate-700 shadow-sm transition hover:border-teal-200 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-45'

function clamp(value: number, minValue: number, maxValue: number) {
  return Math.min(maxValue, Math.max(minValue, value))
}

function createToneLevels(beatsPerMeasure: number) {
  return Array.from({ length: beatsPerMeasure }, () => 2)
}

function createRhythms(beatsPerMeasure: number) {
  return Array.from({ length: beatsPerMeasure }, () => 'quarter' as RhythmId)
}

function formatDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function rhythmLabel(rhythmId: RhythmId) {
  return RHYTHMS.find((rhythm) => rhythm.id === rhythmId)?.shortLabel ?? '四'
}

function OptionPicker<T extends string | number>({
  id,
  value,
  options,
  openPickerId,
  setOpenPickerId,
  onChange,
}: {
  id: string
  value: T
  options: Array<PickerOption<T>>
  openPickerId: string | null
  setOpenPickerId: Dispatch<SetStateAction<string | null>>
  onChange: (value: T) => void
}) {
  const selectedOption = options.find((option) => option.value === value) ?? options[0]
  const isOpen = openPickerId === id
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [menuPosition, setMenuPosition] = useState<PickerPosition | null>(null)

  const updateMenuPosition = useCallback(() => {
    const button = buttonRef.current
    if (!button) {
      return
    }

    const buttonBounds = button.getBoundingClientRect()
    setMenuPosition({
      top: buttonBounds.bottom - 1,
      left: buttonBounds.left,
      width: buttonBounds.width,
    })
  }, [])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleOutsidePointerDown = (event: globalThis.PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) {
        return
      }

      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return
      }

      setOpenPickerId(null)
    }

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenPickerId(null)
        buttonRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', handleOutsidePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', updateMenuPosition)
    window.addEventListener('scroll', updateMenuPosition, true)

    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', updateMenuPosition)
      window.removeEventListener('scroll', updateMenuPosition, true)
    }
  }, [isOpen, setOpenPickerId, updateMenuPosition])

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        className={pickerButtonClassName}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => {
          if (isOpen) {
            setOpenPickerId(null)
            return
          }

          updateMenuPosition()
          setOpenPickerId(id)
        }}
      >
        <span className="truncate">{selectedOption.label}</span>
        <ChevronDown
          size={16}
          strokeWidth={2.4}
          className={`shrink-0 text-slate-400 transition ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen &&
        menuPosition &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[1000] overflow-hidden rounded-b-md rounded-t-none border border-sky-100 bg-white p-1 shadow-[0_16px_40px_rgba(91,141,166,0.18)]"
            role="listbox"
            style={menuPosition}
          >
            {options.map((option) => {
              const isSelected = option.value === value
              return (
                <button
                  key={String(option.value)}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`flex h-10 w-full items-center justify-between rounded-sm px-3 text-left text-sm font-medium transition ${
                    isSelected
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-slate-600 hover:bg-sky-50'
                  }`}
                  onClick={() => {
                    onChange(option.value)
                    setOpenPickerId(null)
                  }}
                >
                  <span>{option.label}</span>
                  {isSelected && <Check size={16} strokeWidth={2.4} />}
                </button>
              )
            })}
          </div>,
          document.body,
        )}
    </div>
  )
}

function RhythmIcon({ rhythmId }: { rhythmId: RhythmId }) {
  const note = (xPosition: number, yPosition = 25) => (
    <>
      <ellipse cx={xPosition} cy={yPosition} rx="3.8" ry="2.7" />
      <path d={`M${xPosition + 3.4} ${yPosition - 1.6}V8`} />
    </>
  )

  return (
    <svg
      viewBox="0 0 64 36"
      className="h-10 w-full"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.2"
    >
      {rhythmId === 'quarter' && <>{note(30)}</>}
      {rhythmId === 'eighth' && (
        <>
          {note(22)}
          {note(42)}
          <path d="M25.4 8H45.4" />
        </>
      )}
      {rhythmId === 'sixteenth' && (
        <>
          {[14, 26, 38, 50].map((xPosition) => note(xPosition))}
          <path d="M17.4 8H53.4" />
          <path d="M17.4 13H53.4" />
        </>
      )}
      {rhythmId === 'dottedFront' && (
        <>
          {note(23)}
          <circle cx="32" cy="23" r="1.4" fill="currentColor" stroke="none" />
          {note(45, 26)}
          <path d="M26.4 8H48.4" />
        </>
      )}
      {rhythmId === 'dottedBack' && (
        <>
          {note(20, 26)}
          {note(42)}
          <circle cx="51" cy="23" r="1.4" fill="currentColor" stroke="none" />
          <path d="M23.4 8H45.4" />
        </>
      )}
      {rhythmId === 'triplet' && (
        <>
          {[18, 32, 46].map((xPosition) => note(xPosition))}
          <path d="M20 7H44" />
          <text
            x="32"
            y="6"
            textAnchor="middle"
            className="fill-current text-[8px] font-semibold"
            stroke="none"
          >
            3
          </text>
        </>
      )}
      {rhythmId === 'swing' && (
        <>
          {note(22)}
          {note(44)}
          <path d="M25.4 8H47.4" />
          <path d="M18 31C28 35 40 35 50 28" />
          <path d="M50 28l-2 5" />
        </>
      )}
    </svg>
  )
}

function App() {
  const [bpm, setBpm] = useState(96)
  const [beatsPerMeasure, setBeatsPerMeasure] = useState(4)
  const [beatUnit, setBeatUnit] = useState(4)
  const [sound, setSound] = useState<SoundId>('classic')
  const [accentFirstBeat, setAccentFirstBeat] = useState(true)
  const [beatToneLevels, setBeatToneLevels] = useState(() => createToneLevels(4))
  const [beatRhythms, setBeatRhythms] = useState(() => createRhythms(4))
  const [activeRhythmBeatIndex, setActiveRhythmBeatIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentBeatIndex, setCurrentBeatIndex] = useState(-1)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [audioNotice, setAudioNotice] = useState('')
  const [tempoRailPadding, setTempoRailPadding] = useState(0)
  const [tempoViewport, setTempoViewport] = useState<TempoViewport>({
    scrollLeft: 0,
    width: 0,
  })
  const [openPickerId, setOpenPickerId] = useState<string | null>(null)

  const tempoRailRef = useRef<HTMLDivElement | null>(null)
  const tempoDragStateRef = useRef<TempoDragState | null>(null)
  const isProgrammaticTempoScrollRef = useRef(false)
  const tempoScrollReleaseFrameRef = useRef(0)
  const tempoViewportFrameRef = useRef(0)
  const audioContextRef = useRef<AudioContext | null>(null)
  const metronomeNodeRef = useRef<AudioWorkletNode | null>(null)
  const audioSetupPromiseRef = useRef<Promise<AudioWorkletNode> | null>(null)
  const playStartedAtRef = useRef<number | null>(null)
  const elapsedBeforePlayRef = useRef(0)

  const beatLabels = useMemo(
    () => Array.from({ length: beatsPerMeasure }, (_unused, index) => `第 ${index + 1} 拍`),
    [beatsPerMeasure],
  )

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

  const beatOptions = useMemo(
    () => BEAT_OPTIONS.map((option) => ({ value: option, label: String(option) })),
    [],
  )

  const beatUnitOptions = useMemo(
    () => BEAT_UNIT_OPTIONS.map((option) => ({ value: option, label: String(option) })),
    [],
  )

  const soundOptions = useMemo(
    () => SOUND_OPTIONS.map((option) => ({ value: option.id, label: option.label })),
    [],
  )

  const visibleTempoValues = useMemo(() => {
    const overscanWidth = TEMPO_OVERSCAN_STEPS * TEMPO_STEP_WIDTH
    const viewportWidth = tempoViewport.width || 0
    const startIndex = clamp(
      Math.floor((tempoViewport.scrollLeft - tempoRailPadding - overscanWidth) / TEMPO_STEP_WIDTH),
      0,
      TEMPO_VALUES.length - 1,
    )
    const endIndex = clamp(
      Math.ceil(
        (tempoViewport.scrollLeft + viewportWidth - tempoRailPadding + overscanWidth) /
          TEMPO_STEP_WIDTH,
      ),
      0,
      TEMPO_VALUES.length - 1,
    )

    return TEMPO_VALUES.slice(startIndex, endIndex + 1).map((tempoValue, index) => ({
      tempoIndex: startIndex + index,
      tempoValue,
    }))
  }, [tempoRailPadding, tempoViewport.scrollLeft, tempoViewport.width])

  const updateTempoViewport = useCallback((tempoRail: HTMLDivElement) => {
    const nextViewport = {
      scrollLeft: tempoRail.scrollLeft,
      width: tempoRail.clientWidth,
    }

    setTempoViewport((currentViewport) => {
      if (
        currentViewport.scrollLeft === nextViewport.scrollLeft &&
        currentViewport.width === nextViewport.width
      ) {
        return currentViewport
      }

      return nextViewport
    })
  }, [])

  const commitTempoFromRail = useCallback(
    (tempoRail: HTMLDivElement) => {
      updateTempoViewport(tempoRail)

      if (isProgrammaticTempoScrollRef.current) {
        return
      }

      const centeredIndex = clamp(
        Math.round(tempoRail.scrollLeft / TEMPO_STEP_WIDTH),
        0,
        TEMPO_VALUES.length - 1,
      )
      const nextBpm = TEMPO_VALUES[centeredIndex]
      setBpm((currentBpm) => (currentBpm === nextBpm ? currentBpm : nextBpm))
    },
    [updateTempoViewport],
  )

  useEffect(() => {
    const tempoRail = tempoRailRef.current
    if (!tempoRail) {
      return
    }

    const updateRailPadding = () => {
      setTempoRailPadding(Math.max(0, tempoRail.clientWidth / 2 - TEMPO_MARK_WIDTH / 2))
      updateTempoViewport(tempoRail)
    }

    updateRailPadding()
    const resizeObserver = new ResizeObserver(updateRailPadding)
    resizeObserver.observe(tempoRail)

    return () => resizeObserver.disconnect()
  }, [updateTempoViewport])

  useEffect(() => {
    const tempoRail = tempoRailRef.current
    if (!tempoRail || tempoDragStateRef.current) {
      return
    }

    window.cancelAnimationFrame(tempoScrollReleaseFrameRef.current)
    isProgrammaticTempoScrollRef.current = true
    tempoRail.scrollTo({
      left: (bpm - MIN_BPM) * TEMPO_STEP_WIDTH,
      behavior: 'auto',
    })
    updateTempoViewport(tempoRail)
    tempoScrollReleaseFrameRef.current = window.requestAnimationFrame(() => {
      isProgrammaticTempoScrollRef.current = false
    })
  }, [bpm, tempoRailPadding, updateTempoViewport])

  useEffect(() => {
    const node = metronomeNodeRef.current
    if (!node) {
      return
    }

    node.port.postMessage({ type: 'config', config: audioConfig })
  }, [audioConfig])

  useEffect(() => {
    if (!isPlaying) {
      return
    }

    const timerId = window.setInterval(() => {
      if (playStartedAtRef.current === null) {
        return
      }

      setElapsedSeconds(
        elapsedBeforePlayRef.current + (Date.now() - playStartedAtRef.current) / 1000,
      )
    }, 200)

    return () => window.clearInterval(timerId)
  }, [isPlaying])

  useEffect(() => {
    const resumeVisibleAudio = () => {
      if (!document.hidden && isPlaying) {
        void audioContextRef.current?.resume()
      }
    }

    document.addEventListener('visibilitychange', resumeVisibleAudio)
    return () => document.removeEventListener('visibilitychange', resumeVisibleAudio)
  }, [isPlaying])

  useEffect(
    () => () => {
      window.cancelAnimationFrame(tempoScrollReleaseFrameRef.current)
      window.cancelAnimationFrame(tempoViewportFrameRef.current)
      metronomeNodeRef.current?.port.postMessage({ type: 'stop' })
      void audioContextRef.current?.close()
    },
    [],
  )

  const adjustBpm = (amount: number) => {
    setBpm((currentBpm) => clamp(currentBpm + amount, MIN_BPM, MAX_BPM))
  }

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
    setCurrentBeatIndex((currentIndex) =>
      currentIndex >= nextBeatsPerMeasure ? nextBeatsPerMeasure - 1 : currentIndex,
    )
  }

  const updateTempoFromScroll = () => {
    const tempoRail = tempoRailRef.current
    if (!tempoRail || tempoViewportFrameRef.current) {
      return
    }

    tempoViewportFrameRef.current = window.requestAnimationFrame(() => {
      tempoViewportFrameRef.current = 0
      commitTempoFromRail(tempoRail)
    })
  }

  const handleTempoPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    tempoDragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: event.currentTarget.scrollLeft,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  const handleTempoPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const dragState = tempoDragStateRef.current
    if (dragState?.pointerId === event.pointerId) {
      event.currentTarget.scrollLeft = dragState.startScrollLeft - (event.clientX - dragState.startX)
    }
  }

  const handleTempoPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    tempoDragStateRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handleTempoKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault()
      adjustBpm(-1)
    }
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault()
      adjustBpm(1)
    }
    if (event.key === 'PageDown') {
      event.preventDefault()
      adjustBpm(-5)
    }
    if (event.key === 'PageUp') {
      event.preventDefault()
      adjustBpm(5)
    }
    if (event.key === 'Home') {
      event.preventDefault()
      setBpm(MIN_BPM)
    }
    if (event.key === 'End') {
      event.preventDefault()
      setBpm(MAX_BPM)
    }
  }

  const updateBeatStrength = (beatIndex: number, levelIndex: number) => {
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

  const ensureAudioEngine = async () => {
    if (metronomeNodeRef.current) {
      return metronomeNodeRef.current
    }

    if (audioSetupPromiseRef.current) {
      return audioSetupPromiseRef.current
    }

    audioSetupPromiseRef.current = (async () => {
      const audioContext = new AudioContext({ latencyHint: 'interactive' })
      await audioContext.audioWorklet.addModule(
        new URL('./audio/metronome-worklet.js', import.meta.url),
      )
      const node = new AudioWorkletNode(audioContext, 'metronome-processor', {
        outputChannelCount: [2],
      })

      node.port.onmessage = (event: MessageEvent<WorkletMessage>) => {
        if (event.data.type === 'tick') {
          setCurrentBeatIndex(event.data.beatIndex)
        }
      }

      node.connect(audioContext.destination)
      audioContextRef.current = audioContext
      metronomeNodeRef.current = node
      return node
    })()

    return audioSetupPromiseRef.current
  }

  const startMetronome = async () => {
    try {
      const node = await ensureAudioEngine()
      await audioContextRef.current?.resume()
      node.port.postMessage({ type: 'config', config: audioConfig })
      node.port.postMessage({ type: 'start' })
      playStartedAtRef.current = Date.now()
      elapsedBeforePlayRef.current = elapsedSeconds
      setCurrentBeatIndex(0)
      setIsPlaying(true)
      setAudioNotice('')
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing'
      }
    } catch {
      setAudioNotice('音频初始化失败，请确认当前环境允许播放声音。')
    }
  }

  const pauseMetronome = () => {
    const nextElapsedSeconds =
      playStartedAtRef.current === null
        ? elapsedSeconds
        : elapsedBeforePlayRef.current + (Date.now() - playStartedAtRef.current) / 1000

    metronomeNodeRef.current?.port.postMessage({ type: 'stop' })
    playStartedAtRef.current = null
    elapsedBeforePlayRef.current = nextElapsedSeconds
    setElapsedSeconds(nextElapsedSeconds)
    setIsPlaying(false)
    setCurrentBeatIndex(-1)
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'paused'
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#f7fbff_0%,#eefbf7_48%,#fff8fb_100%)] px-4 py-4 text-slate-800 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100svh-2rem)] w-full max-w-[1480px] grid-cols-1 content-center items-center gap-4 md:grid-cols-2 xl:grid-cols-3">
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

          <div className="mt-7">
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                className={iconButtonClassName}
                onClick={() => adjustBpm(-1)}
                aria-label="BPM 减 1"
              >
                <Minus size={18} strokeWidth={2.4} />
              </button>
              <div className="min-w-28 text-center">
                <div className="font-mono text-6xl font-semibold leading-none text-slate-950">
                  {bpm}
                </div>
                <div className="mt-1 text-xs font-semibold uppercase text-slate-400">BPM</div>
              </div>
              <button
                type="button"
                className={iconButtonClassName}
                onClick={() => adjustBpm(1)}
                aria-label="BPM 加 1"
              >
                <Plus size={18} strokeWidth={2.4} />
              </button>
            </div>

            <div
              ref={tempoRailRef}
              className="scrollbar-none relative mt-5 cursor-grab overflow-x-auto rounded-md border border-sky-100 bg-sky-50/70 py-4 active:cursor-grabbing"
              role="slider"
              tabIndex={0}
              aria-label="BPM 数轴"
              aria-valuemin={MIN_BPM}
              aria-valuemax={MAX_BPM}
              aria-valuenow={bpm}
              onPointerDown={handleTempoPointerDown}
              onPointerMove={handleTempoPointerMove}
              onPointerUp={handleTempoPointerEnd}
              onPointerCancel={handleTempoPointerEnd}
              onKeyDown={handleTempoKeyDown}
              onScroll={updateTempoFromScroll}
            >
              <div className="pointer-events-none absolute left-1/2 top-4 h-9 w-px -translate-x-1/2 rounded-full bg-teal-300/45" />
              <div
                className="relative h-[61px]"
                style={{ width: tempoRailPadding * 2 + TEMPO_TOTAL_WIDTH }}
              >
                {visibleTempoValues.map(({ tempoIndex, tempoValue }) => {
                  const isActiveTempo = tempoValue === bpm
                  const isMajorTempo = tempoValue % 5 === 0
                  const scaleY = isActiveTempo ? 2 : isMajorTempo ? 1.55 : 1
                  return (
                    <div
                      key={tempoValue}
                      className="absolute top-0 flex w-1 flex-col items-center justify-end"
                      style={{ left: tempoRailPadding + tempoIndex * TEMPO_STEP_WIDTH }}
                    >
                      <div className="flex h-9 w-1 items-end overflow-visible">
                        <div
                          className={`h-[18px] w-1 origin-bottom rounded-full transition-[transform,background-color,box-shadow] duration-200 ease-out ${
                            isActiveTempo
                              ? 'bg-teal-500 shadow-[0_0_0_4px_rgba(20,184,166,0.14)]'
                              : isMajorTempo
                                ? 'bg-sky-300'
                                : 'bg-sky-200'
                          }`}
                          style={{ transform: `scaleY(${scaleY})` }}
                        />
                      </div>
                      <div className="mt-2 h-4 w-8 text-center text-[10px] font-medium text-slate-400">
                        {isMajorTempo ? tempoValue : ''}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <div className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-600">拍号</span>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <OptionPicker
                  id="beats-per-measure"
                  value={beatsPerMeasure}
                  options={beatOptions}
                  openPickerId={openPickerId}
                  setOpenPickerId={setOpenPickerId}
                  onChange={changeBeatsPerMeasure}
                />
                <span className="text-xl font-semibold text-slate-300">/</span>
                <OptionPicker
                  id="beat-unit"
                  value={beatUnit}
                  options={beatUnitOptions}
                  openPickerId={openPickerId}
                  setOpenPickerId={setOpenPickerId}
                  onChange={setBeatUnit}
                />
              </div>
            </div>

            <div className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-600">音色</span>
              <OptionPicker
                id="sound"
                value={sound}
                options={soundOptions}
                openPickerId={openPickerId}
                setOpenPickerId={setOpenPickerId}
                onChange={setSound}
              />
            </div>
          </div>

          <label className="mt-5 flex items-center gap-3 rounded-md bg-rose-50/70 px-3 py-3 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              className="h-5 w-5 rounded border-rose-200 text-rose-500 accent-rose-500"
              checked={accentFirstBeat}
              onChange={(event) => setAccentFirstBeat(event.target.checked)}
            />
            强调第一拍
          </label>
        </section>

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
                      const toneColorClassName = [
                        'bg-emerald-200 shadow-inner shadow-emerald-100',
                        'bg-teal-300 shadow-inner shadow-teal-200',
                        'bg-cyan-400 shadow-inner shadow-cyan-300/70',
                      ][levelIndex]
                      return (
                        <button
                          key={levelIndex}
                          type="button"
                          className={`min-h-0 flex-1 rounded-sm border transition ${
                            isActiveLevel
                              ? `${toneColorClassName} border-white/70`
                              : 'border-sky-100 bg-white shadow-inner shadow-sky-100'
                          }`}
                          onClick={() => updateBeatStrength(beatIndex, levelIndex)}
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
              onClick={startMetronome}
              disabled={isPlaying}
            >
              <Play size={20} fill="currentColor" strokeWidth={2.2} />
              播放
            </button>
            <button
              type="button"
              className="inline-flex h-14 min-w-32 items-center justify-center gap-2 rounded-md border border-rose-100 bg-white px-5 text-base font-semibold text-rose-500 shadow-sm transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-45"
              onClick={pauseMetronome}
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
                  onClick={() => setActiveRhythmBeatIndex(beatIndex)}
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
                  onClick={() => updateRhythm(rhythm.id)}
                  aria-pressed={isActiveRhythm}
                >
                  <RhythmIcon rhythmId={rhythm.id} />
                  <span className="text-sm font-semibold">{rhythm.label}</span>
                </button>
              )
            })}
          </div>
        </section>
      </div>
    </main>
  )
}

export default App
