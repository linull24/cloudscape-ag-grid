# cloudscape-ag-grid

A small, Cloudscape-native integration layer for **AG Grid Community**. It keeps
AG Grid's dense data engine and virtualization while Cloudscape owns color,
typography, density, overlays, filtering, preferences, and error states. No AG
Grid Enterprise modules are used or required.

> Not affiliated with or endorsed by Amazon Web Services or AG Grid.

## Source of truth

The canonical repository is
<https://github.com/linull24/cloudscape-ag-grid>, released under Apache-2.0.
LocalView vendors a copy at
`apps/localview/web/packages/cloudscape-ag-grid` in the gp monorepo so the Go
build remains reproducible without an external path dependency.
`apps/localview/scripts/sync-grid-package.sh` refreshes the vendored copy from
this directory and records SHA-256 hashes; `make grid-check` fails when the two
copies diverge. Edit this package first, then sync.

## What it provides

- **Token-driven grid theme** — colors, fonts, spacing, borders, focus rings,
  and flash backgrounds come from `@cloudscape-design/design-tokens` (plus the
  Cloudscape table-header token). Light/dark mode and density switch through CSS
  variables without rebuilding the theme.
- **Three densities** — `standard` (28px rows), `dense` (24px), and
  `comfortable` (32px). Headers are 28px in every density. No zebra striping.
- **`CloudscapeGrid`** — Community defaults for product tables: fixed-width
  columns by default (opt in to resizing per grid or per column), immovable
  columns, no column/context menus, no horizontal scrollbar, stable
  row IDs, sticky header, native text selection and copy, Cloudscape no-rows /
  loading / error overlays, active-row background plus outline, row
  activation by click or <kbd>Enter</kbd>/<kbd>Space</kbd>, and a small
  imperative handle (`scrollToTop`) plus a body-scroll-state callback for
  streaming lists.
- **`CloudscapeGridProvider`** — supplies mode, density, theme, locale text, and
  optional market colors to every grid below it.
- **`useGridPropertyFilter`** — connects Cloudscape `PropertyFilter` to AG Grid
  row data through the official `@cloudscape-design/collection-hooks`
  `useCollection` hook. Filtering is client-side and query state survives
  streaming row updates. Optional pagination is supported.
- **`useGridPreferences`** — controlled or internal column visibility/order and
  page size for Cloudscape `CollectionPreferences`; the returned preference
  object is serializable for workspace persistence.
- **`zhCNPropertyFilterI18nStrings`** — a complete Simplified Chinese string set
  for `PropertyFilter` (all keys, including token editor and ARIA labels).
- **`zhCNGridLocaleText`** — a comprehensive Simplified Chinese AG Grid locale
  covering overlays, sort/keyboard hints, filter operators and summaries, date
  presets, common validation messages, pagination, and number separators.

## Cloudscape ownership

AG Grid Community supplies the data engine and virtualization. Everything that
looks or behaves like product UI is owned by Cloudscape:

| AG Grid capability | Cloudscape replacement |
| --- | --- |
| Grid chrome, colors, typography, density | `@cloudscape-design/design-tokens` + `CloudscapeGridProvider` |
| Column / quick filter menus | `PropertyFilter` via `useGridPropertyFilter` |
| Tool panel, column chooser, column order | `CollectionPreferences` via `useGridPreferences` |
| Status bar, row counts | `PropertyFilter` `countText`, `Header` description, `Pagination` |
| Pagination | Cloudscape `Pagination` |
| Empty, loading, and error states | Cloudscape `Box`, `Spinner`, `Alert` |
| Row selection highlight | Cloudscape selected-item token plus a 1px outline |
| Context menu and header menu button | Disabled in `CloudscapeGrid` defaults |

Column menus, context menus, AG Grid filters, movable columns, and horizontal
scrolling are intentionally disabled. Column resizing is off by default because
Cloudscape tables are fixed-width and because a resized column can push a
primary panel into overflow; set `resizable: true` in the grid's
`defaultColDef` (or on individual columns) to opt in. Keyboard navigation and
native cell text selection remain available.

## Install

```bash
pnpm add cloudscape-ag-grid
pnpm add ag-grid-community ag-grid-react react react-dom
pnpm add @cloudscape-design/components @cloudscape-design/design-tokens \
  @cloudscape-design/collection-hooks
```

Peer dependencies are intentionally broad (`ag-grid >= 36`, Cloudscape `>= 3`,
React `>= 18`).

## Setup

