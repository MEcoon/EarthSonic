import type { PropsWithChildren } from 'react'

export function PageContainer({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
  return <div className={`page-container ${className}`.trim()}>{children}</div>
}
