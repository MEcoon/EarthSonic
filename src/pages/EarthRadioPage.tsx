import { useMemo, useRef, useState, type FormEvent } from 'react'
import { ArrowRight, ArrowUpRight, Heart, ListPlus, Pause, Play, SkipBack, SkipForward, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DatasetAudioSource, type DatasetAudioHandle } from '../audio/DatasetAudioSource'
import { useSonification } from '../audio/SonificationContext'
import { radioCategories, radioStations, unavailableRadioCategories } from '../data/radioStations'
import { PageContainer } from '../components/layout/PageContainer'
import { SectionHeader } from '../components/ui/SectionHeader'

type Playlist = { id: string; name: string; stationIds: string[] }
const FAVORITES_KEY = 'earthsonic.radio.favorites.v1'
const PLAYLISTS_KEY = 'earthsonic.radio.playlists.v1'
const safeRead = <T,>(key: string, fallback: T): T => {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback } catch { return fallback }
}
const fmtTime = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`

export function EarthRadioPage() {
  const [category, setCategory] = useState<string>('all')
  const [selectedId, setSelectedId] = useState<string>(radioStations[0].id)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [statusMessage, setStatusMessage] = useState('Loading the NASA source video and first frame…')
  const [loadSelected, setLoadSelected] = useState(false)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)
  const [favorites, setFavorites] = useState<string[]>(() => safeRead(FAVORITES_KEY, []))
  const [playlists, setPlaylists] = useState<Playlist[]>(() => safeRead(PLAYLISTS_KEY, [{ id: 'field-notes', name: 'Planet field notes', stationIds: [] }]))
  const [playlistId, setPlaylistId] = useState(() => safeRead<Playlist[]>(PLAYLISTS_KEY, [{ id: 'field-notes', name: 'Planet field notes', stationIds: [] }])[0]?.id ?? 'field-notes')
  const [playlistName, setPlaylistName] = useState('')
  const [notice, setNotice] = useState('')
  const sourceRef = useRef<DatasetAudioHandle>(null)
  const { isPlaying, trackTitle, pause, volume, setVolume } = useSonification()
  const selected = radioStations.find((station) => station.id === selectedId) ?? radioStations[0]
  const isSelectedPlaying = isPlaying && trackTitle === selected.title
  const availableStations = useMemo(() => category === 'all' ? [...radioStations] : radioStations.filter((station) => station.category === category), [category])
  const emptyCategory = unavailableRadioCategories.find((item) => item.id === category)

  const selectStation = async (id: string) => {
    if (isPlaying) { await sourceRef.current?.pause(); await pause() }
    setSelectedId(id)
    setLoadSelected(false)
    setPosition(0); setDuration(0); setStatus('loading'); setStatusMessage('Loading the NASA source video and first frame…'); setNotice('')
  }
  const playSelected = async () => {
    if (!sourceRef.current?.ready) { setNotice('The first NASA video frame is still loading. Playback will be available when sampling is ready.'); return }
    try { await sourceRef.current.play(selected.title); setNotice('Sonification is playing from sampled NASA video frames.') }
    catch { setStatus('error'); setStatusMessage('Audio or NASA media playback could not start in this browser.') }
  }
  const skip = async (direction: -1 | 1) => {
    const list = availableStations.length ? availableStations : [...radioStations]
    const index = Math.max(0, list.findIndex((station) => station.id === selected.id))
    const next = list[(index + direction + list.length) % list.length]
    await selectStation(next.id)
  }
  const toggleFavorite = () => {
    const next = favorites.includes(selected.id) ? favorites.filter((id) => id !== selected.id) : [...favorites, selected.id]
    setFavorites(next); localStorage.setItem(FAVORITES_KEY, JSON.stringify(next))
    setNotice(next.includes(selected.id) ? 'Added to favorites.' : 'Removed from favorites.')
  }
  const createPlaylist = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = playlistName.trim()
    if (!name) return
    const next = [...playlists, { id: `playlist-${Date.now()}`, name, stationIds: [] }]
    setPlaylists(next); setPlaylistId(next[next.length - 1].id); setPlaylistName('')
    localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(next)); setNotice(`Created “${name}”.`)
  }
  const addToPlaylist = () => {
    const next = playlists.map((playlist) => playlist.id === playlistId && !playlist.stationIds.includes(selected.id) ? { ...playlist, stationIds: [...playlist.stationIds, selected.id] } : playlist)
    setPlaylists(next); localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(next)); setNotice(`Saved “${selected.title}” to your playlist.`)
  }

  return <PageContainer className="radio-page">
    <header className="radio-hero"><div><span className="eyebrow">NASA VISUALIZATIONS · GENERATED AUDIO</span><h1>Earth Radio</h1><p>Continuous listening, grounded in NASA visualization frames. Each station explains its data source and how the sound is mapped.</p></div><div className="radio-signal" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div></header>

    <div className="radio-categories" role="group" aria-label="Radio categories">{radioCategories.map((item) => <button key={item.id} className={category === item.id ? 'active' : ''} onClick={() => setCategory(item.id)} aria-pressed={category === item.id}>{item.label}{item.id !== 'all' && !unavailableRadioCategories.some((entry) => entry.id === item.id) && <span>{radioStations.filter((station) => station.category === item.id).length || ''}</span>}</button>)}</div>

    {emptyCategory ? <section className="radio-unavailable"><span className="eyebrow">STATION NOT CONNECTED</span><h2>{emptyCategory.id}</h2><p>{emptyCategory.note} EarthSonic will only activate a station after it has a verified dataset and an explained sound mapping.</p><Link to="/explore" className="text-link">Browse available NASA stories <ArrowRight size={15} /></Link></section> : <>
      <section className="radio-station-grid" aria-label="Available radio stations">{availableStations.map((station) => <button key={station.id} className={`radio-station ${station.id === selectedId ? 'selected' : ''}`} onClick={() => void selectStation(station.id)} aria-pressed={station.id === selectedId}>
        <span className={`radio-cover cover-${station.accent}`}><img src={station.dataset.previewImage} alt="" loading="lazy" /><span className="cover-mark"><Sparkles size={17} /></span><small>{station.category.toUpperCase()}</small></span>
        <span className="radio-card-copy"><span className="eyebrow">{station.dataset.temporalCoverage.label}</span><b>{station.title}</b><span>{station.description}</span><span className="radio-card-source">{station.dataset.attribution}</span></span>
      </button>)}</section>

      <section className="radio-player-panel" aria-label="Selected Earth Radio station">
        <DatasetAudioSource key={selected.id} ref={sourceRef} dataset={selected.dataset} loop shouldLoad={loadSelected} onStatus={(next, message) => { setStatus(next); setStatusMessage(message ?? (next === 'ready' ? 'NASA frame sampling is ready.' : 'Loading the NASA source video and first frame…')) }} onProgress={(time, total) => { setPosition(time); if (total) setDuration(total) }} />
        <div className={`radio-cover radio-player-cover cover-${selected.accent}`}><img src={selected.dataset.previewImage} alt="" /><span className="cover-mark"><Sparkles size={19} /></span></div>
        <div className="radio-player-main"><span className="eyebrow">{selected.category.toUpperCase()} · {!loadSelected ? 'STANDBY' : status === 'ready' ? 'READY TO PLAY' : status.toUpperCase()}</span><h2>{selected.title}</h2><p>{selected.description}</p>
          <div className="radio-trackline"><span>{fmtTime(position)}</span><input type="range" min="0" max={duration || 1} value={Math.min(position, duration || 1)} onChange={(event) => { const time = Number(event.target.value); sourceRef.current?.seek(time); setPosition(time) }} aria-label="Radio position" disabled={!duration} /><span>{duration ? fmtTime(duration) : '—:—'}</span></div>
          <div className="radio-player-actions"><button className="radio-icon-action" onClick={() => void skip(-1)} aria-label="Previous station"><SkipBack size={16} /></button>{!loadSelected ? <button className="radio-play-action prepare-radio" onClick={() => setLoadSelected(true)} aria-label="Load NASA frames for this station">LOAD</button> : status === 'error' ? <button className="radio-play-action prepare-radio" onClick={() => sourceRef.current?.load()} aria-label="Retry loading NASA frames">↻</button> : <button className="radio-play-action" onClick={() => void (isSelectedPlaying ? sourceRef.current?.pause() : playSelected())} disabled={status !== 'ready'} aria-label={isSelectedPlaying ? 'Pause station' : 'Play station'}>{isSelectedPlaying ? <Pause size={17} /> : <Play size={17} />}</button>}<button className="radio-icon-action" onClick={() => void skip(1)} aria-label="Next station"><SkipForward size={16} /></button><label className="radio-volume"><span className="eyebrow">VOLUME</span><input type="range" min="0" max="1" step="0.01" value={volume} onChange={(event) => setVolume(Number(event.target.value))} aria-label="Radio volume" /></label><span className="radio-status" role="status">{loadSelected ? statusMessage : 'Load frames from the selected NASA source to begin.'}</span></div>
          <div className="radio-metadata"><span>PIXEL-BASED MAPPING</span><span>{selected.dataset.temporalCoverage.label}</span><a href={selected.dataset.sourceUrl} target="_blank" rel="noreferrer">NASA source <ArrowUpRight size={13} /></a><Link to={`/studio?story=${selected.dataset.id}`}>Open scientific experience <ArrowRight size={13} /></Link></div>
        </div>
        <div className="radio-save-actions"><button onClick={toggleFavorite} aria-pressed={favorites.includes(selected.id)} className={favorites.includes(selected.id) ? 'is-favorite' : ''}><Heart size={15} fill={favorites.includes(selected.id) ? 'currentColor' : 'none'} />{favorites.includes(selected.id) ? 'Favorite' : 'Add favorite'}</button><button onClick={addToPlaylist}><ListPlus size={15} />Add to playlist</button></div>
      </section>
      {notice && <p className="radio-notice" role="status">{notice}</p>}

      <section className="playlist-section">
        <div><SectionHeader eyebrow="YOUR LIBRARY">Saved for later.</SectionHeader><p className="playlist-description">Favorites and playlists are stored in this browser only.</p></div>
        <div className="playlist-controls"><label><span className="eyebrow">PLAYLIST</span><select value={playlistId} onChange={(event) => setPlaylistId(event.target.value)}>{playlists.map((playlist) => <option key={playlist.id} value={playlist.id}>{playlist.name}</option>)}</select></label><form onSubmit={createPlaylist}><label className="sr-only" htmlFor="new-playlist">New playlist name</label><input id="new-playlist" value={playlistName} onChange={(event) => setPlaylistName(event.target.value)} placeholder="Create a playlist" /><button type="submit">Create</button></form></div>
        <div className="saved-stations"><div><b>Favorites</b><span>{favorites.length} saved</span>{favorites.map((id) => { const station = radioStations.find((item) => item.id === id); return station ? <button key={id} onClick={() => { setCategory('all'); void selectStation(id) }}>{station.title}</button> : null })}</div><div><b>{playlists.find((playlist) => playlist.id === playlistId)?.name ?? 'Playlist'}</b><span>{playlists.find((playlist) => playlist.id === playlistId)?.stationIds.length ?? 0} tracks</span>{(playlists.find((playlist) => playlist.id === playlistId)?.stationIds ?? []).map((id) => { const station = radioStations.find((item) => item.id === id); return station ? <button key={id} onClick={() => { setCategory('all'); void selectStation(id) }}>{station.title}</button> : null })}</div></div>
      </section>
    </>}
  </PageContainer>
}
