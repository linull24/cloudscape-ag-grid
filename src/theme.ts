import { themeBalham, type Theme } from 'ag-grid-community';
import {
  borderRadiusItem,
  colorBackgroundCellShaded,
  colorBackgroundContainerContent,
  colorBackgroundDropdownItemHover,
  colorBackgroundItemSelected,
  colorBorderDividerDefault,
  colorBorderDividerSecondary,
  colorBorderItemFocused,
  colorBorderItemSelected,
  colorTextAccent,
  colorTextBodyDefault,
  colorTextBodySecondary,
  fontFamilyBase,
  fontSizeBodyS,
  fontWeightBold,
  fontWeightNormal,
  spaceScaledXxs,
  spaceScaledXs,
} from '@cloudscape-design/design-tokens';

export type CloudscapeGridColorMode = 'light' | 'dark';
export type CloudscapeGridDensity = 'standard' | 'dense' | 'comfortable';

export interface CloudscapeGridMetrics {
  density: CloudscapeGridDensity;
  /** True for the two denser tiers. */
  compact: boolean;
  rowHeight: number;
  /** Cloudscape table headers are 28px in every density. */
  headerHeight: number;
}

export function getCloudscapeGridMetrics(
  density: CloudscapeGridDensity,
): CloudscapeGridMetrics {
  const rowHeight =
    density === 'dense' ? 24 : density === 'comfortable' ? 32 : 28;
  return {
    density,
    compact: density !== 'comfortable',
    rowHeight,
    headerHeight: 28,
  };
}

/**
 * Cloudscape exposes the table header background as an internal token rather
 * than through @cloudscape-design/design-tokens. Keep the reference (and its
 * Cloudscape token fallback) instead of hard-coding a color, so dark mode
 * follows the Cloudscape base theme.
 */
const colorBackgroundTableHeader =
  'var(--color-background-table-header-dbczmh, var(--color-background-container-header-orof4i))';

const themeCache = new Map<string, Theme>();

/**
 * Themes are immutable and keyed by mode, density, and the numeric metrics that
 * affect font size and row height. Caching keeps the same object identity across
 * renders so AG Grid does not regenerate its theme stylesheet when nothing
 * changed. At most six themes exist (two modes x three densities).
 */
export function getCloudscapeGridTheme(
  mode: CloudscapeGridColorMode,
  density: CloudscapeGridDensity,
  metrics: CloudscapeGridMetrics = getCloudscapeGridMetrics(density),
): Theme {
  const cacheKey = `${mode}:${density}:${metrics.rowHeight}:${metrics.headerHeight}`;
  const cached = themeCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const fontSize = fontSizeBodyS;

  const theme = themeBalham.withParams({
    // Cloudscape tokens are CSS custom properties with light-mode fallbacks.
    // The variables are redefined under .awsui-dark-mode, so a mode change is
    // resolved by CSS without rebuilding the theme stylesheet.
    backgroundColor: colorBackgroundContainerContent,
    wrapperBackgroundColor: colorBackgroundContainerContent,
    dataBackgroundColor: colorBackgroundContainerContent,
    foregroundColor: colorTextBodyDefault,
    textColor: colorTextBodyDefault,
    cellTextColor: colorTextBodyDefault,
    subtleTextColor: colorTextBodySecondary,
    borderColor: colorBorderDividerSecondary,
    chromeBackgroundColor: colorBackgroundTableHeader,
    headerBackgroundColor: colorBackgroundTableHeader,
    headerTextColor: colorTextBodyDefault,
    accentColor: colorTextAccent,
    rangeSelectionBorderColor: colorTextAccent,
    iconColor: colorTextBodySecondary,
    iconSize: 16,
    rowHoverColor: colorBackgroundDropdownItemHover,
    selectedRowBackgroundColor: colorBackgroundItemSelected,
    browserColorScheme: mode,
    headerCellHoverBackgroundColor: 'transparent',
    fontFamily: fontFamilyBase,
    headerFontFamily: fontFamilyBase,
    cellFontFamily: fontFamilyBase,
    fontSize,
    dataFontSize: fontSize,
    cellFontSize: fontSize,
    headerFontSize: fontSize,
    fontWeight: fontWeightNormal,
    cellFontWeight: fontWeightNormal,
    headerFontWeight: fontWeightBold,
    rowHeight: metrics.rowHeight,
    headerHeight: metrics.headerHeight,
    // Cloudscape table cells use 12px inline padding; 8px keeps a 260px
    // sidebar usable while remaining token-derived.
    cellHorizontalPadding: spaceScaledXs,
    spacing: spaceScaledXxs,
    borderRadius: borderRadiusItem,
    focusShadow: `0 0 0 2px ${colorBorderItemFocused}`,
    wrapperBorder: false,
    wrapperBorderRadius: 0,
    columnBorder: false,
    headerColumnBorder: false,
    pinnedColumnBorder: {
      width: 1,
      style: 'solid',
      color: colorBorderDividerSecondary,
    },
    headerRowBorder: {
      width: 1,
      style: 'solid',
      color: colorBorderDividerDefault,
    },
    headerColumnResizeHandleColor: colorBorderDividerDefault,
    headerColumnResizeHandleWidth: '1px',
    headerColumnResizeHandleHeight: '50%',
    rowBorder: {
      width: 1,
      style: 'solid',
      color: colorBorderDividerSecondary,
    },
    oddRowBackgroundColor: 'transparent',
    valueChangeValueHighlightBackgroundColor: colorBackgroundCellShaded,
  });

  themeCache.set(cacheKey, theme);
  return theme;
}

/**
 * Token references for inline styles so application cells and package
 * behaviours use the same Cloudscape colors in both modes.
 */
export const cloudscapeGridPalette = {
  activeRowBackground: colorBackgroundItemSelected,
  activeRowOutline: colorBorderItemSelected,
  rowHoverBackground: colorBackgroundDropdownItemHover,
  focusRing: colorBorderItemFocused,
  spreadBackground: colorBackgroundCellShaded,
  flashBackground: colorBackgroundCellShaded,
  centerLine: colorBorderDividerDefault,
  headerBackground: colorBackgroundTableHeader,
  text: colorTextBodyDefault,
  textSecondary: colorTextBodySecondary,
} as const;
