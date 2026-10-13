/**
 * Masonry renderers: a `masonic`-virtualised grid and the dependency-free
 * equal-width CSS grid fallback, behind one `useMasonryLayout` entry point.
 *
 * `VirtualMasonryGrid` is mounted only once `masonic` has resolved, so the
 * hooks it calls run on every one of its renders and no renderer branch can
 * perturb hook order.
 *
 * Card height comes from the caller's stored aspect ratio, never from a decoded
 * bitmap, so a card occupies its final box while its thumbnail is still loading.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { MasonryGeometry, MasonryModule, MasonryVariant } from './masonryLayout'
import { estimateTotalHeight, loadMasonry, peekMasonry, splitColumns } from './masonryLayout'

/** One cell handed to the card renderer. */
export interface MasonryCell<Item> {
  /** Item to render. */
  item: Item
  /** Position in the display order. */
  index: number
  /** Column width this cell occupies. */
  width: number
}

/**
 * Card content a virtualised cell must re-render for.
 *
 * `masonic` memoises each rendered cell on `(width, itemKey)` alone, so an
 * argument that can change without either of those — a selection, a favourite
 * toggle, a rating, an edited name — would be frozen out of the cell forever.
 * The revision is folded into the key so those changes reach the card, while
 * selection and query edits (which are not content) deliberately do not.
 *
 * Consumers must include every prop that affects how their card renders.
 */
export type ItemRevision<Item> = (item: Item, index: number) => string | number

/** Props for {@link useMasonryLayout}. */
export interface UseMasonryLayoutOptions<Item> {
  /** Preferred minimum column width in CSS pixels. */
  minColumnWidth: number
  /** Horizontal and vertical gap between cards in CSS pixels. */
  gutter: number
  /** Upper bound on column count. */
  maxColumnCount?: number
  /** Index of the card whose height seeds the pre-measurement estimate. */
  estimateIndex?: number
  /** Card height for one item at a column width; must be pure and index-stable. */
  cardHeightAt: (index: number, columnWidth: number) => number
  /** Stable React key for one item. */
  itemKey: (item: Item, index: number) => string
  /** Content revision for one item; see {@link ItemRevision}. */
  itemRevision: ItemRevision<Item>
  /** One card element per item. */
  renderCard: (cell: MasonryCell<Item>) => ReactNode
}

/** The layout handle consumed by the gallery. */
export interface MasonryLayoutHandle<Item> {
  /**
   * Attach to the element that owns scrolling and gallery padding.
   *
   * Typed as `RefObject<HTMLDivElement>` rather than the nullable form, because
   * React 18's `ref` attribute rejects a ref whose current value may be `null`.
   */
  scrollRef: React.RefObject<HTMLDivElement>
  /** Geometry for the current container width. */
  geometry: MasonryGeometry
  /** Render the item list through whichever renderer the geometry selected. */
  renderItems: (items: Item[]) => ReactNode
}

/**
 * Present a nullable ref as the non-nullable form React's `ref` attribute wants.
 *
 * A single cast at the boundary, instead of sprinkling `as` through every
 * consumer that attaches the gallery's scroll ref.
 * @param ref - The nullable ref created by `useRef`.
 * @returns The same ref, typed for the `ref` attribute.
 */
export function asRef<T>(ref: React.RefObject<T | null>): React.RefObject<T> {
  return ref as React.RefObject<T>
}

/**
 * Observe a container's content width and height.
 *
 * Width chooses the column count; height tells the virtualised renderer how many
 * rows are visible.
 * @param ref - Ref to the observed element.
 * @returns The latest measured size, both `0` before the first measurement.
 */
function useContainerSize(ref: React.RefObject<HTMLElement | null>): { width: number; height: number } {
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
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure)
      return () => window.removeEventListener('resize', measure)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])
  return size
}

/**
 * Subscribe to the resolved `masonic` channel.
 * @returns `undefined` while undecided, otherwise the module or `null`.
 */
function useMasonryModule(): MasonryModule | null | undefined {
  const [module, setModule] = useState<MasonryModule | null | undefined>(() => peekMasonry())
  useEffect(() => {
    let live = true
    void loadMasonry().then(resolved => {
      if (live) setModule(resolved)
    })
    return () => {
      live = false
    }
  }, [])
  return module
}

