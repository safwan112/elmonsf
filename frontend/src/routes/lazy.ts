import type { ComponentType } from 'react'

const RELOAD_KEY = 'chunk-reload-at'

/**
 * After a deploy, an open tab may request page chunks that no longer exist.
 * Reload once to pick up the new build; if it fails again soon after, let
 * the error boundary show the error instead of looping.
 */
async function withReloadOnStaleChunk<M>(load: () => Promise<M>): Promise<M> {
  try {
    return await load()
  } catch (error) {
    let last = 0
    try {
      last = Number(sessionStorage.getItem(RELOAD_KEY)) || 0
      if (Date.now() - last > 30_000) {
        sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
        window.location.reload()
        // Keep the route pending while the page reloads.
        return await new Promise<M>(() => {})
      }
    } catch {
      // Storage unavailable: fall through to the error boundary.
    }
    throw error
  }
}

/**
 * Route-level code splitting: `lazy: page(() => import('…'), 'ExportName')`
 * loads a page module on first navigation, so the initial bundle only has
 * the shell, the home page and the auth screens.
 */
export function page<M extends Record<string, unknown>>(load: () => Promise<M>, name: keyof M & string) {
  return async () => ({ Component: (await withReloadOnStaleChunk(load))[name] as ComponentType })
}
