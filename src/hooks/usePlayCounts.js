import { useState, useEffect, useCallback, useRef } from 'react'

const DB_URL = 'https://kladg-a4063-default-rtdb.firebaseio.com'

export function usePlayCounts() {
  const [counts, setCounts] = useState({})
  const recordedRef = useRef(new Set())

  // Fetch all play counts on mount
  useEffect(() => {
    fetch(`${DB_URL}/plays.json`)
      .then(r => r.json())
      .then(data => {
        if (data) setCounts(data)
      })
      .catch(() => {})
  }, [])

  const recordPlay = useCallback((trackId) => {
    if (!trackId || recordedRef.current.has(trackId)) return
    recordedRef.current.add(trackId)

    // Optimistic update
    setCounts(prev => ({ ...prev, [trackId]: (prev[trackId] || 0) + 1 }))

    // Increment in Firebase using a transaction-like approach
    fetch(`${DB_URL}/plays/${trackId}.json`)
      .then(r => r.json())
      .then(current => {
        const newCount = (current || 0) + 1
        return fetch(`${DB_URL}/plays/${trackId}.json`, {
          method: 'PUT',
          body: JSON.stringify(newCount),
        })
      })
      .catch(() => {})
  }, [])

  const getCount = useCallback((trackId) => {
    return counts[trackId] || 0
  }, [counts])

  return { counts, getCount, recordPlay }
}
