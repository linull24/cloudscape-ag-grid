import { useCallback, useMemo, useState } from 'react';
import type { ColDef } from 'ag-grid-community';
import type { CollectionPreferencesProps } from '@cloudscape-design/components/collection-preferences';

/**
 * The minimum metadata the package needs to manage column visibility and order.
 * Labels remain application-owned (and therefore localizable by the app).
 */
export interface GridPreferenceColumn {
  id: string;
  label: string;
  defaultVisible?: boolean;
  /** Always-visible columns cannot be hidden by CollectionPreferences. */
  alwaysVisible?: boolean;
}

export interface UseGridPreferencesOptions {
  columns: readonly GridPreferenceColumn[];
  /** Enables page-size preferences and returns a numeric `pageSize`. */
  defaultPageSize?: number;
  /** Controlled preferences. Omit for internal state. */
  value?: CollectionPreferencesProps.Preferences;
  onChange?: (preferences: CollectionPreferencesProps.Preferences) => void;
}

export interface GridPreferencesResult {
  preferences: CollectionPreferencesProps.Preferences;
  setPreferences: (preferences: CollectionPreferencesProps.Preferences) => void;
  contentDisplay: readonly CollectionPreferencesProps.ContentDisplayItem[];
  orderedColumnIds: readonly string[];
  visibleColumnIds: ReadonlySet<string>;
  pageSize: number | undefined;
  /** Reorders, hides, and keeps unmanaged definitions in their original order. */
  applyToColumnDefs: <T>(columnDefs: readonly ColDef<T>[]) => ColDef<T>[];
}

function isColumnItem(
  item: CollectionPreferencesProps.ContentDisplayItem,
): item is CollectionPreferencesProps.ContentDisplayColumn {
  return item.type !== 'group';
}

function normalizePreferences(
  columns: readonly GridPreferenceColumn[],
  raw: CollectionPreferencesProps.Preferences | undefined,
  defaultPageSize: number | undefined,
): CollectionPreferencesProps.Preferences {
  const columnById = new Map(columns.map(column => [column.id, column]));
  const seen = new Set<string>();
  const contentDisplay: CollectionPreferencesProps.ContentDisplayItem[] = [];

  for (const item of raw?.contentDisplay ?? []) {
    if (!isColumnItem(item) || seen.has(item.id)) {
      continue;
    }
    const column = columnById.get(item.id);
    if (!column) {
      continue;
    }
    contentDisplay.push({
      type: 'column',
      id: item.id,
      visible: column.alwaysVisible ? true : item.visible,
    });
    seen.add(item.id);
  }

  for (const column of columns) {
    if (seen.has(column.id)) {
      continue;
    }
    contentDisplay.push({
      type: 'column',
      id: column.id,
      visible: column.alwaysVisible
        ? true
        : column.defaultVisible !== false,
    });
    seen.add(column.id);
  }

  return {
    ...raw,
    contentDisplay,
    pageSize: raw?.pageSize ?? defaultPageSize,
  };
}

/**
 * Controlled or internally-managed column visibility/order and page size for a
 * Cloudscape `CollectionPreferences` toolbar. The returned preferences object
 * is directly serializable and can be persisted with a workspace.
 */
export function useGridPreferences({
  columns,
  defaultPageSize,
  value,
  onChange,
}: UseGridPreferencesOptions): GridPreferencesResult {
  const [internalPreferences, setInternalPreferences] =
    useState<CollectionPreferencesProps.Preferences>(() =>
      normalizePreferences(columns, undefined, defaultPageSize),
    );

  const preferences = useMemo(
    () =>
      normalizePreferences(
        columns,
        value ?? internalPreferences,
        defaultPageSize,
      ),
    [columns, defaultPageSize, internalPreferences, value],
  );

  const setPreferences = useCallback(
    (next: CollectionPreferencesProps.Preferences) => {
      const normalized = normalizePreferences(columns, next, defaultPageSize);
      if (value === undefined) {
        setInternalPreferences(normalized);
      }
      onChange?.(normalized);
    },
    [columns, defaultPageSize, onChange, value],
  );

  const contentDisplay = preferences.contentDisplay ?? [];

  const orderedColumnIds = useMemo(
    () =>
      contentDisplay
        .filter(isColumnItem)
        .map(item => item.id),
    [contentDisplay],
  );

  const visibleColumnIds = useMemo(() => {
    const visible = new Set<string>();
    const alwaysVisible = new Set(
      columns.filter(column => column.alwaysVisible).map(column => column.id),
    );
    for (const item of contentDisplay) {
      if (isColumnItem(item) && (item.visible || alwaysVisible.has(item.id))) {
        visible.add(item.id);
      }
    }
    return visible;
  }, [columns, contentDisplay]);

  const applyToColumnDefs = useCallback(
    <T,>(columnDefs: readonly ColDef<T>[]): ColDef<T>[] => {
      const definitions = new Map<string, ColDef<T>>();
      const unmanaged: ColDef<T>[] = [];
      columnDefs.forEach((definition, index) => {
        const id = definition.colId ?? definition.field ?? `__index_${index}`;
        if (orderedColumnIds.includes(id)) {
          definitions.set(id, definition);
        } else {
          unmanaged.push(definition);
        }
      });

      const ordered: ColDef<T>[] = [];
      for (const id of orderedColumnIds) {
        const definition = definitions.get(id);
        if (!definition) {
          continue;
        }
        ordered.push({
          ...definition,
          hide: !visibleColumnIds.has(id),
        });
      }
      return [...ordered, ...unmanaged];
    },
    [orderedColumnIds, visibleColumnIds],
  );

  return {
    preferences,
    setPreferences,
    contentDisplay,
    orderedColumnIds,
    visibleColumnIds,
    pageSize: preferences.pageSize,
    applyToColumnDefs,
  };
}
