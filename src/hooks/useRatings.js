import { useState, useEffect, useCallback, useRef } from 'react'

const DB_URL = 'https://kladg-a4063-default-rtdb.firebaseio.com'
const VISITOR_KEY = 'kladg-visitor-id'
const LOCAL_RATINGS_KEY = 'kladg-my-ratings'

function getVisitorId() {
  let id = localStorage.getItem(VISITOR_KEY)
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem(VISITOR_KEY, id)
  }
  return id
}

function loadLocalRatings() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_RATINGS_KEY)) || {}
  } catch {
    return {}
  }
}

export function useRatings() {
  const visitorId = useRef(getVisitorId()).current
  const [myRatings, setMyRatings] = useState(loadLocalRatings)
  const [averages, setAverages] = useState({}) // { trackId: { avg, count } }

  // Persist own ratings locally
  useEffect(() => {
    localStorage.setItem(LOCAL_RATINGS_KEY, JSON.stringify(myRatings))
  }, [myRatings])

  // Fetch all ratings on mount
  useEffect(() => {
    fetch(`${DB_URL}/ratings.json`)
      .then(r => r.json())
      .then(data => {
        if (!data) return
        const avgs = {}
        for (const [trackId, voters] of Object.entries(data)) {
          const scores = Object.values(voters).filter(v => typeof v === 'number')
          if (scores.length > 0) {
            avgs[trackId] = {
              avg: scores.reduce((a, b) => a + b, 0) / scores.length,
              count: scores.length,
            }
          }
        }
        setAverages(avgs)
      })
      .catch(() => {})
  }, [])

  const getRating = useCallback((trackId) => {
    // Show average rating, fall back to user's own if no data yet
    if (averages[trackId]) return Math.round(averages[trackId].avg)
    return myRatings[trackId] || 0
  }, [averages, myRatings])

  const getMyRating = useCallback((trackId) => {
    return myRatings[trackId] || 0
  }, [myRatings])

  const rate = useCallback((trackId, score) => {
    // Update local state immediately
    setMyRatings(prev => {
      const next = { ...prev }
      if (score === 0) {
        delete next[trackId]
      } else {
        next[trackId] = score
      }
      return next
    })

    // Update average optimistically
    setAverages(prev => {
      const existing = prev[trackId]
      if (score === 0) return prev
      if (existing) {
        // Rough optimistic update
        const newCount = existing.count + 1
        const newAvg = (existing.avg * existing.count + score) / newCount
        return { ...prev, [trackId]: { avg: newAvg, count: newCount } }
      }
      return { ...prev, [trackId]: { avg: score, count: 1 } }
    })

    // Sync to Firebase
    if (score === 0) {
      fetch(`${DB_URL}/ratings/${trackId}/${visitorId}.json`, { method: 'DELETE' }).catch(() => {})
    } else {
      fetch(`${DB_URL}/ratings/${trackId}/${visitorId}.json`, {
        method: 'PUT',
        body: JSON.stringify(score),
      }).catch(() => {})
    }
  }, [visitorId])

  return { ratings: myRatings, getRating, getMyRating, rate }
}
