import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { EarthExperience } from '../../data/experiences'

const USAGE_KEY = 'earthsonic.explore.openCounts.v1'

function recordOpen(id: string) {
  try {
    const counts = JSON.parse(localStorage.getItem(USAGE_KEY) ?? '{}') as Record<string, number>
    counts[id] = (Number(counts[id]) || 0) + 1
    localStorage.setItem(USAGE_KEY, JSON.stringify(counts))
  } catch { /* Opening the experience still works if local storage is unavailable. */ }
}

export function ExperienceCard({ experience, onSelect, selected = false }: { experience: EarthExperience; onSelect?: (experience: EarthExperience) => void; selected?: boolean }) {
  return <article className={`experience-card ${selected ? 'is-selected' : ''}`}>
    <div className="experience-image"><img src={experience.image} alt={experience.imageAlt} loading="lazy" /><span className="experience-category">{experience.category}</span></div>
    <div className="experience-card-copy">
      <div className="experience-meta"><span>{experience.dateRange}</span><span>{experience.credit}</span></div>
      <h3>{experience.title}</h3>
      <p>{experience.description}</p>
      <div className="experience-card-actions">
        {onSelect && <button className="experience-select" onClick={() => onSelect(experience)} aria-pressed={selected}>{selected ? 'Selected' : 'Select story'}</button>}
        <Link className="experience-open" to={`/studio?story=${encodeURIComponent(experience.id)}`} onClick={() => recordOpen(experience.id)}>Open experience <ArrowRight size={14} /></Link>
        <a className="experience-source" href={experience.source} target="_blank" rel="noreferrer" aria-label={`Open NASA source for ${experience.title}`}>NASA source <ArrowUpRight size={13} /></a>
      </div>
    </div>
  </article>
}
