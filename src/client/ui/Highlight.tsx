/**
 * Search-hit rendering. The match ranges come from `highlightRanges` in the
 * data layer, so this module owns only the presentation of a hit, never the
 * matching rules.
 */
import { Fragment } from 'react'
import { highlightRanges } from '../data/filters'

/** Props for {@link Highlight}. */
export interface HighlightProps {
  /** Text to render, character for character. */
  text: string
  /** Query whose hits should be wrapped. */
  query: string
  /** Class applied to each `<mark>`. */
  markClassName?: string
}

/**
 * Render `text`, wrapping every query hit in `<mark>`.
 *
 * Ranges arrive non-overlapping and ascending by construction; each is still
 * clamped to the string so a stale query cannot produce an out-of-range slice.
 * @param props - Text, query, and the mark class.
 * @returns A fragment of plain strings and `<mark>` elements.
 */
export function Highlight({ text, query, markClassName }: HighlightProps): JSX.Element {
  const ranges = query.trim() === '' ? [] : highlightRanges(text, query)
  if (ranges.length === 0) return <>{text}</>
  const parts: JSX.Element[] = []
  let cursor = 0
  ranges.forEach(([rawStart, rawEnd], index) => {
    const start = Math.max(cursor, Math.min(rawStart, text.length))
    const end = Math.max(start, Math.min(rawEnd, text.length))
    if (start > cursor) parts.push(<Fragment key={`t${index}`}>{text.slice(cursor, start)}</Fragment>)
    if (end > start) {
      parts.push(
        <mark key={`m${index}`} className={markClassName}>
          {text.slice(start, end)}
        </mark>,
      )
    }
    cursor = end
  })
  if (cursor < text.length) parts.push(<Fragment key="tail">{text.slice(cursor)}</Fragment>)
  return <>{parts}</>
}
