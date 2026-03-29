import { useState, useRef, useEffect, useCallback } from 'react'
import { pickRandom } from '../utils/shuffle'

export function useAudioPlayer(tracks, getNextFromQueue) {
  const audioRef = useRef(null)
  const historyRef = useRef([])
  const historyIndexRef = useRef(-1)
  const lastTimeUpdate = useRef(0)

  const [currentTrack, setCurrentTrack] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  // Create audio element once
  if (!audioRef.current) {
    audioRef.current = new Audio()
    audioRef.current.preload = 'auto'
  }

  const getUrl = useCallback((track) => {
    return track.archiveUrl || track.localUrl
  }, [])

  const loadTrack = useCallback((trackId, autoplay = false) => {
    const track = tracks.find(t => t.id === trackId)
    if (!track) return

    const audio = audioRef.current
    audio.src = getUrl(track)
    audio.load()
    setCurrentTrack(track)
    setCurrentTime(0)
    setDuration(track.duration || 0)

    if (autoplay) {
      audio.play().catch(() => setIsPlaying(false))
    }
  }, [tracks, getUrl])

  const skipNext = useCallback(() => {
    if (tracks.length === 0) return

    const queued = getNextFromQueue ? getNextFromQueue() : null
    if (queued) {
      historyRef.current.push(queued.id)
      historyIndexRef.current = historyRef.current.length - 1
      loadTrack(queued.id, true)
      return
    }

    const track = pickRandom(tracks, historyRef.current)
    historyRef.current.push(track.id)
    historyIndexRef.current = historyRef.current.length - 1
    loadTrack(track.id, true)
  }, [tracks, loadTrack, getNextFromQueue])

  const skipPrev = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--
      const trackId = historyRef.current[historyIndexRef.current]
      loadTrack(trackId, true)
    } else {
      // Restart current track
      const audio = audioRef.current
      audio.currentTime = 0
      setCurrentTime(0)
    }
  }, [loadTrack])

  const play = useCallback(() => {
    audioRef.current.play().catch(() => setIsPlaying(false))
  }, [])

  const pause = useCallback(() => {
    audioRef.current.pause()
  }, [])

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause()
    } else {
      play()
    }
  }, [isPlaying, play, pause])

  const seek = useCallback((time) => {
    audioRef.current.currentTime = time
    setCurrentTime(time)
  }, [])

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current

    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onLoadedMetadata = () => setDuration(audio.duration)
    const onTimeUpdate = () => {
      const now = performance.now()
      if (now - lastTimeUpdate.current > 250) {
        lastTimeUpdate.current = now
        setCurrentTime(audio.currentTime)
      }
    }
    const onEnded = () => skipNext()

    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('ended', onEnded)
    }
  }, [skipNext])

  // Load initial random track (without playing)
  useEffect(() => {
    if (tracks.length > 0 && !currentTrack) {
      const track = pickRandom(tracks, historyRef.current)
      historyRef.current.push(track.id)
      historyIndexRef.current = 0
      loadTrack(track.id, false)
    }
  }, [tracks, currentTrack, loadTrack])

  return {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    play,
    pause,
    toggle,
    skipNext,
    skipPrev,
    seek,
    loadTrack,
  }
}
