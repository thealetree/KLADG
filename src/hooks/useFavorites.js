import { useState, useCallback } from 'react'

const STORAGE_KEY = 'kladg-favorites'

function loadFavorites() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? new Set(JSON.parse(data)) : new Set()
  } catch {
    return new Set()
  }
}

function saveFavorites(set) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]))
}

export function useFavorites() {
  const [favorites, setFavorites] = useState(loadFavorites)

  const toggle = useCallback((trackId) => {
    setFavorites(prev => {
      const next = new Set(prev)
      if (next.has(trackId)) {
        next.delete(trackId)
      } else {
        next.add(trackId)
      }
      saveFavorites(next)
      return next
    })
  }, [])

  const isFavorite = useCallback((trackId) => favorites.has(trackId), [favorites])

  return { favorites, toggle, isFavorite }
}
