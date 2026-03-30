import { useState, useRef, useEffect, useCallback } from 'react'
import { shuffle } from '../utils/shuffle'

export function useAudioPlayer(tracks, getNextFromQueue, artMap) {
  const audioRef = useRef(null)
  const historyRef = useRef([])
  const historyIndexRef = useRef(-1)
  const lastTimeUpdate = useRef(0)
  const deckRef = useRef([])
  const deckIndexRef = useRef(0)

  const [currentTrack, setCurrentTrack] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [looping, setLooping] = useState(false)
  const loopingRef = useRef(false)
  const [upcomingTracks, setUpcomingTracks] = useState([])

  // Create audio element once
  if (!audioRef.current) {
    audioRef.current = new Audio()
    audioRef.current.preload = 'auto'
  }

  const getUrl = useCallback((track) => {
    return track.archiveUrl || track.localUrl
  }, [])

  const updateMediaSession = useCallback((track) => {
    if (!('mediaSession' in navigator) || !track) return

    const artFile = artMap ? artMap[track.artId] : null
    const artworkUrl = artFile
      ? `${window.location.origin}/art/${artFile}`
      : undefined

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: 'KLADG Radio',
      album: 'KLADG',
      ...(artworkUrl && {
        artwork: [
          { src: artworkUrl, sizes: '96x96', type: 'image/jpeg' },
          { src: artworkUrl, sizes: '128x128', type: 'image/jpeg' },
          { src: artworkUrl, sizes: '256x256', type: 'image/jpeg' },
          { src: artworkUrl, sizes: '512x512', type: 'image/jpeg' },
        ],
      }),
    })
  }, [artMap])

  const loadTrack = useCallback((trackId, autoplay = false) => {
    const track = tracks.find(t => t.id === trackId)
    if (!track) return

    const audio = audioRef.current
    audio.src = getUrl(track)
    audio.load()
    setCurrentTrack(track)
    setCurrentTime(0)
    setDuration(track.duration || 0)

    // Set Media Session metadata immediately, before play
    updateMediaSession(track)

    if (autoplay) {
      audio.play().catch(() => setIsPlaying(false))
    }
  }, [tracks, getUrl, updateMediaSession])

  // Build/rebuild shuffled deck
  const rebuildDeck = useCallback(() => {
    const shuffled = shuffle(tracks)
    deckRef.current = shuffled
    deckIndexRef.current = 0
    setUpcomingTracks(shuffled.slice(0, 20))
  }, [tracks])

  // Initialize deck on first load
  useEffect(() => {
    if (tracks.length > 0 && deckRef.current.length === 0) {
      rebuildDeck()
    }
  }, [tracks, rebuildDeck])

  const advanceDeck = useCallback(() => {
    deckIndexRef.current++
    // Re-shuffle when deck is exhausted
    if (deckIndexRef.current >= deckRef.current.length) {
      const shuffled = shuffle(tracks)
      deckRef.current = shuffled
      deckIndexRef.current = 0
    }
    const track = deckRef.current[deckIndexRef.current]
    setUpcomingTracks(deckRef.current.slice(deckIndexRef.current + 1, deckIndexRef.current + 21))
    return track
  }, [tracks])

  const skipNext = useCallback(() => {
    if (tracks.length === 0) return

    const queued = getNextFromQueue ? getNextFromQueue() : null
    if (queued) {
      historyRef.current.push(queued.id)
      historyIndexRef.current = historyRef.current.length - 1
      loadTrack(queued.id, true)
      return
    }

    const track = advanceDeck()
    historyRef.current.push(track.id)
    historyIndexRef.current = historyRef.current.length - 1
    loadTrack(track.id, true)
  }, [tracks, loadTrack, getNextFromQueue, advanceDeck])

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

  const toggleLoop = useCallback(() => {
    setLooping(prev => {
      const next = !prev
      loopingRef.current = next
      return next
    })
  }, [])

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current

    const onPlay = () => {
      setIsPlaying(true)
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing'
      }
    }
    const onPause = () => {
      setIsPlaying(false)
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused'
      }
    }
    const onLoadedMetadata = () => setDuration(audio.duration)
    const onTimeUpdate = () => {
      const now = performance.now()
      if (now - lastTimeUpdate.current > 250) {
        lastTimeUpdate.current = now
        setCurrentTime(audio.currentTime)
        // Update Media Session position
        if ('mediaSession' in navigator && audio.duration > 0) {
          try {
            navigator.mediaSession.setPositionState({
              duration: audio.duration,
              playbackRate: 1,
              position: Math.min(audio.currentTime, audio.duration),
            })
          } catch (_) {}
        }
      }
    }
    const onEnded = () => {
      if (loopingRef.current) {
        audio.currentTime = 0
        audio.play().catch(() => {})
      } else {
        skipNext()
      }
    }

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

  // Media Session action handlers
  useEffect(() => {
    if (!('mediaSession' in navigator)) return

    const actions = {
      play: () => audioRef.current.play().catch(() => {}),
      pause: () => audioRef.current.pause(),
      previoustrack: () => skipPrev(),
      nexttrack: () => skipNext(),
      // Override default 10-second seek with skip prev/next
      seekbackward: () => skipPrev(),
      seekforward: () => skipNext(),
    }

    for (const [action, handler] of Object.entries(actions)) {
      try { navigator.mediaSession.setActionHandler(action, handler) } catch (_) {}
    }

    return () => {
      for (const action of Object.keys(actions)) {
        try { navigator.mediaSession.setActionHandler(action, null) } catch (_) {}
      }
    }
  }, [skipNext, skipPrev])

  // Load initial random track (without playing)
  useEffect(() => {
    if (tracks.length > 0 && !currentTrack && deckRef.current.length > 0) {
      const track = advanceDeck()
      historyRef.current.push(track.id)
      historyIndexRef.current = 0
      loadTrack(track.id, false)
    }
  }, [tracks, currentTrack, loadTrack, advanceDeck])

  return {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    looping,
    upcomingTracks,
    play,
    pause,
    toggle,
    toggleLoop,
    skipNext,
    skipPrev,
    seek,
    loadTrack,
  }
}
