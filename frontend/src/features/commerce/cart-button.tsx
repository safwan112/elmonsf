import { ShoppingCart } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { useCart } from './use-commerce'

/** Header cart link with an item count badge (signed-in users only). */
export function CartButton() {
  const cart = useCart()
  const count = cart.data?.count ?? 0

  return (
    <Button variant="ghost" size="icon" className="relative" asChild>
      <Link to="/cart" aria-label={count > 0 ? `السلة (${count})` : 'السلة'}>
        <ShoppingCart className="size-5" />
        {count > 0 && (
          <span
            aria-hidden="true"
            className="absolute -end-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[0.65rem] leading-5 font-bold text-primary-foreground ltr-nums"
          >
            {count > 9 ? '9+' : count}
          </span>
        )}
      </Link>
    </Button>
  )
}
