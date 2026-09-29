import type { ReactNode } from 'react'
import { Breadcrumbs, type Crumb } from './breadcrumbs'

/** Standard header band for public listing/content pages. */
export function PageHero({ crumbs, title, description, children }: { crumbs: Crumb[]; title: string; description?: ReactNode; children?: ReactNode }) {
  return (
    <section className="border-b bg-card/60">
      <div className="container-page py-8 sm:py-10">
        <Breadcrumbs items={crumbs} className="text-muted-foreground" />
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>}
        {children}
      </div>
    </section>
  )
}
