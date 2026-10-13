/**
 * React binding for the library store.
 *
 * `store` exposes an external mutable snapshot with an explicit subscribe
 * function, which is exactly the contract `useSyncExternalStore` expects. This
 * hook is the only place in the UI that subscribes to it.
 */
import { useSyncExternalStore } from 'react'
import { store } from '../data/store'
import type { LibraryState } from '../data/store'

/**
 * Subscribe to the library store.
 * @returns The current snapshot, or `null` before the store's first snapshot.
 */
export function useStoreState(): LibraryState | null {
  return useSyncExternalStore(
    onStoreChange => store.subscribe(onStoreChange),
    () => store.getSnapshot(),
    () => null,
  )
}
