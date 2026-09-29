import { createElement } from 'react'
import { cn } from '@/lib/utils'
import { iconFor } from './category-icons'

// Hue pairs chosen to sit well with the teal/saffron brand in both themes.
const PALETTES = [
  ['oklch(0.45 0.085 185)', 'oklch(0.62 0.1 170)'],
  ['oklch(0.42 0.09 250)', 'oklch(0.6 0.1 220)'],
  ['oklch(0.5 0.11 60)', 'oklch(0.72 0.13 80)'],
  ['oklch(0.44 0.1 300)', 'oklch(0.6 0.11 280)'],
  ['oklch(0.47 0.1 150)', 'oklch(0.65 0.12 130)'],
] as const

/**
 * Cover image, or an original generated cover (gradient + lattice + icon)
 * when no image has been uploaded. Deterministic per item id.
 */
export function CoverArt({
  src,
  seed,
  icon,
  title,
  className,
}: {
  src: string | null | undefined
  seed: number
  icon?: string | null
  title: string
  className?: string
}) {
  if (src) {
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        className={cn('aspect-[16/10] w-full object-cover', className)}
      />
    )
  }

  const [from, to] = PALETTES[seed % PALETTES.length]!

  return (
    <div
      aria-hidden="true"
      title={title}
      className={cn('relative flex aspect-[16/10] w-full items-center justify-center overflow-hidden', className)}
      style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      <div className="bg-lattice absolute inset-0 opacity-30 mix-blend-overlay" />
      <div className="absolute -bottom-10 -start-10 size-40 rounded-full bg-white/10" />
      <div className="absolute -end-6 -top-8 size-28 rounded-full bg-white/10" />
      {createElement(iconFor(icon), { className: 'relative size-14 text-white/90 drop-shadow', strokeWidth: 1.5 })}
    </div>
  )
}
