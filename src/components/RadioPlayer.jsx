import { useRef, useState } from 'react'
import { SkipBack, Play, Pause, SkipForward, Share2 } from 'lucide-react'
import RatingStars from './RatingStars'

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function RadioPlayer({ player, artMap, rating, communityRating, onRate }) {
  const progressRef = useRef(null)
  const [copied, setCopied] = useState(false)
  const { currentTrack, isPlaying, currentTime, duration, toggle, skipNext, skipPrev, seek } = player

  if (!currentTrack) return null

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const artFilename = artMap[currentTrack.artId]

  function handleShare() {
    const url = `${window.location.origin}/#/track/${currentTrack.id}`
    if (navigator.share) {
      navigator.share({ title: currentTrack.title, text: `Listen to "${currentTrack.title}" on KLADG Radio`, url })
    } else {
      navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function handleProgressClick(e) {
    const rect = progressRef.current.getBoundingClientRect()
    const fraction = (e.clientX - rect.left) / rect.width
    seek(Math.max(0, Math.min(fraction * duration, duration)))
  }

  return (
    <div className="radio-player">
      <h1 className="radio-header">KLADG RADIO</h1>

      {artFilename && (
        <div className="radio-art-wrap">
          <img
            className="radio-art"
            src={`/art/${artFilename}`}
            alt=""
            draggable={false}
          />
        </div>
      )}

      <div className="radio-controls">
        <p className="radio-title">{currentTrack.title}</p>

        <div className="radio-rating-row">
          <RatingStars
            rating={rating}
            communityRating={communityRating}
            onRate={onRate}
          />
        </div>

        <div className="radio-transport">
          <button onClick={skipPrev} aria-label="Previous">
            <SkipBack size={22} strokeWidth={1} />
          </button>
          <button onClick={toggle} aria-label={isPlaying ? 'Pause' : 'Play'} className="radio-play-btn">
            {isPlaying
              ? <Pause size={32} strokeWidth={1} />
              : <Play size={32} strokeWidth={1} />
            }
          </button>
          <button onClick={skipNext} aria-label="Next">
            <SkipForward size={22} strokeWidth={1} />
          </button>
        </div>

        <div className="radio-progress" ref={progressRef} onClick={handleProgressClick}>
          <div className="radio-progress-track" />
          <div className="radio-progress-fill" style={{ width: `${progress}%` }} />
          <div className="radio-progress-dot" style={{ left: `${progress}%` }} />
        </div>

        <div className="radio-time">
          <span className="tabular">{formatTime(currentTime)}</span>
          <span className="tabular">{formatTime(duration)}</span>
        </div>

        <button className="radio-share-btn" onClick={handleShare} aria-label="Share">
          <Share2 size={12} strokeWidth={1} />
          <span>{copied ? 'URL COPIED TO CLIPBOARD!' : 'SHARE THIS TRACK'}</span>
        </button>
      </div>
    </div>
  )
}
