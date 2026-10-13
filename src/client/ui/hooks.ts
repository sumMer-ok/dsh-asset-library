/**
 * Small presentation hooks shared by the gallery components.
 *
 * Each hook owns exactly one browser resource or timing concern so components
 * stay free of manual listener and object-URL bookkeeping.
 */
import { useEffect, useRef, useState } from 'react'

/**
 * Delay propagating a fast-changing value.
 *
 * Used by the search field so typing does not re-filter the library on every
 * keystroke.
 * @param value - The live value.
 * @param delayMs - Quiet period before the returned value catches up.
 * @returns The value as of `delayMs` ago.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])
  return settled
}

/**
 * Manage an object URL for a blob for exactly as long as it is needed.
 *
 * The URL is created once per blob identity and revoked on identity change and
 * on unmount, which is what keeps `URL.createObjectURL` allocation paired with
 * `revokeObjectURL` while the gallery scrolls.
 * @param blob - The blob to expose, or `undefined`/`null` for no URL.
 * @returns The object URL, or `undefined` when there is nothing to show.
 */
export function useObjectUrl(blob: Blob | undefined | null): string | undefined {
  const [url, setUrl] = useState<string | undefined>(undefined)
  useEffect(() => {
    if (blob === undefined || blob === null) {
      setUrl(undefined)
      return
    }
    const next = URL.createObjectURL(blob)
    setUrl(next)
    return () => {
      URL.revokeObjectURL(next)
    }
  }, [blob])
  return url
}

/**
 * Observe an element's content-box size.
 *
 * The measured size drives both the column count and the virtualisation height,
 * so it must update on container resize rather than only on window resize.
 * @param ref - Ref to the element to observe.
 * @returns The latest `width`/`height`, both `0` until the first measurement.
 */
export function useElementSize<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
): { width: number; height: number } {
  const [size, setSize] = useState({ width: 0, height: 0 })
  useEffect(() => {
    const element = ref.current
    if (element === null) return
    const measure = (): void => {
      const width = element.clientWidth
      const height = element.clientHeight
      setSize(previous =>
        previous.width === width && previous.height === height ? previous : { width, height },
      )
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])
  return size
}

/**
 * Subscribe to a scroll container's vertical scroll offset.
 *
 * The offset is read from the element rather than from `window`, because the
 * gallery scrolls inside its own pane.
 * @param ref - Ref to the scroll container.
 * @returns The current `scrollTop` in CSS pixels.
 */
export function useScrollTop(ref: React.RefObject<HTMLElement | null>): number {
  const [scrollTop, setScrollTop] = useState(0)
  useEffect(() => {
    const element = ref.current
    if (element === null) return
    const onScroll = (): void => setScrollTop(element.scrollTop)
    onScroll()
    element.addEventListener('scroll', onScroll, { passive: true })
    return () => element.removeEventListener('scroll', onScroll)
  }, [ref])
  return scrollTop
}

/**
 * Track a media query, defaulting to `false` during server-style rendering.
 * @param query - A media query string.
 * @returns Whether the query currently matches.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)
  useEffect(() => {
    const list = window.matchMedia(query)
    const update = (): void => setMatches(list.matches)
    update()
    list.addEventListener('change', update)
    return () => list.removeEventListener('change', update)
  }, [query])
  return matches
}

/**
 * Invoke a callback when a pointer press lands outside an element.
 * @param ref - Ref to the element that should keep the interaction alive.
 * @param active - Whether the listener is currently wanted.
 * @param onOutside - Called on the first outside `pointerdown`.
 */
export function useOutsidePointerDown(
  ref: React.RefObject<HTMLElement | null>,
  active: boolean,
  onOutside: () => void,
): void {
  const handler = useRef(onOutside)
  handler.current = onOutside
  useEffect(() => {
    if (!active) return
    const listener = (event: PointerEvent): void => {
      const element = ref.current
      if (element === null || !(event.target instanceof Node)) return
      if (!element.contains(event.target)) handler.current()
    }
    document.addEventListener('pointerdown', listener, true)
    return () => document.removeEventListener('pointerdown', listener, true)
  }, [ref, active])
}
