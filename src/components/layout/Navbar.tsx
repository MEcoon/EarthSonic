import { useEffect, useState } from 'react'
import { Accessibility, AudioLines, Menu, Volume2, X } from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useSonification } from '../../audio/SonificationContext'

const links = [
  ['Home', '/'], ['Explore', '/explore'], ['Studio', '/studio'],
  ['Earth Radio', '/earth-radio'], ['Discover', '/discover'], ['About', '/about'],
] as const
const readSetting = (key: string, fallback: boolean) => {
  try { return localStorage.getItem(key) === null ? fallback : localStorage.getItem(key) === 'true' } catch { return fallback }
}
const pageSummaries: Record<string, string> = {
  '/': 'EarthSonic home. Explore NASA SVS visualization 3912 of global sea surface currents and temperature and learn how rendered image features become sound.',
  '/explore': 'Explore NASA SVS 3912. View ECCO2 surface-current flows colored by sea surface temperature and open the Studio.',
  '/studio': 'Sonification Studio. Play NASA SVS 3912, inspect rendered pixel features, and hear the documented image-derived sound mapping.',
  '/earth-radio': 'Earth Radio. Listen to a continuous generated sound interpretation of NASA SVS 3912. Favorites and playlists are saved on this device.',
  '/discover': 'Discover NASA SVS 3912 by sound. Listen to a generated clue, guess which rendered image feature controls pitch, and ask the local Earth Interpreter about the ocean visualization.',
  '/about': 'About EarthSonic. Learn how NASA SVS 3912 is analyzed and sonified, including the scientific limits of image-derived sound.',
}

export function Navbar() {
  const [open, setOpen] = useState(false)
  const [accessibilityOpen, setAccessibilityOpen] = useState(false)
  const [closeEyes, setCloseEyes] = useState(() => readSetting('earthsonic.a11y.closeEyes', false))
  const [highContrast, setHighContrast] = useState(() => readSetting('earthsonic.a11y.highContrast', false))
  const [reducedMotion, setReducedMotion] = useState(() => readSetting('earthsonic.a11y.reducedMotion', false))
  const [textScale, setTextScale] = useState(() => { try { return Number(localStorage.getItem('earthsonic.a11y.textScale') || 1) } catch { return 1 } })
  const location = useLocation()
  const { hasTrack, isPlaying, start, pause } = useSonification()

  useEffect(() => {
    document.documentElement.classList.toggle('close-eyes-mode', closeEyes)
    document.documentElement.classList.toggle('high-contrast-mode', highContrast)
    document.documentElement.classList.toggle('user-reduced-motion', reducedMotion)
    document.documentElement.classList.toggle('user-text-scale-active', textScale !== 1)
    document.documentElement.style.setProperty('--user-text-scale', String(textScale))
    try {
      localStorage.setItem('earthsonic.a11y.closeEyes', String(closeEyes))
      localStorage.setItem('earthsonic.a11y.highContrast', String(highContrast))
      localStorage.setItem('earthsonic.a11y.reducedMotion', String(reducedMotion))
      localStorage.setItem('earthsonic.a11y.textScale', String(textScale))
    } catch { /* Preferences still apply for this session if storage is unavailable. */ }
    return () => {
      document.documentElement.classList.remove('close-eyes-mode', 'high-contrast-mode', 'user-reduced-motion', 'user-text-scale-active')
      document.documentElement.style.removeProperty('--user-text-scale')
    }
  }, [closeEyes, highContrast, reducedMotion, textScale])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && event.shiftKey && event.key.toLowerCase() === 'a') { event.preventDefault(); setAccessibilityOpen((value) => !value); return }
      if (event.key === 'Escape') { setOpen(false); setAccessibilityOpen(false); return }
      const target = event.target as HTMLElement | null
      if (!hasTrack || event.repeat || event.ctrlKey || event.metaKey || event.altKey || target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(target?.tagName ?? '')) return
      if (event.code === 'Space') { event.preventDefault(); void (isPlaying ? pause() : start()) }
      if (event.key.toLowerCase() === 'm') document.querySelector<HTMLButtonElement>('.mini-mute')?.click()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [hasTrack, isPlaying, pause, start])

  const speakSummary = () => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(pageSummaries[location.pathname] ?? 'EarthSonic page.')
    utterance.rate = 0.92
    window.speechSynthesis.speak(utterance)
  }

  return <header className="site-header">
    <div className="page-container nav-inner">
      <Link className="brand" to="/" aria-label="EarthSonic home"><span className="brand-symbol" aria-hidden="true"><AudioLines size={19} /></span><span>EARTH<span className="brand-light">SONIC</span></span></Link>
      <button className="mobile-menu-button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? 'Close navigation' : 'Open navigation'}>{open ? <X size={21} /> : <Menu size={21} />}</button>
      <nav className={`primary-nav ${open ? 'is-open' : ''}`} aria-label="Main navigation">{links.map(([label, to]) => <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)}>{label}</NavLink>)}</nav>
      <button className="accessibility-button" onClick={() => setAccessibilityOpen(!accessibilityOpen)} aria-expanded={accessibilityOpen} aria-controls="accessibility-panel"><Accessibility size={17} /><span>Accessibility</span></button>
    </div>
    {accessibilityOpen && <section className="accessibility-panel page-container" id="accessibility-panel" aria-label="Accessibility settings">
      <div className="a11y-panel-heading"><strong>Accessibility</strong><span>Settings are saved on this device.</span></div>
      <label className="a11y-toggle"><input type="checkbox" checked={closeEyes} onChange={(event) => setCloseEyes(event.target.checked)} /><span>Close Your Eyes Mode</span></label>
      <label className="a11y-toggle"><input type="checkbox" checked={highContrast} onChange={(event) => setHighContrast(event.target.checked)} /><span>High contrast</span></label>
      <label className="a11y-toggle"><input type="checkbox" checked={reducedMotion} onChange={(event) => setReducedMotion(event.target.checked)} /><span>Reduce motion</span></label>
      <label className="a11y-text-size">Text size <button type="button" aria-label="Decrease text size" disabled={textScale <= 1} onClick={() => setTextScale((value) => Math.max(1, Math.round((value - 0.1) * 10) / 10))}>−</button><output>{Math.round(textScale * 100)}%</output><button type="button" aria-label="Increase text size" disabled={textScale >= 1.3} onClick={() => setTextScale((value) => Math.min(1.3, Math.round((value + 0.1) * 10) / 10))}>+</button></label>
      <button className="a11y-narrate" type="button" onClick={speakSummary}><Volume2 size={15} /> Read page summary</button>
      <span className="a11y-shortcuts">Shortcuts: Alt + Shift + A settings · Space play/pause · M mute · Esc close</span>
      <button className="text-button" onClick={() => { window.speechSynthesis?.cancel(); setAccessibilityOpen(false) }}>Close</button>
    </section>}
    {closeEyes && <aside className="close-eyes-banner" aria-label="Close Your Eyes Mode"><div><span className="eyebrow">AUDIO-FIRST MODE</span><p>Visual decoration is reduced. Page content remains available to screen readers and keyboard users.</p></div><button onClick={speakSummary}><Volume2 size={15} /> Hear page summary</button><button className="close-eyes-exit" onClick={() => setCloseEyes(false)}>Exit mode</button></aside>}
  </header>
}
