/**
 * Duplicate-resolution dialog for the import pipeline.
 *
 * The store reports a content-hash collision and waits for a verdict, so this
 * dialog is the only place that decides between skipping the new file, keeping
 * both copies, and replacing the stored one. A verdict is required: dismissing
 * the dialog resolves the pending item as `skip` rather than stalling the queue.
 */
import { useCallback, useEffect, useState } from 'react'
import type { AssetRecord } from '../data/types'
import { useObjectUrl } from './hooks'
import { formatBytes, formatDate } from './format'
import styles from './Overlay.module.css'
import appStyles from './App.module.css'

/** The verdict a duplicate prompt can produce. */
export type DuplicateChoice = 'skip' | 'keep' | 'replace'

/** One pending collision: an incoming file and the stored asset it matches. */
export interface DuplicateRequest {
  /** The asset already in the library. */
  existing: AssetRecord
  /** The file the user is importing. */
  incoming: File
}

/** Props for {@link DuplicateDialog}. */
export interface DuplicateDialogProps {
  /** The collision to resolve. */
  request: DuplicateRequest
  /** How many further collisions are waiting behind this one. */
  remaining: number
  /** Resolve this collision, and optionally every remaining one the same way. */
  onResolve: (choice: DuplicateChoice, applyToAll: boolean) => void
}

/**
 * Render the duplicate dialog.
 * @param props - The collision and its resolver.
 * @returns The modal overlay.
 */
export function DuplicateDialog(props: DuplicateDialogProps): JSX.Element {
  const { existing, incoming } = props.request
  const [applyToAll, setApplyToAll] = useState(false)
  const existingThumb = useObjectUrl(existing.thumb instanceof Blob ? existing.thumb : undefined)

  const resolve = useCallback(
    (choice: DuplicateChoice): void => {
      props.onResolve(choice, applyToAll)
    },
    [props.onResolve, applyToAll],
  )

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      resolve('skip')
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [resolve])

  return (
    <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-label="发现重复素材">
      <div className={styles.modal}>
        <h2 className={styles.modalTitle}>发现重复素材</h2>
        <p className={styles.modalBody}>
          新文件与库中已有素材内容一致（SHA-256 相同）。你想怎么处理？
        </p>

        <div className={styles.compare}>
          <div className={styles.compareCard}>
            <span className={styles.compareLabel}>库中已有</span>
            {existingThumb !== undefined ? (
              <img className={styles.compareThumb} src={existingThumb} alt="" />
            ) : (
              <div className={styles.compareThumb} />
            )}
            <span className={styles.compareName} title={existing.name}>
              {existing.name}
            </span>
            <span className={styles.compareMeta}>
              {formatBytes(existing.size)} · 导入于 {formatDate(existing.importedAt)}
            </span>
          </div>

          <div className={styles.compareCard}>
            <span className={styles.compareLabel}>正在导入</span>
            <div className={styles.compareThumb} />
            <span className={styles.compareName} title={incoming.name}>
              {incoming.name}
            </span>
            <span className={styles.compareMeta}>{formatBytes(incoming.size)}</span>
          </div>
        </div>

        <label className={styles.modalCheckbox}>
          <input
            type="checkbox"
            checked={applyToAll}
            onChange={event => setApplyToAll(event.target.checked)}
          />
          对本次剩余的 {props.remaining} 个重复文件都这样做
        </label>

        <div className={styles.modalActions}>
          <button
            type="button"
            className={appStyles.ghostButton}
            onClick={() => resolve('skip')}
          >
            跳过
          </button>
          <button
            type="button"
            className={appStyles.ghostButton}
            onClick={() => resolve('keep')}
          >
            保留两份
          </button>
          <span className={styles.modalActionsSpacer} />
          <button
            type="button"
            className={appStyles.primaryButton}
            onClick={() => resolve('replace')}
          >
            替换已有
          </button>
        </div>
      </div>
    </div>
  )
}
