import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'kladg-ratings'

function loadRatings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}
  } catch {
    return {}
  }
}

export function useRatings() {
  const [ratings, setRatings] = useState(loadRatings)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ratings))
  }, [ratings])

  const getRating = useCallback((trackId) => {
    return ratings[trackId] || 0
  }, [ratings])

  const rate = useCallback((trackId, score) => {
    setRatings(prev => {
      const next = { ...prev }
      if (score === 0) {
        delete next[trackId]
      } else {
        next[trackId] = score
      }
      return next
    })
  }, [])

  return { ratings, getRating, rate }
}