/** Props for {@link VirtualMasonryGrid}. */
export interface VirtualMasonryGridProps<Item> {
  /** Scroll container whose offset and height drive virtualisation. */
  scrollRef: React.RefObject<HTMLDivElement | null>
  /** Items in display order. */
  items: Item[]
  /** Stable React key per item. */
  itemKey: (item: Item, index: number) => string
  /** Column count for the current width. */
  columnCount: number
  /** Column width for the current width. */
  columnWidth: number
  /** Gap between cards. */
  gutter: number
  /** Card height for one item at the current column width. */
  cardHeightAt: (index: number, columnWidth: number) => number
  /** Index whose height seeds the pre-measurement estimate. */
  estimateIndex: number
  /** Content revision per item; folded into the cell key. */
  itemRevision: ItemRevision<Item>
  /** One card element per item. */
  renderCard: (cell: MasonryCell<Item>) => ReactNode
  /** Reports the reserved scroll height back to the layout owner. */
  onTotalHeight: (height: number) => void
}

/**
 * Render items through `masonic`'s virtualised grid.
 * @param props - Items, geometry, and the card renderer.
 * @returns The virtualised grid element, or `null` while the module is missing.
 */
function VirtualMasonryGrid<Item>(props: VirtualMasonryGridProps<Item>): JSX.Element | null {
  const module = useMasonryModule()
  const { scrollRef, items, itemKey, itemRevision, columnCount, columnWidth, gutter, cardHeightAt } = props
  const { height: viewportHeight } = useContainerSize(scrollRef)
  const [scrollTop, setScrollTop] = useState(0)

  useEffect(() => {
    const element = scrollRef.current
    if (element === null) return
    const onScroll = (): void => setScrollTop(element.scrollTop)
    onScroll()
    element.addEventListener('scroll', onScroll, { passive: true })
    return () => element.removeEventListener('scroll', onScroll)
  }, [scrollRef])

  // Hooks are reached through the resolved namespace rather than a static
  // import, so this component must not render while the module is unknown.
  const positioner = module?.usePositioner({
    width: Math.max(columnWidth * columnCount + gutter * (columnCount - 1), columnWidth),
    columnWidth,
    columnGutter: gutter,
    rowGutter: gutter,
    columnCount,
  })
  const resizeObserver = module == null || positioner === undefined
    ? undefined
    : module.useResizeObserver(positioner)

  const renderCard = useRef(props.renderCard)
  renderCard.current = props.renderCard

  // `masonic` compares these two by reference, so an inline function would
  // invalidate its positioner on every render and collapse the grid to one column.
  const render = useCallback(
    (cell: { index: number; width: number; data: Item }): JSX.Element =>
      renderCard.current({ item: cell.data, index: cell.index, width: cell.width }) as JSX.Element,
    [],
  )
  // `masonic` caches the rendered element on this key, so the content revision
  // rides on it: a favourite toggle or a rename invalidates that one cell while
  // selection and query edits (absent from the revision) leave every cell alone.
  const key = useCallback(
    (item: Item, index: number): string => `${itemKey(item, index)}#${itemRevision(item, index)}`,
    [itemKey, itemRevision],
  )

  // Reserve the scroll height from the same card heights the cards will render
  // at, so the scrollbar cannot jump once the measured values replace it.
  const reservedHeight = estimateTotalHeight(
    items.map((_, index) => cardHeightAt(index, columnWidth)),
    columnCount,
    gutter,
  )
  const onTotalHeight = props.onTotalHeight
  const previousHeight = useRef(-1)
  useEffect(() => {
    if (previousHeight.current === reservedHeight) return
    previousHeight.current = reservedHeight
    onTotalHeight(reservedHeight)
  }, [reservedHeight, onTotalHeight])

  if (module == null || positioner === undefined || resizeObserver === undefined) return null

  return module.useMasonry({
    positioner,
    resizeObserver,
    items,
    height: viewportHeight,
    scrollTop,
    itemKey: key,
    overscanBy: 2,
    itemHeightEstimate: cardHeightAt(props.estimateIndex, columnWidth) + 64,
    render,
  })
}

/**
 * Lay items into balanced columns without virtualisation.
 *
 * Each item joins the column with the fewest items, which reproduces the ragged
 * masonry rhythm with no measurement at all.
 * @param props - Column count, gutter, and one element per item.
 * @returns A flex row of column stacks.
 */
