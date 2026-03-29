import { Search, X } from 'lucide-react'

export default function SearchBar({ value, onChange }) {
  return (
    <div className="search-bar">
      <Search size={14} strokeWidth={1} className="search-bar-icon" />
      <input
        type="text"
        placeholder="Search tracks..."
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      {value && (
        <button className="search-bar-clear" onClick={() => onChange('')} aria-label="Clear search">
          <X size={14} strokeWidth={1} />
        </button>
      )}
    </div>
  )
}
