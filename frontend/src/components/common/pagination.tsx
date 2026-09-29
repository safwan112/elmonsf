import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PaginationMeta } from '@/types/api'
import { formatNumber } from '@/utils/format'

interface PaginationProps {
  meta: PaginationMeta
  onPageChange: (page: number) => void
  disabled?: boolean
}

export function Pagination({ meta, onPageChange, disabled }: PaginationProps) {
  if (meta.last_page <= 1) return null

  return (
    <nav aria-label="التنقل بين الصفحات" className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        عرض {formatNumber(meta.from ?? 0)}–{formatNumber(meta.to ?? 0)} من أصل {formatNumber(meta.total)}
      </p>
      <div className="flex items-center gap-2">
        {/* In RTL, "previous" points right and "next" points left. */}
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || meta.current_page <= 1}
          onClick={() => onPageChange(meta.current_page - 1)}
        >
          <ChevronRight />
          السابق
        </Button>
        <span className="min-w-16 text-center text-sm tabular-nums">
          {formatNumber(meta.current_page)} / {formatNumber(meta.last_page)}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || meta.current_page >= meta.last_page}
          onClick={() => onPageChange(meta.current_page + 1)}
        >
          التالي
          <ChevronLeft />
        </Button>
      </div>
    </nav>
  )
}
