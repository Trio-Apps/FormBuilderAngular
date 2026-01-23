import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { TableActionsComponent } from '../../../shared/table-actions/table-actions.component';
import { DialogShellComponent } from '../../../shared/dialog-shell/dialog-shell.component';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { GridService } from '../../FormBuilder/services/grid.service';
import { TabsService } from '../../FormBuilder/services/tabs.service';
import { FieldsService } from '../../FormBuilder/services/fields.service';
import { GridColumnDataSourcesService } from '../../FormBuilder/services/grid-column-data-sources.service';
import { GridColumnOptionsService } from '../../FormBuilder/services/grid-column-options.service';
import { FieldDataSourceService } from '../../FormBuilder/services/field-data-source.service';
import { MessageService, ConfirmationService } from 'primeng/api';
import {
  FormGridColumnDto,
  CreateFormGridColumnDto,
  UpdateFormGridColumnDto,
  FormGridDto,
  GridColumnOptionDto,
  GridColumnDataSourceDto,
  CreateGridColumnDataSourceDto,
  DropdownOptionDto
} from '../../FormBuilder/form-builder/models/grid-dto.model';
import { FieldTypeDto, FieldOptionResponse, PreviewDataSourceRequestDto } from '../../FormBuilder/form-builder/models/form-builder-dto.model';
import { Subscription, forkJoin, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { TranslationService } from '../../../core/services/translation.service';
import { TableShellComponent } from '../../../shared/table-shell/table-shell.component';

// PrimeNG Modules
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
// DropdownModule not needed - using native select

@Component({
  selector: 'app-grid-columns-list',
  standalone: true,
  imports: [
    TableActionsComponent,
    DialogShellComponent,
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
    TableShellComponent
  ],
  templateUrl: './grid-columns-list.component.html',
  styleUrls: ['./grid-columns-list.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class GridColumnsListComponent implements OnInit, OnDestroy {
  tabId!: number;
  gridId!: number;
  formBuilderId!: number;
  grid: FormGridDto | null = null;
  columns: FormGridColumnDto[] = [];
  fieldTypes: FieldTypeDto[] = [];
  loading = false;
  private routeSubscription?: Subscription;
  searchTerm = '';
  
  // Column Modal
  showColumnModal = false;
  columnForm: FormGroup;
  editingColumn: FormGridColumnDto | null = null;
  currentInputLanguage: 'en' | 'ar' = 'en';
  
  // Column Options
  showOptionsSection = false;
  
  // Helper method to check if field type supports options (similar to FieldsListComponent)
  isOptionsFieldType(): boolean {
    const selectedFieldType = this.getSelectedFieldType();
    if (!selectedFieldType) return false;
    const typeName = (selectedFieldType.typeName || '').toLowerCase().trim();
    return selectedFieldType.hasOptions === true ||
           typeName.includes('checkbox') ||
           typeName.includes('radio') ||
           typeName.includes('select') ||
           typeName.includes('combobox') ||
           typeName.includes('multiselect');
  }

  // Data Sources
  dataSources: GridColumnDataSourceDto[] = [];
  selectedDataSource: GridColumnDataSourceDto | null = null;
  showDataSourceModal = false;
  dataSourceForm!: FormGroup;
  dropdownOptions: DropdownOptionDto[] = [];
  loadingOptions = false;
  dataSourceType: 'Static' | 'API' | 'LookupTable' = 'Static';
  existingColumnDataSource: GridColumnDataSourceDto | null = null;
  
  // DataSource Configuration (for Column Modal - similar to FieldsListComponent)
  columnDataSourceConfig: {
    apiUrl: string | null;
    httpMethod: string;
    requestBodyJson: string | null;
    valuePath: string | null;
    textPath: string | null;
  } = {
    apiUrl: null,
    httpMethod: 'GET',
    requestBodyJson: null,
    valuePath: null,
    textPath: null
  };
  
  // LookupTable Configuration (for Column Modal)
  columnLookupTableConfig: {
    table: string;
    valueColumn: string;
    textColumn: string;
  } = {
    table: '',
    valueColumn: 'Id',
    textColumn: 'Name'
  };
  
  // API Properties (similar to Fields component)
  availableProperties: string[] = [];
  availableColumns: string[] = [];
  availableLookupTables: string[] = [];
  rawApiResponse: any = null;
  loadingPreview = false;
  apiDebugError: string | null = null;
  previewOptions: FieldOptionResponse[] = []; // Preview options from data source
  private previewTimeout: any = null; // Debounce timer for preview

  // Data Types
  dataTypes = [
    { value: 'text', label: 'Text', labelAr: 'نص' },
    { value: 'number', label: 'Number', labelAr: 'رقم' },
    { value: 'date', label: 'Date', labelAr: 'تاريخ' },
    { value: 'email', label: 'Email', labelAr: 'بريد إلكتروني' },
    { value: 'select', label: 'Select', labelAr: 'قائمة منسدلة' },
    { value: 'boolean', label: 'Boolean', labelAr: 'نعم/لا' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gridService: GridService,
    private tabsService: TabsService,
    private fieldsService: FieldsService,
    private dataSourcesService: GridColumnDataSourcesService,
    private gridColumnOptionsService: GridColumnOptionsService,
    private fieldDataSourceService: FieldDataSourceService,
    private fb: FormBuilder,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    public translationService: TranslationService,
    private cdr: ChangeDetectorRef
  ) {
    this.columnForm = this.fb.group({
      fieldTypeId: ['', Validators.required],
      columnName: ['', [Validators.required, Validators.maxLength(200)]],
      foreignColumnName: ['', [Validators.maxLength(200)]],
      columnCode: ['', [Validators.required, Validators.pattern('^[A-Za-z_][A-Za-z0-9_]*$'), Validators.maxLength(100)]],
      columnOrder: [1, [Validators.required, Validators.min(1)]],
      dataType: ['text', Validators.required],
      isRequired: [false],
      isActive: [true],
      isReadOnly: [false],
      isVisible: [true],
      dataSourceId: [null],
      defaultValue: [''],
      columnOptions: this.fb.array([])
    });

    this.dataSourceForm = this.fb.group({
      sourceType: ['Static', Validators.required],
      apiUrl: [{value: '', disabled: false}], // Ensure apiUrl is enabled by default
      apiPath: [''],
      httpMethod: ['GET'],
      requestBodyJson: [''],
      valuePath: [''],
      textPath: [''],
      configurationJson: [''],
      isActive: [true]
    });

    // Watch fieldTypeId changes to show/hide options section (based on fieldType.hasOptions)
    this.columnForm.get('fieldTypeId')?.valueChanges.subscribe(fieldTypeId => {
      const selectedFieldType = this.getSelectedFieldType();
      const dataSourceType = this.getDataSourceType();
      this.showOptionsSection = selectedFieldType?.hasOptions === true && dataSourceType === 'Static';
      if (selectedFieldType?.hasOptions === true && dataSourceType === 'Static') {
        // If no options exist, add one empty option
        if (this.columnOptionsFormArray.length === 0) {
          this.addColumnOption();
        }
      } else {
        // Clear options if field type doesn't have options or dataSourceType is not Static
        while (this.columnOptionsFormArray.length !== 0) {
          this.columnOptionsFormArray.removeAt(0);
        }
      }
    });

    // Watch dataSourceId changes to show/hide options section
    this.columnForm.get('dataSourceId')?.valueChanges.subscribe(dataSourceId => {
      const selectedFieldType = this.getSelectedFieldType();
      const dataSourceType = this.getDataSourceType();
      this.showOptionsSection = selectedFieldType?.hasOptions === true && dataSourceType === 'Static';
      if (selectedFieldType?.hasOptions === true && dataSourceType === 'Static') {
        // If no options exist, add one empty option
        if (this.columnOptionsFormArray.length === 0) {
          this.addColumnOption();
        }
      } else {
        // Clear options if dataSourceType is not Static
        while (this.columnOptionsFormArray.length !== 0) {
          this.columnOptionsFormArray.removeAt(0);
        }
      }
    });
  }

  ngOnInit(): void {
    this.loadFieldTypes();
    this.loadDataSources();
    this.routeSubscription = this.route.params.subscribe(params => {
      const newTabId = +params['tabId'];
      const newGridId = +params['gridId'];

      console.log('[GridColumnsList] Route params:', { tabId: newTabId, gridId: newGridId });

      if (newTabId && newGridId) {
        this.tabId = newTabId;
        this.gridId = newGridId;
        console.log('[GridColumnsList] Initializing with tabId:', this.tabId, 'gridId:', this.gridId);
        this.loadTabAndFormId();
        this.loadGrid();
        this.loadColumns();
      } else {
        console.warn('[GridColumnsList] Missing tabId or gridId:', { tabId: newTabId, gridId: newGridId });
      }
    });
  }

  ngOnDestroy(): void {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }

  loadFieldTypes(): void {
    console.log('[GridColumnsList] Loading field types...');
    this.fieldsService.getFieldTypes().subscribe({
      next: (types: FieldTypeDto[]) => {
        console.log('[GridColumnsList] Raw field types from API:', types);
        
        // Service now returns properly formatted FieldTypeDto[]
        // Filter only active field types and ensure they have valid id and typeName
        this.fieldTypes = types.filter(type => 
          type.isActive && 
          type.id && 
          type.typeName && 
          type.typeName.trim() !== ''
        );
        
        // Sort by typeName for better UX
        this.fieldTypes.sort((a, b) => (a.typeName || '').localeCompare(b.typeName || ''));
        
        console.log(`[GridColumnsList] Loaded ${this.fieldTypes.length} active field types:`, this.fieldTypes.map(t => ({ id: t.id, name: t.typeName, isActive: t.isActive })));
      },
      error: (error) => {
        console.error('[GridColumnsList] Error loading field types:', error);
        this.fieldTypes = [];
        
        let errorMessage = 'Failed to load field types';
        if (error?.status === 0 || error?.error?.message?.includes('Connection refused')) {
          errorMessage = 'Cannot connect to server. Please ensure the backend server is running.';
        } else if (error?.status === 404) {
          errorMessage = 'Field types endpoint not found';
        }
        
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage
        });
      }
    });
  }

  loadTabAndFormId(): void {
    if (!this.tabId) return;
    
    this.tabsService.getTabById(this.tabId).subscribe({
      next: (tab) => {
        if (tab && tab.formBuilderId) {
          this.formBuilderId = tab.formBuilderId;
        }
      },
      error: () => {
        // Handle error
      }
    });
  }

  loadGrid(): void {
    if (!this.gridId) {
      console.warn('[GridColumnsList] Cannot load grid: gridId is missing');
      return;
    }

    this.gridService.getGridById(this.gridId).subscribe({
      next: (response) => {
        if (response && response.data) {
          this.grid = response.data;
        } else if (response && (response as any).id) {
          // Handle case where API returns grid directly (not wrapped)
          this.grid = response as unknown as FormGridDto;
        } else {
          this.grid = null;
        }
      },
      error: (error) => {
        console.error('[GridColumnsList] Error loading grid:', error);
        this.grid = null;
        
        let errorMessage = 'Failed to load grid';
        if (error?.status === 0 || error?.error?.message?.includes('Connection refused')) {
          errorMessage = 'Cannot connect to server. Please ensure the backend server is running.';
        } else if (error?.status === 404) {
          errorMessage = 'Grid not found';
        }
        
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage
        });
      }
    });
  }

  loadColumns(): void {
    if (!this.gridId) {
      console.warn('[GridColumnsList] Cannot load columns: gridId is missing');
      return;
    }

    this.loading = true;
    console.log('[GridColumnsList] Loading columns for gridId:', this.gridId);
    this.gridService.getColumnsByGrid(this.gridId).subscribe({
      next: (response) => {
        console.log('[GridColumnsList] Raw API response:', response);
        
        let columnsData: FormGridColumnDto[] = [];
        
        // Handle different response structures
        if (response) {
          if (response.data) {
            // Standard ApiResponse structure
            columnsData = Array.isArray(response.data) ? response.data : [];
        } else if (Array.isArray(response)) {
            // Direct array response
            columnsData = response;
        } else {
            // Try to access alternative properties (using type assertion for flexibility)
            const responseAny = response as any;
            if (responseAny.result && Array.isArray(responseAny.result)) {
              // Alternative response structure with 'result' property
              columnsData = responseAny.result;
            } else if (responseAny.items && Array.isArray(responseAny.items)) {
              // Alternative response structure with 'items' property
              columnsData = responseAny.items;
            }
          }
        }
        
        // Normalize isActive values: ensure true/false (not null/undefined)
        const normalizedColumns = columnsData.map(col => {
          let isActiveValue: boolean;
          if (col.isActive === undefined || col.isActive === null) {
            isActiveValue = true; // Default to true if null/undefined
          } else if (typeof col.isActive === 'boolean') {
            isActiveValue = col.isActive;
          } else if (typeof col.isActive === 'string') {
            isActiveValue = col.isActive === 'true' || col.isActive === '1';
          } else if (typeof col.isActive === 'number') {
            isActiveValue = col.isActive === 1;
          } else {
            isActiveValue = true; // Default to true for any other type
          }
          return {
            ...col,
            isActive: isActiveValue
          };
        });
        
        this.columns = normalizedColumns;
        
        // Sort by columnOrder, but if order is same, sort by id to maintain consistency
        this.columns.sort((a, b) => {
          const orderA = a.columnOrder || 0;
          const orderB = b.columnOrder || 0;
          if (orderA !== orderB) {
            return orderA - orderB;
          }
          // If same order, sort by id
          return (a.id || 0) - (b.id || 0);
        });
        
        console.log('[GridColumnsList] Total columns loaded:', this.columns.length);
        console.log('[GridColumnsList] Columns array:', this.columns);
        console.log('[GridColumnsList] Columns details:', this.columns.map(c => ({ 
          id: c.id, 
          name: c.columnName, 
          code: c.columnCode, 
          order: c.columnOrder,
          isActive: c.isActive,
          isVisible: c.isVisible
        })));
        console.log('[GridColumnsList] Filtered columns count:', this.filteredColumns.length);
        console.log('[GridColumnsList] Filtered columns:', this.filteredColumns);
        
        this.loading = false;
      },
      error: (error) => {
        console.error('[GridColumnsList] Error loading columns:', error);
        console.error('[GridColumnsList] Error details:', {
          status: error?.status,
          statusText: error?.statusText,
          message: error?.message,
          error: error?.error,
          url: error?.url
        });
        this.loading = false;
        this.columns = [];
        
        let errorMessage = 'Failed to load columns';
        if (error?.status === 0 || error?.error?.message?.includes('Connection refused')) {
          errorMessage = 'Cannot connect to server. Please ensure the backend server is running.';
        } else if (error?.status === 400) {
          errorMessage = `Bad request: ${error?.error?.message || 'Invalid grid ID or parameters'}`;
        } else if (error?.status === 404) {
          errorMessage = `Grid not found (gridId: ${this.gridId})`;
        } else if (error?.status === 500) {
          errorMessage = `Server error: ${error?.error?.message || 'Internal server error'}`;
        }
        
        console.error('[GridColumnsList] Error message to display:', errorMessage);
        
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage
        });
      }
    });
  }

  loadDataSources(): void {
    this.dataSourcesService.getAllDataSources().subscribe({
      next: (dataSources: GridColumnDataSourceDto[]) => {
        this.dataSources = dataSources.filter((ds: GridColumnDataSourceDto) => ds.isActive);
      },
      error: (error: any) => {
        console.error('[GridColumnsList] Error loading data sources:', error);
        this.dataSources = [];
      }
    });
  }

  loadDropdownOptions(columnId?: number): void {
    if (!columnId) return;

    this.loadingOptions = true;
    this.dataSourcesService.getColumnOptions(columnId).subscribe({
      next: (options: DropdownOptionDto[]) => {
        this.dropdownOptions = options;
        this.loadingOptions = false;
      },
      error: (error: any) => {
        console.error('[GridColumnsList] Error loading dropdown options:', error);
        this.dropdownOptions = [];
        this.loadingOptions = false;
      }
    });
  }

  testDropdownOptions(columnId?: number): void {
    if (!columnId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Column ID is required to test dropdown options'
      });
      return;
    }

    this.loadingOptions = true;
    this.gridService.loadColumnOptions(columnId).subscribe({
      next: (response) => {
        if (response.data) {
          this.dropdownOptions = response.data;
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: `Loaded ${response.data.length} dropdown options`
          });
        }
        this.loadingOptions = false;
      },
      error: (error) => {
        console.error('[GridColumnsList] Error testing dropdown options:', error);
        this.loadingOptions = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load dropdown options'
        });
      }
    });
  }

  openDataSourceModal(dataSource?: GridColumnDataSourceDto): void {
    // If editing an existing data source, allow it
    if (dataSource) {
      // Existing data source - proceed normally
    } else if (!this.editingColumn?.id) {
      // New column - save it first before opening data source modal
      if (this.columnForm.invalid) {
        this.columnForm.markAllAsTouched();
        this.messageService.add({
          severity: 'warn',
          summary: 'Validation',
          detail: 'Please fill all required column fields first before adding a data source.'
        });
        return;
      }

      // Auto-save column first
      this.loading = true;
      const columnData = this.columnForm.value;
      const createDto: CreateFormGridColumnDto = {
        gridId: this.gridId,
        fieldTypeId: Number(columnData.fieldTypeId),
        columnName: columnData.columnName,
        foreignColumnName: columnData.foreignColumnName || undefined,
        columnCode: columnData.columnCode.toUpperCase(),
        columnOrder: Number(columnData.columnOrder || 1),
        dataType: columnData.dataType,
        isRequired: columnData.isRequired || false,
        isActive: columnData.isActive === true || columnData.isActive === 'true' || columnData.isActive === 1 || (columnData.isActive !== false && columnData.isActive !== 'false' && columnData.isActive !== 0 && columnData.isActive !== null && columnData.isActive !== undefined),
        isDeleted: false,
        isReadOnly: columnData.isReadOnly || false,
        isVisible: columnData.isVisible !== false,
        defaultValue: columnData.defaultValue || undefined,
        createdByUserId: 'f776321b-3476-494d-aaef-18439f35a1b4'
      };

      this.gridService.createColumn(createDto).subscribe({
        next: (response) => {
          const createdColumn = response.data || response;
          const columnId = createdColumn?.id;
          
          if (columnId) {
            // Set editingColumn to the newly created column
            this.editingColumn = createdColumn;
            
            // Update form with the created column's ID
            this.columnForm.patchValue({ dataSourceId: createdColumn.dataSourceId || null });
            
            // Load columns to refresh the list
            this.loadColumns();
            
            // Now open the data source modal
            this.loading = false;
            this.openDataSourceModalInternal(dataSource);
          } else {
            this.loading = false;
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to create column. Please try again.'
            });
          }
        },
        error: (error) => {
          this.loading = false;
          const errorMessage = error?.error?.message || error?.error?.title || error?.message || 'Failed to create column';
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: errorMessage
          });
        }
      });
      return;
    }
    
    this.openDataSourceModalInternal(dataSource);
  }

  private openDataSourceModalInternal(dataSource?: GridColumnDataSourceDto): void {
    if (dataSource) {
      this.selectedDataSource = dataSource;
      this.dataSourceForm.patchValue({
        sourceType: dataSource.sourceType,
        apiUrl: dataSource.apiUrl || '',
        apiPath: dataSource.apiPath || '',
        httpMethod: dataSource.httpMethod || 'GET',
        requestBodyJson: dataSource.requestBodyJson || '',
        valuePath: dataSource.valuePath || '',
        textPath: dataSource.textPath || '',
        configurationJson: dataSource.configurationJson || '',
        isActive: dataSource.isActive
      });
    } else {
      this.selectedDataSource = null;
      this.dataSourceForm.reset({
        sourceType: 'Static',
        apiUrl: '',
        apiPath: '',
        httpMethod: 'GET',
        requestBodyJson: '',
        valuePath: '',
        textPath: '',
        configurationJson: '',
        isActive: true
      });
    }
    
    // Call onDataSourceTypeChange to ensure apiUrl is enabled/disabled correctly
    // This is the same pattern used in Fields component
    this.onDataSourceTypeChange();
    
    this.showDataSourceModal = true;
  }

  closeDataSourceModal(): void {
    this.showDataSourceModal = false;
    this.selectedDataSource = null;
    this.dropdownOptions = [];
    this.availableProperties = [];
    this.availableColumns = [];
    this.availableLookupTables = [];
    this.previewOptions = [];
    this.rawApiResponse = null;
    this.apiDebugError = null;
  }

  /**
   * Handle data source type change (same as Field component)
   */
  onDataSourceTypeChange(): void {
    const sourceType = this.dataSourceForm.get('sourceType')?.value;
    const apiUrlControl = this.dataSourceForm.get('apiUrl');
    
    // Reset fields based on source type
    if (sourceType === 'Static') {
      // Clear DataSource config for Static
      this.dataSourceForm.patchValue({
        apiUrl: '',
        httpMethod: 'GET',
        requestBodyJson: '',
        valuePath: '',
        textPath: '',
        apiPath: '',
        configurationJson: ''
      });
      // Disable apiUrl for Static
      if (apiUrlControl) {
        apiUrlControl.disable({ emitEvent: false });
      }
      this.availableProperties = [];
      this.availableColumns = [];
    } else if (sourceType === 'LookupTable') {
      // Set default columns for LookupTable
      this.dataSourceForm.patchValue({
        httpMethod: '',
        requestBodyJson: '',
        valuePath: this.dataSourceForm.get('valuePath')?.value || 'Id',
        textPath: this.dataSourceForm.get('textPath')?.value || 'Name',
        apiPath: '',
        configurationJson: ''
      });
      // Enable apiUrl for LookupTable (it's used as table name selector)
      if (apiUrlControl) {
        apiUrlControl.enable({ emitEvent: false });
      }
      this.availableProperties = [];
      // Load lookup tables
      this.loadLookupTables();
      // Load columns when table name is provided
      const tableName = this.dataSourceForm.get('apiUrl')?.value;
      if (tableName && tableName.trim()) {
        this.loadTableColumns(tableName);
      } else {
        this.availableColumns = [];
        this.updatePathControlsState();
      }
    } else if (sourceType === 'API') {
      // Set default HTTP method and paths for API
      this.dataSourceForm.patchValue({
        httpMethod: this.dataSourceForm.get('httpMethod')?.value || 'GET',
        requestBodyJson: '',
        valuePath: this.dataSourceForm.get('valuePath')?.value || 'id',
        textPath: this.dataSourceForm.get('textPath')?.value || 'name',
        apiPath: '',
        configurationJson: ''
      });
      // Enable apiUrl for API
      if (apiUrlControl) {
        apiUrlControl.enable({ emitEvent: false });
      }
      this.availableColumns = [];
      // Clear properties until API is tested
      this.availableProperties = [];
    }
    
    this.cdr.detectChanges();
  }

  /**
   * Load available lookup tables
   */
  loadLookupTables(): void {
    const sourceType = this.dataSourceForm.get('sourceType')?.value;
    if (sourceType !== 'LookupTable') {
      return;
    }

    this.fieldDataSourceService.getAvailableLookupTables().subscribe({
      next: (tables: string[]) => {
        this.availableLookupTables = tables || [];
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('[GridColumnsList] Error loading lookup tables:', error);
        this.availableLookupTables = [];
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Handle table selection change
   */
  onTableSelected(): void {
    const tableName = this.dataSourceForm.get('apiUrl')?.value;
    if (tableName && tableName.trim()) {
      this.loadTableColumns(tableName);
    } else {
      this.availableColumns = [];
      this.updatePathControlsState();
    }
  }

  /**
   * Load table columns (for LookupTable source type)
   */
  loadTableColumns(tableName: string): void {
    if (!tableName || !tableName.trim()) {
      this.availableColumns = [];
      this.updatePathControlsState();
      return;
    }

    this.fieldDataSourceService.getTableColumns(tableName).subscribe({
      next: (columns: string[]) => {
        this.availableColumns = columns.sort();
        this.updatePathControlsState();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('[GridColumnsList] Error loading table columns:', error);
        this.availableColumns = [];
        this.updatePathControlsState();
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Update disabled state of valuePath and textPath controls
   */
  private updatePathControlsState(): void {
    const valuePathControl = this.dataSourceForm.get('valuePath');
    const textPathControl = this.dataSourceForm.get('textPath');
    const shouldDisable = this.availableColumns.length === 0;

    if (valuePathControl) {
      if (shouldDisable && !valuePathControl.disabled) {
        valuePathControl.disable({ emitEvent: false });
      } else if (!shouldDisable && valuePathControl.disabled) {
        valuePathControl.enable({ emitEvent: false });
      }
    }

    if (textPathControl) {
      if (shouldDisable && !textPathControl.disabled) {
        textPathControl.disable({ emitEvent: false });
      } else if (!shouldDisable && textPathControl.disabled) {
        textPathControl.enable({ emitEvent: false });
      }
    }
  }

  saveDataSource(): void {
    if (this.dataSourceForm.invalid) {
      this.dataSourceForm.markAllAsTouched();
      return;
    }

    const formValue = this.dataSourceForm.value;

    if (this.selectedDataSource) {
      // Update existing data source
      this.dataSourcesService.updateDataSource(this.selectedDataSource.id, formValue).subscribe({
        next: (dataSource: GridColumnDataSourceDto) => {
          this.loadDataSources();
          this.closeDataSourceModal();
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Data source updated successfully'
          });
        },
        error: (error: any) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error?.error?.message || 'Failed to update data source'
          });
        }
      });
    } else {
      // Create new data source - columnId is required
      if (!this.editingColumn?.id) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Grid column not found. Please save the column first.'
        });
        return;
      }

      const createDto: CreateGridColumnDataSourceDto = {
        columnId: this.editingColumn.id, // Use current column ID
        sourceType: formValue.sourceType,
        apiUrl: formValue.apiUrl || undefined,
        apiPath: formValue.apiPath || undefined,
        httpMethod: formValue.httpMethod || undefined,
        requestBodyJson: formValue.requestBodyJson || undefined,
        valuePath: formValue.valuePath || undefined,
        textPath: formValue.textPath || undefined,
        configurationJson: formValue.configurationJson || undefined,
        isActive: formValue.isActive === true || formValue.isActive === 'true' || formValue.isActive === 1 || (formValue.isActive !== false && formValue.isActive !== 'false' && formValue.isActive !== 0 && formValue.isActive !== null && formValue.isActive !== undefined),
        createdByUserId: 'system' // TODO: Get from auth service
      };

      this.dataSourcesService.createDataSource(createDto).subscribe({
        next: (dataSource: GridColumnDataSourceDto) => {
          this.loadDataSources();
          this.closeDataSourceModal();
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Data source created successfully'
          });
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error?.error?.message || 'Failed to create data source'
          });
        }
      });
    }
  }

  get filteredColumns(): FormGridColumnDto[] {
    // Return all columns regardless of isActive or isVisible status
    // The table should show all columns, and status is displayed in the Status column
    let result = this.columns;
    
    // Only filter by search term if provided
    if (this.searchTerm.trim()) {
    const term = this.searchTerm.toLowerCase();
      result = this.columns.filter(column =>
      column.columnName.toLowerCase().includes(term) ||
      (column.columnCode && column.columnCode.toLowerCase().includes(term))
    );
    }
    
    return result;
  }

  trackByColumnId(index: number, column: FormGridColumnDto): any {
    return column.id || index;
  }

  openColumnModal(column?: FormGridColumnDto): void {
    this.currentInputLanguage = 'en';
    if (column) {
      this.editingColumn = column;
      // Normalize isActive value
      let isActiveValue: boolean;
      if (column.isActive === undefined || column.isActive === null) {
        isActiveValue = true; // Default to true if null/undefined
      } else if (typeof column.isActive === 'boolean') {
        isActiveValue = column.isActive;
      } else if (typeof column.isActive === 'string') {
        isActiveValue = column.isActive === 'true' || column.isActive === '1';
      } else if (typeof column.isActive === 'number') {
        isActiveValue = column.isActive === 1;
      } else {
        isActiveValue = true; // Default to true for any other type
      }

      // Normalize isVisible value (same logic as isActive)
      let isVisibleValue: boolean;
      if (column.isVisible === undefined || column.isVisible === null) {
        isVisibleValue = true; // Default to true if null/undefined
      } else if (typeof column.isVisible === 'boolean') {
        isVisibleValue = column.isVisible;
      } else if (typeof column.isVisible === 'string') {
        isVisibleValue = column.isVisible === 'true' || column.isVisible === '1';
      } else if (typeof column.isVisible === 'number') {
        isVisibleValue = column.isVisible === 1;
      } else {
        isVisibleValue = true; // Default to true for any other type
      }

      this.columnForm.patchValue({
        fieldTypeId: column.fieldTypeId || '',
        columnName: column.columnName,
        foreignColumnName: column.foreignColumnName || '',
        columnCode: column.columnCode,
        columnOrder: column.columnOrder || 1,
        dataType: column.dataType || 'text',
        isRequired: column.isRequired || false,
        isActive: isActiveValue,
        isReadOnly: column.isReadOnly || false,
        isVisible: isVisibleValue,
        defaultValue: column.defaultValue || '',
        dataSourceId: column.dataSourceId || null
      }, { emitEvent: false });
      
      // Load column DataSource if column has ID
      // isActive is already set in the form above, so no need to pass it
      if (column.id) {
        this.loadColumnDataSource(column.id);
      } else {
        // Reset DataSource config for new column
        this.existingColumnDataSource = null;
        this.dataSourceType = 'Static';
        this.resetColumnDataSourceConfig();
      }
      
      // Load column options if field type has options
      const selectedFieldType = this.getSelectedFieldType();
      this.showOptionsSection = selectedFieldType?.hasOptions === true && this.dataSourceType === 'Static';
      if (selectedFieldType?.hasOptions === true && this.dataSourceType === 'Static' && column.id) {
        // Load options from API if column has ID
        this.loadColumnOptionsFromApi(column.id);
      } else {
        // Clear options
        while (this.columnOptionsFormArray.length !== 0) {
          this.columnOptionsFormArray.removeAt(0);
        }
      }
    } else {
      this.editingColumn = null;
      const nextOrder = this.columns.length > 0
        ? Math.max(...this.columns.map(c => c.columnOrder || 0)) + 1
        : 1;
      const defaultFieldTypeId = this.fieldTypes.length > 0 ? this.fieldTypes[0].id : '';
      this.dataSourceType = 'Static'; // Reset to Static for new column
      this.existingColumnDataSource = null;
      this.resetColumnDataSourceConfig();
      this.columnForm.reset({
        fieldTypeId: defaultFieldTypeId,
        columnName: '',
        foreignColumnName: '',
        columnCode: '',
        columnOrder: nextOrder,
        dataType: 'text',
        isRequired: false,
        isActive: true,
        isReadOnly: false,
        isVisible: true,
        defaultValue: '',
        dataSourceId: null
      }, { emitEvent: false });
      this.showOptionsSection = false;
      // Clear options
      while (this.columnOptionsFormArray.length !== 0) {
        this.columnOptionsFormArray.removeAt(0);
      }
    }
    this.showColumnModal = true;
  }
  
  /**
   * Reset Column DataSource Configuration
   */
  resetColumnDataSourceConfig(): void {
    this.columnDataSourceConfig = {
      apiUrl: null,
      httpMethod: 'GET',
      requestBodyJson: null,
      valuePath: null,
      textPath: null
    };
    this.columnLookupTableConfig = {
      table: '',
      valueColumn: 'Id',
      textColumn: 'Name'
    };
    this.availableProperties = [];
    this.availableColumns = [];
  }
  
  /**
   * Load Column DataSource when editing (similar to FieldsListComponent)
   */
  loadColumnDataSource(columnId: number): void {
    // احفظ قيمة isActive قبل أي شيء - هذه القيمة يجب أن تبقى كما هي
    const preservedIsActive = this.columnForm.get('isActive')?.value;
    console.log('[GridColumnsList] loadColumnDataSource START - preservedIsActive:', preservedIsActive);
    
    // لا تعيد تعيين isActive هنا - القيمة موجودة بالفعل في الـ form من openColumnModal()
    // فقط قم بتحميل DataSource وتحديث dataSourceType
    
    // Try to load DataSource for each type (Api, LookupTable)
    // We'll check both types and use the one that exists
    forkJoin({
      api: this.dataSourcesService.getDataSourceByColumnIdAndType(columnId, 'API'),
      lookupTable: this.dataSourcesService.getDataSourceByColumnIdAndType(columnId, 'LookupTable')
    }).subscribe({
      next: (results) => {
        const apiDataSource = results.api;
        const lookupTableDataSource = results.lookupTable;
        
        // احفظ قيمة isActive قبل أي تغيير
        const isActiveBeforeChange = this.columnForm.get('isActive')?.value;
        console.log('[GridColumnsList] loadColumnDataSource - isActive before change:', isActiveBeforeChange);
        
        if (apiDataSource) {
          this.existingColumnDataSource = apiDataSource;
          this.dataSourceType = 'API';
          this.columnDataSourceConfig = {
            apiUrl: apiDataSource.apiUrl || null,
            httpMethod: apiDataSource.httpMethod || 'GET',
            requestBodyJson: apiDataSource.requestBodyJson || null,
            valuePath: apiDataSource.valuePath || null,
            textPath: apiDataSource.textPath || null
          };
          // لا تعيد تعيين isActive - احتفظ بالقيمة الحالية في النموذج
        } else if (lookupTableDataSource) {
          this.existingColumnDataSource = lookupTableDataSource;
          this.dataSourceType = 'LookupTable';
          // For LookupTable, apiUrl contains the table name
          this.columnLookupTableConfig = {
            table: lookupTableDataSource.apiUrl || '',
            valueColumn: lookupTableDataSource.valuePath || 'Id',
            textColumn: lookupTableDataSource.textPath || 'Name'
          };
          // لا تعيد تعيين isActive - احتفظ بالقيمة الحالية في النموذج
          // Load table columns if table is selected
          if (this.columnLookupTableConfig.table) {
            this.loadColumnTableColumns(this.columnLookupTableConfig.table);
          }
        } else {
          // No DataSource found, use Static
          this.existingColumnDataSource = null;
          this.dataSourceType = 'Static';
          this.resetColumnDataSourceConfig();
          // لا تعيد تعيين isActive - احتفظ بالقيمة الحالية في النموذج
        }
        
        // تأكد من أن isActive لم يتغير - استخدم القيمة المحفوظة في البداية
        const isActiveAfterChange = this.columnForm.get('isActive')?.value;
        console.log('[GridColumnsList] loadColumnDataSource - isActive after change:', {
          preservedIsActive,
          isActiveBeforeChange,
          isActiveAfterChange
        });
        if (preservedIsActive !== isActiveAfterChange) {
          console.warn('[GridColumnsList] WARNING: isActive changed from', preservedIsActive, 'to', isActiveAfterChange, '- Restoring original value');
          // استعد القيمة الأصلية المحفوظة في البداية
          this.columnForm.patchValue({ 
            isActive: preservedIsActive
          }, { emitEvent: false });
        }
        
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('[GridColumnsList] Error loading column DataSource:', error);
        this.existingColumnDataSource = null;
        this.dataSourceType = 'Static';
        this.resetColumnDataSourceConfig();
        // لا تعيد تعيين isActive - احتفظ بالقيمة الحالية في النموذج
        this.cdr.detectChanges();
      }
    });
  }

  get columnOptionsFormArray(): FormArray {
    return this.columnForm.get('columnOptions') as FormArray;
  }

  addColumnOption(): void {
    const optionForm = this.fb.group({
      optionValue: ['', Validators.required],
      optionText: ['', Validators.required],
      foreignOptionText: [''],
      optionOrder: [this.columnOptionsFormArray.length + 1],
      isDefault: [false]
    });
    this.columnOptionsFormArray.push(optionForm);
  }

  removeColumnOption(index: number): void {
    this.columnOptionsFormArray.removeAt(index);
    // Update option orders
    this.columnOptionsFormArray.controls.forEach((control, i) => {
      control.patchValue({ optionOrder: i + 1 }, { emitEvent: false });
    });
  }

  loadColumnOptions(options: GridColumnOptionDto[]): void {
    // Clear existing options
    while (this.columnOptionsFormArray.length !== 0) {
      this.columnOptionsFormArray.removeAt(0);
    }
    
    // Add options from column
    if (options && options.length > 0) {
      options.forEach(option => {
        const optionForm = this.fb.group({
          optionValue: [option.optionValue || '', Validators.required],
          optionText: [option.optionText || '', Validators.required],
          foreignOptionText: [option.foreignOptionText || ''],
          optionOrder: [option.optionOrder || this.columnOptionsFormArray.length + 1],
          isDefault: [option.isDefault || false]
        });
        this.columnOptionsFormArray.push(optionForm);
      });
    }
  }

  /**
   * Load column options from API
   */
  loadColumnOptionsFromApi(columnId: number): void {
    this.gridColumnOptionsService.getOptionsByColumnId(columnId).subscribe({
      next: (options: GridColumnOptionDto[]) => {
        if (options && options.length > 0) {
          this.loadColumnOptions(options);
        } else {
          // No options found, clear the form array
          while (this.columnOptionsFormArray.length !== 0) {
            this.columnOptionsFormArray.removeAt(0);
          }
          // Add one empty option if field type has options
          const selectedFieldType = this.getSelectedFieldType();
          if (selectedFieldType?.hasOptions === true && this.dataSourceType === 'Static') {
            this.addColumnOption();
          }
        }
      },
      error: (error) => {
        console.error('[GridColumnsList] Error loading column options from API:', error);
        // Clear options on error
        while (this.columnOptionsFormArray.length !== 0) {
          this.columnOptionsFormArray.removeAt(0);
        }
        // Add one empty option if field type has options
        const selectedFieldType = this.getSelectedFieldType();
        if (selectedFieldType?.hasOptions === true && this.dataSourceType === 'Static') {
          this.addColumnOption();
        }
      }
    });
  }

  setInputLanguage(lang: 'en' | 'ar'): void {
    this.currentInputLanguage = lang;
  }

  translateLabel(key: string): string {
    return this.translationService.translateForLanguage(key, this.currentInputLanguage);
  }

  /**
   * Check if a field is invalid (similar to FieldsListComponent)
   */
  isFieldInvalid(fieldName: string): boolean {
    const control = this.columnForm.get(fieldName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  /**
   * Get error message for a field (similar to FieldsListComponent)
   */
  getFieldErrorMessage(fieldName: string): string {
    const control = this.columnForm.get(fieldName);
    if (!control || !control.errors) {
      return '';
    }

    if (control.errors['required']) {
      return this.translateLabel('common.fieldRequired') || 'This field is required';
    }

    if (control.errors['pattern']) {
      if (fieldName === 'columnCode') {
        return this.translateLabel('fields.fieldCodeInvalid') || 'Invalid format. Use only letters, numbers and underscores';
      }
      return this.translateLabel('common.invalidFormat') || 'Invalid format';
    }

    if (control.errors['min']) {
      return `${this.translateLabel('common.minValue') || 'Minimum value'}: ${control.errors['min'].min}`;
    }

    if (control.errors['max']) {
      return `${this.translateLabel('common.maxValue') || 'Maximum value'}: ${control.errors['max'].max}`;
    }

    if (control.errors['minlength']) {
      return `${this.translateLabel('common.minLength') || 'Minimum length'}: ${control.errors['minlength'].requiredLength}`;
    }

    if (control.errors['maxlength']) {
      return `${this.translateLabel('common.maxLength') || 'Maximum length'}: ${control.errors['maxlength'].requiredLength}`;
    }

    if (control.errors['email']) {
      return this.translateLabel('common.invalidEmail') || 'Please enter a valid email address';
    }

    // Return first error message
    const firstError = Object.keys(control.errors)[0];
    return control.errors[firstError]?.message || this.translateLabel('common.invalidValue') || 'Invalid value';
  }

  closeColumnModal(): void {
    this.showColumnModal = false;
    this.editingColumn = null;
    const defaultFieldTypeId = this.fieldTypes.length > 0 ? this.fieldTypes[0].id : '';
    this.columnForm.reset({
      fieldTypeId: defaultFieldTypeId,
      columnOrder: 1,
      dataType: 'text',
      isRequired: false,
      isActive: true,
      isReadOnly: false,
      isVisible: true
    });
  }

  getFieldTypeName(fieldTypeId: number | undefined, column?: FormGridColumnDto): string {
    if (!fieldTypeId) {
      return 'Unknown';
    }
    
    // Convert to number if it's a string
    const numericId = Number(fieldTypeId);
    if (isNaN(numericId)) {
      return `Invalid ID: ${fieldTypeId}`;
    }
    
    // First, try to find in fieldTypes array (most reliable)
    if (this.fieldTypes && this.fieldTypes.length > 0) {
      const type = this.fieldTypes.find(t => t.id === numericId);
      if (type && type.typeName) {
        return type.typeName;
      }
    }
    
    // If not found and column has fieldType navigation property, use it
    // Note: This assumes the API returns fieldType as a navigation property
    const columnAny = column as any;
    if (columnAny?.fieldType?.typeName) {
      return columnAny.fieldType.typeName;
    }
    
    // Last resort: return the ID
    return `Type ${numericId}`;
  }

  getSelectedFieldType(): FieldTypeDto | undefined {
    const rawFieldTypeId = this.columnForm.get('fieldTypeId')?.value;
    const fieldTypeId = Number(rawFieldTypeId);
    if (!fieldTypeId) return undefined;
    return this.fieldTypes.find(t => t.id === fieldTypeId);
  }

  getDataSourceType(): 'Static' | 'API' | 'LookupTable' {
    // First check if dataSourceType is explicitly set (from radio buttons)
    if (this.dataSourceType) {
      return this.dataSourceType;
    }
    
    // Fallback: check dataSourceId
    const dataSourceId = this.columnForm.get('dataSourceId')?.value;
    if (!dataSourceId) {
      return 'Static';
    }
    const dataSource = this.dataSources.find(ds => ds.id === dataSourceId);
    if (!dataSource) {
      return 'Static';
    }
    return dataSource.sourceType as 'Static' | 'API' | 'LookupTable';
  }
  
  /**
   * Handle data source type change from radio buttons (for Column Form)
   */
  onColumnDataSourceTypeChange(): void {
    const selectedFieldType = this.getSelectedFieldType();
    this.showOptionsSection = (selectedFieldType?.hasOptions === true || this.isOptionsFieldType()) && this.dataSourceType === 'Static';
    
    // احفظ قيمة isActive الحالية - لا تعيد تعيينها إلا في النهاية إذا لزم الأمر
    const currentIsActive = this.columnForm.get('isActive')?.value;
    console.log('[GridColumnsList] onColumnDataSourceTypeChange - isActive at start:', {
      currentIsActive,
      dataSourceType: this.dataSourceType
    });
    
    if (this.dataSourceType === 'Static') {
      // Clear dataSourceId when switching to Static
      this.columnForm.patchValue({ 
        dataSourceId: null
      }, { emitEvent: false });
      
      // Reset DataSource config
      this.columnDataSourceConfig = {
        apiUrl: null,
        httpMethod: 'GET',
        requestBodyJson: null,
        valuePath: null,
        textPath: null
      };
      this.columnLookupTableConfig = {
        table: '',
        valueColumn: 'Id',
        textColumn: 'Name'
      };
      this.availableProperties = [];
      this.availableColumns = [];
      
      // If field type has options, add one empty option
      if ((selectedFieldType?.hasOptions === true || this.isOptionsFieldType()) && this.columnOptionsFormArray.length === 0) {
        this.addColumnOption();
      }
    } else if (this.dataSourceType === 'LookupTable') {
      // لا تعيد تعيين isActive - احتفظ بالقيمة الحالية
      
      // Load lookup tables when switching to LookupTable
      this.loadColumnLookupTables();
      
      // Clear options when switching to LookupTable
      while (this.columnOptionsFormArray.length !== 0) {
        this.columnOptionsFormArray.removeAt(0);
      }
    } else if (this.dataSourceType === 'API') {
      // لا تعيد تعيين isActive - احتفظ بالقيمة الحالية
      
      // Reset API config
      this.columnDataSourceConfig = {
        apiUrl: null,
        httpMethod: 'GET',
        requestBodyJson: null,
        valuePath: 'id',
        textPath: 'title' // Changed from 'name' to 'title' for better API compatibility
      };
      this.availableProperties = [];
      
      // Clear options when switching to Api
      while (this.columnOptionsFormArray.length !== 0) {
        this.columnOptionsFormArray.removeAt(0);
      }
    }
    
    // تأكد من أن قيمة isActive تظل كما هي - فقط إذا كانت null/undefined، استخدم true كـ default
    const isActiveAtEnd = this.columnForm.get('isActive')?.value;
    if (currentIsActive === null || currentIsActive === undefined) {
      this.columnForm.patchValue({ 
        isActive: true
      }, { emitEvent: false });
    } else if (currentIsActive !== isActiveAtEnd) {
      // إذا تغيرت القيمة بشكل غير متوقع، استعدها
      console.warn('[GridColumnsList] onColumnDataSourceTypeChange - isActive changed unexpectedly from', currentIsActive, 'to', isActiveAtEnd);
      this.columnForm.patchValue({ 
        isActive: currentIsActive
      }, { emitEvent: false });
    }
    
    console.log('[GridColumnsList] onColumnDataSourceTypeChange - isActive at end:', {
      currentIsActive,
      isActiveAtEnd: this.columnForm.get('isActive')?.value,
      dataSourceType: this.dataSourceType
    });
    // إذا كانت القيمة موجودة (true/false)، لا تفعل شيئًا - احتفظ بها كما هي
  }
  
  /**
   * Load lookup tables for Column Modal
   */
  loadColumnLookupTables(): void {
    this.fieldDataSourceService.getAvailableLookupTables().subscribe({
      next: (tables: string[]) => {
        this.availableLookupTables = tables || [];
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('[GridColumnsList] Error loading lookup tables:', error);
        this.availableLookupTables = [];
        this.cdr.detectChanges();
      }
    });
  }
  
  /**
   * Handle table selection change in Column Modal
   */
  onColumnTableSelected(): void {
    const tableName = this.columnLookupTableConfig.table;
    if (tableName && tableName.trim()) {
      this.loadColumnTableColumns(tableName);
      // Auto-preview will be triggered after columns are loaded and value/text paths are set
    } else {
      this.availableColumns = [];
      this.previewOptions = [];
    }
  }
  
  /**
   * Load columns from selected table for Column Modal
   */
  loadColumnTableColumns(tableName: string): void {
    this.fieldDataSourceService.getTableColumns(tableName).subscribe({
      next: (columns: string[]) => {
        this.availableColumns = columns || [];
        // Auto-set value and text columns if not set
        if (!this.columnLookupTableConfig.valueColumn && this.availableColumns.length > 0) {
          const idColumn = this.availableColumns.find(col => 
            col.toLowerCase().includes('id') || col.toLowerCase() === 'value'
          );
          this.columnLookupTableConfig.valueColumn = idColumn || this.availableColumns[0];
        }
        if (!this.columnLookupTableConfig.textColumn && this.availableColumns.length > 0) {
          const nameColumn = this.availableColumns.find(col => 
            col.toLowerCase().includes('name') || col.toLowerCase() === 'text'
          );
          this.columnLookupTableConfig.textColumn = nameColumn || (this.availableColumns.length > 1 ? this.availableColumns[1] : this.availableColumns[0]);
        }
        // Auto-preview after columns are loaded and paths are set
        if (this.columnLookupTableConfig.valueColumn && this.columnLookupTableConfig.textColumn) {
          this.debouncedPreviewColumnDataSource();
        }
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('[GridColumnsList] Error loading table columns:', error);
        this.availableColumns = [];
        this.cdr.detectChanges();
      }
    });
  }
  
  /**
   * Test API response for Column Modal
   */
  testColumnApiResponse(): void {
    if (!this.columnDataSourceConfig.apiUrl || !this.columnDataSourceConfig.apiUrl.trim()) {
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

    // Use actual values from config, or try to fetch raw data first to extract properties
    // If valuePath/textPath are not set, we'll try to call API with common defaults
    // and then extract properties from error message or response
    let valuePath = this.columnDataSourceConfig.valuePath;
    let textPath = this.columnDataSourceConfig.textPath;
    
    // If paths are not set, use defaults but we'll update them after getting available properties
    if (!valuePath) {
      valuePath = 'id';
    }
    if (!textPath) {
      textPath = 'title'; // Changed from 'name' to 'title' for better API compatibility
    }

    const requestPayload: any = {
      fieldId: 0, // Use 0 for preview
      sourceType: 'API',
      apiUrl: this.columnDataSourceConfig.apiUrl || '',
      httpMethod: this.columnDataSourceConfig.httpMethod || 'GET',
      requestBodyJson: this.columnDataSourceConfig.requestBodyJson || undefined,
      valuePath: valuePath,
      textPath: textPath
    };

    this.fieldDataSourceService.previewDataSource(requestPayload).subscribe({
      next: (response) => {
        this.loadingPreview = false;
        // Response is directly FieldOptionResponse[] (not wrapped)
        const options = Array.isArray(response) ? response : (response as any)?.data || [];
        if (options && options.length > 0) {
          this.previewOptions = options;
          this.rawApiResponse = response;
          
          // Extract available properties from first option
          if (this.previewOptions.length > 0) {
            const firstOption = this.previewOptions[0];
            if (typeof firstOption === 'object' && firstOption !== null) {
              this.availableProperties = Object.keys(firstOption);
              
              // Auto-set valuePath and textPath if not already set
              if (!this.columnDataSourceConfig.valuePath && this.availableProperties.length > 0) {
                // Priority: 'id' first, then properties containing 'id', avoid 'value' unless it's the only option
                const idProp = this.availableProperties.find(prop => 
                  prop.toLowerCase() === 'id'
                ) || this.availableProperties.find(prop => 
                  prop.toLowerCase().includes('id') && prop.toLowerCase() !== 'id'
                );
                this.columnDataSourceConfig.valuePath = idProp || this.availableProperties[0];
              }
              
              if (!this.columnDataSourceConfig.textPath && this.availableProperties.length > 0) {
                const nameProp = this.availableProperties.find(prop => 
                  prop.toLowerCase() === 'name' ||
                  prop.toLowerCase().includes('name') ||
                  prop.toLowerCase() === 'text' ||
                  prop.toLowerCase() === 'title' ||
                  prop.toLowerCase() === 'label'
                );
                // If no 'name' found, try firstName or lastName
                if (!nameProp) {
                  const firstNameProp = this.availableProperties.find(prop => 
                    prop.toLowerCase() === 'firstname' ||
                    prop.toLowerCase() === 'first_name'
                  );
                  this.columnDataSourceConfig.textPath = firstNameProp || 
                    (this.availableProperties.length > 1 ? this.availableProperties[1] : this.availableProperties[0]);
                } else {
                  this.columnDataSourceConfig.textPath = nameProp;
                }
              }
            }
          }
          
          // Call previewColumnDataSource to show "options found" message
          // But only if we have valuePath and textPath set
          if (this.columnDataSourceConfig.valuePath && this.columnDataSourceConfig.textPath) {
            // previewOptions is already set, just show the message
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: `Loaded ${this.previewOptions.length} options`
            });
          }
        } else {
          this.apiDebugError = 'No data returned from API';
          this.previewOptions = [];
        }
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.loadingPreview = false;
        const errorMessage = error?.error?.message || error?.message || 'Failed to load API response';
        this.apiDebugError = errorMessage;
        
        // Try to extract available properties from error message
        if (errorMessage.includes('Available properties')) {
          const propertiesMatch = errorMessage.match(/Available properties in the first item: ([^.]+)/);
          if (propertiesMatch && propertiesMatch[1]) {
            this.availableProperties = propertiesMatch[1]
              .split(',')
              .map((p: string) => p.trim())
              .filter((p: string) => p.length > 0);
            
            // Auto-set valuePath and textPath from available properties
            if (this.availableProperties.length > 0) {
              if (!this.columnDataSourceConfig.valuePath) {
                // Priority: 'id' first, then properties containing 'id', avoid 'value' unless it's the only option
                const idProp = this.availableProperties.find(prop => 
                  prop.toLowerCase() === 'id'
                ) || this.availableProperties.find(prop => 
                  prop.toLowerCase().includes('id') && prop.toLowerCase() !== 'id'
                );
                this.columnDataSourceConfig.valuePath = idProp || this.availableProperties[0];
              }
              
              if (!this.columnDataSourceConfig.textPath) {
                const nameProp = this.availableProperties.find(prop => 
                  prop.toLowerCase() === 'name' ||
                  prop.toLowerCase().includes('name') ||
                  prop.toLowerCase() === 'text' ||
                  prop.toLowerCase() === 'title' ||
                  prop.toLowerCase() === 'label'
                );
                // If no 'name' found, try firstName or lastName
                if (!nameProp) {
                  const firstNameProp = this.availableProperties.find(prop => 
                    prop.toLowerCase() === 'firstname' ||
                    prop.toLowerCase() === 'first_name'
                  );
                  this.columnDataSourceConfig.textPath = firstNameProp || 
                    (this.availableProperties.length > 1 ? this.availableProperties[1] : this.availableProperties[0]);
                } else {
                  this.columnDataSourceConfig.textPath = nameProp;
                }
              }
              
              // Show warning with suggestion to retry
              this.messageService.add({
                severity: 'warn',
                summary: 'Auto-detected Properties',
                detail: `Please select Value Path and Text Path from available properties, then click "Test API" again.`,
                life: 8000
              });
            }
          }
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: this.apiDebugError || 'Failed to load API response'
          });
        }
        this.cdr.detectChanges();
      }
    });
  }
  
  /**
   * Apply property as path in Column Modal
   */
  applyColumnPropertyAsPath(property: string): void {
    const lowerProp = property.toLowerCase();
    if (lowerProp.includes('id') || lowerProp === 'value') {
      this.columnDataSourceConfig.valuePath = property;
    } else {
      this.columnDataSourceConfig.textPath = property;
    }
    this.cdr.detectChanges();
  }
  
  /**
   * Apply column as path in Column Modal
   */
  applyColumnColumnAsPath(column: string): void {
    const lowerCol = column.toLowerCase();
    if (lowerCol.includes('id') || lowerCol === 'value') {
      this.columnLookupTableConfig.valueColumn = column;
    } else {
      this.columnLookupTableConfig.textColumn = column;
    }
    // Auto-preview will be triggered by (change) event in HTML
    this.cdr.detectChanges();
  }

  /**
   * Debounced preview to prevent multiple rapid calls
   */
  debouncedPreviewColumnDataSource(): void {
    if (this.previewTimeout) {
      clearTimeout(this.previewTimeout);
    }
    this.previewTimeout = setTimeout(() => {
      this.previewColumnDataSource();
    }, 300);
  }

  /**
   * Preview DataSource options for Column Modal (for both API and LookupTable)
   * Similar to FieldsListComponent.previewDataSource()
   */
  previewColumnDataSource(): void {
    // Prevent multiple simultaneous calls
    if (this.loadingPreview) {
      return;
    }

    if (this.dataSourceType === 'Static') {
      return;
    }

    // Validate required fields
    if (this.dataSourceType === 'API') {
      if (!this.columnDataSourceConfig.apiUrl || !this.columnDataSourceConfig.apiUrl.trim()) {
        return;
      }
    } else if (this.dataSourceType === 'LookupTable') {
      if (!this.columnLookupTableConfig.table || !this.columnLookupTableConfig.table.trim()) {
        return;
      }
      if (!this.columnLookupTableConfig.valueColumn || !this.columnLookupTableConfig.textColumn) {
        return;
      }
    }

    // Ensure valuePath and textPath are set
    let valuePath: string;
    let textPath: string;

    if (this.dataSourceType === 'LookupTable') {
      valuePath = this.columnLookupTableConfig.valueColumn || 'Id';
      textPath = this.columnLookupTableConfig.textColumn || 'Name';
    } else {
      // For API, try to use availableProperties if they exist, otherwise use defaults
      // Default to 'title' instead of 'name' for better API compatibility
      if (this.availableProperties.length > 0) {
        // Auto-select from available properties
        if (!this.columnDataSourceConfig.valuePath) {
          // Priority: 'id' first, then properties containing 'id', avoid 'value' unless it's the only option
          const idProp = this.availableProperties.find(prop => 
            prop.toLowerCase() === 'id'
          ) || this.availableProperties.find(prop => 
            prop.toLowerCase().includes('id') && prop.toLowerCase() !== 'id'
          );
          valuePath = idProp || this.availableProperties[0];
        } else {
          valuePath = this.columnDataSourceConfig.valuePath;
        }
        if (!this.columnDataSourceConfig.textPath) {
          const nameProp = this.availableProperties.find(prop => 
            prop.toLowerCase() === 'name' || prop.toLowerCase() === 'title' || 
            prop.toLowerCase() === 'text' || prop.toLowerCase() === 'label'
          );
          textPath = nameProp || (this.availableProperties.length > 1 ? this.availableProperties[1] : this.availableProperties[0]);
        } else {
          textPath = this.columnDataSourceConfig.textPath;
        }
      } else {
        // Use defaults if availableProperties not loaded yet
        valuePath = this.columnDataSourceConfig.valuePath || 'id';
        textPath = this.columnDataSourceConfig.textPath || 'title'; // Changed from 'name' to 'title'
      }
    }

    this.loadingPreview = true;
    this.previewOptions = [];

    // For LookupTable, use table name directly for preview
    // For API, use the URL
    const apiUrlForPreview = this.dataSourceType === 'LookupTable'
      ? this.columnLookupTableConfig.table
      : (this.columnDataSourceConfig.apiUrl || undefined);

    // Prepare request payload
    const requestPayload: any = {
      fieldId: 0, // Use 0 for preview
      sourceType: this.dataSourceType,
      apiUrl: apiUrlForPreview,
      httpMethod: this.dataSourceType === 'API' ? (this.columnDataSourceConfig.httpMethod || 'GET') : undefined,
      requestBodyJson: this.dataSourceType === 'API' ? (this.columnDataSourceConfig.requestBodyJson || undefined) : undefined,
      valuePath: valuePath,
      textPath: textPath
    };

    this.fieldDataSourceService.previewDataSource(requestPayload).subscribe({
      next: (options) => {
        this.loadingPreview = false;
        const processedOptions = Array.isArray(options) ? options : (options as any)?.data || [];
        if (processedOptions && processedOptions.length > 0) {
          this.previewOptions = processedOptions;
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: `Loaded ${this.previewOptions.length} options`
          });
        } else {
          this.previewOptions = [];
        }
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.loadingPreview = false;
        this.previewOptions = [];
        const errorMessage = error?.error?.message || error?.message || 'Failed to load options';
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage
        });
        this.cdr.detectChanges();
      }
    });
  }
  
  /**
   * Save Column DataSource (similar to FieldsListComponent.saveDataSource)
   * Returns the dataSourceId after saving
   */
  saveColumnDataSource(columnId: number): Promise<number | null> {
    return new Promise((resolve, reject) => {
      if (this.dataSourceType === 'Static') {
        // If Static, delete existing DataSource and use static options
        if (this.existingColumnDataSource?.id) {
          this.dataSourcesService.deleteDataSource(this.existingColumnDataSource.id).subscribe({
            next: () => {
              resolve(null); // No DataSource for Static
            },
            error: () => {
              reject();
            }
          });
        } else {
          resolve(null); // No DataSource for Static
        }
        return;
      }

      // For Api or LookupTable: Delete all existing options first (if switching from Static)
      // Options should NOT be saved for Api/LookupTable DataSources
      // Note: We don't have deleteAllColumnOptions method, so we'll skip this for now
      // For LookupTable, use table name only in apiUrl
      let apiUrlValue: string | null = null;
      let valuePathValue: string | null = null;
      let textPathValue: string | null = null;

      if (this.dataSourceType === 'LookupTable') {
        // Backend expects only the table name in apiUrl, not JSON object
        apiUrlValue = this.columnLookupTableConfig.table || null;
        valuePathValue = this.columnLookupTableConfig.valueColumn || null;
        textPathValue = this.columnLookupTableConfig.textColumn || null;
      } else {
        // For Api type, use the URL directly
        apiUrlValue = this.columnDataSourceConfig.apiUrl || null;
        valuePathValue = this.columnDataSourceConfig.valuePath || null;
        textPathValue = this.columnDataSourceConfig.textPath || null;
        
        // Validate valuePath - if it's 'value', try to find 'id' instead
        if (valuePathValue && valuePathValue.toLowerCase() === 'value') {
          // 'value' is not a valid property name for most APIs, use 'id' instead
          if (this.availableProperties.length > 0) {
            const idProp = this.availableProperties.find(prop => prop.toLowerCase() === 'id');
            if (idProp) {
              valuePathValue = idProp;
              this.columnDataSourceConfig.valuePath = idProp; // Update config as well
            }
          } else {
            // If no availableProperties, default to 'id'
            valuePathValue = 'id';
            this.columnDataSourceConfig.valuePath = 'id';
          }
        }
      }

      const dataSourceDto: CreateGridColumnDataSourceDto = {
        columnId: columnId,
        sourceType: this.dataSourceType,
        apiUrl: apiUrlValue || undefined,
        httpMethod: this.dataSourceType === 'API' ? (this.columnDataSourceConfig.httpMethod || undefined) : undefined,
        requestBodyJson: this.dataSourceType === 'API' ? (this.columnDataSourceConfig.requestBodyJson || undefined) : undefined,
        valuePath: valuePathValue || undefined,
        textPath: textPathValue || undefined,
        isActive: true
      };

      if (this.existingColumnDataSource?.id) {
        // Check if sourceType is changing - if so, delete old and create new
        const isSourceTypeChanging = this.existingColumnDataSource.sourceType !== this.dataSourceType;
        
        if (isSourceTypeChanging) {
          // Delete old DataSource and create new one when sourceType changes
          console.log('[GridColumnsList] SourceType changing from', this.existingColumnDataSource.sourceType, 'to', this.dataSourceType, '- deleting old and creating new');
          this.dataSourcesService.deleteDataSource(this.existingColumnDataSource.id).subscribe({
            next: () => {
              // Old DataSource deleted, now create new one
              console.log('[GridColumnsList] Creating new DataSource after deleting old one');
              this.dataSourcesService.createDataSource(dataSourceDto).subscribe({
                next: (createdDataSource) => {
                  const dataSourceId = createdDataSource?.id;
                  if (dataSourceId) {
                    this.existingColumnDataSource = createdDataSource;
                    resolve(dataSourceId);
                  } else {
                    console.error('[GridColumnsList] Created DataSource but no ID returned');
                    reject();
                  }
                },
                error: (error) => {
                  console.error('[GridColumnsList] Error creating new DataSource:', error);
                  this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to create new DataSource'
                  });
                  reject();
                }
              });
            },
            error: (error) => {
              console.error('[GridColumnsList] Error deleting old DataSource:', error);
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to delete old DataSource'
              });
              reject();
            }
          });
        } else {
          // Update existing DataSource (same sourceType)
          this.dataSourcesService.updateDataSource(this.existingColumnDataSource.id, {
            sourceType: dataSourceDto.sourceType,
            apiUrl: dataSourceDto.apiUrl,
            httpMethod: dataSourceDto.httpMethod,
            requestBodyJson: dataSourceDto.requestBodyJson,
            valuePath: dataSourceDto.valuePath,
            textPath: dataSourceDto.textPath,
            isActive: dataSourceDto.isActive
          }).subscribe({
            next: (updatedDataSource) => {
              this.existingColumnDataSource = updatedDataSource;
              resolve(this.existingColumnDataSource.id!); // Return existing DataSource ID
            },
            error: (error) => {
              console.error('[GridColumnsList] Error updating DataSource:', error);
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to update DataSource'
              });
              reject();
            }
          });
        }
      } else {
        // Create new DataSource
        console.log('[GridColumnsList] Creating DataSource for column:', {
          columnId: columnId,
          dataSourceDto: dataSourceDto
        });
        this.dataSourcesService.createDataSource(dataSourceDto).subscribe({
          next: (createdDataSource) => {
            const dataSourceId = createdDataSource?.id;
            console.log('[GridColumnsList] DataSource created successfully:', {
              columnId: columnId,
              dataSourceId: dataSourceId,
              createdDataSource: createdDataSource
            });
            if (dataSourceId) {
              // Update existingColumnDataSource for future reference
              this.existingColumnDataSource = createdDataSource;
              resolve(dataSourceId);
            } else {
              console.error('[GridColumnsList] Created DataSource but no ID returned:', createdDataSource);
              reject();
            }
          },
          error: (error) => {
            console.error('[GridColumnsList] Error creating DataSource:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to create DataSource'
            });
            reject();
          }
        });
      }
    });
  }

  saveColumn(): void {
    if (this.columnForm.invalid) {
      this.columnForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Please fill all required fields correctly'
      });
      return;
    }

    this.loading = true;
    const columnData = this.columnForm.value;
    
    // Normalize isActive value - handle all possible types
    let normalizedIsActive: boolean;
    const isActiveValue = columnData.isActive;
    if (isActiveValue === true || isActiveValue === 'true' || isActiveValue === 1 || isActiveValue === '1') {
      normalizedIsActive = true;
    } else if (isActiveValue === false || isActiveValue === 'false' || isActiveValue === 0 || isActiveValue === '0') {
      normalizedIsActive = false;
    } else if (isActiveValue === null || isActiveValue === undefined) {
      // Default to true if null/undefined (as per business logic)
      normalizedIsActive = true;
    } else {
      // For any other value, default to true
      normalizedIsActive = true;
    }
    
    // Normalize isVisible value - handle all possible types (same logic as isActive)
    let normalizedIsVisible: boolean;
    const isVisibleValue = columnData.isVisible;
    if (isVisibleValue === true || isVisibleValue === 'true' || isVisibleValue === 1 || isVisibleValue === '1') {
      normalizedIsVisible = true;
    } else if (isVisibleValue === false || isVisibleValue === 'false' || isVisibleValue === 0 || isVisibleValue === '0') {
      normalizedIsVisible = false;
    } else if (isVisibleValue === null || isVisibleValue === undefined) {
      // Default to true if null/undefined (as per business logic)
      normalizedIsVisible = true;
    } else {
      // For any other value, default to true
      normalizedIsVisible = true;
    }
    
    console.log('[GridColumnsList] saveColumn - Normalizing values:', {
      isActive: { original: isActiveValue, normalized: normalizedIsActive },
      isVisible: { original: isVisibleValue, normalized: normalizedIsVisible },
      isEditing: !!this.editingColumn
    });

    if (this.editingColumn) {
      const updateDto: UpdateFormGridColumnDto = {
        fieldTypeId: Number(columnData.fieldTypeId),
        columnName: columnData.columnName,
        foreignColumnName: columnData.foreignColumnName || undefined,
        columnCode: columnData.columnCode,
        columnOrder: Number(columnData.columnOrder || 1),
        dataType: columnData.dataType,
        isRequired: columnData.isRequired || false,
        isActive: normalizedIsActive,
        isReadOnly: columnData.isReadOnly || false,
        isVisible: normalizedIsVisible
      };

      if (columnData.defaultValue) {
        updateDto.defaultValue = columnData.defaultValue;
      }

      if (!this.editingColumn || !this.editingColumn.id) {
        this.loading = false;
        return;
      }

      this.gridService.updateColumn(this.editingColumn.id, updateDto).subscribe({
        next: (updatedColumn) => {
          // Save DataSource if field type has options and not Static
          const selectedFieldType = this.getSelectedFieldType();
          if (selectedFieldType?.hasOptions === true || this.isOptionsFieldType()) {
            if (this.dataSourceType !== 'Static') {
              // Save DataSource for Api/LookupTable (no static options needed)
              if (this.editingColumn?.id) {
                this.saveColumnDataSource(this.editingColumn.id).then((dataSourceId) => {
                  console.log('[GridColumnsList] DataSource saved, dataSourceId:', dataSourceId);
                  // Update column with dataSourceId
                  if (dataSourceId) {
                    console.log('[GridColumnsList] Updating column with dataSourceId:', {
                      columnId: this.editingColumn!.id!,
                      dataSourceId: dataSourceId,
                      isActive: normalizedIsActive
                    });
                    this.gridService.updateColumn(this.editingColumn!.id!, {
                      dataSourceId: dataSourceId,
                      isActive: normalizedIsActive,
                      isVisible: normalizedIsVisible
                    }).subscribe({
                      next: (updatedColumn) => {
                        console.log('[GridColumnsList] Column updated with dataSourceId successfully:', {
                          columnId: this.editingColumn!.id!,
                          dataSourceId: dataSourceId,
                          updatedColumn: updatedColumn
                        });
                        this.loading = false;
                        this.loadColumns();
                        this.closeColumnModal();
                        this.messageService.add({
                          severity: 'success',
                          summary: 'Success',
                          detail: 'Column updated successfully'
                        });
                      },
                      error: (error) => {
                        console.error('[GridColumnsList] Error updating column with dataSourceId:', error);
                        this.loading = false;
                        this.loadColumns();
                        this.closeColumnModal();
                        this.messageService.add({
                          severity: 'success',
                          summary: 'Success',
                          detail: 'Column updated, but failed to link DataSource'
                        });
                      }
                    });
                  } else {
                    console.log('[GridColumnsList] No dataSourceId to update (Static type)');
                    this.loading = false;
                    this.loadColumns();
                    this.closeColumnModal();
                    this.messageService.add({
                      severity: 'success',
                      summary: 'Success',
                      detail: 'Column updated successfully'
                    });
                  }
                }).catch((error) => {
                  console.error('[GridColumnsList] Error saving DataSource:', error);
                  this.loading = false;
                });
              } else {
                this.loading = false;
              }
            } else if (this.dataSourceType === 'Static') {
              // Static: delete existing data source (if any) and clear dataSourceId, then save options
              if (!this.editingColumn?.id) {
                this.loading = false;
                return;
              }
              const columnDataSourceId = this.editingColumn.dataSourceId || this.columnForm.get('dataSourceId')?.value;
              if (columnDataSourceId || this.existingColumnDataSource?.id) {
                // Column has a data source - delete it and clear dataSourceId first
                this.saveColumnDataSource(this.editingColumn.id).then(() => {
                  // Data source deleted, now update column to clear dataSourceId
                  this.gridService.updateColumn(this.editingColumn!.id!, {
                    dataSourceId: undefined,
                    isActive: normalizedIsActive,
                    isVisible: normalizedIsVisible
                  }).subscribe({
                    next: () => {
                      // Column updated, now save static options if any
                      if (this.columnOptionsFormArray.length > 0) {
                        this.saveColumnOptions(this.editingColumn!.id!, true);
                      } else {
                        this.loading = false;
                        this.loadColumns();
                        this.closeColumnModal();
                        this.messageService.add({
                          severity: 'success',
                          summary: 'Success',
                          detail: 'Column updated successfully'
                        });
                      }
                    },
                    error: (error) => {
                      console.error('[GridColumnsList] Error clearing dataSourceId:', error);
                      this.loading = false;
                      this.loadColumns();
                      this.closeColumnModal();
                      this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Failed to clear data source from column'
                      });
                    }
                  });
                }).catch((error) => {
                  console.error('[GridColumnsList] Error deleting data source:', error);
                  this.loading = false;
                });
              } else if (this.columnOptionsFormArray.length > 0) {
                // No data source, just save static options
                this.saveColumnOptions(this.editingColumn.id, true);
              } else {
                // No data source and no options to save
                this.loading = false;
                this.loadColumns();
                this.closeColumnModal();
                this.messageService.add({
                  severity: 'success',
                  summary: 'Success',
                  detail: 'Column updated successfully'
                });
              }
            } else {
              this.loading = false;
              this.loadColumns();
              this.closeColumnModal();
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Column updated successfully'
              });
            }
          } else {
            this.loading = false;
            this.loadColumns();
            this.closeColumnModal();
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Column updated successfully'
            });
          }
        },
        error: (error) => {
          this.loading = false;
          const errorMessage = error?.error?.message || error?.message || 'Failed to update column';
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: errorMessage
          });
        }
      });
    } else {
      const createDto: CreateFormGridColumnDto = {
        gridId: this.gridId,
        fieldTypeId: Number(columnData.fieldTypeId),
        columnName: columnData.columnName,
        foreignColumnName: columnData.foreignColumnName || undefined,
        columnCode: columnData.columnCode.toUpperCase(),
        columnOrder: Number(columnData.columnOrder || 1),
        dataType: columnData.dataType,
        isRequired: columnData.isRequired || false,
        isActive: normalizedIsActive,
        isDeleted: false,
        isReadOnly: columnData.isReadOnly || false,
        isVisible: normalizedIsVisible,
        defaultValue: columnData.defaultValue || undefined,
        createdByUserId: 'f776321b-3476-494d-aaef-18439f35a1b4'
      };

      this.gridService.createColumn(createDto).subscribe({
        next: (response) => {
          // Extract column from response
          const createdColumn = response.data || response;
          const columnId = createdColumn?.id;
          
          // Save DataSource if field type has options and not Static
          const selectedFieldType = this.getSelectedFieldType();
          if (selectedFieldType?.hasOptions === true || this.isOptionsFieldType()) {
            if (this.dataSourceType !== 'Static') {
              // Save DataSource for Api/LookupTable (no static options needed)
              if (columnId) {
                this.saveColumnDataSource(columnId).then((dataSourceId) => {
                  // Update column with dataSourceId - preserve isActive
                  if (dataSourceId) {
                    this.gridService.updateColumn(columnId, {
                      dataSourceId: dataSourceId,
                      isActive: normalizedIsActive,
                      isVisible: normalizedIsVisible
                    }).subscribe({
                      next: () => {
                        this.loading = false;
                        this.loadColumns();
                        this.closeColumnModal();
                        this.messageService.add({
                          severity: 'success',
                          summary: 'Success',
                          detail: 'Column created successfully'
                        });
                      },
                      error: (error) => {
                        console.error('[GridColumnsList] Error updating column with dataSourceId:', error);
                        this.loading = false;
                        this.loadColumns();
                        this.closeColumnModal();
                        this.messageService.add({
                          severity: 'success',
                          summary: 'Success',
                          detail: 'Column created, but failed to link DataSource'
                        });
                      }
                    });
                  } else {
                    this.loading = false;
                    this.loadColumns();
                    this.closeColumnModal();
                    this.messageService.add({
                      severity: 'success',
                      summary: 'Success',
                      detail: 'Column created successfully'
                    });
                  }
                }).catch(() => {
                  this.loading = false;
                });
              } else {
                this.loading = false;
              }
            } else if (this.dataSourceType === 'Static' && this.columnOptionsFormArray.length > 0 && columnId) {
              // Static: save options only (only when dataSourceType is Static and no dataSourceId exists)
              // Double-check: if column has dataSourceId, don't save static options
              const columnDataSourceId = this.columnForm.get('dataSourceId')?.value;
              if (columnDataSourceId) {
                console.warn('[GridColumnsList] Column has dataSourceId, skipping static options save');
                this.loading = false;
                this.loadColumns();
                this.closeColumnModal();
                this.messageService.add({
                  severity: 'success',
                  summary: 'Success',
                  detail: 'Column created successfully'
                });
              } else {
                this.saveColumnOptions(columnId, true);
              }
            } else {
              this.loading = false;
              this.loadColumns();
              this.closeColumnModal();
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Column created successfully'
              });
            }
          } else {
            this.loading = false;
            this.loadColumns();
            this.closeColumnModal();
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Column created successfully'
            });
          }
        },
        error: (error) => {
          this.loading = false;
          const errorMessage = error?.error?.message || error?.error?.title || error?.message || 'Failed to create column';
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: errorMessage
          });
        }
      });
    }
  }

  deleteColumn(id: number): void {
    const columnToDelete = this.columns.find(c => c.id === id);
    if (!columnToDelete) return;

    this.confirmationService.confirm({
      message: `Delete "${columnToDelete.columnName}"? This will soft delete the column (it will be hidden but not permanently removed).`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.gridService.deleteColumn(id).subscribe({
          next: () => {
            // Reload columns - backend automatically excludes soft-deleted columns
            this.loadColumns();
            this.messageService.add({
              severity: 'success',
              summary: 'Deleted',
              detail: 'Column deleted successfully (soft delete)'
            });
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to delete column'
            });
          }
        });
      }
    });
  }

  getDataTypeLabel(dataType: string): string {
    const type = this.dataTypes.find(t => t.value === dataType);
    const lang = this.translationService.getCurrentLanguage();
    if (lang === 'ar' && type?.labelAr) {
      return type.labelAr;
    }
    return type?.label || dataType;
  }

  getActiveColumnsCount(): number {
    return this.columns.filter(c => c.isActive === true).length;
  }

  getRequiredColumnsCount(): number {
    return this.columns.filter(c => c.isRequired).length;
  }

  /**
   * Save column options using GridColumnOptionsService API
   */
  private saveColumnOptions(columnId: number, isSelectType: boolean): void {
    // Safety check: Only allow saving static options when dataSourceType is 'Static'
    if (this.dataSourceType !== 'Static') {
      console.warn('[GridColumnsList] Cannot save static options for column with external data source (type:', this.dataSourceType, ')');
      this.loading = false;
      this.loadColumns();
      this.closeColumnModal();
      this.messageService.add({
        severity: 'warn',
        summary: 'Cannot Save Options',
        detail: 'Static options cannot be added to columns with external data sources (API or LookupTable)'
      });
      return;
    }

    if (!isSelectType || this.columnOptionsFormArray.length === 0) {
      this.loading = false;
      this.loadColumns();
      this.closeColumnModal();
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Column saved successfully'
      });
      return;
    }

    // First, get existing options to determine which to delete/update/create
    this.gridColumnOptionsService.getOptionsByColumnId(columnId).pipe(
      switchMap((existingOptions: GridColumnOptionDto[]) => {
        const newOptions = this.columnOptionsFormArray.value.map((opt: any, index: number) => ({
          columnId: columnId,
          optionValue: opt.optionValue,
          optionText: opt.optionText,
          foreignOptionText: opt.foreignOptionText || '',
          optionOrder: opt.optionOrder || index + 1,
          isDefault: opt.isDefault || false,
          isActive: true
        }));

        // Find options to delete (existing options not in new options)
        const newOptionValues = new Set(newOptions.map((o: any) => o.optionValue));
        const optionsToDelete = existingOptions.filter(o => !newOptionValues.has(o.optionValue));

        // Delete options that are no longer in the form
        const deleteObservables = optionsToDelete
          .filter(option => option.id !== undefined)
          .map(option => this.gridColumnOptionsService.deleteOption(option.id!));

        // If no options to delete, use empty array
        const deleteOps = deleteObservables.length > 0 
          ? forkJoin(deleteObservables)
          : of([]);

        return deleteOps.pipe(
          switchMap(() => {
            // Create or update options
            const updateCreateObservables = newOptions.map((opt: any, index: number) => {
              const existingOption = existingOptions.find(eo => eo.optionValue === opt.optionValue);
              
              if (existingOption && existingOption.id) {
                // Update existing option
                return this.gridColumnOptionsService.updateOption(existingOption.id, {
                  optionValue: opt.optionValue,
                  optionText: opt.optionText,
                  foreignOptionText: opt.foreignOptionText || undefined,
                  optionOrder: opt.optionOrder || index + 1,
                  isDefault: opt.isDefault || false,
                  isActive: true
                });
              } else {
                // Create new option
                return this.gridColumnOptionsService.createOption({
                  columnId: columnId,
                  optionValue: opt.optionValue,
                  optionText: opt.optionText,
                  foreignOptionText: opt.foreignOptionText || undefined,
                  optionOrder: opt.optionOrder || index + 1,
                  isDefault: opt.isDefault || false,
                  isActive: true
                });
              }
            });

            return forkJoin(updateCreateObservables);
          })
        );
      }),
      catchError((error) => {
        console.error('[GridColumnsList] Error loading existing options:', error);
        // If we can't load existing options, try to create new ones anyway
        const newOptions = this.columnOptionsFormArray.value.map((opt: any, index: number) => ({
          columnId: columnId,
          optionValue: opt.optionValue,
          optionText: opt.optionText,
          foreignOptionText: opt.foreignOptionText || '',
          optionOrder: opt.optionOrder || index + 1,
          isDefault: opt.isDefault || false,
          isActive: true
        }));

        // Use bulk create
        return this.gridColumnOptionsService.createOptionsBulk(newOptions);
      })
    ).subscribe({
      next: () => {
        this.loading = false;
        this.loadColumns();
        this.closeColumnModal();
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Column and options saved successfully'
        });
      },
      error: (error) => {
        console.error('[GridColumnsList] Error saving column options:', error);
        this.loading = false;
        const errorMessage = error?.error?.message || error?.message || 'Failed to save column options';
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage
        });
      }
    });
  }

  private buildRowDataObject(cells: any[]): any {
    const rowData: any = {};
    cells.forEach((cell, index) => {
      const column = this.columns[index];
      if (column) {
        rowData[column.columnCode] = cell.cellValue;
      }
    });
    return rowData;
  }

  onDataSourceChange(event: any): void {
    const dataSourceId = event.target.value;
    if (dataSourceId && this.editingColumn?.id) {
      // Use columnId to load options
      this.loadDropdownOptions(this.editingColumn.id);
      // Update dataSourceType based on selected dataSource
      const dataSource = this.dataSources.find(ds => ds.id === parseInt(dataSourceId));
      if (dataSource) {
        this.dataSourceType = dataSource.sourceType as 'Static' | 'API' | 'LookupTable';
      }
    } else {
      this.dropdownOptions = [];
      this.dataSourceType = 'Static';
    }
    
    // Update options section visibility
    const selectedFieldType = this.getSelectedFieldType();
    const dataSourceType = this.getDataSourceType();
    this.showOptionsSection = selectedFieldType?.hasOptions === true && dataSourceType === 'Static';
    if (selectedFieldType?.hasOptions === true && dataSourceType === 'Static') {
      // If no options exist, add one empty option
      if (this.columnOptionsFormArray.length === 0) {
        this.addColumnOption();
      }
    } else {
      // Clear options if dataSourceType is not Static
      while (this.columnOptionsFormArray.length !== 0) {
        this.columnOptionsFormArray.removeAt(0);
      }
    }
  }

  /**
   * Test API response and extract available properties (similar to Fields component)
   */
  testApiResponse(): void {
    const apiUrl = this.dataSourceForm.get('apiUrl')?.value;
    if (!apiUrl || !apiUrl.trim()) {
      return;
    }

    const url = apiUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return;
    }

    this.loadingPreview = true;
    this.rawApiResponse = null;
    this.apiDebugError = null;

    const method = (this.dataSourceForm.get('httpMethod')?.value || 'GET').toUpperCase();
    let body: any = null;

    try {
      const requestBodyJson = this.dataSourceForm.get('requestBodyJson')?.value;
      if (requestBodyJson) {
        body = JSON.parse(requestBodyJson);
      }
    } catch (e) {
      this.loadingPreview = false;
      this.apiDebugError = 'Invalid JSON in request body';
      this.cdr.detectChanges();
      return;
    }

    const fetchOptions: RequestInit = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    if (method === 'POST' && body) {
      fetchOptions.body = JSON.stringify(body);
    }

    fetch(url, fetchOptions)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        this.rawApiResponse = data;
        this.apiDebugError = null;
        this.loadingPreview = false;
        this.extractAvailableProperties();
        this.cdr.detectChanges();
      })
      .catch(error => {
        this.loadingPreview = false;
        this.apiDebugError = error.message || 'Failed to fetch API response';
        this.cdr.detectChanges();
      });
  }

  /**
   * Extract available properties from raw API response
   */
  extractAvailableProperties(): void {
    this.availableProperties = [];

    if (!this.rawApiResponse) return;

    try {
      let dataArray: any[] = [];

      if (Array.isArray(this.rawApiResponse)) {
        dataArray = this.rawApiResponse;
      } else if (this.rawApiResponse.data && Array.isArray(this.rawApiResponse.data)) {
        dataArray = this.rawApiResponse.data;
      } else if (this.rawApiResponse.results && Array.isArray(this.rawApiResponse.results)) {
        dataArray = this.rawApiResponse.results;
      } else if (this.rawApiResponse.items && Array.isArray(this.rawApiResponse.items)) {
        dataArray = this.rawApiResponse.items;
      } else if (typeof this.rawApiResponse === 'object' && this.rawApiResponse !== null) {
        const responseKeys = Object.keys(this.rawApiResponse);
        for (const key of responseKeys) {
          const value = this.rawApiResponse[key];
          if (Array.isArray(value) && value.length > 0) {
            const firstElement = value[0];
            if (typeof firstElement === 'object' && firstElement !== null) {
              dataArray = value;
              break;
            }
          }
        }
      }

      if (dataArray.length > 0) {
        const firstItem = dataArray[0];
        const keys = Object.keys(firstItem);
        this.availableProperties = keys.sort();
      }
    } catch (e) {
      console.error('[GridColumnsList] Error extracting available properties:', e);
      this.availableProperties = [];
    }
  }

  /**
   * Apply property as Value Path or Text Path when clicked
   */
  applyPropertyAsPath(property: string): void {
    const propLower = property.toLowerCase();

    if (propLower.includes('id') || propLower === 'value' || propLower === 'key') {
      this.dataSourceForm.patchValue({ valuePath: property });
      this.messageService.add({
        severity: 'info',
        summary: 'Value Path Set',
        detail: `Value Path set to: "${property}"`,
        life: 3000
      });
    } else {
      this.dataSourceForm.patchValue({ textPath: property });
      this.messageService.add({
        severity: 'info',
        summary: 'Text Path Set',
        detail: `Text Path set to: "${property}"`,
        life: 3000
      });
    }
    
    // Load preview options after setting path
    setTimeout(() => {
      this.previewDataSource();
    }, 100);
    
    this.cdr.detectChanges();
  }

  /**
   * Extract available columns from raw API response (for LookupTable)
   */
  extractColumnsFromRawResponse(): void {
    this.extractAvailableProperties(); // Same logic for now
    this.availableColumns = [...this.availableProperties];
  }

  /**
   * Apply column as Value Path or Text Path when clicked (for LookupTable)
   */
  applyColumnAsPath(column: string): void {
    this.applyPropertyAsPath(column); // Same logic for now - will call previewDataSource
  }

  /**
   * Preview DataSource options (similar to Fields component)
   */
  previewDataSource(): void {
    const sourceType = this.dataSourceForm.get('sourceType')?.value;
    
    if (sourceType === 'Static') {
      return;
    }

    // Validate required fields
    if (sourceType === 'API') {
      const apiUrl = this.dataSourceForm.get('apiUrl')?.value;
      if (!apiUrl || !apiUrl.trim()) {
        return;
      }
      
      // Validate URL format
      const url = apiUrl.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return;
      }
    } else if (sourceType === 'LookupTable') {
      const tableName = this.dataSourceForm.get('apiUrl')?.value;
      if (!tableName || !tableName.trim()) {
        return;
      }
    }

    // Get value and text paths
    const valuePath = this.dataSourceForm.get('valuePath')?.value?.trim();
    const textPath = this.dataSourceForm.get('textPath')?.value?.trim();

    if (!valuePath || !textPath) {
      return;
    }

    this.loadingPreview = true;
    this.previewOptions = [];

    // Prepare request payload
    const apiUrlForPreview = sourceType === 'LookupTable'
      ? this.dataSourceForm.get('apiUrl')?.value
      : this.dataSourceForm.get('apiUrl')?.value;

    const requestPayload: PreviewDataSourceRequestDto = {
      fieldId: 0, // Use 0 for preview (no field created yet)
      sourceType: sourceType,
      apiUrl: apiUrlForPreview,
      httpMethod: this.dataSourceForm.get('httpMethod')?.value || 'GET',
      requestBodyJson: this.dataSourceForm.get('requestBodyJson')?.value || undefined,
      valuePath: valuePath,
      textPath: textPath
    };

    console.log('[GridColumnsList] Previewing data source:', requestPayload);

    this.fieldDataSourceService.previewDataSource(requestPayload).subscribe({
      next: (options) => {
        console.log('[GridColumnsList] Preview options loaded:', options?.length || 0);
        this.previewOptions = options || [];
        this.loadingPreview = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('[GridColumnsList] Error previewing data source:', error);
        this.previewOptions = [];
        this.loadingPreview = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error?.error?.message || 'Failed to load preview options'
        });
        this.cdr.detectChanges();
      }
    });
  }

}








