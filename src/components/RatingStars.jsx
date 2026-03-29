import { Star } from 'lucide-react'

export default function RatingStars({ rating = 0, communityRating = 0, onRate, size = 'md' }) {
  const iconSize = size === 'sm' ? 12 : 16
  const isInteractive = typeof onRate === 'function'

  return (
    <div className={`rating-stars ${size === 'sm' ? 'rating-stars-sm' : ''}`}>
      {[1, 2, 3, 4, 5].map(n => {
        const isMyRating = n <= rating
        const isCommunity = n <= communityRating && !isMyRating

        const fill = isMyRating ? '#fff' : isCommunity ? 'rgba(255,255,255,0.3)' : 'none'
        const stroke = isMyRating ? '#fff' : isCommunity ? 'rgba(255,255,255,0.3)' : undefined

        return isInteractive ? (
          <button
            key={n}
            onClick={(e) => {
              e.stopPropagation()
              onRate(n === rating ? 0 : n)
            }}
            aria-label={`Rate ${n}`}
          >
            <Star size={iconSize} strokeWidth={1} fill={fill} stroke={stroke} />
          </button>
        ) : (
          <span key={n} style={{ display: 'flex' }}>
            <Star size={iconSize} strokeWidth={1} fill={fill} stroke={stroke} />
          </span>
        )
      })}
    </div>
  )
}