Register the AG Grid Community module once, import Cloudscape global styles, and
wrap the application:

```tsx
import { AgGridProvider } from 'ag-grid-react';
import { AllCommunityModule } from 'ag-grid-community';
import { I18nProvider } from '@cloudscape-design/components/i18n';
import allZhCN from '@cloudscape-design/components/i18n/messages/all.zh-CN';
import '@cloudscape-design/global-styles/index.css';
import { applyMode, applyDensity, Density, Mode } from '@cloudscape-design/global-styles';
import {
  CloudscapeGridProvider,
  zhCNGridLocaleText,
} from 'cloudscape-ag-grid';

applyMode(Mode.Light);         // or Mode.Dark
applyDensity(Density.Compact); // or Density.Comfortable

const modules = [AllCommunityModule];

createRoot(root).render(
  <I18nProvider locale="zh-CN" messages={[allZhCN]}>
    <AgGridProvider modules={modules}>
      <CloudscapeGridProvider
        mode="light"          // 'light' | 'dark'
        density="standard"    // 'dense' | 'standard' | 'comfortable'
        localeText={zhCNGridLocaleText}
        marketColors={{
          up: 'var(--color-price-up)',
          down: 'var(--color-price-down)',
          flat: 'var(--color-text-body-secondary)',
        }}
      >
        <App />
      </CloudscapeGridProvider>
    </AgGridProvider>
  </I18nProvider>,
);
```

`CloudscapeGridProvider` does not call `applyMode`/`applyDensity` itself — the
application remains in control of Cloudscape global styles.

## Grid usage

```tsx
import { CloudscapeGrid } from 'cloudscape-ag-grid';
import type { ColDef, GridState } from 'ag-grid-community';

interface Row {
  symbol: string;
  last: number;
}

const columns: ColDef<Row>[] = [
  { colId: 'symbol', headerName: '合约', minWidth: 90, flex: 1 },
  {
    colId: 'last',
    headerName: '最新',
    width: 72,
    flex: 0,
    headerClass: 'csag-numeric-header',
    cellStyle: { textAlign: 'right' },
  },
];

const [gridState, setGridState] = useState<GridState>();

<CloudscapeGrid<Row>
  rowData={rows}
  columnDefs={columns}
  getRowId={row => row.symbol}
  ariaLabel="自选列表"
  emptyText="自选为空"
  loading={loading}
  loadingText="加载中…"
  error={error}
  onRetry={refresh}
  activeRowId={activeSymbol}
  onRowActivate={row => open(row.symbol)}
  height={360}
  initialState={gridState}
  onStateChange={setGridState}
/>
```

`headerClass: 'csag-numeric-header'` right-aligns a header label;
`'csag-center-header'` centers it. `getRowStyle` can add market-specific row
styling; active-row background and outline are merged on top.

### Streaming lists

`onReady` receives a small `CloudscapeGridHandle` when the grid API exists, and
`onBodyScrollStateChange` reports whether the body is at the first row. Use them
to offer a “new rows” jump without reaching into AG Grid:

```tsx
const grid = useRef<CloudscapeGridHandle | null>(null);
const [atTop, setAtTop] = useState(true);

<CloudscapeGrid<Row>
  // ...
  onReady={handle => { grid.current = handle; }}
  onBodyScrollStateChange={setAtTop}
/>

{!atTop && newCount > 0 ? (
  <Button variant="inline-link" onClick={() => grid.current?.scrollToTop()}>
    {newCount} 条新成交
  </Button>
) : null}
```

The handle is deliberately limited to `scrollToTop()`; selection, filtering,
and preferences stay in Cloudscape components.

## Preferences

```tsx
import CollectionPreferences from '@cloudscape-design/components/collection-preferences';
import { useGridPreferences } from 'cloudscape-ag-grid';

const columns = [
  { id: 'symbol', label: '合约', defaultVisible: true, alwaysVisible: true },
  { id: 'last', label: '最新', defaultVisible: true },
  { id: 'change', label: '涨跌', defaultVisible: true },
  { id: 'actions', label: '操作', defaultVisible: true, alwaysVisible: true },
];

const preferences = useGridPreferences({
  columns,
  defaultPageSize: 20,
  // value: savedPreferences,
  // onChange: savePreferences,
});

const visibleColumns = useMemo(
  () => preferences.applyToColumnDefs(columnsWithDefinition),
  [preferences.applyToColumnDefs, columnsWithDefinition],
);

<CollectionPreferences
  contentDisplayPreference={{ title: '显示列', options: columns }}
  pageSizePreference={{ title: '每页条数', options: [10, 20, 50].map(...) }}
  preferences={preferences.preferences}
  onConfirm={({ detail }) => preferences.setPreferences(detail)}
/>
```

