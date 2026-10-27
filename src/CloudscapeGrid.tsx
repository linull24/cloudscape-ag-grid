import { useEffect, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type {
  AutoSizeStrategy,
  CellKeyDownEvent,
  ColDef,
  Column,
  FullWidthCellKeyDownEvent,
  GetRowIdFunc,
  GetRowStyle,
  GridApi,
  GridState,
  IRowNode,
  ModelUpdatedEvent,
  RowStyle,
  StateUpdatedEvent,
} from 'ag-grid-community';
import { useCloudscapeGridSettings } from './context.js';
import { usePrefersReducedMotion } from './motion.js';
import { cloudscapeGridPalette } from './theme.js';
import type { CloudscapeGridDensity } from './theme.js';
import { getCloudscapeGridMetrics, getCloudscapeGridTheme } from './theme.js';
import {
  CloudscapeErrorOverlay,
  CloudscapeLoadingOverlay,
  CloudscapeNoRowsOverlay,
} from './overlays.js';

const interactiveSelector =
  'button, a, input, select, textarea, [role="button"], [role="link"], [contenteditable="true"]';

const MIN_FLASH_INTERVAL_MS = 300;
const MIN_FLASH_DURATION_MS = 150;
const MAX_FLASH_DURATION_MS = 250;
const DEFAULT_FLASH_DURATION_MS = 180;
const DEFAULT_FLASH_FADE_DURATION_MS = 40;

function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.closest(interactiveSelector) !== null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * A flash is the highlight plus its fade. Keep the entire visual window inside
 * 150–250ms and ensure the CSS never outlives the frequency budget.
 */
function resolveFlashTiming(
  duration: number | undefined,
  fade: number | undefined,
): { flashDuration: number; fadeDuration: number } {
  const flashDuration = clamp(
    Number.isFinite(duration) ? (duration as number) : DEFAULT_FLASH_DURATION_MS,
    MIN_FLASH_DURATION_MS,
    MAX_FLASH_DURATION_MS,
  );
  const requestedFade = Number.isFinite(fade)
    ? (fade as number)
    : DEFAULT_FLASH_FADE_DURATION_MS;
  return {
    flashDuration,
    fadeDuration: clamp(
      requestedFade,
      0,
      MAX_FLASH_DURATION_MS - flashDuration,
    ),
  };
}

function cellKey(rowId: string, columnId: string): string {
  return `${rowId}\u0000${columnId}`;
}

/**
 * Only primitive values are compared. Structural objects are not market values
 * and comparing them by reference would flash cells that did not meaningfully
 * change.
 */
function isFlashableValue(value: unknown): boolean {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'bigint' ||
    typeof value === 'boolean'
  );
}

/**
 * Coalesces high-frequency row updates into one AG Grid update per animation
 * frame. Streaming feeds can deliver several ticks in the same frame; without
 * this, every delivery would rebuild the row model.
 */
function useBatchedRowData<T>(rowData: T[]): T[] {
  const [batched, setBatched] = useState(rowData);
  const latest = useRef(rowData);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    latest.current = rowData;
    if (frame.current !== null) {
      return;
    }
    frame.current = window.requestAnimationFrame(() => {
      frame.current = null;
      setBatched(latest.current);
    });
  }, [rowData]);

  useEffect(
    () => () => {
      if (frame.current !== null) {
        window.cancelAnimationFrame(frame.current);
        frame.current = null;
      }
    },
    [],
  );

  return batched;
}

export interface CloudscapeGridHandle {
  /** Scrolls the first row to the top of the body viewport. */
  scrollToTop: () => void;
}

