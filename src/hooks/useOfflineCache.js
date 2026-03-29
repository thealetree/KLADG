import { useState, useEffect, useCallback } from 'react'

const CACHE_NAME = 'kladg-v1'

export function useOfflineCache(tracks, artMap) {
  const [cached, setCached] = useState(new Set())
  const [downloading, setDownloading] = useState(new Set())

  // Check which tracks are already cached on mount
  useEffect(() => {
    if (!('caches' in window) || window.location.hostname === 'localhost') return

    caches.open(CACHE_NAME).then(async (cache) => {
      const keys = await cache.keys()
      const urls = new Set(keys.map(r => new URL(r.url).pathname))
      const cachedIds = new Set()

      for (const track of tracks) {
        const musicUrl = track.localUrl
        if (urls.has(musicUrl)) {
          cachedIds.add(track.id)
        }
      }

      setCached(cachedIds)
    })
  }, [tracks])

  const downloadTrack = useCallback(async (track) => {
    if (!('caches' in window)) return
    if (cached.has(track.id) || downloading.has(track.id)) return

    setDownloading(prev => new Set(prev).add(track.id))

    try {
      const cache = await caches.open(CACHE_NAME)
      const urls = [track.localUrl]

      // Also cache the artwork
      const artFile = artMap[track.artId]
      if (artFile) urls.push(`/art/${artFile}`)

      await Promise.all(urls.map(url => cache.add(url).catch(() => {})))

      setCached(prev => new Set(prev).add(track.id))
    } catch (_) {}

    setDownloading(prev => {
      const next = new Set(prev)
      next.delete(track.id)
      return next
    })
  }, [cached, downloading, artMap])

  const isCached = useCallback((trackId) => cached.has(trackId), [cached])
  const isDownloading = useCallback((trackId) => downloading.has(trackId), [downloading])

  const downloadAll = useCallback(async (trackList) => {
    if (!('caches' in window)) return
    for (const track of trackList) {
      if (!cached.has(track.id) && !downloading.has(track.id)) {
        await downloadTrack(track)
      }
    }
  }, [cached, downloading, downloadTrack])

  return { isCached, isDownloading, downloadTrack, downloadAll }
}
