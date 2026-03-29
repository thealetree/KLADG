import { useState, useEffect } from 'react'

function isIOSSafari() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS|Chrome/.test(ua)
  return isIOS && isSafari
}

function isStandalone() {
  if (typeof window === 'undefined') return false
  return window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches
}

function wasDismissed() {
  try {
    return localStorage.getItem('kladg-install-dismissed') === 'true'
  } catch {
    return false
  }
}

export default function InstallPrompt() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isIOSSafari() && !isStandalone() && !wasDismissed()) {
      setVisible(true)
    }
  }, [])

  function handleDismiss() {
    try {
      localStorage.setItem('kladg-install-dismissed', 'true')
    } catch { /* ignore */ }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="install-prompt-backdrop" onClick={handleDismiss}>
      <div className="install-prompt" onClick={(e) => e.stopPropagation()}>
        <p className="install-prompt-title">
          Add KLADG Radio to your home screen to keep music playing when your phone sleeps
        </p>
        <p className="install-prompt-instructions">
          Tap the <span className="install-prompt-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7"/>
              <polyline points="16 6 12 2 8 6"/>
              <line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
          </span> share button, then <strong>&ldquo;Add to Home Screen&rdquo;</strong>
        </p>
        <button className="install-prompt-dismiss" onClick={handleDismiss}>
          Got it
        </button>
      </div>
    </div>
  )
}
