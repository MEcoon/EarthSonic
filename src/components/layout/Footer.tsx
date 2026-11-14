import { Link } from 'react-router-dom'

export function Footer() {
  return <footer className="site-footer">
    <div><Link className="brand footer-brand" to="/"><span className="brand-symbol" aria-hidden="true">◉</span><span>EARTH<span className="brand-light">SONIC</span></span></Link><p>Listen to Our Planet.</p><a className="footer-attribution" href="https://svs.gsfc.nasa.gov/" target="_blank" rel="noreferrer">NASA Scientific Visualization Studio</a></div>
    <nav aria-label="Footer navigation"><Link to="/explore">Explore</Link><Link to="/studio">Studio</Link><Link to="/about">About</Link></nav>
    <span className="footer-note">An Earth science sonification experience<br />NASA Space Apps Challenge</span>
  </footer>
}
