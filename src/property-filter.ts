import { useMemo } from 'react';
import { useCollection } from '@cloudscape-design/collection-hooks';
import type {
  PropertyFilterFreeTextFiltering,
  PropertyFilterOption,
  PropertyFilterProperty,
  PropertyFilterQuery,
  UseCollectionResult,
} from '@cloudscape-design/collection-hooks';
import type { PropertyFilterProps } from '@cloudscape-design/components/property-filter';
import type { LocaleText } from 'ag-grid-community';

export interface GridPropertyFilterOptions {
  filteringProperties: readonly PropertyFilterProperty[];
  filteringOptions?: readonly PropertyFilterOption[];
  defaultQuery?: PropertyFilterQuery;
  freeTextFiltering?: PropertyFilterFreeTextFiltering;
  /** Enables client-side pagination with this page size. */
  pageSize?: number;
}

export interface GridPropertyFilterResult<T> {
  /** Rows for the current page (or all filtered rows when pagination is off). */
  items: T[];
  /** All rows that match the current query. */
  filteredItems: T[];
  propertyFilterProps: UseCollectionResult<T>['propertyFilterProps'];
  paginationProps: UseCollectionResult<T>['paginationProps'];
  /** Serializable query state for workspace persistence. */
  query: PropertyFilterQuery;
  setQuery: (query: PropertyFilterQuery) => void;
  filteredCount: number;
  totalCount: number;
  pagesCount: number;
  currentPageIndex: number;
  hasFilter: boolean;
  setCurrentPage: (page: number) => void;
}

/**
 * Thin Cloudscape-native adapter between `PropertyFilter` and AG Grid row data.
 * Filtering is fully client-side and query state survives streaming updates
 * because `useCollection` owns the query state.
 */
export function useGridPropertyFilter<T>(
  allItems: readonly T[],
  options: GridPropertyFilterOptions,
): GridPropertyFilterResult<T> {
  const {
    filteringProperties,
    filteringOptions,
    defaultQuery,
    freeTextFiltering,
    pageSize,
  } = options;

  const collectionOptions = useMemo(
    () => ({
      propertyFiltering: {
        filteringProperties,
        filteringOptions:
          filteringOptions === undefined ? undefined : Array.from(filteringOptions),
        defaultQuery,
        freeTextFiltering,
      },
      pagination: pageSize === undefined ? undefined : { pageSize },
    }),
    [filteringProperties, filteringOptions, defaultQuery, freeTextFiltering, pageSize],
  );

  const collection = useCollection(allItems, collectionOptions);

  return {
    items: Array.from(collection.items),
    filteredItems: Array.from(collection.allPageItems),
    propertyFilterProps: collection.propertyFilterProps,
    paginationProps: collection.paginationProps,
    query: collection.propertyFilterProps.query,
    setQuery: query => {
      collection.actions.setPropertyFiltering(query);
    },
    filteredCount: collection.filteredItemsCount ?? allItems.length,
    totalCount: allItems.length,
    pagesCount: collection.paginationProps.pagesCount ?? 1,
    currentPageIndex: collection.paginationProps.currentPageIndex,
    hasFilter: hasActivePropertyFilter(collection.propertyFilterProps.query),
    setCurrentPage: page => collection.actions.setCurrentPage(page),
  };
}

export function hasActivePropertyFilter(query: PropertyFilterQuery): boolean {
  return query.tokens.length > 0 || (query.tokenGroups?.length ?? 0) > 0;
}

const operatorLabelsZh: Record<string, string> = {
  '<': '小于',
  '<=': '小于等于',
  '>': '大于',
  '>=': '大于等于',
  ':': '包含',
  '!:': '不包含',
  '=': '等于',
  '!=': '不等于',
  '^': '开始于',
  '!^': '不开始于',
};

