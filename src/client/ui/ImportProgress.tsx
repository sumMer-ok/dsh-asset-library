/**
 * Per-file import progress.
 *
 * Every file the store is working on appears here with its current phase, and a
 * failure stays visible with its reason instead of disappearing, so a silent
 * import is never possible.
 */
import { useState } from 'react'
import type { ImportEvent, ImportPhase } from '../data/types'
import styles from './Overlay.module.css'

/** Short Chinese labels for the store's import phases. */
const PHASE_LABEL: Record<ImportPhase, string> = {
  queued: '排队',
  hashing: '校验',
  thumb: '缩略图',
  writing: '写入',
  done: '完成',
  duplicate: '重复',
  failed: '失败',
}

/** Props for {@link ImportProgress}. */
export interface ImportProgressProps {
  /** One event per file, in arrival order. */
  events: ImportEvent[]
  /** Whether the import queue is still draining. */
  running: boolean
  /** Dismiss the panel; only offered once the queue has drained. */
  onDismiss: () => void
}

/**
 * Render the import progress panel.
 * @param props - Events, running flag, and the dismiss callback.
 * @returns The progress panel, or `null` when there is nothing to show.
 */
export function ImportProgress(props: ImportProgressProps): JSX.Element | null {
  const [collapsed, setCollapsed] = useState(false)
  const { events, running } = props
  if (events.length === 0) return null

  const failed = events.filter(event => event.phase === 'failed').length
  const done = events.filter(event => event.phase === 'done').length
  const title = running
    ? `正在导入 ${events.length} 个文件…`
    : failed > 0
      ? `导入结束：${done} 成功，${failed} 失败`
      : `已导入 ${done} 个文件`

  return (
    <section className={styles.progressPanel} aria-live="polite" aria-label="导入进度">
      <div className={styles.progressHead}>
        <span className={styles.progressTitle}>{title}</span>
        <button
          type="button"
          className={styles.progressToggle}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed(value => !value)}
        >
          {collapsed ? '展开' : '收起'}
        </button>
        {!running ? (
          <button type="button" className={styles.progressToggle} onClick={props.onDismiss}>
            关闭
          </button>
        ) : null}
      </div>
      {!collapsed ? (
        <ul className={styles.progressList}>
          {events.map((event, index) => (
            <li
              key={`${event.path}:${index}`}
              className={`${styles.progressRow} ${event.phase === 'failed' ? styles.progressRowFailed : ''}`}
            >
              <span
                className={`${styles.progressPhase} ${event.phase === 'failed' ? styles.progressPhaseFailed : ''}`}
              >
                {PHASE_LABEL[event.phase] ?? event.phase}
              </span>
              <span className={styles.progressName} title={event.path}>
                {event.name}
              </span>
              {event.error !== undefined ? (
                <span className={styles.progressError}>{event.error}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
