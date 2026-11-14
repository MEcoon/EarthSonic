import { Link } from 'react-router-dom'
import { PageContainer } from '../components/layout/PageContainer'

export function PlaceholderPage({ title, number }: { title: string; number: string }) {
  return <PageContainer className="placeholder-page"><span className="eyebrow">EARTHSONIC · {number}</span><h1>{title}</h1><p>This section will take shape in the next development phase.</p><Link className="button button-outline" to="/">Return home</Link></PageContainer>
}
