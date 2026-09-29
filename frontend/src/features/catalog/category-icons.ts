import {
  Atom,
  BookOpen,
  Calculator,
  FlaskConical,
  GraduationCap,
  Layers,
  Leaf,
  Lightbulb,
  Sigma,
  Target,
  type LucideIcon,
} from 'lucide-react'
import type { Category } from '@/types/catalog'

/** Map of category slug → icon name, used for generated covers. */
export function categoryIcons(categories: Category[] | undefined): Record<string, string | null> {
  const map: Record<string, string | null> = {}
  categories?.forEach((c) => {
    map[c.slug] = c.icon
    c.children?.forEach((child) => (map[child.slug] = child.icon ?? c.icon))
  })
  return map
}

const ICONS: Record<string, LucideIcon> = {
  target: Target,
  calculator: Calculator,
  'book-open': BookOpen,
  'graduation-cap': GraduationCap,
  sigma: Sigma,
  atom: Atom,
  'flask-conical': FlaskConical,
  leaf: Leaf,
  lightbulb: Lightbulb,
  layers: Layers,
}

/** Lucide icon for a stored icon name (falls back to a book). */
export function iconFor(name: string | null | undefined): LucideIcon {
  return (name && ICONS[name]) || BookOpen
}

/** Published courses in a category including its sub-categories. */
export function totalCourses(category: Category): number {
  return (category.courses_count ?? 0) + (category.children ?? []).reduce((sum, c) => sum + (c.courses_count ?? 0), 0)
}
