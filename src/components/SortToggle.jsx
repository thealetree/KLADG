import { Shuffle, ArrowUpNarrowWide, ArrowDownWideNarrow, Headphones } from 'lucide-react'

export default function SortToggle({ mode, onChange }) {
  return (
    <div className="sort-toggle">
      <button
        className={mode === 'random' ? 'active' : ''}
        onClick={() => onChange('random')}
      >
        <Shuffle size={13} strokeWidth={1} />
        Random
      </button>
      <button
        className={mode === 'rating-desc' ? 'active' : ''}
        onClick={() => onChange('rating-desc')}
      >
        <ArrowDownWideNarrow size={13} strokeWidth={1} />
        Top
      </button>
      <button
        className={mode === 'rating-asc' ? 'active' : ''}
        onClick={() => onChange('rating-asc')}
      >
        <ArrowUpNarrowWide size={13} strokeWidth={1} />
        Lowest
      </button>
      <button
        className={mode === 'plays-desc' ? 'active' : ''}
        onClick={() => onChange('plays-desc')}
      >
        <Headphones size={13} strokeWidth={1} />
        Played
      </button>
    </div>
  )
}
