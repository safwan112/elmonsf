import { Badge } from '@/components/ui/badge'
import type { EnumValue } from '@/types/catalog'
import type { OrderStatus } from '@/types/commerce'

const VARIANT: Record<OrderStatus, 'success' | 'destructive' | 'accent' | 'secondary'> = {
  paid: 'success',
  pending: 'accent',
  failed: 'destructive',
  cancelled: 'secondary',
  refunded: 'secondary',
}

export function OrderStatusBadge({ status }: { status: EnumValue<OrderStatus> }) {
  return <Badge variant={VARIANT[status.value]}>{status.label}</Badge>
}