Omit `value`/`onChange` for internal state; provide them for controlled
persistence. `preferences.preferences` is JSON-serializable.

## PropertyFilter + client-side filtering

```tsx
import PropertyFilter from '@cloudscape-design/components/property-filter';
import {
  useGridPropertyFilter,
  zhCNPropertyFilterI18nStrings,
} from 'cloudscape-ag-grid';

const filteringProperties = [
  {
    key: 'symbol',
    propertyLabel: '合约代码',
    groupValuesLabel: '合约代码值',
    operators: [':', '!:', '=', '!=', '^', '!^'],
    defaultOperator: ':',
  },
  {
    key: 'statusLabel',
    propertyLabel: '状态',
    groupValuesLabel: '状态值',
    operators: [
      { operator: '=', tokenType: 'enum' },
      { operator: '!=', tokenType: 'enum' },
    ],
  },
];

const filter = useGridPropertyFilter(rows, {
  filteringProperties,
  filteringOptions,
  pageSize: 20, // optional; enables pagination
});

<PropertyFilter
  {...filter.propertyFilterProps}
  i18nStrings={zhCNPropertyFilterI18nStrings}
  filteringAriaLabel="筛选录制列表"
  filteringPlaceholder="按合约或状态筛选"
  countText={filter.hasFilter ? `${filter.filteredCount} 条匹配` : undefined}
  tokenLimit={2}
  expandToViewport
/>

<CloudscapeGrid
  rowData={filter.items}
  columnDefs={columns}
  getRowId={row => row.id}
  ariaLabel="录制列表"
  emptyText={filter.hasFilter ? '没有匹配的录制' : '暂无录制'}
/>
```

`useGridPropertyFilter` uses the same filtering engine Cloudscape Table uses, so
enum tokens, contains/starts-with operators, free text, and pagination behave
like native Cloudscape collections. Query state is owned by `useCollection`, so
streaming row updates do not clear the filter.

### Persistence contract

Grid state is made of three independently serializable pieces:

```tsx
const [gridState, setGridState] = useState<GridState>();
const preferences = useGridPreferences({ columns, value, onChange });
const filter = useGridPropertyFilter(rows, { filteringProperties });

const saved = {
  gridState,                 // column order, width, sort, pinning
  preferences: preferences.preferences,
  propertyFilterQuery: filter.query,
};

// later
setGridState(saved.gridState);
preferences.setPreferences(saved.preferences);
filter.setQuery(saved.propertyFilterQuery);
```

`initialState`/`onStateChange` cover AG Grid column state, `useGridPreferences`
covers visibility/order/page size, and `query`/`setQuery` cover
`PropertyFilter`. The package does not depend on LocalView workspace types;
persisting the three values is application-owned.

### Enum properties

For `tokenType: 'enum'`, the item field must contain the same primitive value as
the token value. If users should see a localized label, add `format` to the
operator and put the label in `filteringOptions`:

```tsx
const filteringProperties = [
  {
    key: 'direction',
    propertyLabel: '涨跌方向',
    groupValuesLabel: '涨跌方向值',
    operators: [
      { operator: '=', tokenType: 'enum' },
      { operator: '!=', tokenType: 'enum' },
    ],
  },
];

const filteringOptions = [
  { propertyKey: 'direction', value: 'up', label: '上涨' },
  { propertyKey: 'direction', value: 'down', label: '下跌' },
];
```

Cloudscape limits options that carry a `label` to the `=` and `!=` operators.
For options used with contains or starts-with operators, omit `label` and let
the option value be displayed directly.

## Behaviour details

- **Flash** — changed primitive cell values flash for 180ms and fade for 40ms
  (a 220ms visual window), with at most one flash per cell per 300ms. The
  package measures displayed values after each row-model update and calls AG
  Grid's `flashCells` for only the cells that changed; AG Grid's unthrottled
  `enableCellChangeFlash` is disabled by default. `usePrefersReducedMotion`
  disables flashes and the package stylesheet also removes flash transitions
  under `prefers-reduced-motion: reduce`. Rows are never animated
  (`animateRows=false`). Override the timing with `flashDuration` and
  `flashFadeDuration`; values are clamped to the 150–250ms window.