export function formatPropertyFilterToken(
  token: PropertyFilterProps.FormattedToken,
): string {
  const operator = operatorLabelsZh[token.operator] ?? token.operator;
  return `${token.propertyLabel} ${operator} ${token.value}`;
}

export const zhCNPropertyFilterI18nStrings: PropertyFilterProps.I18nStrings = {
  allPropertiesLabel: '所有属性',
  applyActionText: '应用',
  cancelActionText: '取消',
  clearAriaLabel: '清除筛选输入',
  clearFiltersText: '清除筛选',
  dismissAriaLabel: '关闭',
  editTokenHeader: '编辑筛选条件',
  filteringAriaLabel: '筛选',
  filteringPlaceholder: '输入筛选条件',
  groupPropertiesText: '属性',
  groupValuesText: '值',
  operationAndText: '且',
  operationOrText: '或',
  operatorContainsText: '包含',
  operatorDoesNotContainText: '不包含',
  operatorDoesNotEqualText: '不等于',
  operatorDoesNotStartWithText: '不开始于',
  operatorEqualsText: '等于',
  operatorGreaterOrEqualText: '大于等于',
  operatorGreaterText: '大于',
  operatorLessOrEqualText: '小于等于',
  operatorLessText: '小于',
  operatorStartsWithText: '开始于',
  operatorsText: '运算符',
  operatorText: '运算符',
  propertyText: '属性',
  tokenEditorAddExistingTokenAriaLabel: token =>
    `添加已有筛选条件：${formatPropertyFilterToken(token)}`,
  tokenEditorAddExistingTokenLabel: token =>
    `添加筛选条件“${formatPropertyFilterToken(token)}”`,
  tokenEditorAddNewTokenLabel: '新建筛选条件',
  tokenEditorAddTokenActionsAriaLabel: '添加筛选条件操作',
  tokenEditorTokenActionsAriaLabel: token =>
    `筛选条件操作：${formatPropertyFilterToken(token)}`,
  tokenEditorTokenRemoveAriaLabel: token =>
    `移除筛选条件：${formatPropertyFilterToken(token)}`,
  tokenEditorTokenRemoveFromGroupLabel: '从筛选条件组移除',
  tokenEditorTokenRemoveLabel: '移除筛选条件',
  tokenLimitShowFewer: '收起筛选条件',
  tokenLimitShowMore: '显示更多筛选条件',
  tokenOperatorAriaLabel: '筛选运算符',
  valueText: '值',
  enteredTextLabel: value => `使用“${value}”`,
  formatToken: token => formatPropertyFilterToken(token),
  groupEditAriaLabel: group => `编辑筛选条件组：${group.operationLabel}`,
  removeTokenButtonAriaLabel: token =>
    `移除筛选条件：${formatPropertyFilterToken(token)}`,
};

