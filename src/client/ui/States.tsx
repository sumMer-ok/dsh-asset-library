/**
 * The gallery's three non-content states: empty, loading, and error.
 *
 * Loading shows skeleton cards shaped like real cards rather than a spinner, so
 * the layout the user is waiting for is already legible.
 */
import styles from './Overlay.module.css'
import appStyles from './App.module.css'

/** Props for {@link EmptyState}. */
export interface EmptyStateProps {
  /** Whether a query is filtering everything out. */
  filtered: boolean
  /** Open the file picker. */
  onPickFiles: () => void
  /** Clear the active query. */
  onClearQuery: () => void
}

/**
 * Render the empty-library guidance.
 * @param props - Picker and query-reset callbacks.
 * @returns The empty-state element.
 */
export function EmptyState(props: EmptyStateProps): JSX.Element {
  return (
    <div className={styles.stateWrap}>
      <span className={styles.stateGlyph} aria-hidden="true">
        🖼
      </span>
      <h2 className={styles.stateTitle}>
        {props.filtered ? '没有匹配的素材' : '素材库还是空的'}
      </h2>
      <p className={styles.stateBody}>
        {props.filtered
          ? '当前筛选条件没有命中任何素材。放宽条件或清空筛选即可看到全部内容。'
          : '把图片、视频、音频或文档拖进这个窗口，插件会生成缩略图并把元数据存到本机；原始文件始终留在磁盘原位。'}
      </p>
      <div className={styles.stateActions}>
        {props.filtered ? (
          <button type="button" className={appStyles.primaryButton} onClick={props.onClearQuery}>
            清空筛选
          </button>
        ) : (
          <button type="button" className={appStyles.primaryButton} onClick={props.onPickFiles}>
            选择文件
          </button>
        )}
      </div>
      {!props.filtered ? <div className={styles.dropHint}>也可以直接把文件拖到窗口任意位置</div> : null}
    </div>
  )
}

/** Props for {@link LoadingState}. */
export interface LoadingStateProps {
  /** Column count to mirror, so the skeleton matches the gallery. */
  columnCount: number
  /** Gap between skeleton cards. */
  gutter: number
}

/**
 * Render skeleton cards while the library loads.
 * @param props - Column count and gutter.
 * @returns The skeleton element.
 */
export function LoadingState(props: LoadingStateProps): JSX.Element {
  const columnCount = Math.max(1, props.columnCount)
  const columns = Array.from({ length: columnCount }, (_, columnIndex) => columnIndex)
  return (
    <div className={styles.stateWrap} aria-busy="true" aria-live="polite">
      <div className={styles.skeletonGrid} style={{ gap: props.gutter }}>
        {columns.map(columnIndex => (
          <div key={columnIndex} className={styles.skeletonColumn} style={{ gap: props.gutter }}>
            {[0, 1, 2].map(row => (
              <div key={row} className={styles.skeletonCard}>
                <div
                  className={styles.skeletonMedia}
                  style={{ height: 120 + ((columnIndex + row) % 3) * 54 }}
                />
                <div className={styles.skeletonFooter}>
                  <div className={styles.skeletonLine} />
                  <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <span className={appStyles.visuallyHidden}>正在载入素材库</span>
    </div>
  )
}

/** Props for {@link ErrorState}. */
export interface ErrorStateProps {
  /** Human-readable failure summary. */
  message: string
  /** Optional technical detail, revealed on demand. */
  detail?: string
  /** Retry the failed operation. */
  onRetry: () => void
}

/**
 * Render the library error with an expandable detail block.
 * @param props - Message, optional detail, and the retry callback.
 * @returns The error element.
 */
export function ErrorState(props: ErrorStateProps): JSX.Element {
  return (
    <div className={styles.stateWrap} role="alert">
      <span className={styles.stateGlyph} aria-hidden="true">
        ⚠
      </span>
      <h2 className={styles.stateTitle}>素材库加载失败</h2>
      <p className={styles.stateBody}>{props.message}</p>
      <div className={styles.stateActions}>
        <button type="button" className={appStyles.primaryButton} onClick={props.onRetry}>
          重试
        </button>
      </div>
      {props.detail !== undefined && props.detail !== '' ? (
        <details className={styles.stateDetails}>
          <summary className={styles.stateDetailsSummary}>查看详情</summary>
          <pre className={styles.stateDetailsPre}>{props.detail}</pre>
        </details>
      ) : null}
    </div>
  )
}
