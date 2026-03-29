import { Trash2, X } from 'lucide-react'

export default function QueueView({ queue, onRemove, onClear, artMap }) {
  return (
    <div className="queue-panel">
      {queue.length > 0 && (
        <div className="queue-header">
          <span className="queue-header-label">{queue.length} track{queue.length !== 1 ? 's' : ''} queued</span>
          <div className="queue-header-actions">
            <button onClick={onClear} aria-label="Clear queue">
              <Trash2 size={14} strokeWidth={1} />
            </button>
          </div>
        </div>
      )}

      {queue.length === 0 ? (
        <p className="queue-empty">Nothing queued — add tracks from Browse</p>
      ) : (
        <div className="queue-list-full">
          {queue.map(track => (
            <div key={track.id} className="queue-item">
              <img
                className="queue-item-art"
                src={`/art/${artMap[track.artId]}`}
                alt=""
                loading="lazy"
              />
              <span className="queue-item-title">{track.title}</span>
              <button onClick={() => onRemove(track.id)} aria-label="Remove">
                <X size={14} strokeWidth={1} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