export interface CloudscapeGridProps<TData> {
  rowData: TData[];
  columnDefs: ColDef<TData>[];
  /** Returns a stable id so selection and flashes survive streaming updates. */
  getRowId: (row: TData) => string;
  /** Accessible name for the grid region. */
  ariaLabel: string;
  /** Message shown when there are no rows. */
  emptyText: string;
  /** Message shown while loading. Defaults to the provider locale text. */
  loadingText?: string;
  /** Error message. Renders a Cloudscape Alert over the grid body. */
  error?: string;
  onRetry?: () => void;
  retryText?: string;
  height?: number | string;
  loading?: boolean;
  /** Overrides the provider row height. */
  rowHeight?: number;
  /** Overrides the provider density for this grid only. */
  density?: CloudscapeGridDensity;
  /** Row that receives the Cloudscape selected-item background and outline. */
  activeRowId?: string;
  /** Click or Enter/Space activation. Interactive cell content is excluded. */
  onRowActivate?: (row: TData) => void;
  /** @deprecated Use `onRowActivate`. */
  onRowClick?: (row: TData) => void;
  defaultColDef?: ColDef<TData>;
  /** Extra row styles, merged with the active-row styling. */
  getRowStyle?: GetRowStyle<TData>;
  /**
   * Keeps changed cells briefly highlighted. The package rate-limits flashes to
   * one per cell per 300ms and suppresses them under reduced motion.
   * @default true
   */
  flashOnChange?: boolean;
  /** Highlight duration in milliseconds. Clamped to 150–250. */
  flashDuration?: number;
  /** Fade duration in milliseconds. Clamped so the whole flash stays ≤250ms. */
  flashFadeDuration?: number;
  /**
   * Overrides the default fit-to-width strategy. Pass `null` to leave column
   * widths exactly as defined; automatic sizing never runs continuously.
   */
  autoSizeStrategy?: AutoSizeStrategy<TData> | null;
  /** Called after the row model updates, after package flash tracking. */
  onModelUpdated?: (event: ModelUpdatedEvent<TData>) => void;
  initialState?: GridState;
  onStateChange?: (state: GridState) => void;
  /** Receives a small imperative handle when the grid API is ready. */
  onReady?: (handle: CloudscapeGridHandle) => void;
  /** Reports whether the body viewport is scrolled to the first row. */
  onBodyScrollStateChange?: (atTop: boolean) => void;
  className?: string;
}

