import { useEffect, useState } from 'react'

/**
 * Seconds left until a deadline fixed when the component mounts, from the
 * server-computed remaining time (so a wrong device clock doesn't matter).
 * Returns null for untimed exams.
 */
export function useCountdown(remainingSeconds: number | null): number | null {
  const [deadline] = useState(() => (remainingSeconds === null ? null : Date.now() + remainingSeconds * 1000))
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (deadline === null) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [deadline])

  return deadline === null ? null : Math.max(0, Math.ceil((deadline - now) / 1000))
}
