import { useRef, useEffect, useState, useCallback } from 'react'
import { Plus, Play, Download, Check } from 'lucide-react'
import RatingStars from './RatingStars'

const ITEM_HEIGHT = 52
const VISIBLE_HALF = 6
const MAX_ROTATION = 45
const FRICTION = 0.93
const SNAP_THRESHOLD = 0.5
const SNAP_STIFFNESS = 0.12
const RUBBER_BAND = 0.3

export default function ScrollWheel({ tracks, artMap, ratings, playCounts, offlineCache, onSelect, onAddToQueue, onRate }) {
  const containerRef = useRef(null)
  const scrollRef = useRef({ y: 0, velocity: 0 })
  const dragging = useRef(false)
  const lastPointerY = useRef(0)
  const lastPointerTime = useRef(0)
  const lastDelta = useRef(0)
  const rafId = useRef(null)
  const [, setTick] = useState(0)

  const maxScroll = Math.max(0, (tracks.length - 1) * ITEM_HEIGHT)

  // Reset scroll when tracks change (sort/search)
  const prevTracksRef = useRef(tracks)
  if (prevTracksRef.current !== tracks) {
    prevTracksRef.current = tracks
    scrollRef.current.y = 0
    scrollRef.current.velocity = 0
  }

  const animate = useCallback(() => {
    const s = scrollRef.current

    if (!dragging.current) {
      // Apply velocity
      s.y += s.velocity

      // Rubber band at boundaries
      if (s.y < 0) {
        s.y *= RUBBER_BAND
        s.velocity *= RUBBER_BAND
      } else if (s.y > maxScroll) {
        s.y = maxScroll + (s.y - maxScroll) * RUBBER_BAND
        s.velocity *= RUBBER_BAND
      }

      // Friction
      s.velocity *= FRICTION

      // Snap when slow enough
      if (Math.abs(s.velocity) < SNAP_THRESHOLD) {
        s.velocity = 0
        const target = Math.round(s.y / ITEM_HEIGHT) * ITEM_HEIGHT
        const clamped = Math.max(0, Math.min(target, maxScroll))
        s.y += (clamped - s.y) * SNAP_STIFFNESS
      }
    }

    setTick(t => t + 1)
    rafId.current = requestAnimationFrame(animate)
  }, [maxScroll])

  useEffect(() => {
    rafId.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId.current)
  }, [animate])

  // Wheel handler
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onWheel = (e) => {
      e.preventDefault()
      scrollRef.current.velocity += e.deltaY * 0.4
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // Touch/mouse handlers
  const handlePointerDown = useCallback((e) => {
    dragging.current = true
    scrollRef.current.velocity = 0
    const y = e.touches ? e.touches[0].clientY : e.clientY
    lastPointerY.current = y
    lastPointerTime.current = performance.now()
    lastDelta.current = 0
  }, [])

  const handlePointerMove = useCallback((e) => {
    if (!dragging.current) return
    e.preventDefault()
    const y = e.touches ? e.touches[0].clientY : e.clientY
    const delta = lastPointerY.current - y
    scrollRef.current.y += delta
    lastDelta.current = delta
    lastPointerY.current = y
    lastPointerTime.current = performance.now()
  }, [])

  const handlePointerUp = useCallback(() => {
    if (!dragging.current) return
    dragging.current = false
    scrollRef.current.velocity = lastDelta.current * 0.8
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onTouchMove = (e) => handlePointerMove(e)

    el.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => el.removeEventListener('touchmove', onTouchMove)
  }, [handlePointerMove])

  useEffect(() => {
    const onMouseUp = () => handlePointerUp()
    const onMouseMove = (e) => { if (dragging.current) handlePointerMove(e) }
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('mousemove', onMouseMove)
    return () => {
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('mousemove', onMouseMove)
    }
  }, [handlePointerUp, handlePointerMove])

  // Compute visible items
  const centerIndex = Math.max(0, Math.min(
    Math.round(scrollRef.current.y / ITEM_HEIGHT),
    tracks.length - 1
  ))

  const visibleItems = []
  for (let i = centerIndex - VISIBLE_HALF; i <= centerIndex + VISIBLE_HALF; i++) {
    if (i < 0 || i >= tracks.length) continue
    const offset = i * ITEM_HEIGHT - scrollRef.current.y
    const normalized = offset / (ITEM_HEIGHT * VISIBLE_HALF)
    const clamped = Math.max(-1, Math.min(1, normalized))
    const rotateX = clamped * MAX_ROTATION
    const opacity = 1 - Math.abs(clamped) * 0.7
    const scale = 1 - Math.abs(clamped) * 0.08
    const isFocused = Math.abs(offset) < ITEM_HEIGHT / 2

    const yPos = offset - ITEM_HEIGHT / 2
    // Cosine curve for scaleX: items near center bulge wider (cylinder barrel effect)
    const scaleX = 0.85 + 0.15 * Math.cos(Math.abs(clamped) * Math.PI / 2)

    visibleItems.push({
      track: tracks[i],
      index: i,
      style: {
        transform: `translateY(${yPos}px) rotateX(${-rotateX}deg) scale(${scaleX}, ${scale})`,
        opacity: isFocused ? 1 : Math.max(0.05, opacity),
      },
      isFocused,
    })
  }

  // Focus line positions
  const focusTop = `calc(50% - ${ITEM_HEIGHT / 2}px)`
  const focusBottom = `calc(50% + ${ITEM_HEIGHT / 2}px)`

  return (
    <div
      className="scroll-wheel"
      ref={containerRef}
      onMouseDown={handlePointerDown}
      onTouchStart={handlePointerDown}
      onTouchEnd={handlePointerUp}
    >
      <div className="scroll-wheel-focus-top" style={{ top: focusTop }} />
      <div className="scroll-wheel-focus-bottom" style={{ top: focusBottom }} />
      <div className="scroll-wheel-fade-top" />
      <div className="scroll-wheel-fade-bottom" />

      <div className="scroll-wheel-viewport">
        {visibleItems.map(({ track, style, isFocused }) => (
          <div
            key={track.id}
            className={`scroll-wheel-item ${isFocused ? 'focused' : ''}`}
            style={style}
            onClick={isFocused ? () => onSelect(track.id) : undefined}
          >
            <img
              className="wheel-item-art"
              src={`/art/${artMap[track.artId]}`}
              alt=""
              loading="lazy"
              draggable={false}
            />
            <span className="wheel-item-title">{track.title}</span>
            <div className="wheel-item-rating">
              <RatingStars
                rating={ratings.getMyRating(track.id)}
                communityRating={ratings.getRating(track.id)}
                onRate={onRate ? (score) => onRate(track.id, score) : undefined}
                size="sm"
              />
            </div>
            <span className="wheel-item-plays">{playCounts ? playCounts.getCount(track.id) : 0}</span>
            <button
              className="wheel-item-play"
              onClick={(e) => { e.stopPropagation(); onSelect(track.id) }}
              aria-label="Play track"
            >
              <Play size={14} strokeWidth={2} />
            </button>
            {offlineCache && (
              <button
                className={`wheel-item-download ${offlineCache.isCached(track.id) ? 'cached' : ''} ${offlineCache.isDownloading(track.id) ? 'downloading' : ''}`}
                onClick={(e) => { e.stopPropagation(); offlineCache.downloadTrack(track) }}
                aria-label={offlineCache.isCached(track.id) ? 'Available offline' : 'Download for offline'}
              >
                {offlineCache.isCached(track.id)
                  ? <Check size={12} strokeWidth={2.5} />
                  : <Download size={12} strokeWidth={2} />
                }
              </button>
            )}
            <button
              className="wheel-item-add"
              onClick={(e) => { e.stopPropagation(); onAddToQueue(track) }}
              aria-label="Add to queue"
            >
              <Plus size={16} strokeWidth={2} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