export function CssMasonryGrid(props: {
  columnCount: number
  gutter: number
  children: ReactNode[]
}): JSX.Element {
  const columnCount = Math.max(1, props.columnCount)
  const columns = useMemo((): ReactNode[][] => {
    const buckets: ReactNode[][] = Array.from({ length: columnCount }, () => [])
    ;(props.children ?? []).forEach((child, index) => {
      buckets[index % columnCount]?.push(child)
    })
    return buckets
  }, [props.children, columnCount])
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: props.gutter }}>
      {columns.map((column, columnIndex) => (
        <div
          key={columnIndex}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: props.gutter,
            flex: '1 1 0',
            minWidth: 0,
          }}
        >
          {column}
        </div>
      ))}
    </div>
  )
}

/**
 * Own the gallery's scroll ref, geometry, and renderer choice.
 * @param itemCount - Number of items, used to seed the reserved scroll height.
 * @param options - Column, gutter, card-height, key, and card-render settings.
 * @returns A handle exposing the scroll ref, geometry, and item renderer.
 */
export function useMasonryLayout<Item>(
  itemCount: number,
  options: UseMasonryLayoutOptions<Item>,
): MasonryLayoutHandle<Item> {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const { minColumnWidth, gutter, maxColumnCount = 4, cardHeightAt, itemKey, itemRevision, renderCard } =
    options
  const estimateIndex = options.estimateIndex ?? 0
  const { width } = useContainerSize(scrollRef)
  const module = useMasonryModule()
  const [measuredHeight, setMeasuredHeight] = useState(0)

  const { columnCount, columnWidth } = splitColumns(width, minColumnWidth, gutter, maxColumnCount)
  const canVirtualize = module != null && typeof ResizeObserver !== 'undefined'
  // The fallback must render before the first measurement, so an unmeasured
  // container counts as one column rather than as no content.
  const variant: MasonryVariant = canVirtualize && width > 0 ? 'virtualized' : 'grid'

  // The virtualised renderer reports its own measured height; until it does, the
  // reserved height is estimated from the same card heights the cards will use.
  const estimatedHeight = useMemo(() => {
    const heights: number[] = []
    for (let index = 0; index < itemCount; index += 1) {
      heights.push(cardHeightAt(index, columnWidth))
    }
    return estimateTotalHeight(heights, columnCount, gutter)
  }, [itemCount, cardHeightAt, columnWidth, columnCount, gutter])

  const totalHeight = variant === 'virtualized' ? measuredHeight || estimatedHeight : 0

  const renderCardRef = useRef(renderCard)
  renderCardRef.current = renderCard

  const onMeasured = useCallback((height: number): void => {
    setMeasuredHeight(previous => (previous === height ? previous : height))
  }, [])

  const renderItems = useCallback(
    (items: Item[]): ReactNode => {
      if (variant === 'virtualized') {
        return (
          <VirtualMasonryGrid<Item>
            // `masonic`'s positioner is built for one item array and keeps cell
            // positions for indices a changed array no longer has; reusing it
            // across a filter change hands `getRefSetter` a stale cell and throws
            // inside its element cache. Remounting on a new item set is the
            // supported way to reset that state.
            key={`al-grid:${items.length}:${columnCount}:${columnWidth}`}
            scrollRef={scrollRef}
            items={items}
            itemKey={itemKey}
            itemRevision={itemRevision}
            columnCount={columnCount}
            columnWidth={columnWidth}
            gutter={gutter}
            cardHeightAt={cardHeightAt}
            estimateIndex={estimateIndex}
            renderCard={cell => renderCardRef.current(cell)}
            onTotalHeight={onMeasured}
          />
        )
      }
      return (
        <CssMasonryGrid columnCount={columnCount} gutter={gutter}>
          {items.map((item, index) =>
            renderCardRef.current({ item, index, width: columnWidth }),
          )}
        </CssMasonryGrid>
      )
    },
    [
      variant,
      itemKey,
      itemRevision,
      columnCount,
      columnWidth,
      gutter,
      cardHeightAt,
      estimateIndex,
      onMeasured,
    ],
  )

  // A geometry change invalidates the last measurement, so the estimate stands in
  // until the renderer has re-measured at the new column width.
  useEffect(() => {
    setMeasuredHeight(0)
  }, [columnWidth, columnCount, itemCount])

  return {
    scrollRef: asRef(scrollRef),
    geometry: { variant, columnCount, columnWidth, gutter, totalHeight },
    renderItems,
  }
}
