import { ArrowUpRight, Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSonification } from './SonificationContext'

export function GlobalAudioPlayer() {
  const { hasTrack, isPlaying, muted, volume, trackTitle, start, pause, toggleMute, setVolume } = useSonification()
  if (!hasTrack) return null
  return <aside className="global-audio-player" aria-label="EarthSonic mini player">
    <div className="mini-track-mark" aria-hidden="true">≈</div>
    <div className="mini-track-info"><span className="eyebrow">{isPlaying ? 'NOW LISTENING' : 'PAUSED'}</span><b>{trackTitle}</b></div>
    <button className="mini-transport" aria-label={isPlaying ? 'Pause sonification' : 'Resume sonification'} onClick={() => { void (isPlaying ? pause() : start()) }}>{isPlaying ? <Pause size={16} /> : <Play size={16} />}</button>
    <button className="mini-mute" aria-label={muted ? 'Unmute sonification' : 'Mute sonification'} onClick={toggleMute}>{muted ? <VolumeX size={16} /> : <Volume2 size={16} />}</button>
    <label className="mini-volume"><span className="sr-only">Sonification volume</span><input type="range" min="0" max="1" step="0.01" value={volume} onChange={(event) => setVolume(Number(event.target.value))} /></label>
    <Link className="mini-open" to="/studio" aria-label="Open Sonification Studio">Studio <ArrowUpRight size={14} /></Link>
  </aside>
}
