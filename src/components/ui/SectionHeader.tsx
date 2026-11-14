import type { PropsWithChildren } from 'react'

export function SectionHeader({ eyebrow, children }: PropsWithChildren<{ eyebrow?: string }>) {
  return <div className="section-header">{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2>{children}</h2></div>
}
