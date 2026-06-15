import { Injectable, NgZone } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

type TableFilterState = {
  filters: string[];
  sortColumnIndex?: number;
  sortDirection?: 'asc' | 'desc';
};

@Injectable({
  providedIn: 'root'
})
export class UnifiedTableFilterService {
  private observer?: MutationObserver;
  private applyTimer?: number;
  private initialized = false;
  private readonly tableState = new WeakMap<HTMLTableElement, TableFilterState>();

  constructor(
    private router: Router,
    private zone: NgZone
  ) {}

  init(): void {
    if (this.initialized || typeof document === 'undefined') {
      return;
    }

    this.initialized = true;

    this.zone.runOutsideAngular(() => {
      this.hideLegacySearchBoxes();
      this.applyColumnFilters();

      this.router.events
        .pipe(filter(event => event instanceof NavigationEnd))
        .subscribe(() => this.scheduleApply());

      this.observer = new MutationObserver(() => this.scheduleApply());
      this.observer.observe(document.body, {
        attributes: true,
        childList: true,
        subtree: true
      });

      [250, 750, 1500].forEach(delay => window.setTimeout(() => this.scheduleApply(), delay));
    });
  }

  private scheduleApply(): void {
    if (this.applyTimer) {
      window.clearTimeout(this.applyTimer);
    }

    this.applyTimer = window.setTimeout(() => {
      this.hideLegacySearchBoxes();
      this.applyColumnFilters();
    }, 80);
  }

  private hideLegacySearchBoxes(): void {
    const legacySearchContainers = document.querySelectorAll<HTMLElement>(
      [
        '.search-box',
        '.search-field',
        '.toolbar-card-search',
        '[table-actions] input[placeholder*="Search" i]',
        '[table-actions] input[placeholder*="بحث" i]'
      ].join(', ')
    );

    legacySearchContainers.forEach(element => {
      const container = this.getLegacySearchContainer(element);
      if (container) {
        container.classList.add('legacy-table-search-hidden');
      }
    });

    document
      .querySelectorAll<HTMLElement>('input.search-input, input[placeholder*="Search" i], [table-actions] input.search-input')
      .forEach(element => {
        const container = this.getLegacySearchContainer(element);
        if (container) {
          container.classList.add('legacy-table-search-hidden');
        }
      });
  }

  private applyColumnFilters(): void {
    const tables = Array.from(document.querySelectorAll<HTMLTableElement>('table'));

    tables
      .filter(table => this.shouldEnhanceTable(table))
      .forEach(table => this.ensureFilterRow(table));
  }

  private shouldEnhanceTable(table: HTMLTableElement): boolean {
    if (table.dataset['columnFiltersDisabled'] === 'true') {
      return false;
    }

    if (!table.tHead) {
      return false;
    }

    const headerRow = this.getHeaderRow(table);

    return !!headerRow && headerRow.cells.length > 1;
  }

  private ensureFilterRow(table: HTMLTableElement): void {
    const headerRow = this.getHeaderRow(table);
    if (!headerRow || !table.tHead) {
      return;
    }

    let filterRow = table.tHead.querySelector<HTMLTableRowElement>('tr.unified-column-filter-row');
    const filterableIndexes = this.getFilterableColumnIndexes(headerRow);
    table.classList.add('unified-enhanced-table');
    headerRow.classList.add('unified-table-header-row');
    this.ensureSortableHeaders(table, headerRow, filterableIndexes);

    if (!filterRow || filterRow.cells.length !== headerRow.cells.length) {
      filterRow?.remove();
      filterRow = document.createElement('tr');
      filterRow.className = 'unified-column-filter-row';
      table.tHead.appendChild(filterRow);

      Array.from(headerRow.cells).forEach((cell, index) => {
        const th = document.createElement('th');
        th.className = 'unified-column-filter-cell';

        if (filterableIndexes.includes(index)) {
          th.appendChild(this.createFilterControl(table, index, cell.textContent || ''));
        }

        filterRow!.appendChild(th);
      });
    }

    this.applyFilters(table);
  }

