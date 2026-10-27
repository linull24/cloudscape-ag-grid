/**
 * A deliberately small, token-driven stylesheet for behaviours AG Grid does not
 * expose as theme parameters. Application code must not add grid-specific CSS.
 */
const STYLE_ELEMENT_ID = 'cloudscape-ag-grid-styles';

export const CLOUDSCAPE_GRID_NUMERIC_HEADER_CLASS = 'csag-numeric-header';
export const CLOUDSCAPE_GRID_CENTER_HEADER_CLASS = 'csag-center-header';

const GRID_CSS = `
.ag-cell {
  font-variant-numeric: tabular-nums;
}
.${CLOUDSCAPE_GRID_NUMERIC_HEADER_CLASS} .ag-header-cell-label {
  justify-content: flex-end;
}
.${CLOUDSCAPE_GRID_CENTER_HEADER_CLASS} .ag-header-cell-label {
  justify-content: center;
}
.ag-cell.ag-cell-focus:not(.ag-cell-range-selected):focus-within {
  border-color: transparent;
  outline: 2px solid var(--ag-range-selection-border-color);
  outline-offset: -2px;
}
@media (prefers-reduced-motion: reduce) {
  .ag-cell-data-changed,
  .ag-cell-data-changed-animation {
    transition: none !important;
    animation: none !important;
  }
}
`;

export function ensureCloudscapeGridStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ELEMENT_ID)) {
    return;
  }
  const style = document.createElement('style');
  style.id = STYLE_ELEMENT_ID;
  style.textContent = GRID_CSS;
  document.head.appendChild(style);
}
