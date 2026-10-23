/** Default UI strings. Every user-facing string in a component comes from here (rules/component-api.md). */
export const en = {
  loading: 'Loading…',
  close: 'Close',
  dismiss: 'Dismiss',
  clear: 'Clear',
  select: 'Select…',
  noResults: 'No results found',
  noRecords: 'No records found',
  filter: 'Filter',
  selectAll: 'Select all rows',
  selectRow: 'Select row {index}',
  pagination: 'Pagination',
  paginationReport: '{first}–{last} of {total}',
  rowsPerPage: 'Rows per page',
  firstPage: 'First page',
  previousPage: 'Previous page',
  nextPage: 'Next page',
  lastPage: 'Last page',
  page: 'Page {page}',
  sortAscending: 'sorted ascending',
  sortDescending: 'sorted descending',
  severityInfo: 'Info:',
  severitySuccess: 'Success:',
  severityWarning: 'Warning:',
  severityDanger: 'Error:',
  severitySecondary: 'Note:',
  darkMode: 'Dark mode',
  required: 'required',
};

export type Messages = typeof en;
export type MessageKey = keyof Messages;
