import { Minus, Plus } from 'lucide-react'
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
import { MAX_BPM, MIN_BPM } from '../../lib/metronome'
import { clamp } from '../../lib/number'
import { IconButton } from '../ui/IconButton'

const TEMPO_STEP_WIDTH = 8
const TEMPO_MARK_WIDTH = 4
const TEMPO_OVERSCAN_STEPS = 48
const TEMPO_VALUES = Array.from(
  { length: MAX_BPM - MIN_BPM + 1 },
  (_unused, index) => MIN_BPM + index,
)
const TEMPO_TOTAL_WIDTH = (TEMPO_VALUES.length - 1) * TEMPO_STEP_WIDTH + TEMPO_MARK_WIDTH

type TempoDragState = {
  pointerId: number
  startX: number
  startScrollLeft: number
}

type TempoViewport = {
  scrollLeft: number
  width: number
}

type BpmControlProps = {
  bpm: number
  onBpmChange: Dispatch<SetStateAction<number>>
}

export function BpmControl({ bpm, onBpmChange }: BpmControlProps) {
  const [tempoRailPadding, setTempoRailPadding] = useState(0)
  const [tempoViewport, setTempoViewport] = useState<TempoViewport>({
    scrollLeft: 0,
    width: 0,
  })

  const tempoRailRef = useRef<HTMLDivElement | null>(null)
  const tempoDragStateRef = useRef<TempoDragState | null>(null)
  const isProgrammaticTempoScrollRef = useRef(false)
  const tempoScrollReleaseFrameRef = useRef(0)
  const tempoViewportFrameRef = useRef(0)

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
      onBpmChange((currentBpm) => (currentBpm === nextBpm ? currentBpm : nextBpm))
    },
    [onBpmChange, updateTempoViewport],
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

  useEffect(
    () => () => {
      window.cancelAnimationFrame(tempoScrollReleaseFrameRef.current)
      window.cancelAnimationFrame(tempoViewportFrameRef.current)
    },
    [],
  )

  const adjustBpm = useCallback(
    (amount: number) => {
      onBpmChange((currentBpm) => clamp(currentBpm + amount, MIN_BPM, MAX_BPM))
    },
    [onBpmChange],
  )

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
      onBpmChange(MIN_BPM)
    }
    if (event.key === 'End') {
      event.preventDefault()
      onBpmChange(MAX_BPM)
    }
  }

  return (
    <div className="mt-7">
      <div className="flex items-center justify-center gap-4">
        <IconButton ariaLabel="BPM 减 1" onClick={() => adjustBpm(-1)}>
          <Minus size={18} strokeWidth={2.4} />
        </IconButton>
        <div className="min-w-28 text-center">
          <div className="font-mono text-6xl font-semibold leading-none text-slate-950">{bpm}</div>
          <div className="mt-1 text-xs font-semibold uppercase text-slate-400">BPM</div>
        </div>
        <IconButton ariaLabel="BPM 加 1" onClick={() => adjustBpm(1)}>
          <Plus size={18} strokeWidth={2.4} />
        </IconButton>
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
  )
}