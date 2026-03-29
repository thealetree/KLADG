export function shuffle(array) {
  const a = [...array]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function pickRandom(tracks, history, maxSize = Infinity) {
  const historySet = new Set(history)
  let pool = tracks.filter(t => !historySet.has(t.id))

  if (pool.length === 0) {
    history.length = 0
    pool = tracks
  }

  const track = pool[Math.floor(Math.random() * pool.length)]
  history.push(track.id)

  if (history.length > maxSize) {
    history.splice(0, history.length - maxSize)
  }

  return track
}
