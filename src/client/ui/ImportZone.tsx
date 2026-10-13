/**
 * Import affordances: the panel's call-to-action, the file picker, and the
 * whole-window drop fallback.
 *
 * Files are only collected here. Hashing, thumbnailing, and persistence belong
 * to the store, which the panel calls through `onFiles`.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import styles from './App.module.css'

/** Props for {@link ImportZone}. */
export interface ImportZoneProps {
  /** Called with the files the user dropped or picked. */
  onFiles: (files: File[]) => void
  /** Whether an import is already running. */
  busy: boolean
  /** Whether the library is empty, which changes the wording of the trigger. */
  empty: boolean
}

/**
 * Render the import call-to-action and arm the window-wide drop target.
 * @param props - Drop handler, busy flag, and library emptiness.
 * @returns The import bar plus, while dragging, a full-window drop hint.
 */
export function ImportZone(props: ImportZoneProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const dragDepth = useRef(0)
  const [dragging, setDragging] = useState(false)
  const onFilesRef = useRef(props.onFiles)
  onFilesRef.current = props.onFiles

  const accept = useCallback((list: FileList | File[] | null): void => {
    if (list === null) return
    const files = Array.isArray(list) ? list : Array.from(list)
    if (files.length === 0) return
    onFilesRef.current(files)
  }, [])

  // Drag events fire on every descendant, and `dragleave` fires when crossing
  // into a child, so depth is tracked rather than a bare boolean.
  useEffect(() => {
    const onEnter = (event: DragEvent): void => {
      if (!hasFiles(event)) return
      dragDepth.current += 1
      setDragging(true)
    }
    const onOver = (event: DragEvent): void => {
      if (!hasFiles(event)) return
      event.preventDefault()
      if (event.dataTransfer !== null) event.dataTransfer.dropEffect = 'copy'
    }
    const onLeave = (): void => {
      dragDepth.current = Math.max(0, dragDepth.current - 1)
      if (dragDepth.current === 0) setDragging(false)
    }
    const onDrop = (event: DragEvent): void => {
      if (!hasFiles(event)) return
      event.preventDefault()
      dragDepth.current = 0
      setDragging(false)
      accept(event.dataTransfer?.files ?? null)
    }
    window.addEventListener('dragenter', onEnter)
    window.addEventListener('dragover', onOver)
    window.addEventListener('dragleave', onLeave)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragenter', onEnter)
      window.removeEventListener('dragover', onOver)
      window.removeEventListener('dragleave', onLeave)
      window.removeEventListener('drop', onDrop)
    }
  }, [accept])

  return (
    <>
      <div className={styles.importBar}>
        <button
          type="button"
          className={styles.primaryButton}
          disabled={props.busy}
          onClick={() => inputRef.current?.click()}
        >
          {props.empty ? '选择文件' : '继续添加'}
        </button>
        <span className={styles.countLabel}>或把文件拖到窗口任意位置</span>
        <input
          ref={inputRef}
          className={styles.visuallyHidden}
          type="file"
          multiple
          tabIndex={-1}
          aria-hidden="true"
          onChange={event => {
            accept(event.target.files)
            // Reset so picking the same file twice still fires a change event.
            event.target.value = ''
          }}
        />
      </div>

      {dragging ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 55,
            display: 'grid',
            placeItems: 'center',
            pointerEvents: 'none',
            background: 'var(--dsw-alias-bg-mask-1)',
          }}
        >
          <span
            style={{
              padding: '18px 28px',
              border: '2px dashed var(--dsw-alias-state-business-primary)',
              borderRadius: 14,
              background: 'var(--dsw-alias-bg-overlay, var(--dsw-alias-bg-layer-1))',
              color: 'var(--dsw-alias-label-primary)',
              fontSize: 'var(--dsw-font-s-14)',
            }}
          >
            松开以导入素材
          </span>
        </div>
      ) : null}
    </>
  )
}

/**
 * Whether a drag payload carries files, as opposed to text or a URL.
 * @param event - The drag event.
 * @returns True when the payload advertises at least one file.
 */
function hasFiles(event: DragEvent): boolean {
  const types = event.dataTransfer?.types
  if (types === undefined) return false
  return Array.from(types).includes('Files')
}