  private ensureSortableHeaders(table: HTMLTableElement, headerRow: HTMLTableRowElement, filterableIndexes: number[]): void {
    Array.from(headerRow.cells).forEach((cell, index) => {
      if (!filterableIndexes.includes(index) || cell.classList.contains('unified-sortable-header')) {
        return;
      }

      cell.classList.add('unified-sortable-header');
      cell.setAttribute('role', 'button');
      cell.setAttribute('tabindex', '0');
      cell.setAttribute('aria-sort', 'none');

      const indicator = document.createElement('span');
      indicator.className = 'unified-sort-indicator';
      cell.appendChild(indicator);

      const sort = () => this.toggleSort(table, index);
      cell.addEventListener('click', event => {
        const target = event.target as HTMLElement;
        if (target.closest('.unified-column-filter-row')) {
          return;
        }
        sort();
      });
      cell.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          sort();
        }
      });
    });
  }

  private getLegacySearchContainer(element: HTMLElement): HTMLElement | null {
    if (element.closest('app-master-data-manage, .master-page')) {
      return null;
    }

    if (element.closest('.unified-column-filter-row, .searchable-select')) {
      return null;
    }

    const directSearchContainer = element.closest<HTMLElement>('.search-box, .search-field, .toolbar-card-search');
    if (directSearchContainer) {
      return directSearchContainer;
    }

    if (element instanceof HTMLInputElement && this.isLegacySearchInput(element)) {
      return element.closest<HTMLElement>('.p-input-icon-left, .input-group, label, span, div') || element.parentElement;
    }

    return null;
  }

  private isLegacySearchInput(input: HTMLInputElement): boolean {
    if (input.closest('.unified-column-filter-row, .searchable-select')) {
      return false;
    }

    const placeholder = this.normalize(input.getAttribute('placeholder') || '');
    return input.classList.contains('search-input') || placeholder.includes('search') || placeholder.includes('بحث');
  }

  private createFilterControl(table: HTMLTableElement, columnIndex: number, label: string): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'unified-column-filter-control';

    const input = document.createElement('input');
    input.type = 'text';
    input.setAttribute('aria-label', `Filter ${label.trim() || 'column'}`);
    input.dataset['columnIndex'] = String(columnIndex);
    input.placeholder = '';

    const state = this.getState(table);
    input.value = state.filters[columnIndex] || '';

    input.addEventListener('input', () => {
      state.filters[columnIndex] = input.value;
      this.applyFilters(table);
    });

    wrapper.appendChild(input);
    return wrapper;
  }

  private applyFilters(table: HTMLTableElement): void {
    const state = this.getState(table);
    const bodyRows = this.getBodyRows(table);

    bodyRows.forEach(row => {
      const visible = state.filters.every((filterValue, index) => {
        const normalizedFilter = this.normalize(filterValue);
        if (!normalizedFilter) {
          return true;
        }

        const cell = row.cells[index];
        if (!cell) {
          return false;
        }

        return this.normalize(this.getCellSearchText(cell)).includes(normalizedFilter);
      });

      row.classList.toggle('unified-filter-hidden-row', !visible);
    });
  }

  private toggleSort(table: HTMLTableElement, columnIndex: number): void {
    const state = this.getState(table);
    const nextDirection: 'asc' | 'desc' =
      state.sortColumnIndex === columnIndex && state.sortDirection === 'asc' ? 'desc' : 'asc';

    state.sortColumnIndex = columnIndex;
    state.sortDirection = nextDirection;
    this.sortRows(table, columnIndex, nextDirection);
    this.updateSortIndicators(table);
    this.applyFilters(table);
  }

  private sortRows(table: HTMLTableElement, columnIndex: number, direction: 'asc' | 'desc'): void {
    Array.from(table.tBodies).forEach(tbody => {
      const rows = Array.from(tbody.rows).filter(row => !row.classList.contains('empty-row'));
      const sortedRows = rows.sort((a, b) => {
        const aValue = this.getSortableCellValue(a.cells[columnIndex]);
        const bValue = this.getSortableCellValue(b.cells[columnIndex]);
        const comparison = this.compareValues(aValue, bValue);
        return direction === 'asc' ? comparison : -comparison;
      });

      sortedRows.forEach(row => tbody.appendChild(row));
    });
  }

  private updateSortIndicators(table: HTMLTableElement): void {
    const state = this.getState(table);
    const headerRow = this.getHeaderRow(table);
    if (!headerRow) {
      return;
    }

    Array.from(headerRow.cells).forEach((cell, index) => {
      const isActive = state.sortColumnIndex === index;
      cell.classList.toggle('unified-sort-active', isActive);
      cell.setAttribute('aria-sort', isActive ? (state.sortDirection === 'asc' ? 'ascending' : 'descending') : 'none');

      const indicator = cell.querySelector<HTMLElement>('.unified-sort-indicator');
      if (indicator) {
        indicator.textContent = isActive ? (state.sortDirection === 'asc' ? '^' : 'v') : '';
      }
    });
  }

  private getState(table: HTMLTableElement): TableFilterState {
    let state = this.tableState.get(table);
    if (!state) {
      state = { filters: [] };
      this.tableState.set(table, state);
    }
    return state;
  }

  private getHeaderRow(table: HTMLTableElement): HTMLTableRowElement | null {
    return Array.from(table.tHead?.rows || []).find(row => !row.classList.contains('unified-column-filter-row')) || null;
  }

  private getBodyRows(table: HTMLTableElement): HTMLTableRowElement[] {
    return Array.from(table.tBodies)
      .flatMap(tbody => Array.from(tbody.rows))
      .filter(row =>
        !row.classList.contains('empty-row') &&
        !row.classList.contains('p-datatable-emptymessage') &&
        !(row.cells.length === 1 && row.cells[0].colSpan > 1)
      );
  }

  private getFilterableColumnIndexes(headerRow: HTMLTableRowElement): number[] {
    return Array.from(headerRow.cells)
      .map((cell, index) => ({ text: this.normalize(cell.textContent || ''), index }))
      .filter(({ text }) => text && !['#', 'actions', 'action', ''].includes(text))
      .map(({ index }) => index);
  }

  private getCellSearchText(cell: HTMLTableCellElement): string {
    const formValues = Array.from(cell.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea'))
      .map(control => {
        if (control instanceof HTMLSelectElement) {
          return control.selectedOptions?.[0]?.textContent || control.value;
        }
        if (control instanceof HTMLInputElement && (control.type === 'checkbox' || control.type === 'radio')) {
          return control.checked ? control.value || 'true' : '';
        }
        return control.value;
      })
      .filter(Boolean)
      .join(' ');

    return `${cell.textContent || ''} ${formValues}`;
  }

  private getSortableCellValue(cell: HTMLTableCellElement | undefined): string {
    if (!cell) {
      return '';
    }

    return this.getCellSearchText(cell).trim();
  }

  private compareValues(aValue: string, bValue: string): number {
    const a = this.normalize(aValue);
    const b = this.normalize(bValue);
    const aNumber = this.toNumber(a);
    const bNumber = this.toNumber(b);

    if (aNumber !== null && bNumber !== null) {
      return aNumber - bNumber;
    }

    const aDate = Date.parse(a);
    const bDate = Date.parse(b);
    if (!Number.isNaN(aDate) && !Number.isNaN(bDate)) {
      return aDate - bDate;
    }

    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  }

  private toNumber(value: string): number | null {
    const normalized = value.replace(/,/g, '').trim();
    if (!normalized || !/^-?\d+(\.\d+)?$/.test(normalized)) {
      return null;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private normalize(value: string): string {
    return (value || '').toString().trim().toLowerCase();
  }
}
