import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { SiteLayout } from './components/layout/SiteLayout'
import { HomePage } from './pages/HomePage'
import { PlaceholderPage } from './pages/PlaceholderPage'

const ExplorePage = lazy(() => import('./pages/ExplorePage').then((module) => ({ default: module.ExplorePage })))
const StudioPage = lazy(() => import('./pages/StudioPage').then((module) => ({ default: module.StudioPage })))
const AboutPage = lazy(() => import('./pages/AboutPage').then((module) => ({ default: module.AboutPage })))

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<HomePage />} />
        <Route path="/explore" element={<Suspense fallback={<div className="page-container route-loading" role="status">Loading Explore…</div>}><ExplorePage /></Suspense>} />
        <Route path="/studio" element={<Suspense fallback={<div className="page-container route-loading" role="status">Loading Studio…</div>}><StudioPage /></Suspense>} />
        <Route path="/about" element={<Suspense fallback={<div className="page-container route-loading" role="status">Loading About…</div>}><AboutPage /></Suspense>} />
        <Route path="*" element={<PlaceholderPage title="Page not found" number="404" />} />
      </Route>
    </Routes>
  )
}
