/**
 * Duplicate-resolution queue for the import pipeline.
 *
 * `store.importFiles` asks for a verdict through a callback that returns a
 * promise, and it may ask again for a later file before the first verdict
 * arrives. This hook keeps its own FIFO of pending collisions and exposes
 * exactly one at a time, so a slow decision can never overwrite a pending prompt
 * or lose a queued one.
 *
 * All ordering state lives in refs while the visible prompt lives in `useState`;
 * the promise executors never touch state, which keeps the store's callbacks
 * outside React's render phase.
 */
import { useCallback, useRef, useState } from 'react'
import type { AssetRecord } from '../data/types'
import type { DuplicateChoice, DuplicateRequest } from './DuplicateDialog'

/** What {@link useDuplicateResolution} hands back to the panel. */
export interface DuplicateResolution {
  /** The collision to show, or `null` when nothing is pending. */
  current: DuplicateRequest | null
  /** How many further collisions are queued behind {@link current}. */
  remaining: number
  /**
   * Passed straight to `store.importFiles`. It never rejects, because a rejected
   * promise would abort the whole import instead of one file.
   */
  onDuplicate: (asset: AssetRecord, file: File) => Promise<DuplicateChoice>
  /** Apply a verdict to the current collision and, optionally, to the queue. */
  resolve: (choice: DuplicateChoice, applyToAll: boolean) => void
  /** Drop every queued collision, resolving each as `skip`. */
  reset: () => void
}

/** One pending collision together with the identity of its resolver. */
interface PendingDuplicate {
  /** Monotonic id, so a resolved entry can be deleted by identity. */
  id: number
  /** The collision the user is being asked about. */
  request: DuplicateRequest
}

/**
 * Manage duplicate prompts for one import run.
 * @returns The pending prompt, its queue depth, and the store callback.
 */
export function useDuplicateResolution(): DuplicateResolution {
  const queue = useRef<PendingDuplicate[]>([])
  const resolvers = useRef<Map<number, (choice: DuplicateChoice) => void>>(new Map())
  const nextId = useRef(1)
  // Bumped on every queue mutation so the hook re-renders even when the head
  // request is unchanged (a second collision arriving behind an open prompt).
  const [version, setVersion] = useState(0)

  const settleHead = useCallback((choice: DuplicateChoice): void => {
    const entry = queue.current.shift()
    if (entry === undefined) return
    const resolver = resolvers.current.get(entry.id)
    resolvers.current.delete(entry.id)
    resolver?.(choice)
  }, [])

  const onDuplicate = useCallback(
    (asset: AssetRecord, file: File): Promise<DuplicateChoice> => {
      const id = nextId.current
      nextId.current += 1
      queue.current.push({ id, request: { existing: asset, incoming: file } })
      const promise = new Promise<DuplicateChoice>(resolve => {
        resolvers.current.set(id, resolve)
      })
      setVersion(value => value + 1)
      return promise
    },
    [],
  )

  const resolve = useCallback(
    (choice: DuplicateChoice, applyToAll: boolean): void => {
      if (queue.current.length === 0) return
      settleHead(choice)
      if (applyToAll) while (queue.current.length > 0) settleHead(choice)
      setVersion(value => value + 1)
    },
    [settleHead],
  )

  const reset = useCallback((): void => {
    while (queue.current.length > 0) settleHead('skip')
    setVersion(value => value + 1)
  }, [settleHead])

  // `version` is the change signal; the queue itself is the source of truth, so
  // reading it during render and at call time can never disagree.
  void version
  const head = queue.current[0]

  return {
    current: head?.request ?? null,
    remaining: Math.max(0, queue.current.length - 1),
    onDuplicate,
    resolve,
    reset,
  }
}
