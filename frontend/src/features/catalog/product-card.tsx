import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { Product } from '@/types/catalog'
import { CoverArt } from './cover-art'
import { PriceTag } from './price-tag'

const TYPE_ICONS: Record<string, string> = {
  ebook: 'book-open',
  question_bank: 'layers',
  bundle: 'graduation-cap',
  other: 'lightbulb',
}

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-soft transition-shadow hover:shadow-lift focus-within:ring-4 focus-within:ring-ring/25">
      <div className="relative">
        <CoverArt src={product.cover_url} seed={product.id + 2} icon={TYPE_ICONS[product.type.value]} title={product.title} />
        <Badge className="absolute start-3 top-3 bg-card/90 text-foreground backdrop-blur">{product.type.label}</Badge>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-lg leading-snug font-bold">
          <Link to={`/products/${encodeURIComponent(product.slug)}`} className="outline-none after:absolute after:inset-0">
            {product.title}
          </Link>
        </h3>
        {product.subtitle && <p className="line-clamp-2 text-sm text-muted-foreground">{product.subtitle}</p>}
        <div className="mt-auto border-t pt-3">
          <PriceTag price={product.price} compareAt={product.compare_at_price} discountPercent={product.discount_percent} />
        </div>
      </div>
    </article>
  )
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card" aria-hidden="true">
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="grid gap-3 p-4">
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="mt-3 h-6 w-24" />
      </div>
    </div>
  )
}
