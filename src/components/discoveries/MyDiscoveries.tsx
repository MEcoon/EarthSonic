import { useEffect, useState } from 'react'
import { ArrowRight, Bookmark, Clock3, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getOceanRegion } from '../../data/oceanRegions'
import { oceanExpeditions } from '../../data/oceanExpeditions'
import { DISCOVERY_NOTE_LIMIT, type DiscoveriesStore } from '../../services/discoveriesStorage'
import { PageContainer } from '../layout/PageContainer'
import './MyDiscoveries.css'

type Props = {
  discoveries: DiscoveriesStore
  storageAvailable: boolean
  onSaveNote: (regionId: string, note: string) => boolean
  onDeleteNote: (regionId: string) => boolean
  onRemoveRegion: (regionId: string) => boolean
}

const formatDate = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date)
}

function SavedRegionCard({ regionId, savedAt, note, storageAvailable, onSaveNote, onDeleteNote, onRemoveRegion }: {
  regionId: string
  savedAt: string
  note: string
  storageAvailable: boolean
  onSaveNote: Props['onSaveNote']
  onDeleteNote: Props['onDeleteNote']
  onRemoveRegion: Props['onRemoveRegion']
}) {
  const region = getOceanRegion(regionId)
  const [draft, setDraft] = useState(note)
  const [feedback, setFeedback] = useState('')
  useEffect(() => setDraft(note), [note])
  if (!region) return null

  const saveNote = () => {
    const saved = onSaveNote(regionId, draft.trim())
    setFeedback(saved ? 'Personal note saved.' : 'Personal note saved for this visit.')
  }
  const deleteNote = () => {
    const saved = onDeleteNote(regionId)
    setDraft('')
    setFeedback(saved ? 'Personal note deleted.' : 'Personal note cleared for this visit.')
  }

  return <article className="discovery-region-card">
    <div className="discovery-card-heading"><div><span className="explore-section-index">{region.ocean.toUpperCase()}</span><h3>{region.name}</h3></div><span className="discovery-saved-date"><Clock3 size={14} aria-hidden="true" /> Saved {formatDate(savedAt)}</span></div>
    <p className="discovery-region-description">{region.shortDescription}</p>
    <div className="discovery-card-actions"><Link className="button button-secondary" to={`/explore?region=${encodeURIComponent(region.id)}#interactive-earth`}>Open in Explore <ArrowRight size={15} aria-hidden="true" /></Link><Link className="button button-primary" to={`/studio?${new URLSearchParams({ region: region.id, dataset: region.datasetId }).toString()}`}>Listen in Studio <ArrowRight size={15} aria-hidden="true" /></Link><button className="discovery-remove-button" type="button" onClick={() => { onRemoveRegion(regionId); setFeedback('Region removed from saved regions. Your note will remain if you save it again.') }}><Bookmark size={15} aria-hidden="true" /> Remove saved region</button></div>
    <section className="discovery-note-editor" aria-labelledby={`note-heading-${region.id}`}>
      <div className="discovery-note-title"><h4 id={`note-heading-${region.id}`}>Your personal note</h4><span>{draft.length}/{DISCOVERY_NOTE_LIMIT}</span></div>
      {note ? null : <p className="discovery-empty-note">No note saved yet. Add a personal observation or reminder.</p>}
      <label className="sr-only" htmlFor={`note-${region.id}`}>Personal note for {region.name}</label>
      <textarea id={`note-${region.id}`} maxLength={DISCOVERY_NOTE_LIMIT} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write a note for yourself…" rows={3} />
      <div className="discovery-note-actions"><button className="button button-secondary" type="button" disabled={draft.trim() === note.trim()} onClick={saveNote}>Save note</button>{note && <button className="discovery-delete-note" type="button" onClick={deleteNote}><Trash2 size={15} aria-hidden="true" /> Delete note</button>}</div>
      {feedback && <p className="discovery-feedback" role="status" aria-live="polite">{feedback}{!storageAvailable ? ' Changes may not persist after this visit.' : ''}</p>}
    </section>
  </article>
}

export function MyDiscoveries({ discoveries, storageAvailable, onSaveNote, onDeleteNote, onRemoveRegion }: Props) {
  const hasItems = discoveries.savedRegions.length > 0 || discoveries.completedExpeditions.length > 0
  return <section className="my-discoveries-section" id="my-discoveries" aria-labelledby="my-discoveries-heading">
    <PageContainer>
      <header className="explore-section-heading discoveries-heading">
        <span className="explore-section-index">03 <i /> MY DISCOVERIES</span>
        <div><h2 id="my-discoveries-heading">Keep what caught your attention.</h2><p>Your saved regions, personal notes, and completed journeys stay in this browser.</p></div>
      </header>
      <p className={`discoveries-storage-status${storageAvailable ? '' : ' is-limited'}`} role="status">{storageAvailable ? 'Saved on this device in this browser.' : 'Browser storage is unavailable. New changes are kept only for this visit.'}</p>
      {!hasItems && <div className="discoveries-empty-state"><Bookmark size={21} aria-hidden="true" /><h3>Your collection is empty</h3><p>Save a region from its information panel or complete an Ocean Expedition to start collecting discoveries.</p><a className="button button-primary" href="#interactive-earth">Explore regions <ArrowRight size={16} aria-hidden="true" /></a></div>}
      {hasItems && <div className="discoveries-content">
        <section aria-labelledby="saved-regions-heading"><div className="discoveries-subheading"><span className="explore-section-index">SAVED PLACES</span><h3 id="saved-regions-heading">Saved Regions <span>{discoveries.savedRegions.length}</span></h3></div>
          {discoveries.savedRegions.length ? <div className="discoveries-region-list">{discoveries.savedRegions.map((record) => <SavedRegionCard key={record.regionId} regionId={record.regionId} savedAt={record.savedAt} note={discoveries.notes[record.regionId] ?? ''} storageAvailable={storageAvailable} onSaveNote={onSaveNote} onDeleteNote={onDeleteNote} onRemoveRegion={onRemoveRegion} />)}</div> : <p className="discoveries-subsection-empty">No saved regions yet. Use the bookmark action in a region’s information panel.</p>}
        </section>
        <section aria-labelledby="completed-expeditions-heading"><div className="discoveries-subheading"><span className="explore-section-index">FINISHED JOURNEYS</span><h3 id="completed-expeditions-heading">Completed Expeditions <span>{discoveries.completedExpeditions.length}</span></h3></div>
          {discoveries.completedExpeditions.length ? <div className="discoveries-expedition-list">{discoveries.completedExpeditions.map((record) => {
            const expedition = oceanExpeditions.find((item) => item.id === record.expeditionId)
            const regions = record.visitedRegionIds.map((id) => getOceanRegion(id)).filter((region) => region !== undefined)
            const firstRegion = regions[0]
            return <article className="discovery-expedition-card" key={record.expeditionId}><span className="explore-section-index">{expedition?.ocean.toUpperCase() ?? 'OCEAN EXPEDITION'}</span><h4>{record.title}</h4><p>Completed {formatDate(record.completedAt)}</p><div className="discovery-visited-regions"><span>Regions visited</span><b>{regions.map((region) => region.name).join(' · ') || 'Region details unavailable'}</b></div>{firstRegion && <Link className="button button-secondary" to={`/explore?region=${encodeURIComponent(firstRegion.id)}#interactive-earth`}>Return to Explore <ArrowRight size={15} aria-hidden="true" /></Link>}</article>
          })}</div> : <p className="discoveries-subsection-empty">No completed expeditions yet. Finish an available journey to see it here.</p>}
        </section>
      </div>}
    </PageContainer>
  </section>
}
