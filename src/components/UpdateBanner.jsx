import { useState, useEffect } from 'react'

export default function UpdateBanner() {
  const [showUpdate, setShowUpdate] = useState(false)
  const [waitingWorker, setWaitingWorker] = useState(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || window.location.hostname === 'localhost') return

    navigator.serviceWorker.register('/sw.js').then((registration) => {
      // Check for waiting worker on load
      if (registration.waiting) {
        setWaitingWorker(registration.waiting)
        setShowUpdate(true)
      }

      // Listen for new worker installing
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (!newWorker) return

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setWaitingWorker(newWorker)
            setShowUpdate(true)
          }
        })
      })
    })

    // Reload when the new worker takes over
    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true
        window.location.reload()
      }
    })
  }, [])

  function handleUpdate() {
    if (waitingWorker) {
      waitingWorker.postMessage('skipWaiting')
    }
  }

  if (!showUpdate) return null

  return (
    <div className="update-banner" onClick={handleUpdate}>
      New version available — tap to refresh
    </div>
  )
}
