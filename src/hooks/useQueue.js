import { useState, useCallback, useRef } from 'react'

export function useQueue() {
  const [queue, setQueue] = useState([])
  const queueRef = useRef(queue)
  queueRef.current = queue

  const add = useCallback((track) => {
    setQueue(prev => {
      if (prev.some(t => t.id === track.id)) return prev
      return [...prev, track]
    })
  }, [])

  const remove = useCallback((trackId) => {
    setQueue(prev => prev.filter(t => t.id !== trackId))
  }, [])

  const dequeue = useCallback(() => {
    const current = queueRef.current
    if (current.length === 0) return null
    const first = current[0]
    setQueue(prev => prev.slice(1))
    return first
  }, [])

  const clear = useCallback(() => {
    setQueue([])
  }, [])

  return { queue, add, remove, dequeue, clear }
}
