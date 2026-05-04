import { useCallback, useEffect, useRef, useState } from 'react'
import { type AudioConfig, type WorkletMessage } from '../lib/metronome'

export function useMetronomeEngine(audioConfig: AudioConfig) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentBeatIndex, setCurrentBeatIndex] = useState(-1)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [audioNotice, setAudioNotice] = useState('')

  const audioContextRef = useRef<AudioContext | null>(null)
  const metronomeNodeRef = useRef<AudioWorkletNode | null>(null)
  const audioSetupPromiseRef = useRef<Promise<AudioWorkletNode> | null>(null)
  const playStartedAtRef = useRef<number | null>(null)
  const elapsedBeforePlayRef = useRef(0)

  const ensureAudioEngine = useCallback(async () => {
    if (metronomeNodeRef.current) {
      return metronomeNodeRef.current
    }

    if (audioSetupPromiseRef.current) {
      return audioSetupPromiseRef.current
    }

    audioSetupPromiseRef.current = (async () => {
      const audioContext = new AudioContext({ latencyHint: 'interactive' })
      await audioContext.audioWorklet.addModule(
        new URL('../audio/metronome-worklet.js', import.meta.url),
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
  }, [])

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
      metronomeNodeRef.current?.port.postMessage({ type: 'stop' })
      void audioContextRef.current?.close()
    },
    [],
  )

  const startMetronome = useCallback(async () => {
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
  }, [audioConfig, elapsedSeconds, ensureAudioEngine])

  const pauseMetronome = useCallback(() => {
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
  }, [elapsedSeconds])

  const resetMetronome = useCallback(() => {
    metronomeNodeRef.current?.port.postMessage({ type: 'stop' })
    playStartedAtRef.current = null
    elapsedBeforePlayRef.current = 0
    setElapsedSeconds(0)
    setCurrentBeatIndex(-1)
    setIsPlaying(false)
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'paused'
    }
  }, [])

  return {
    isPlaying,
    currentBeatIndex,
    elapsedSeconds,
    audioNotice,
    startMetronome,
    pauseMetronome,
    resetMetronome,
  }
}