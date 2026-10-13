/**
 * Stand-in for the optional `masonic` dependency.
 *
 * Vite aliases `masonic` here when the package is not installed, so the preview
 * exercises the same code path a machine without network access would: the
 * dynamic import rejects, `useMasonryLayout` reports the `grid` variant, and the
 * dependency-free CSS grid fallback renders.
 */

/** Reported as unavailable so the layout hook selects the grid fallback. */
export const available = false

/**
 * Absent on purpose: `masonic`'s real entry points must not exist here, because
 * their presence is what the layout hook probes for.
 */
export const useMasonry = undefined
export const usePositioner = undefined
export const useResizeObserver = undefined