export function CloudscapeGrid<TData>({
  rowData,
  columnDefs,
  getRowId,
  ariaLabel,
  emptyText,
  loadingText,
  error,
  onRetry,
  retryText,
  height = '100%',
  loading = false,
  rowHeight,
  density,
  activeRowId,
  onRowActivate,
  onRowClick,
  defaultColDef,
  getRowStyle,
  flashOnChange = true,
  flashDuration,
  flashFadeDuration,
  autoSizeStrategy,
  onModelUpdated,
  initialState,
  onStateChange,
  onReady,
  onBodyScrollStateChange,
  className,
}: CloudscapeGridProps<TData>) {
  const settings = useCloudscapeGridSettings();
  const reducedMotion = usePrefersReducedMotion();
  const displayRowData = useBatchedRowData(rowData);
  const activate = onRowActivate ?? onRowClick;
  const apiRef = useRef<GridApi<TData> | null>(null);
  const readyRef = useRef(onReady);
  const flashEnabled = flashOnChange && !reducedMotion;
  const flashTiming = resolveFlashTiming(flashDuration, flashFadeDuration);
  const flashConfig = useRef({
    enabled: flashEnabled,
    ...flashTiming,
  });
  const flashTracking = useRef({
    previousValues: new Map<string, unknown>(),
    lastFlashedAt: new Map<string, number>(),
  });
  const flashFrame = useRef<number | null>(null);
  const handle = useMemo<CloudscapeGridHandle>(
    () => ({
      scrollToTop: () => {
        apiRef.current?.ensureIndexVisible(0, 'top');
      },
    }),
    [],
  );

  useEffect(() => {
    readyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    flashConfig.current = {
      enabled: flashEnabled,
      ...flashTiming,
    };
    if (!flashEnabled) {
      flashTracking.current.previousValues.clear();
      flashTracking.current.lastFlashedAt.clear();
    }
  }, [flashEnabled, flashTiming.flashDuration, flashTiming.fadeDuration]);

  useEffect(
    () => () => {
      if (flashFrame.current !== null) {
        window.cancelAnimationFrame(flashFrame.current);
        flashFrame.current = null;
      }
    },
    [],
  );

  const metrics = density
    ? getCloudscapeGridMetrics(density)
    : settings.metrics;
  const theme = density
    ? getCloudscapeGridTheme(settings.mode, density, metrics)
    : settings.theme;

  const resolveRowId = useMemo<GetRowIdFunc<TData>>(
    () => params => getRowId(params.data),
    [getRowId],
  );

  const mergedRowStyle = useMemo<GetRowStyle<TData>>(
    () => params => {
      if (!params.data) {
        return undefined;
      }
      const active =
        activeRowId !== undefined && getRowId(params.data) === activeRowId;
      const base = getRowStyle?.(params);
      if (!active && !activate) {
        return base;
      }
      const result: RowStyle = {
        ...base,
        ...(activate ? { cursor: 'pointer' } : undefined),
        ...(active
          ? {
              backgroundColor: cloudscapeGridPalette.activeRowBackground,
              // AG Grid paints pinned cells with a gradient built from this
              // variable, so override it on the row to keep the active colour
              // visible under the pinned symbol column too.
              '--ag-data-background-color':
                cloudscapeGridPalette.activeRowBackground,
              outline: `1px solid ${cloudscapeGridPalette.activeRowOutline}`,
              outlineOffset: '-1px',
            }
          : undefined),
      };
      return result;
    },
    [activate, activeRowId, getRowId, getRowStyle],
  );

  const mergedDefaultColDef = useMemo<ColDef<TData>>(
    () => ({
      flex: 1,
      minWidth: 44,
      sortable: false,
      // Cloudscape tables do not resize columns, and resizing is the easiest
      // way to push a primary panel into horizontal overflow. Opt in through
      // `defaultColDef` or a column definition when a consumer needs it.
      resizable: false,
      suppressMovable: true,
      suppressHeaderMenuButton: true,
      suppressHeaderContextMenu: true,
      // The package flashes changed cells itself so the frequency limit can be
      // enforced; AG Grid's built-in flash has no rate control.
      enableCellChangeFlash: false,
      ...defaultColDef,
    }),
    [defaultColDef],
  );

  const defaultAutoSize = useMemo<AutoSizeStrategy<TData>>(
    () => ({ type: 'fitGridWidth', defaultMinWidth: 44 }),
    [],
  );

  const noRowsParams = useMemo(() => ({ message: emptyText }), [emptyText]);
  const loadingParams = useMemo(
    () => ({ message: loadingText ?? settings.localeText.loadingOoo ?? 'Loading…' }),
    [loadingText, settings.localeText],
  );
  const errorParams = useMemo(
    () => ({ message: error ?? '', onRetry, retryText }),
    [error, onRetry, retryText],
  );

  const handleRowActivate = (row: TData): void => {
    activate?.(row);
  };

  const handleCellKeyDown = (
    event: CellKeyDownEvent<TData> | FullWidthCellKeyDownEvent<TData>,
  ): void => {
    if (!activate || !event.data) {
      return;
    }
    const keyboardEvent = event.event;
    if (!(keyboardEvent instanceof KeyboardEvent)) {
      return;
    }
    // Let interactive cell content (action buttons, links, inputs) handle its
    // own keyboard activation without also opening the row.
    if (isInteractiveTarget(keyboardEvent.target)) {
      return;
    }
    if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
      keyboardEvent.preventDefault();
      handleRowActivate(event.data);
    }
  };

  const handleModelUpdated = (event: ModelUpdatedEvent<TData>): void => {
    if (flashConfig.current.enabled) {
      const api = event.api;
      const previous = flashTracking.current.previousValues;
      const next = new Map<string, unknown>();
      const nodesByColumn = new Map<Column, IRowNode<TData>[]>();
      const now = Date.now();

      let renderedNodes: IRowNode<TData>[] = [];
      let displayedColumns: Column[] = [];
      try {
        renderedNodes = api.getRenderedNodes();
        displayedColumns = api.getAllDisplayedColumns();
      } catch {
        renderedNodes = [];
        displayedColumns = [];
      }

      for (const node of renderedNodes) {
        const rowId = node.id;
        if (rowId === undefined || rowId === null) {
          continue;
        }
        for (const column of displayedColumns) {
          const key = cellKey(rowId, column.getColId());
          let value: unknown;
          try {
            value = api.getCellValue({
              rowNode: node,
              colKey: column,
              from: 'data',
            });
          } catch {
            continue;
          }
          next.set(key, value);
          if (!previous.has(key)) {
            continue;
          }
          const oldValue = previous.get(key);
          if (
            !isFlashableValue(oldValue) ||
            !isFlashableValue(value) ||
            Object.is(oldValue, value)
          ) {
            continue;
          }
          const lastFlashed = flashTracking.current.lastFlashedAt.get(key) ?? 0;
          if (now - lastFlashed < MIN_FLASH_INTERVAL_MS) {
            continue;
          }
          flashTracking.current.lastFlashedAt.set(key, now);
          const nodes = nodesByColumn.get(column);
          if (nodes) {
            nodes.push(node);
          } else {
            nodesByColumn.set(column, [node]);
          }
        }
      }

      flashTracking.current.previousValues = next;
      for (const key of Array.from(flashTracking.current.lastFlashedAt.keys())) {
        if (!next.has(key)) {
          flashTracking.current.lastFlashedAt.delete(key);
        }
      }

      if (nodesByColumn.size > 0) {
        if (flashFrame.current !== null) {
          window.cancelAnimationFrame(flashFrame.current);
        }
        flashFrame.current = window.requestAnimationFrame(() => {
          flashFrame.current = null;
          const config = flashConfig.current;
          if (!config.enabled) {
            return;
          }
          for (const [column, nodes] of nodesByColumn) {
            const alive = nodes.filter(
              node =>
                node.displayed &&
                node.id !== undefined &&
                api.getRowNode(node.id) === node,
            );
            if (alive.length === 0) {
              continue;
            }
            api.flashCells({
              rowNodes: alive,
              columns: [column],
              flashDuration: config.flashDuration,
              fadeDuration: config.fadeDuration,
            });
          }
        });
      }
    }

    onModelUpdated?.(event);
  };

  return (
    <div
      className={className}
      style={{ height, minHeight: 0, width: '100%', position: 'relative' }}
      role="region"
      aria-label={ariaLabel}
      aria-busy={loading || undefined}
    >
      <AgGridReact<TData>
        theme={theme}
        rowData={displayRowData}
        columnDefs={columnDefs}
        defaultColDef={mergedDefaultColDef}
        autoSizeStrategy={
          autoSizeStrategy === null
            ? undefined
            : (autoSizeStrategy ?? defaultAutoSize)
        }
        getRowId={resolveRowId}
        getRowStyle={mergedRowStyle}
        rowHeight={rowHeight ?? metrics.rowHeight}
        loading={loading && !error}
        animateRows={false}
        cellFlashDuration={flashTiming.flashDuration}
        cellFadeDuration={flashTiming.fadeDuration}
        enableCellTextSelection
        ensureDomOrder
        suppressHorizontalScroll
        suppressMovableColumns
        suppressContextMenu
        suppressScrollOnNewData
        rowBuffer={12}
        noRowsOverlayComponent={CloudscapeNoRowsOverlay}
        noRowsOverlayComponentParams={noRowsParams}
        loadingOverlayComponent={CloudscapeLoadingOverlay}
        loadingOverlayComponentParams={loadingParams}
        localeText={settings.localeText}
        initialState={initialState}
        onGridReady={event => {
          apiRef.current = event.api;
          readyRef.current?.(handle);
        }}
        onBodyScroll={event => {
          onBodyScrollStateChange?.(
            event.api.getVerticalPixelRange().top <= 0,
          );
        }}
        onStateUpdated={(event: StateUpdatedEvent<TData>) => {
          onStateChange?.(event.state);
        }}
        onModelUpdated={handleModelUpdated}
        onRowClicked={event => {
          const mouseEvent = event.event;
          if (!event.data || !mouseEvent || isInteractiveTarget(mouseEvent.target)) {
            return;
          }
          // enableCellTextSelection makes drag-copy possible; never treat the
          // end of a text selection as row activation.
          const selection = window.getSelection();
          if (selection && !selection.isCollapsed) {
            return;
          }
          handleRowActivate(event.data);
        }}
        onCellKeyDown={handleCellKeyDown}
      />
      {error ? (
        <div
          style={{
            position: 'absolute',
            top: metrics.headerHeight,
            right: 0,
            left: 0,
            zIndex: 2,
            maxHeight: '100%',
            overflow: 'auto',
            pointerEvents: 'none',
          }}
        >
          <CloudscapeErrorOverlay {...errorParams} />
        </div>
      ) : null}
    </div>
  );
}
