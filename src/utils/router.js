import { useState, useEffect } from 'react'

export function parseRoute() {
  const hash = window.location.hash.replace(/^#\/?/, '')
  if (!hash) return { path: 'radio', params: {} }

  const parts = hash.split('/')

  if (parts[0] === 'track' && parts[1]) {
    return { path: 'track', params: { trackId: parts[1] } }
  }
  if (parts[0] === 'browse') {
    return { path: 'browse', params: {} }
  }
  if (parts[0] === 'playlist' && parts[1]) {
    return { path: 'playlist', params: { playlistId: parts[1] } }
  }

  return { path: 'radio', params: {} }
}

export function navigate(hash) {
  window.location.hash = hash
}

export function useRoute() {
  const [route, setRoute] = useState(parseRoute)

  useEffect(() => {
    const onChange = () => setRoute(parseRoute())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return route
}
