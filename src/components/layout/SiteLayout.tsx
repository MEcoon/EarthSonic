import { Outlet } from 'react-router-dom'
import { Footer } from './Footer'
import { Navbar } from './Navbar'
import { PageContainer } from './PageContainer'
import { GlobalAudioPlayer } from '../../audio/GlobalAudioPlayer'

export function SiteLayout() {
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <Navbar />
      <main id="main-content"><Outlet /></main>
      <PageContainer><Footer /></PageContainer>
      <GlobalAudioPlayer />
    </>
  )
}
