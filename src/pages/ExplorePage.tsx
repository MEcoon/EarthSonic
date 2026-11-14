import { useMemo, useState } from 'react'
import { ArrowRight, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EarthGlobe } from '../components/earth/EarthGlobe'
import { ExperienceCard } from '../components/earth/ExperienceCard'
import { PageContainer } from '../components/layout/PageContainer'
import { SectionHeader } from '../components/ui/SectionHeader'
import { experiences, type EarthExperience } from '../data/experiences'

export function ExplorePage() {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<EarthExperience>(experiences[0])
  const filtered = useMemo(() => experiences.filter((story) =>
    `${story.title} ${story.category} ${story.description}`.toLowerCase().includes(query.toLowerCase())
  ), [query])

  return <>
    <PageContainer className="explore-hero"><div><span className="eyebrow">NASA SVS #3912 · OCEAN CURRENTS & TEMPERATURE</span><h1>Listen to the<br /><span>moving ocean.</span></h1><p>Explore one NASA visualization of ECCO2 surface-current flows colored by sea surface temperature. Its sound is derived from rendered video features.</p></div><div className="explore-coordinates"><span>NASA SVS · 3912</span><span>VIEW · LISTEN · LEARN</span></div></PageContainer>
    <PageContainer className="globe-section"><div className="globe-intro"><SectionHeader eyebrow="INTERACTIVE EARTH">Choose a region to explore.</SectionHeader><p>Rotate the globe or select a highlighted region. Markers open a relevant story; they do not indicate local data values.</p></div><EarthGlobe /></PageContainer>
    <PageContainer className="gallery-section">
      <div className="gallery-header"><SectionHeader eyebrow="NASA SVS #3912 · OCEAN VISUALIZATION">Explore the ocean story.</SectionHeader><div className="gallery-tools"><label className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search this visualization" aria-label="Search this visualization" /></label></div></div>
      <div className="experience-grid">{filtered.map((experience) => <ExperienceCard key={experience.id} experience={experience} onSelect={setSelected} selected={selected.id === experience.id} />)}</div>
      {filtered.length === 0 && <div className="empty-state"><span className="eyebrow">NO MATCHING STORIES</span><p>Try another search or choose a different Earth system.</p></div>}
      <aside className="selected-experience"><img src={selected.image} alt="" /><div><span className="eyebrow">SELECTED EXPERIENCE · {selected.category.toUpperCase()}</span><h3>{selected.title}</h3><p>{selected.context}</p><div className="source-row"><span>{selected.dateRange}</span><span>{selected.credit}</span><a href={selected.source} target="_blank" rel="noreferrer">NASA SVS source <ArrowRight size={14} /></a></div></div><Link className="button button-primary" to={`/studio?story=${selected.id}`}>Open in Studio <ArrowRight size={16} /></Link></aside>
    </PageContainer>
  </>
}
