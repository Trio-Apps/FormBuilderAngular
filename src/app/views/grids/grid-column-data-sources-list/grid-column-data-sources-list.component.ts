import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { GridColumnDataSourcesService } from '../../FormBuilder/services/grid-column-data-sources.service';
import { FieldDataSourceService } from '../../FormBuilder/services/field-data-source.service';
import { MessageService, ConfirmationService } from 'primeng/api';
import {
  GridColumnDataSourceDto,
  CreateGridColumnDataSourceDto,
  UpdateGridColumnDataSourceDto
} from '../../FormBuilder/form-builder/models/grid-dto.model';
import { FieldOptionResponse } from '../../FormBuilder/form-builder/models/form-builder-dto.model';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError, map, filter, distinctUntilChanged } from 'rxjs/operators';
import { TranslationService } from '../../../core/services/translation.service';

// PrimeNG Modules
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { PaginatorModule } from 'primeng/paginator';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

@Component({
  selector: 'app-grid-column-data-sources-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    TableModule,
    InputTextModule,
    DialogModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule,
    PaginatorModule,
    TranslatePipe
  ],
  templateUrl: './grid-column-data-sources-list.component.html',
  styleUrls: ['./grid-column-data-sources-list.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class GridColumnDataSourcesListComponent implements OnInit, OnDestroy {
  dataSources: GridColumnDataSourceDto[] = [];
  filteredDataSources: GridColumnDataSourceDto[] = [];
  searchTerm = '';
  loading = false;
  private routerSubscription?: Subscription;
  private deletedDataSourceIds: Set<number> = new Set();

  // DataSource Modal
  showDataSourceModal = false;
  dataSourceForm!: FormGroup;
  editingDataSource: GridColumnDataSourceDto | null = null;
  currentInputLanguage: 'en' | 'ar' = 'en';

  // DataSource Configuration
  dataSourceType: 'Static' | 'API' | 'LookupTable' = 'Static';
  dataSourceConfig: {
    apiUrl: string | null;
    apiPath: string | null;
    httpMethod: string;
    requestBodyJson: string | null;
    valuePath: string | null;
    textPath: string | null;
    arrayPropertyNames: string[];
  } = {
    apiUrl: null,
    apiPath: null,
    httpMethod: 'GET',
    requestBodyJson: null,
    valuePath: null,
    textPath: null,
    arrayPropertyNames: []
  };

  // LookupTable Configuration
  lookupTableConfig: {
    table: string;
    valueColumn: string;
    textColumn: string;
  } = {
    table: '',
    valueColumn: 'Id',
    textColumn: 'Name'
  };

  // API Properties
  availableProperties: string[] = [];
  availableColumns: string[] = [];
  availableLookupTables: string[] = [];
  rawApiResponse: any = null;
  loadingPreview = false;
  apiDebugError: string | null = null;
  previewOptions: FieldOptionResponse[] = [];

  // Pagination
  paginatedDataSources: GridColumnDataSourceDto[] = [];
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;
  totalPages = 0;

  constructor(
    private dataSourcesService: GridColumnDataSourcesService,
    private fieldDataSourceService: FieldDataSourceService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder,
    public translationService: TranslationService
  ) {
    this.initializeDataSourceForm();
  }

  ngOnInit(): void {
    const adminLanguagePreference = localStorage.getItem('adminLanguagePreference');
    if (adminLanguagePreference) {
      this.translationService.setLanguage(adminLanguagePreference as 'en' | 'ar');
    } else {
      this.translationService.setLanguage('en');
      localStorage.setItem('adminLanguagePreference', 'en');
    }

    this.loadDeletedDataSourceIds();
    this.loadDataSources();

    this.routerSubscription = this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        distinctUntilChanged((prev: NavigationEnd, curr: NavigationEnd) => {
          return prev.urlAfterRedirects === curr.urlAfterRedirects;
        })
      )
      .subscribe((event: NavigationEnd) => {
        const url = event.urlAfterRedirects || event.url || '';
        const isDataSourcesPage = url && url.includes('/grid-column-data-sources');
        if (isDataSourcesPage) {
          setTimeout(() => {
            this.loadDataSources();
          }, 500);
        }
      });
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  initializeDataSourceForm(): void {
    this.dataSourceForm = this.fb.group({
      columnId: [null, [Validators.required, Validators.min(1)]],
      sourceType: ['Static', Validators.required],
      apiUrl: [null],
      httpMethod: ['GET'],
      requestBodyJson: [null],
      valuePath: [null],
      textPath: [null],
      isActive: [true]
    });
  }

  loadDeletedDataSourceIds(): void {
    try {
      const savedIds = localStorage.getItem('deletedGridColumnDataSourceIds');
      if (savedIds) {
        const idsArray = JSON.parse(savedIds) as number[];
        this.deletedDataSourceIds = new Set(idsArray);
      }
    } catch (error) {
      console.error('[GridColumnDataSourcesList] Error loading deleted DataSource IDs:', error);
      this.deletedDataSourceIds = new Set();
    }
  }

  saveDeletedDataSourceIds(): void {
    try {
      const idsArray = Array.from(this.deletedDataSourceIds);
      localStorage.setItem('deletedGridColumnDataSourceIds', JSON.stringify(idsArray));
    } catch (error) {
      console.error('[GridColumnDataSourcesList] Error saving deleted DataSource IDs:', error);
    }
  }

  loadDataSources(): void {
    this.loading = true;
    this.dataSources = [];
    this.filteredDataSources = [];

    this.loadDeletedDataSourceIds();

    this.dataSourcesService.getAllDataSources().subscribe({
      next: (dataSources) => {
        // Normalize isActive values: ensure true/false (not null/undefined)
        const normalizedDataSources = dataSources.map(ds => {
          let isActiveValue: boolean;
          if (ds.isActive === undefined || ds.isActive === null) {
            isActiveValue = true; // Default to true if null/undefined
          } else if (typeof ds.isActive === 'boolean') {
            isActiveValue = ds.isActive;
          } else if (typeof ds.isActive === 'string') {
            isActiveValue = ds.isActive === 'true' || ds.isActive === '1';
          } else if (typeof ds.isActive === 'number') {
            isActiveValue = ds.isActive === 1;
          } else {
            isActiveValue = true; // Default to true for any other type
          }
          return {
            ...ds,
            isActive: isActiveValue
          };
        });

        const processedDataSources = normalizedDataSources.filter(ds => {
          if (this.deletedDataSourceIds.has(ds.id!)) {
            return false;
          }
          return true;
        });

        const apiDataSourceIds = new Set(dataSources.map(ds => ds.id));
        const idsToRemove: number[] = [];
        this.deletedDataSourceIds.forEach(deletedId => {
          const dsInApi = dataSources.find(ds => ds.id === deletedId);
          if (!dsInApi) {
            idsToRemove.push(deletedId);
          }
        });
        if (idsToRemove.length > 0) {
          idsToRemove.forEach(id => this.deletedDataSourceIds.delete(id));
          this.saveDeletedDataSourceIds();
        }

        this.dataSources = processedDataSources;
        this.filteredDataSources = [...processedDataSources];
        this.totalItems = processedDataSources.length;
        this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.itemsPerPage));
        this.updatePagination();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load data sources'
        });
      }
    });
  }

  filterDataSources(): void {
    if (!this.searchTerm.trim()) {
      this.filteredDataSources = [...this.dataSources];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredDataSources = this.dataSources.filter(ds =>
        ds.sourceType?.toLowerCase().includes(term) ||
        (ds.apiUrl && ds.apiUrl.toLowerCase().includes(term)) ||
        (ds.valuePath && ds.valuePath.toLowerCase().includes(term)) ||
        (ds.textPath && ds.textPath.toLowerCase().includes(term))
      );
    }

    this.totalItems = this.filteredDataSources.length;
    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination(): void {
    this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.itemsPerPage));
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedDataSources = this.filteredDataSources.slice(startIndex, endIndex);
  }

  onPageChange(event: any): void {
    if (event && typeof event.page === 'number') {
      this.currentPage = event.page + 1;
    } else if (typeof event === 'number') {
      this.currentPage = event;
    }
    this.updatePagination();
  }

  openDataSourceModal(dataSource?: GridColumnDataSourceDto): void {
    this.currentInputLanguage = 'en';
    if (dataSource) {
      this.editingDataSource = dataSource;
      this.dataSourceType = (dataSource.sourceType as 'Static' | 'API' | 'LookupTable') || 'Static';
      
      // Ensure isActive is explicitly true or false (not undefined)
      // Default to true if undefined or null
      const isActiveValue = dataSource.isActive !== undefined && dataSource.isActive !== null 
        ? dataSource.isActive === true 
        : true;
      
      this.dataSourceForm.patchValue({
        columnId: dataSource.columnId || null,
        sourceType: this.dataSourceType,
        apiUrl: dataSource.apiUrl || null,
        httpMethod: dataSource.httpMethod || 'GET',
        requestBodyJson: dataSource.requestBodyJson || null,
        valuePath: dataSource.valuePath || null,
        textPath: dataSource.textPath || null,
        isActive: isActiveValue
      });

      if (this.dataSourceType === 'LookupTable') {
        this.lookupTableConfig = {
          table: dataSource.apiUrl || '',
          valueColumn: dataSource.valuePath || 'Id',
          textColumn: dataSource.textPath || 'Name'
        };
        if (this.lookupTableConfig.table) {
          this.loadTableColumns(this.lookupTableConfig.table);
        }
      } else if (this.dataSourceType === 'API') {
        this.dataSourceConfig = {
          apiUrl: dataSource.apiUrl || null,
          apiPath: dataSource.apiPath || null,
          httpMethod: dataSource.httpMethod || 'GET',
          requestBodyJson: dataSource.requestBodyJson || null,
          valuePath: dataSource.valuePath || null,
          textPath: dataSource.textPath || null,
          arrayPropertyNames: dataSource.arrayPropertyNames || []
        };
      }
    } else {
      this.editingDataSource = null;
      this.dataSourceType = 'Static';
      this.resetDataSourceConfig();
      this.dataSourceForm.reset({
        columnId: null,
        sourceType: 'Static',
        apiUrl: null,
        httpMethod: 'GET',
        requestBodyJson: null,
        valuePath: null,
        textPath: null,
        isActive: true
      });
    }
    this.showDataSourceModal = true;
  }

  closeDataSourceModal(): void {
    this.showDataSourceModal = false;
    this.editingDataSource = null;
    this.resetDataSourceConfig();
    this.dataSourceForm.reset();
  }

  resetDataSourceConfig(): void {
    this.dataSourceConfig = {
      apiUrl: null,
      apiPath: null,
      httpMethod: 'GET',
      requestBodyJson: null,
      valuePath: null,
      textPath: null,
      arrayPropertyNames: []
    };
    this.lookupTableConfig = {
      table: '',
      valueColumn: 'Id',
      textColumn: 'Name'
    };
    this.availableProperties = [];
    this.availableColumns = [];
  }

  onDataSourceTypeChange(): void {
    const sourceType = this.dataSourceForm.get('sourceType')?.value;
    this.dataSourceType = sourceType as 'Static' | 'API' | 'LookupTable';
    
    if (this.dataSourceType === 'LookupTable') {
      this.loadLookupTables();
    } else if (this.dataSourceType === 'API') {
      this.dataSourceConfig = {
        apiUrl: null,
        apiPath: null,
        httpMethod: 'GET',
        requestBodyJson: null,
        valuePath: 'id',
        textPath: 'name',
        arrayPropertyNames: []
      };
    }
  }

  loadLookupTables(): void {
    this.fieldDataSourceService.getAvailableLookupTables().subscribe({
      next: (tables: string[]) => {
        this.availableLookupTables = tables || [];
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('[GridColumnDataSourcesList] Error loading lookup tables:', error);
        this.availableLookupTables = [];
        this.cdr.detectChanges();
      }
    });
  }

  onTableSelected(): void {
    const tableName = this.lookupTableConfig.table;
    if (tableName && tableName.trim()) {
      this.loadTableColumns(tableName);
    } else {
      this.availableColumns = [];
    }
  }

  loadTableColumns(tableName: string): void {
    this.fieldDataSourceService.getTableColumns(tableName).subscribe({
      next: (columns: string[]) => {
        this.availableColumns = columns || [];
        if (!this.lookupTableConfig.valueColumn && this.availableColumns.length > 0) {
          const idColumn = this.availableColumns.find(col =>
            col.toLowerCase().includes('id') || col.toLowerCase() === 'value'
          );
          this.lookupTableConfig.valueColumn = idColumn || this.availableColumns[0];
        }
        if (!this.lookupTableConfig.textColumn && this.availableColumns.length > 0) {
          const nameColumn = this.availableColumns.find(col =>
            col.toLowerCase().includes('name') || col.toLowerCase() === 'text'
          );
          this.lookupTableConfig.textColumn = nameColumn || (this.availableColumns.length > 1 ? this.availableColumns[1] : this.availableColumns[0]);
        }
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('[GridColumnDataSourcesList] Error loading table columns:', error);
        this.availableColumns = [];
        this.cdr.detectChanges();
      }
    });
  }

  testApiResponse(): void {
    if (!this.dataSourceConfig.apiUrl || !this.dataSourceConfig.apiUrl.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Please enter API URL first'
      });
      return;
    }

    this.loadingPreview = true;
    this.availableProperties = [];
    this.apiDebugError = null;

    const requestPayload: any = {
      fieldId: 0,
      sourceType: 'API',
      apiUrl: this.dataSourceConfig.apiUrl || '',
      httpMethod: this.dataSourceConfig.httpMethod || 'GET',
      requestBodyJson: this.dataSourceConfig.requestBodyJson || undefined,
      valuePath: this.dataSourceConfig.valuePath || 'id',
      textPath: this.dataSourceConfig.textPath || 'name'
    };

    this.fieldDataSourceService.previewDataSource(requestPayload).subscribe({
      next: (response) => {
        this.loadingPreview = false;
        const options = Array.isArray(response) ? response : (response as any)?.data || [];
        if (options && options.length > 0) {
          this.previewOptions = options;
          this.rawApiResponse = response;

          if (this.previewOptions.length > 0) {
            const firstOption = this.previewOptions[0];
            if (typeof firstOption === 'object' && firstOption !== null) {
              this.availableProperties = Object.keys(firstOption);

              if (!this.dataSourceConfig.valuePath && this.availableProperties.length > 0) {
                const idProp = this.availableProperties.find(prop =>
                  prop.toLowerCase() === 'id' ||
                  prop.toLowerCase().includes('id') ||
                  prop.toLowerCase() === 'value'
                );
                this.dataSourceConfig.valuePath = idProp || this.availableProperties[0];
              }

              if (!this.dataSourceConfig.textPath && this.availableProperties.length > 0) {
                const nameProp = this.availableProperties.find(prop =>
                  prop.toLowerCase() === 'name' ||
                  prop.toLowerCase().includes('name') ||
                  prop.toLowerCase() === 'text'
                );
                this.dataSourceConfig.textPath = nameProp || (this.availableProperties.length > 1 ? this.availableProperties[1] : this.availableProperties[0]);
              }
            }
          }

          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: `Loaded ${this.previewOptions.length} options`
          });
        } else {
          this.apiDebugError = 'No data returned from API';
        }
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.loadingPreview = false;
        const errorMessage = error?.error?.message || error?.message || 'Failed to load API response';
        this.apiDebugError = errorMessage;

        if (errorMessage.includes('Available properties')) {
          const propertiesMatch = errorMessage.match(/Available properties in the first item: ([^.]+)/);
          if (propertiesMatch && propertiesMatch[1]) {
            this.availableProperties = propertiesMatch[1]
              .split(',')
              .map((p: string) => p.trim())
              .filter((p: string) => p.length > 0);

            if (this.availableProperties.length > 0) {
              if (!this.dataSourceConfig.valuePath) {
                const idProp = this.availableProperties.find(prop =>
                  prop.toLowerCase() === 'id' ||
                  prop.toLowerCase().includes('id') ||
                  prop.toLowerCase() === 'value'
                );
                this.dataSourceConfig.valuePath = idProp || this.availableProperties[0];
              }

              if (!this.dataSourceConfig.textPath) {
                const nameProp = this.availableProperties.find(prop =>
                  prop.toLowerCase() === 'name' ||
                  prop.toLowerCase().includes('name') ||
                  prop.toLowerCase() === 'text'
                );
                this.dataSourceConfig.textPath = nameProp || (this.availableProperties.length > 1 ? this.availableProperties[1] : this.availableProperties[0]);
              }
            }
          }
        }

        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: this.apiDebugError || 'Failed to load API response'
        });
        this.cdr.detectChanges();
      }
    });
  }

  applyPropertyAsPath(property: string): void {
    const lowerProp = property.toLowerCase();
    if (lowerProp.includes('id') || lowerProp === 'value') {
      this.dataSourceConfig.valuePath = property;
    } else {
      this.dataSourceConfig.textPath = property;
    }
    this.cdr.detectChanges();
  }

  applyColumnAsPath(column: string): void {
    const lowerCol = column.toLowerCase();
    if (lowerCol.includes('id') || lowerCol === 'value') {
      this.lookupTableConfig.valueColumn = column;
    } else {
      this.lookupTableConfig.textColumn = column;
    }
    this.cdr.detectChanges();
  }

  saveDataSource(): void {
    if (this.dataSourceForm.invalid) {
      this.dataSourceForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Please fill all required fields correctly'
      });
      return;
    }

    this.loading = true;
    const formData = this.dataSourceForm.value;

    // Validate columnId for create operation
    if (!this.editingDataSource) {
      const columnId = Number(formData.columnId);
      if (!columnId || isNaN(columnId) || columnId <= 0) {
        this.loading = false;
        this.messageService.add({
          severity: 'warn',
          summary: 'Validation',
          detail: 'Please enter a valid Column ID'
        });
        return;
      }
    }

    let apiUrlValue: string | null = null;
    let valuePathValue: string | null = null;
    let textPathValue: string | null = null;

    if (this.dataSourceType === 'LookupTable') {
      apiUrlValue = this.lookupTableConfig.table || null;
      valuePathValue = this.lookupTableConfig.valueColumn || null;
      textPathValue = this.lookupTableConfig.textColumn || null;
      
      // Validate required fields for LookupTable
      if (!apiUrlValue || !valuePathValue || !textPathValue) {
        this.loading = false;
        this.messageService.add({
          severity: 'warn',
          summary: 'Validation',
          detail: 'LookupTable requires: Table name, Value Column, and Text Column'
        });
        return;
      }
    } else if (this.dataSourceType === 'API') {
      apiUrlValue = this.dataSourceConfig.apiUrl || null;
      valuePathValue = this.dataSourceConfig.valuePath || null;
      textPathValue = this.dataSourceConfig.textPath || null;
      
      // Validate required fields for API
      if (!apiUrlValue || !valuePathValue || !textPathValue) {
        this.loading = false;
        this.messageService.add({
          severity: 'warn',
          summary: 'Validation',
          detail: 'API requires: API URL, Value Path, and Text Path'
        });
        return;
      }
    }

    if (this.editingDataSource) {
      // Ensure isActive is explicitly set (true or false, not undefined)
      // Handle boolean, string, number, or undefined/null values
      const isActiveValue = formData.isActive === true || 
                           formData.isActive === 'true' || 
                           formData.isActive === 1 ||
                           (formData.isActive !== false && formData.isActive !== 'false' && formData.isActive !== 0 && formData.isActive !== null && formData.isActive !== undefined);
      
      console.log('[GridColumnDataSourcesList] Updating DataSource:', {
        id: this.editingDataSource.id,
        formDataIsActive: formData.isActive,
        isActiveValue: isActiveValue,
        sourceType: this.dataSourceType
      });
      
      const updateDto: UpdateGridColumnDataSourceDto = {
        sourceType: this.dataSourceType,
        apiUrl: apiUrlValue || undefined,
        apiPath: this.dataSourceType === 'API' ? (this.dataSourceConfig.apiPath || undefined) : undefined,
        httpMethod: this.dataSourceType === 'API' ? (this.dataSourceConfig.httpMethod || undefined) : undefined,
        requestBodyJson: this.dataSourceType === 'API' ? (this.dataSourceConfig.requestBodyJson || undefined) : undefined,
        valuePath: valuePathValue || undefined,
        textPath: textPathValue || undefined,
        arrayPropertyNames: this.dataSourceType === 'API' && this.dataSourceConfig.arrayPropertyNames.length > 0 
          ? this.dataSourceConfig.arrayPropertyNames 
          : undefined,
        isActive: isActiveValue
      };

      console.log('[GridColumnDataSourcesList] Update DTO:', updateDto);

      this.dataSourcesService.updateDataSource(this.editingDataSource.id!, updateDto).subscribe({
        next: () => {
          this.loading = false;
          this.loadDataSources();
          this.closeDataSourceModal();
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Data source updated successfully'
          });
        },
        error: (error) => {
          this.loading = false;
          const errorMessage = error?.error?.message || error?.message || 'Failed to update data source';
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: errorMessage
          });
        }
      });
    } else {
      // Ensure isActive is explicitly set (true or false, not undefined)
      // Handle boolean, string, number, or undefined/null values
      // Default to true if not explicitly set to false
      const isActiveValue = formData.isActive === true || 
                           formData.isActive === 'true' || 
                           formData.isActive === 1 ||
                           (formData.isActive !== false && formData.isActive !== 'false' && formData.isActive !== 0 && formData.isActive !== null && formData.isActive !== undefined);
      
      console.log('[GridColumnDataSourcesList] Creating DataSource:', {
        columnId: formData.columnId,
        formDataIsActive: formData.isActive,
        isActiveValue: isActiveValue,
        sourceType: this.dataSourceType
      });
      
      const createDto: CreateGridColumnDataSourceDto = {
        columnId: Number(formData.columnId), // Ensure it's a number
        sourceType: this.dataSourceType,
        apiUrl: apiUrlValue || undefined,
        apiPath: this.dataSourceType === 'API' ? (this.dataSourceConfig.apiPath || undefined) : undefined,
        httpMethod: this.dataSourceType === 'API' ? (this.dataSourceConfig.httpMethod || undefined) : undefined,
        requestBodyJson: this.dataSourceType === 'API' ? (this.dataSourceConfig.requestBodyJson || undefined) : undefined,
        valuePath: valuePathValue || undefined,
        textPath: textPathValue || undefined,
        arrayPropertyNames: this.dataSourceType === 'API' && this.dataSourceConfig.arrayPropertyNames.length > 0 
          ? this.dataSourceConfig.arrayPropertyNames 
          : undefined,
        isActive: isActiveValue
      };

      console.log('[GridColumnDataSourcesList] Create DTO:', createDto);

      this.dataSourcesService.createDataSource(createDto).subscribe({
        next: () => {
          this.loading = false;
          this.loadDataSources();
          this.closeDataSourceModal();
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Data source created successfully'
          });
        },
        error: (error) => {
          this.loading = false;
          const errorMessage = error?.error?.message || error?.message || 'Failed to create data source';
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: errorMessage
          });
        }
      });
    }
  }

  deleteDataSource(id: number): void {
    const dataSourceToDelete = this.dataSources.find(ds => ds.id === id);
    if (!dataSourceToDelete) return;

    this.confirmationService.confirm({
      message: `Are you sure you want to delete this data source?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loading = true;
        this.dataSourcesService.deleteDataSource(id).subscribe({
          next: () => {
            this.deletedDataSourceIds.add(id);
            this.saveDeletedDataSourceIds();
            this.dataSources = this.dataSources.filter(ds => ds.id !== id);
            this.filteredDataSources = this.filteredDataSources.filter(ds => ds.id !== id);
            this.totalItems = this.filteredDataSources.length;
            this.updatePagination();
            this.loading = false;
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Data source deleted successfully'
            });
          },
          error: (error) => {
            this.loading = false;
            const errorMessage = error?.error?.message || error?.message || 'Failed to delete data source';
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: errorMessage
            });
          }
        });
      }
    });
  }

  setInputLanguage(lang: 'en' | 'ar'): void {
    this.currentInputLanguage = lang;
  }

  translateLabel(key: string): string {
    return this.translationService.translateForLanguage(key, this.currentInputLanguage);
  }

  getSourceTypeLabel(sourceType: string | undefined): string {
    if (!sourceType) return 'Unknown';
    return sourceType === 'API' ? 'API' : sourceType === 'LookupTable' ? 'Database Table' : 'Static';
  }

  getSourceTypeClass(sourceType: string | undefined): string {
    if (!sourceType) return '';
    if (sourceType === 'API') return 'badge-info';
    if (sourceType === 'LookupTable') return 'badge-success';
    return 'badge-secondary';
  }
}

