/**
 * Harness logging.
 *
 * The preview has no host to observe callbacks, so every action writes a line
 * into `#log` — that is how a screenshot shows that a click actually fired.
 *
 * @module dsh-asset-library/preview/log
 */

/**
 * Append one line to the harness log.
 * @param message - Line to show.
 */
export function pushLog(message: string): void {
  const log = document.getElementById('log')
  if (log === null) return
  const line = document.createElement('div')
  line.textContent = message
  log.append(line)
}
