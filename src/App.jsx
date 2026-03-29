import { useMemo, useEffect, useState, useCallback, useRef } from 'react'
import { useRoute } from './utils/router'
import { useAudioPlayer } from './hooks/useAudioPlayer'
import { useQueue } from './hooks/useQueue'
import { useRatings } from './hooks/useRatings'
import { usePlayCounts } from './hooks/usePlayCounts'
import { shuffle } from './utils/shuffle'
import { ChevronUp, ChevronDown } from 'lucide-react'
import RadioPlayer from './components/RadioPlayer'
import QueueView from './components/QueueView'
import ScrollWheel from './components/ScrollWheel'
import SearchBar from './components/SearchBar'
import SortToggle from './components/SortToggle'
import InstallPrompt from './components/InstallPrompt'
import tracks from './data/tracks.json'
import artData from './data/art.json'

export default function App() {
  const route = useRoute()
  const queue = useQueue()
  const ratings = useRatings()
  const playCounts = usePlayCounts()

  const [search, setSearch] = useState('')
  const [sortMode, setSortMode] = useState('random')
  const [drawerOpen, setDrawerOpen] = useState(true)
  const [drawerTab, setDrawerTab] = useState('browse') // 'browse' | 'queue' | 'about'
  const [shuffledTracks] = useState(() => shuffle(tracks))
  const [randomOrder, setRandomOrder] = useState(shuffledTracks)

  const artMap = useMemo(() => {
    const map = {}
    for (const art of artData) {
      map[art.id] = art.filename
    }
    return map
  }, [])

  // Stable dequeue ref so audio player doesn't re-subscribe listeners
  const dequeueRef = useRef(queue.dequeue)
  dequeueRef.current = queue.dequeue
  const stableDequeue = useCallback(() => dequeueRef.current(), [])

  const player = useAudioPlayer(tracks, stableDequeue, artMap)

  // Re-shuffle when switching back to random mode
  useEffect(() => {
    if (sortMode === 'random') {
      setRandomOrder(shuffle(tracks))
    }
  }, [sortMode])

  // Stable refs so sorting doesn't cause re-renders
  const getRatingRef = useRef(ratings.getRating)
  getRatingRef.current = ratings.getRating
  const getCountRef = useRef(playCounts.getCount)
  getCountRef.current = playCounts.getCount

  // Filtered and sorted tracks for the scroll wheel
  const filteredTracks = useMemo(() => {
    let list = sortMode === 'random' ? randomOrder : [...tracks]

    if (search) {
      const q = search.toLowerCase()
      list = list.filter(t => t.title.toLowerCase().includes(q))
    }

    if (sortMode === 'rating-desc') {
      list.sort((a, b) => (getRatingRef.current(b.id) || 0) - (getRatingRef.current(a.id) || 0))
    } else if (sortMode === 'rating-asc') {
      list.sort((a, b) => (getRatingRef.current(a.id) || 0) - (getRatingRef.current(b.id) || 0))
    } else if (sortMode === 'plays-desc') {
      list.sort((a, b) => (getCountRef.current(b.id) || 0) - (getCountRef.current(a.id) || 0))
    }

    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortMode, randomOrder, search])

  // Handle route-based track loading
  useEffect(() => {
    if (route.path === 'track' && route.params.trackId) {
      player.loadTrack(route.params.trackId, false)
    }
  }, [route.path, route.params.trackId])

  const handleSelectTrack = useCallback((trackId) => {
    player.loadTrack(trackId, true)
  }, [player.loadTrack])

  // Record play count when a track starts playing
  useEffect(() => {
    if (player.currentTrack && player.isPlaying) {
      playCounts.recordPlay(player.currentTrack.id)
    }
  }, [player.currentTrack, player.isPlaying, playCounts.recordPlay])

  const currentPlayCount = player.currentTrack
    ? playCounts.getCount(player.currentTrack.id)
    : 0

  const currentMyRating = player.currentTrack
    ? ratings.getMyRating(player.currentTrack.id)
    : 0

  const currentCommunityRating = player.currentTrack
    ? ratings.getRating(player.currentTrack.id)
    : 0

  const handleRateCurrentTrack = useCallback((score) => {
    if (player.currentTrack) {
      ratings.rate(player.currentTrack.id, score)
    }
  }, [player.currentTrack, ratings.rate])

  const handleDrawerToggle = useCallback(() => {
    setDrawerOpen(prev => !prev)
  }, [])

  const handleTabClick = useCallback((tab) => {
    if (tab === drawerTab && drawerOpen) {
      setDrawerOpen(false)
    } else {
      setDrawerTab(tab)
      setDrawerOpen(true)
    }
  }, [drawerTab, drawerOpen])

  return (
    <div className={`app ${drawerOpen ? 'drawer-expanded' : 'drawer-collapsed'}`}>
      <section className="panel-player">
        <RadioPlayer
          player={player}
          artMap={artMap}
          rating={currentMyRating}
          communityRating={currentCommunityRating}
          onRate={handleRateCurrentTrack}
          playCount={currentPlayCount}
        />
      </section>

      <section className="panel-drawer">
        <div className="drawer-tabs">
          <button className="drawer-collapse-btn" onClick={handleDrawerToggle}>
            {drawerOpen
              ? <ChevronDown size={14} strokeWidth={1} />
              : <ChevronUp size={14} strokeWidth={1} />
            }
          </button>
          <button
            className={`drawer-tab ${drawerTab === 'browse' ? 'active' : ''}`}
            onClick={() => handleTabClick('browse')}
          >
            Browse
          </button>
          <button
            className={`drawer-tab ${drawerTab === 'queue' ? 'active' : ''}`}
            onClick={() => handleTabClick('queue')}
          >
            Up Next{queue.queue.length > 0 && ` (${queue.queue.length})`}
          </button>
          <button
            className={`drawer-tab ${drawerTab === 'about' ? 'active' : ''}`}
            onClick={() => handleTabClick('about')}
          >
            About
          </button>
        </div>

        {drawerOpen && drawerTab === 'browse' && (
          <>
            <div className="browse-controls">
              <SearchBar value={search} onChange={setSearch} />
              <SortToggle mode={sortMode} onChange={setSortMode} />
            </div>
            <ScrollWheel
              tracks={filteredTracks}
              artMap={artMap}
              ratings={ratings}
              playCounts={playCounts}
              onSelect={handleSelectTrack}
              onAddToQueue={queue.add}
              onRate={ratings.rate}
            />
          </>
        )}

        {drawerOpen && drawerTab === 'queue' && (
          <QueueView
            queue={queue.queue}
            onRemove={queue.remove}
            onClear={queue.clear}
            artMap={artMap}
          />
        )}

        {drawerOpen && drawerTab === 'about' && (
          <div className="about-panel">
            <p>These are all original tracks made between 2019 and 2025 by Van, with a couple collabs with Josie. Everything is original, made mostly while cracking up imagining how others would receive these batshit tracks with a mixture of nonsense and real lyrics and psycho beats. All artwork is Van original as well. Everything was made without a hint of AI.</p>
            <p>Van hasn't been making music or visual art since AI generation hit the world… Maybe he should get back to it?</p>
            <p>Thanks for listening and reach out if you want via the submission form at <a href="https://wanderingwojo.com" target="_blank" rel="noopener noreferrer">wanderingwojo.com</a></p>
            <div className="about-donate">
              <p className="about-donate-label">Buy Van a coffee</p>
              <div className="about-kofi-wrap">
                <iframe
                  src="https://ko-fi.com/wanderingwojo/?hidefeed=true&widget=true&embed=true&preview=true"
                  style={{ border: 'none', width: '100%', background: 'transparent' }}
                  height="712"
                  title="Support on Ko-fi"
                />
              </div>
            </div>
          </div>
        )}
      </section>
      <InstallPrompt />
    </div>
  )
}
