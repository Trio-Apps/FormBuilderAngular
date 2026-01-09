import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { GridService } from '../../FormBuilder/services/grid.service';
import { TabsService } from '../../FormBuilder/services/tabs.service';
import { FieldsService } from '../../FormBuilder/services/fields.service';
import { GridColumnDataSourcesService } from '../../FormBuilder/services/grid-column-data-sources.service';
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
import { FieldTypeDto } from '../../FormBuilder/form-builder/models/form-builder-dto.model';
import { Subscription } from 'rxjs';
import { TranslationService } from '../../../core/services/translation.service';

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
    TooltipModule
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

  // Data Sources
  dataSources: GridColumnDataSourceDto[] = [];
  selectedDataSource: GridColumnDataSourceDto | null = null;
  showDataSourceModal = false;
  dataSourceForm!: FormGroup;
  dropdownOptions: DropdownOptionDto[] = [];
  loadingOptions = false;
  dataSourceType: 'Static' | 'Api' | 'LookupTable' = 'Static';

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
    private fb: FormBuilder,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    public translationService: TranslationService
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
      apiUrl: [''],
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
        
        this.columns = columnsData;
        
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
    this.dataSourcesService.getDataSources().subscribe({
      next: (response) => {
        if (response.data) {
          this.dataSources = response.data.filter(ds => ds.isActive);
        }
      },
      error: (error) => {
        console.error('[GridColumnsList] Error loading data sources:', error);
        this.dataSources = [];
      }
    });
  }

  loadDropdownOptions(dataSourceId?: number): void {
    if (!dataSourceId) return;

    this.loadingOptions = true;
    this.dataSourcesService.getOptionsByDataSource(dataSourceId).subscribe({
      next: (response) => {
        if (response.data) {
          this.dropdownOptions = response.data.map(option => ({
            value: option.optionValue,
            text: option.optionText,
            foreignText: option.foreignOptionText,
            order: option.optionOrder,
            isActive: option.isActive
          }));
        }
        this.loadingOptions = false;
      },
      error: (error) => {
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
    this.showDataSourceModal = true;
  }

  closeDataSourceModal(): void {
    this.showDataSourceModal = false;
    this.selectedDataSource = null;
    this.dropdownOptions = [];
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
        next: (response) => {
          if (response.statusCode === 200) {
            this.loadDataSources();
            this.closeDataSourceModal();
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Data source updated successfully'
            });
          }
        },
        error: (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error?.error?.message || 'Failed to update data source'
          });
        }
      });
    } else {
      // Create new data source
      const createDto: CreateGridColumnDataSourceDto = {
        columnId: 0, // Will be set when assigning to column
        sourceType: formValue.sourceType,
        apiUrl: formValue.apiUrl || undefined,
        apiPath: formValue.apiPath || undefined,
        httpMethod: formValue.httpMethod || undefined,
        requestBodyJson: formValue.requestBodyJson || undefined,
        valuePath: formValue.valuePath || undefined,
        textPath: formValue.textPath || undefined,
        configurationJson: formValue.configurationJson || undefined,
        isActive: formValue.isActive !== false,
        createdByUserId: 'system' // TODO: Get from auth service
      };

      this.dataSourcesService.createDataSource(createDto).subscribe({
        next: (response) => {
          if (response.statusCode === 200 || response.statusCode === 201) {
            this.loadDataSources();
            this.closeDataSourceModal();
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Data source created successfully'
            });
          }
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
      this.columnForm.patchValue({
        fieldTypeId: column.fieldTypeId || '',
        columnName: column.columnName,
        foreignColumnName: column.foreignColumnName || '',
        columnCode: column.columnCode,
        columnOrder: column.columnOrder || 1,
        dataType: column.dataType || 'text',
        isRequired: column.isRequired || false,
        isActive: column.isActive !== false,
        isReadOnly: column.isReadOnly || false,
        isVisible: column.isVisible !== false,
        defaultValue: column.defaultValue || '',
        dataSourceId: column.dataSourceId || null
      }, { emitEvent: false });
      
      // Load column options if field type has options
      const selectedFieldType = this.getSelectedFieldType();
      // Determine dataSourceType from column's dataSourceId
      if (column.dataSourceId) {
        const dataSource = this.dataSources.find(ds => ds.id === column.dataSourceId);
        if (dataSource) {
          this.dataSourceType = dataSource.sourceType as 'Static' | 'Api' | 'LookupTable';
        } else {
          this.dataSourceType = 'Static';
        }
      } else {
        this.dataSourceType = 'Static';
      }
      
      this.showOptionsSection = selectedFieldType?.hasOptions === true && this.dataSourceType === 'Static';
      if (selectedFieldType?.hasOptions === true && this.dataSourceType === 'Static' && column.columnOptions) {
        this.loadColumnOptions(column.columnOptions);
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

  get columnOptionsFormArray(): FormArray {
    return this.columnForm.get('columnOptions') as FormArray;
  }

  addColumnOption(): void {
    const optionForm = this.fb.group({
      optionValue: ['', Validators.required],
      optionText: ['', Validators.required],
      foreignOptionText: [''],
      optionOrder: [this.columnOptionsFormArray.length + 1]
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
          optionOrder: [option.optionOrder || this.columnOptionsFormArray.length + 1]
        });
        this.columnOptionsFormArray.push(optionForm);
      });
    }
  }

  setInputLanguage(lang: 'en' | 'ar'): void {
    this.currentInputLanguage = lang;
  }

  translateLabel(key: string): string {
    return this.translationService.translateForLanguage(key, this.currentInputLanguage);
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

  getDataSourceType(): 'Static' | 'Api' | 'LookupTable' {
    const dataSourceId = this.columnForm.get('dataSourceId')?.value;
    if (!dataSourceId) {
      return 'Static';
    }
    const dataSource = this.dataSources.find(ds => ds.id === dataSourceId);
    if (!dataSource) {
      return 'Static';
    }
    return dataSource.sourceType as 'Static' | 'Api' | 'LookupTable';
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

    if (this.editingColumn) {
      const updateDto: UpdateFormGridColumnDto = {
        fieldTypeId: Number(columnData.fieldTypeId),
        columnName: columnData.columnName,
        foreignColumnName: columnData.foreignColumnName || undefined,
        columnCode: columnData.columnCode,
        columnOrder: Number(columnData.columnOrder || 1),
        dataType: columnData.dataType,
        isRequired: columnData.isRequired || false,
        isActive: columnData.isActive !== false,
        isReadOnly: columnData.isReadOnly || false,
        isVisible: columnData.isVisible !== false
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
          // Save column options if field type has options
          const selectedFieldType = this.getSelectedFieldType();
          if (selectedFieldType?.hasOptions === true && this.columnOptionsFormArray.length > 0 && this.editingColumn?.id) {
            this.saveColumnOptions(this.editingColumn.id, true);
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
        isActive: columnData.isActive !== false,
        isReadOnly: columnData.isReadOnly || false,
        isVisible: columnData.isVisible !== false,
        defaultValue: columnData.defaultValue || undefined,
        createdByUserId: 'f776321b-3476-494d-aaef-18439f35a1b4'
      };

      this.gridService.createColumn(createDto).subscribe({
        next: (response) => {
          // Extract column from response
          const createdColumn = response.data || response;
          const columnId = createdColumn?.id;
          
          // Save column options if field type has options
          const selectedFieldType = this.getSelectedFieldType();
          if (selectedFieldType?.hasOptions === true && this.columnOptionsFormArray.length > 0 && columnId) {
            this.saveColumnOptions(columnId, true);
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
      message: `Delete "${columnToDelete.columnName}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.gridService.deleteColumn(id).subscribe({
          next: () => {
            this.loadColumns();
            this.messageService.add({
              severity: 'success',
              summary: 'Deleted',
              detail: 'Column deleted successfully'
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
    return this.columns.filter(c => c.isActive).length;
  }

  getRequiredColumnsCount(): number {
    return this.columns.filter(c => c.isRequired).length;
  }

  /**
   * Save column options (store in validationRules as JSON for now)
   * TODO: Create dedicated API endpoint for column options
   */
  private saveColumnOptions(columnId: number, isSelectType: boolean): void {
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

    const options = this.columnOptionsFormArray.value.map((opt: any, index: number) => ({
      optionValue: opt.optionValue,
      optionText: opt.optionText,
      foreignOptionText: opt.foreignOptionText || '',
      optionOrder: opt.optionOrder || index + 1
    }));

    // Store options in validationRules as JSON (temporary solution)
    const validationRules = JSON.stringify({ columnOptions: options });
    
    const updateDto: UpdateFormGridColumnDto = {
      validationRules: validationRules
    };

    this.gridService.updateColumn(columnId, updateDto).subscribe({
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
    if (dataSourceId) {
      this.loadDropdownOptions(parseInt(dataSourceId));
      // Update dataSourceType based on selected dataSource
      const dataSource = this.dataSources.find(ds => ds.id === parseInt(dataSourceId));
      if (dataSource) {
        this.dataSourceType = dataSource.sourceType as 'Static' | 'Api' | 'LookupTable';
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

}