- **Batched updates** — high-frequency `rowData` changes are coalesced into one
  AG Grid row-model update per animation frame.
- **Stable updates** — `getRowId` is required. Active row ids and filters survive
  data refreshes and streaming updates. Watchlists should keep a stable input
  order; the package does not add an initial sort.
- **Column sizing** — the default `fitGridWidth` strategy runs once on load, not
  continuously, so streaming updates and user widths are stable. Pass
  `autoSizeStrategy={null}` to keep the exact widths from the column
  definitions. Columns use `flex: 1` and `minWidth: 44` unless a column sets
  its own width; primary panels must hide or compress columns instead of
  scrolling horizontally.
- **Error state** — the grid renders a non-modal Cloudscape `Alert` below the
  header. The header, column widths, and the last rows remain visible, and the
  alert does not block interaction with the data underneath. `onRetry` exposes a
  retry action.
- **Cell copy** — native text selection is enabled, and finishing a drag
  selection does not activate the row.
- **Density override** — pass `density` on a single grid to use `dense` or
  `comfortable` without changing the provider.

## Design notes

- **No hard-coded colors.** The grid consumes Cloudscape tokens directly. Tokens
  are CSS variables with light-mode fallbacks, and Cloudscape redefines them
  under `.awsui-dark-mode`.
- **Token mapping.** The theme maps AG Grid parameters to Cloudscape tokens:

  | AG Grid parameter | Cloudscape token |
  | --- | --- |
  | `backgroundColor`, `dataBackgroundColor` | `colorBackgroundContainerContent` |
  | `foregroundColor`, `textColor`, `cellTextColor`, `headerTextColor` | `colorTextBodyDefault` |
  | `subtleTextColor`, `iconColor` | `colorTextBodySecondary` |
  | `chromeBackgroundColor`, `headerBackgroundColor` | Cloudscape table-header token |
  | `accentColor`, `rangeSelectionBorderColor` | `colorTextAccent` |
  | `rowHoverColor` | `colorBackgroundDropdownItemHover` |
  | `selectedRowBackgroundColor` | `colorBackgroundItemSelected` |
  | `borderColor`, `rowBorder` | `colorBorderDividerSecondary` |
  | `headerRowBorder` | `colorBorderDividerDefault` |
  | `pinnedColumnBorder` | `colorBorderDividerSecondary` |
  | `headerColumnResizeHandleColor` | `colorBorderDividerDefault` |
  | `focusShadow` | `colorBorderItemFocused` |
  | `valueChangeValueHighlightBackgroundColor` | `colorBackgroundCellShaded` |
  | `fontFamily`, `headerFontFamily`, `cellFontFamily` | `fontFamilyBase` |
  | `fontSize`, `dataFontSize`, `cellFontSize`, `headerFontSize` | `fontSizeBodyS` |
  | `fontWeight`, `cellFontWeight` / `headerFontWeight` | `fontWeightNormal` / `fontWeightBold` |
  | `cellHorizontalPadding` | `spaceScaledXs` (8px) |
  | `spacing` | `spaceScaledXxs` |
  | `borderRadius` | `borderRadiusItem` |
  | `browserColorScheme` | provider `mode` (`light` / `dark`) |

  Row and header heights are numeric because Cloudscape exposes density through
  spacing tokens rather than a grid row-height token: 24/28/32px rows and 28px
  headers.
- **No Enterprise modules.** Column menus, context menus, and AG Grid filters are
  disabled. Use Cloudscape `PropertyFilter`, `CollectionPreferences`, and
  `Pagination` instead.
- **Theme caching.** `getCloudscapeGridTheme` caches themes by mode, density, and
  the metrics that affect row height, so the same immutable theme object is
  reused across renders. Toggling light/dark and density therefore reuses at
  most six theme objects instead of registering a new one per render.
- **Accessibility.** The grid is exposed as a labelled `region` with
  `aria-busy` while loading; rows can be activated with <kbd>Enter</kbd> or
  <kbd>Space</kbd>; keyboard events originating from action buttons, links, or
  inputs inside a cell are left to those controls; overlays render as polite
  status regions (errors as `alert`); `PropertyFilter` receives a complete ARIA
  label set; and `zhCNGridLocaleText` localizes AG Grid's keyboard and sorting
  hints.

## Development

```bash
pnpm install
pnpm typecheck
pnpm build      # emits dist/ (ESM + d.ts)
```

## License

Apache-2.0. See [LICENSE](./LICENSE).