export const zhCNGridLocaleText: LocaleText = {
  // Grid overlays
  loadingOoo: '加载中…',
  noMatchingRows: '没有匹配的数据',
  noRowsToShow: '暂无数据',
  exportingOoo: '正在导出…',
  loadingError: '加载失败',

  // Header, sorting, and keyboard hints
  ariaSortableColumn: '按回车键排序',
  ariaSortableColumnWithCellSelection: '按 Alt+回车键排序',
  ariaColumnGroupExpansion: '按回车键展开或收起此列组',
  ariaColumnShowValuesAs: '显示值为',
  ariaHeaderSelection: '带表头选择的列',
  ariaHasNote: '此单元格有备注。',
  ariaPendingChange: '待处理更改',
  ariaCalculatedColumn: '计算列',
  ariaInputEditor: '输入编辑器',
  ariaRowSelectAll: '按空格键切换所有行的选择',
  ariaToggleCellValue: '按空格键切换单元格值',
  ariaValidationErrorPrefix: '单元格编辑器校验',
  ariaDeferSkeletonCellLoading: '等待单元格加载',
  ariaSkeletonCellLoading: '单元格加载中',
  ariaSkeletonCellLoadingFailed: '单元格加载失败',

  // Column menus and filters (disabled by this module, kept for completeness)
  ariaFilterColumn: '按 Ctrl+回车键打开筛选',
  ariaMenuColumn: '按 Alt+向下键打开列菜单',
  ariaLabelColumnFilter: '列筛选',
  ariaLabelColumnMenu: '列菜单',
  ariaColumnFiltered: '列已筛选',
  ariaFilterMenuOpen: '筛选菜单已打开',
  ariaFilterInput: '筛选输入',
  ariaFilteringOperator: '筛选运算符',
  ariaDateFilterInput: '日期筛选输入',
  ariaLabelInputClear: '清除',

  // Validation
  invalidBigInt: '无效的大整数',
  invalidDate: '无效日期',
  invalidNumber: '无效数字',
  invalidSelectionValidation: '无效选择。',
  tooltipValidationErrorSeparator: '。',

  // Filter operators and summaries
  applyFilter: '应用筛选',
  clearFilter: '清除筛选',
  resetFilter: '重置筛选',
  cancelFilter: '取消筛选',
  textFilter: '文本筛选',
  numberFilter: '数字筛选',
  bigintFilter: '大整数筛选',
  dateFilter: '日期筛选',
  setFilter: '集合筛选',
  filterOoo: '筛选…',
  empty: '空',
  equals: '等于',
  notEqual: '不等于',
  lessThan: '小于',
  greaterThan: '大于',
  inRange: '介于',
  inRangeStart: '起始',
  inRangeEnd: '结束',
  lessThanOrEqual: '小于等于',
  greaterThanOrEqual: '大于等于',
  contains: '包含',
  notContains: '不包含',
  startsWith: '开始于',
  endsWith: '结束于',
  blank: '空白',
  notBlank: '非空白',
  before: '早于',
  after: '晚于',
  andCondition: '且',
  orCondition: '或',
  dateFormatOoo: 'yyyy-mm-dd',
  filterSummaryInactive: '全部',
  filterSummaryContains: '包含',
  filterSummaryNotContains: '不包含',
  filterSummaryTextEquals: '等于',
  filterSummaryTextNotEqual: '不等于',
  filterSummaryStartsWith: '开始于',
  filterSummaryEndsWith: '结束于',
  filterSummaryBlank: '空白',
  filterSummaryNotBlank: '非空白',
  filterSummaryEquals: '=',
  filterSummaryNotEqual: '!=',
  filterSummaryGreaterThan: '>',
  filterSummaryGreaterThanOrEqual: '>=',
  filterSummaryLessThan: '<',
  filterSummaryLessThanOrEqual: '<=',
  filterSummaryInRange: '介于',

  // Date presets
  yesterday: '昨天',
  today: '今天',
  tomorrow: '明天',
  last7Days: '最近 7 天',
  lastWeek: '上周',
  thisWeek: '本周',
  nextWeek: '下周',
  last30Days: '最近 30 天',
  lastMonth: '上个月',
  thisMonth: '本月',
  nextMonth: '下个月',
  last90Days: '最近 90 天',
  lastQuarter: '上季度',
  thisQuarter: '本季度',
  nextQuarter: '下季度',
  lastYear: '去年',
  thisYear: '今年',
  yearToDate: '年初至今',
  nextYear: '明年',
  last6Months: '最近 6 个月',
  last12Months: '最近 12 个月',
  last24Months: '最近 24 个月',

  // Pagination
  firstPage: '第一页',
  previousPage: '上一页',
  nextPage: '下一页',
  lastPage: '最后一页',
  page: '页',
  of: '共',
  to: '至',
  more: '更多',
  pageSizeSelectorLabel: '每页条数',
  ariaPageSizeSelectorLabel: '每页条数',
  pageLastRowUnknown: '更多',

  // Number formatting
  decimalSeparator: '.',
  thousandSeparator: ',',
  number: '数字',
};
