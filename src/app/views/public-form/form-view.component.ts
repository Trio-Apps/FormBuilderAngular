import { Component, OnInit, HostListener, ViewChildren, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsService } from '../FormBuilder/services/forms.service';
import { TabsService } from '../FormBuilder/services/tabs.service';
import { FieldsService } from '../FormBuilder/services/fields.service';
import { FileUploadService, FormSubmissionAttachmentDto } from '../FormBuilder/services/file-upload.service';
import { FieldDataSourceService } from '../FormBuilder/services/field-data-source.service';
import { FormBuilderDto, FormTabDto, FormFieldDto, FieldOptionResponse, FormRule, RuleCondition, FieldCondition, RuleAction } from '../FormBuilder/form-builder/models/form-builder-dto.model';
import { TranslationService } from '../../core/services/translation.service';
import { environment } from '../../environments/environment';
import { catchError, of, forkJoin, Observable } from 'rxjs';
import { GridViewComponent } from './components/grid-view.component';

@Component({
  selector: 'app-form-view',
  standalone: true,
  imports: [
    CommonModule,
    GridViewComponent
  ],
  templateUrl: './form-view.component.html',
  styleUrls: ['./form-view.component.scss']
})
export class FormViewComponent implements OnInit {
  formCode!: string;
  form: FormBuilderDto | null = null;
  tabs: FormTabDto[] = [];
  loading = false;
  notFound = false;
  notFoundReason: string = '';
  activeTabIndex = 0;
  showLanguageDropdown = false;

  // File upload state
  uploadingFiles: { [fieldId: number]: boolean } = {};
  uploadProgress: { [fieldId: number]: number } = {}; // Upload progress percentage
  uploadedFiles: { [fieldId: number]: FormSubmissionAttachmentDto[] } = {};
  submissionId: number = 0; // Will be set when form is submitted
  fileUploadErrors: { [fieldId: number]: string } = {}; // File upload error messages
  filePreviewUrls: { [attachmentId: number]: string } = {}; // File preview URLs for images/PDFs
  showPreviewModal: boolean = false;
  previewFile: FormSubmissionAttachmentDto | null = null;

  // Field DataSource state
  fieldDataSourceOptions: { [fieldId: number]: FieldOptionResponse[] } = {}; // Options loaded from DataSource
  loadingFieldOptions: { [fieldId: number]: boolean } = {}; // Loading state for each field
  private _loggedFieldOptions: { [fieldId: number]: boolean } = {}; // Track logged fields to avoid console spam
  private _loggedFieldNoOptions: { [fieldId: number]: boolean } = {}; // Track logged "no options" warnings

  // Form Rules state - Dynamic field states based on rules
  dynamicFieldStates: {
    [fieldCode: string]: {
      isVisible?: boolean;
      isRequired?: boolean;
      isReadOnly?: boolean;
      value?: any;
    }
  } = {};
  fieldValues: { [fieldCode: string]: any } = {}; // Track field values for rule evaluation

  // Grid components reference
  @ViewChildren(GridViewComponent) gridViewComponents!: QueryList<GridViewComponent>;

  // Default allowed file types (matching backend validation)
  private readonly DEFAULT_ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'xls', 'xlsx', 'doc', 'docx'];

  constructor(
    private route: ActivatedRoute,
    private formsService: FormsService,
    private tabsService: TabsService,
    private fieldsService: FieldsService,
    private fieldDataSourceService: FieldDataSourceService,
    public fileUploadService: FileUploadService,
    public translationService: TranslationService
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const code = params.get('formCode');
      if (code) {
        this.formCode = code;
        this.loadForm();
      } else {
        this.notFound = true;
      }
    });

    // Check for submissionId in query params (for draft/edit mode)
    this.route.queryParams.subscribe(params => {
      if (params['submissionId']) {
        this.submissionId = +params['submissionId'];
      }
    });
  }

  /**
   * Save all grid data (called from form submission)
   */
  saveAllGridsData(): Observable<any[]> {
    const gridComponents = this.gridViewComponents?.toArray() || [];
    if (gridComponents.length === 0) {
      return of([]);
    }

    const saveObservables = gridComponents
      .filter(grid => grid.hasGridData() && grid.submissionId > 0)
      .map(grid => grid.saveGridData());

    if (saveObservables.length === 0) {
      return of([]);
    }

    return forkJoin(saveObservables);
  }

  /**
   * Validate all grids before submission
   */
  validateAllGrids(): { isValid: boolean; errors: string[] } {
    const gridComponents = this.gridViewComponents?.toArray() || [];
    const errors: string[] = [];

    gridComponents.forEach((grid, index) => {
      if (grid.hasGridData()) {
        // Check if grid is valid
        if (!grid.isGridValid()) {
          const gridName = grid.getGridTitle();
          errors.push(`Grid "${gridName}" has validation errors. Please fill all required fields.`);
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // ===== Form Loading =====

  private loadForm(): void {
    this.loading = true;
    this.notFound = false;

    // Removed verbose logging
    // console.log('[FormView] Loading form with code:', this.formCode);

    // Fetch form data from API by formCode
    this.formsService.getFormByCode(this.formCode).subscribe({
      next: (form) => {
        console.log('[FormView] API Response:', form);

        if (!form) {
          console.warn('[FormView] Form is null or undefined');
          this.handleNotFound('Form not found in API response');
          return;
        }

        // Check if form is published and active
        if (form.isPublished !== true || form.isActive !== true) {
          console.warn('[FormView] Form is not published or not active', {
            isPublished: form.isPublished,
            isActive: form.isActive,
            formCode: form.formCode
          });
          let reason = 'Form is ';
          if (!form.isPublished) reason += 'not published';
          if (!form.isActive) reason += (reason.includes('not') ? ' and ' : '') + 'not active';
          this.handleNotFound(reason);
          return;
        }

        // Verify formCode matches
        if (form.formCode && form.formCode.toLowerCase() !== this.formCode.toLowerCase()) {
          console.warn('[FormView] FormCode mismatch', {
            requested: this.formCode,
            received: form.formCode
          });
          // Still show the form if codes are similar (case-insensitive match was used)
        }

        this.form = form;
        const apiTabs = form.tabs || [];

        // Initialize submission ID
        // Note: In a real scenario, you should create a submission record first
        // For now, we don't set submissionId until a file is actually uploaded
        // This prevents unnecessary API calls to load non-existent files
        this.submissionId = 0; // Will be set when first file is uploaded or when submission is created

        // TODO: Create a submission record when form is first loaded
        // This ensures files are properly linked to a submission
        // Example: this.createSubmission(form.id).subscribe(submission => { this.submissionId = submission.id; });

        console.log('[FormView] Form data:', {
          formName: form.formName,
          foreignFormName: form.foreignFormName,
          description: form.description,
          foreignDescription: form.foreignDescription
        });
        console.log('[FormView] Current Language:', this.translationService.getCurrentLanguage());
        console.log('[FormView] Tabs found:', apiTabs.length);

        if (apiTabs && apiTabs.length > 0) {
          // API returned Tabs + Fields (or just Tabs)
          // Filter and sort tabs (only active ones)
          this.tabs = apiTabs
            .filter(tab => tab.isActive)
            .sort((a, b) => (a.tabOrder || 0) - (b.tabOrder || 0))
            .map(tab => ({
              ...tab,
              // Filter and sort fields (only active and visible ones)
              fields: (tab.fields || [])
                .filter(field => field.isActive && (field.isVisible ?? true))
                .sort((a, b) => (a.fieldOrder || 0) - (b.fieldOrder || 0))
                .map(field => {
                  const originalOptions = field.fieldOptions || [];
                  // Filter options - include all options if none are active, otherwise filter by isActive
                  const hasActiveOptions = originalOptions.some(opt => opt?.isActive !== false);
                  const filteredOptions = hasActiveOptions
                    ? originalOptions.filter(opt => opt?.isActive !== false)
                    : originalOptions; // If no active options, show all (for debugging)

                  const sortedOptions = filteredOptions.sort((a, b) => (a.optionOrder || 0) - (b.optionOrder || 0));

                  // Removed verbose logging - only warn if no options
                  if (sortedOptions.length === 0) {
                    console.warn(`[FormView] WARNING: Field ${field.id} (${field.fieldCode || 'no-code'}) has NO options after filtering!`);
                  }

                  return {
                    ...field,
                    fieldOptions: filteredOptions
                  };
                })
            }));

          // Initialize uploaded files arrays for file fields (don't load yet if no submissionId)
          this.tabs.forEach(tab => {
            tab.fields?.forEach(field => {
              if (this.getFieldType(field) === 'file' && field.id) {
                // Initialize empty array
                if (!this.uploadedFiles[field.id]) {
                  this.uploadedFiles[field.id] = [];
                }
              }

              // Load field options from DataSource if field has options type
              const fieldType = this.getFieldType(field);
              if (['select', 'radio', 'checkbox'].includes(fieldType)) {
                this.loadFieldOptionsFromDataSource(field);
              }
            });
          });

          // Don't load files on initial form load - files will be loaded after first upload
          // or when submissionId is available from a saved submission
          // This prevents unnecessary 404 errors when no files have been uploaded yet

          this.activeTabIndex = 0;
          this.loading = false;

          // Initialize form rules after form is loaded
          this.initializeFormRules();

          // Removed verbose logging
        } else if (form.id) {
          // API returned form only or Tabs without Fields
          console.log('[FormView] Loading tabs and fields for form ID:', form.id);
          this.loadTabsAndFields(form.id);
        } else {
          this.tabs = [];
          this.loading = false;
          console.log('[FormView] No tabs found in form');
        }
      },
      error: (error) => {
        console.error('[FormView] Error loading form:', error);
        console.error('[FormView] Error details:', {
          formCode: this.formCode,
          status: error?.status,
          message: error?.message,
          error: error
        });

        let reason = 'Unable to load form';
        if (error?.status === 404) {
          reason = 'Form not found (404)';
        } else if (error?.status === 403) {
          reason = 'Access denied (403)';
        } else if (error?.status === 500) {
          reason = 'Server error (500)';
        } else if (error?.status) {
          reason = `Error ${error.status}: ${error.statusText || error.message || 'Unknown error'}`;
        }

        this.handleNotFound(reason);
      }
    });
  }

  // Load tabs and fields from services if API doesn't return them
  private loadTabsAndFields(formId: number): void {
    this.tabsService.getTabs(formId).subscribe({
      next: (tabs) => {
        // Filter only active tabs
        const safeTabs = (Array.isArray(tabs) ? tabs : [])
          .filter(tab => tab.isActive);
        if (!safeTabs.length) {
          this.tabs = [];
          this.loading = false;
          return;
        }

        let remaining = safeTabs.length;
        const tabsWithFields: FormTabDto[] = [];

        safeTabs.forEach(tab => {
          if (!tab.id) {
            remaining--;
            if (remaining === 0) {
              this.tabs = tabsWithFields;
              this.loading = false;
            }
            return;
          }

          this.fieldsService.getFieldsByTabId(tab.id).subscribe({
            next: (fields: FormFieldDto[]) => {
              // Filter and sort fields (only active and visible ones)
              const filteredFields = (Array.isArray(fields) ? fields : [])
                .filter(field => field.isActive && (field.isVisible ?? true))
                .sort((a, b) => (a.fieldOrder || 0) - (b.fieldOrder || 0))
                .map(field => ({
                  ...field,
                  // Filter and sort field options (only active ones)
                  fieldOptions: (field.fieldOptions || [])
                    .filter(opt => opt.isActive)
                    .sort((a, b) => (a.optionOrder || 0) - (b.optionOrder || 0))
                }));

              tabsWithFields.push({
                ...tab,
                fields: filteredFields
              });
              remaining--;
              if (remaining === 0) {
                this.tabs = tabsWithFields.sort((a, b) => (a.tabOrder || 0) - (b.tabOrder || 0));
                this.activeTabIndex = 0;
                this.loading = false;
                // Initialize uploaded files arrays (don't load yet - files will be loaded after first upload)
                this.tabs.forEach(tab => {
                  tab.fields?.forEach(field => {
                    if (this.getFieldType(field) === 'file' && field.id) {
                      if (!this.uploadedFiles[field.id]) {
                        this.uploadedFiles[field.id] = [];
                      }
                    }

                    // Load field options from DataSource if field has options type
                    const fieldType = this.getFieldType(field);
                    if (['select', 'radio', 'checkbox'].includes(fieldType)) {
                      this.loadFieldOptionsFromDataSource(field);
                    }
                  });
                });
              }
            },
            error: () => {
              tabsWithFields.push({
                ...tab,
                fields: [] // Empty fields array on error
              });
              remaining--;
              if (remaining === 0) {
                this.tabs = tabsWithFields
                  .filter(t => t.isActive)
                  .sort((a, b) => (a.tabOrder || 0) - (b.tabOrder || 0));
                this.activeTabIndex = 0;
                this.loading = false;
              }
            }
          });
        });
      },
      error: () => {
        this.tabs = [];
        this.loading = false;
      }
    });
  }

  private handleNotFound(reason: string = ''): void {
    this.form = null;
    this.tabs = [];
    this.loading = false;
    this.notFound = true;
    this.notFoundReason = reason;
    console.log('[FormView] Form not found. Reason:', reason);
  }

  // ===== Field DataSource Helpers =====

  /**
   * Load field options from DataSource if available
   * This method checks if a field has an active DataSource and loads options from it
   * Only loads from API/LookupTable, not from Static (Static options are already in field.fieldOptions)
   */
  loadFieldOptionsFromDataSource(field: FormFieldDto, context?: Record<string, any>): void {
    if (!field.id) return;

    // Check if field has options type (select, radio, checkbox)
    const fieldType = this.getFieldType(field);
    if (!['select', 'radio', 'checkbox'].includes(fieldType)) {
      return;
    }

    // Check if field has a DataSource configuration
    const dataSource = field.fieldDataSource;
    if (!dataSource || !dataSource.isActive) {
      // No DataSource or inactive - use static options from field.fieldOptions
      // Removed verbose logging
      this.fieldDataSourceOptions[field.id] = [];
      return;
    }

    // Only load from API/LookupTable, not Static
    // Static options are already included in field.fieldOptions from the form schema
    if (dataSource.sourceType === 'Static') {
      // Removed verbose logging
      // console.log(`[FormView] Field ${field.id} has Static DataSource, using field.fieldOptions`);
      this.fieldDataSourceOptions[field.id] = [];
      return;
    }

    // For Api or LookupTable, load options dynamically
    if (dataSource.sourceType === 'Api' || dataSource.sourceType === 'LookupTable') {
      // Set loading state
      this.loadingFieldOptions[field.id] = true;

      // Load options from DataSource API
      this.fieldDataSourceService.getFieldOptions(field.id, context).subscribe({
        next: (options: FieldOptionResponse[]) => {
          if (options && options.length > 0) {
            this.fieldDataSourceOptions[field.id] = options;

            // Log success (debug level)
            console.log(`[FormView] Loaded ${options.length} options for field ${field.id} from ${dataSource.sourceType}`);
          } else {
            // If no options from DataSource, fallback to static options
            this.fieldDataSourceOptions[field.id] = [];
            console.warn(`[FormView] DataSource returned no options for field ${field.id}`);
          }
          this.loadingFieldOptions[field.id] = false;
        },
        error: (error) => {
          console.error(`[FormView] Error loading options from ${dataSource.sourceType} DataSource for field ${field.id}:`, error);

          // Extract error message from backend response
          let backendErrorMessage = '';
          let backendErrorDetails: any = null;

          if (error?.error) {
            if (typeof error.error === 'string') {
              backendErrorMessage = error.error;
            } else if (error.error.message) {
              backendErrorMessage = error.error.message;
              backendErrorDetails = error.error;
            } else if (error.error.error) {
              backendErrorMessage = error.error.error;
            }
          }

          console.error(`[FormView] Error details:`, {
            status: error?.status,
            statusText: error?.statusText,
            message: error?.message,
            url: error?.url,
            backendMessage: backendErrorMessage,
            backendDetails: backendErrorDetails
          });

          // Log DataSource configuration for debugging
          console.error(`[FormView] DataSource configuration:`, {
            sourceType: dataSource.sourceType,
            apiUrl: dataSource.apiUrl,
            valuePath: dataSource.valuePath,
            textPath: dataSource.textPath,
            httpMethod: dataSource.httpMethod
          });

          // Provide helpful error message based on status code and source type
          if (error?.status === 500) {
            console.error(`[FormView] Backend server error (500) for ${dataSource.sourceType} DataSource.`);

            if (dataSource.sourceType === 'LookupTable') {
              console.error(`[FormView] LookupTable-specific troubleshooting:`);

              // Display backend error message if available (includes available tables/columns)
              if (backendErrorMessage) {
                console.error(`[FormView] Backend error message:`, backendErrorMessage);
              }

              console.error(`[FormView] 1. Verify the table exists in the database`);
              console.error(`[FormView] 2. Check if valueColumn "${dataSource.valuePath}" exists in the table`);
              console.error(`[FormView] 3. Check if textColumn "${dataSource.textPath}" exists in the table`);
              console.error(`[FormView] 4. Ensure the table has data (rows)`);
              console.error(`[FormView] 5. Verify database connection is working`);
              console.error(`[FormView] 6. Check backend logs for detailed error messages`);

              // If backend provides available tables/columns, log them
              if (backendErrorDetails?.availableTables) {
                console.error(`[FormView] Available tables:`, backendErrorDetails.availableTables);
              }
              if (backendErrorDetails?.availableColumns) {
                console.error(`[FormView] Available columns:`, backendErrorDetails.availableColumns);
              }
            } else if (dataSource.sourceType === 'Api') {
              console.error(`[FormView] API-specific troubleshooting:`);
              console.error(`[FormView] 1. The API endpoint "${dataSource.apiUrl}" might be invalid or unreachable`);
              console.error(`[FormView] 2. The valuePath "${dataSource.valuePath}" might not match the API response structure`);
              console.error(`[FormView] 3. The textPath "${dataSource.textPath}" might not match the API response structure`);
              console.error(`[FormView] 4. The backend might have an internal error processing the request`);
              console.error(`[FormView] 5. Check backend logs for more details`);
            } else {
              console.error(`[FormView] General troubleshooting:`);
              console.error(`[FormView] 1. Check backend logs for detailed error messages`);
              console.error(`[FormView] 2. Verify DataSource configuration is correct`);
              console.error(`[FormView] 3. Ensure backend service is running properly`);
            }
          } else if (error?.status === 404) {
            console.error(`[FormView] DataSource endpoint not found (404).`);
            if (dataSource.sourceType === 'LookupTable') {
              console.error(`[FormView] The table "${dataSource.apiUrl}" might not exist or the endpoint is incorrect.`);
            } else {
              console.error(`[FormView] Check if the field has a valid DataSource configuration.`);
            }
          } else if (error?.status === 400) {
            console.error(`[FormView] Bad request (400). The DataSource configuration might be invalid.`);
            if (dataSource.sourceType === 'LookupTable') {
              console.error(`[FormView] Check if valueColumn "${dataSource.valuePath}" and textColumn "${dataSource.textPath}" are correct.`);
            }
          }

          // Fallback to static options on error
          this.fieldDataSourceOptions[field.id] = [];
          this.loadingFieldOptions[field.id] = false;
        }
      });
    } else {
      // Unknown source type, use static options
      console.warn(`[FormView] Field ${field.id} has unknown DataSource type: ${dataSource.sourceType}, using static options`);
      this.fieldDataSourceOptions[field.id] = [];
    }
  }

  /**
   * Get field options (from DataSource or static fieldOptions)
   */
  getFieldOptions(field: FormFieldDto): any[] {
    if (!field.id) {
      return field.fieldOptions || [];
    }

    // If options are loaded from DataSource, use them
    if (this.fieldDataSourceOptions[field.id] && this.fieldDataSourceOptions[field.id].length > 0) {
      // Convert FieldOptionResponse to FieldOptionDto format for compatibility
      const dataSource = field.fieldDataSource;
      const textPath = dataSource?.textPath || '';
      const valuePath = dataSource?.valuePath || '';

      if (!this._loggedFieldOptions[field.id]) {
        console.log(`[FormView] Mapping ${this.fieldDataSourceOptions[field.id].length} options for field ${field.id}`);
        console.log(`[FormView] - Config: textPath="${textPath}", valuePath="${valuePath}"`);
        if (this.fieldDataSourceOptions[field.id].length > 0) {
          console.log(`[FormView] - First option sample:`, JSON.stringify(this.fieldDataSourceOptions[field.id][0]));
        }
        this._loggedFieldOptions[field.id] = true;
      }

      return this.fieldDataSourceOptions[field.id]
        .filter(opt => opt !== null && opt !== undefined) // Filter out null/undefined options
        .map((opt, index) => {
          // Try to extract text and value from the option
          // Use 'any' to handle dynamic properties that might exist in the response
          const optAny = opt as any;
          let text = '';
          let value = '';

          // FIRST: Try to use the configured textPath from DataSource (case-insensitive)
          if (textPath) {
            const textPathLower = textPath.toLowerCase().trim();
            const keys = Object.keys(optAny || {});
            const matchingKey = keys.find(k => k.toLowerCase().trim() === textPathLower);
            if (matchingKey && optAny[matchingKey] !== undefined && optAny[matchingKey] !== null) {
              const val = optAny[matchingKey];
              if (typeof val === 'object') {
                text = JSON.stringify(val);
              } else {
                text = String(val).trim();
              }
            }
          }

          // FIRST: Try to use the configured valuePath from DataSource (case-insensitive)
          if (valuePath) {
            const valuePathLower = valuePath.toLowerCase().trim();
            const keys = Object.keys(optAny || {});
            const matchingKey = keys.find(k => k.toLowerCase().trim() === valuePathLower);
            if (matchingKey && optAny[matchingKey] !== undefined && optAny[matchingKey] !== null) {
              const val = optAny[matchingKey];
              if (typeof val === 'object') {
                value = JSON.stringify(val);
              } else {
                value = String(val);
              }
            }
          }

          // Fallback: Check for text property (case-insensitive) - only if textPath didn't work
          if (!text) {
            if (opt.text !== undefined && opt.text !== null) {
              text = String(opt.text).trim();
            } else if (optAny.Text !== undefined && optAny.Text !== null) {
              text = String(optAny.Text).trim();
            } else if (optAny.label !== undefined && optAny.label !== null) {
              text = String(optAny.label).trim();
            } else if (optAny.name !== undefined && optAny.name !== null) {
              text = String(optAny.name).trim();
            }
          }

          // Fallback: Check for value property (case-insensitive) - only if valuePath didn't work
          if (!value) {
            if (opt.value !== undefined && opt.value !== null) {
              value = String(opt.value);
            } else if (optAny.Value !== undefined && optAny.Value !== null) {
              value = String(optAny.Value);
            } else if (optAny.id !== undefined && optAny.id !== null) {
              value = String(optAny.id);
            } else if (optAny.Id !== undefined && optAny.Id !== null) {
              value = String(optAny.Id);
            }
          }

          // If still no value, try to use the first property that looks like an ID
          if (!value && optAny) {
            const keys = Object.keys(optAny);
            const idKey = keys.find(k =>
              k.toLowerCase() === 'id' ||
              k.toLowerCase() === 'value' ||
              k.toLowerCase() === 'key'
            );
            if (idKey && optAny[idKey] !== undefined && optAny[idKey] !== null) {
              value = String(optAny[idKey]);
            }
          }

          // If still no text, try to use the first string property that's not value/id
          if (!text && optAny) {
            const keys = Object.keys(optAny);
            const textKey = keys.find(k => {
              const kLower = k.toLowerCase();
              return kLower !== 'id' &&
                kLower !== 'value' &&
                kLower !== 'key' &&
                typeof optAny[k] === 'string' &&
                String(optAny[k]).trim() !== '';
            });
            if (textKey) {
              text = String(optAny[textKey]).trim();
            }
          }

          // Priority: text > value > index-based fallback
          let displayText = text;
          if (!displayText && value) {
            displayText = value;
          } else if (!displayText && !value) {
            // Last resort: use index (but this shouldn't happen if backend is working correctly)
            displayText = `Option ${index + 1}`;
            console.warn(`[FormView] Option at index ${index} has no text or value, using fallback: "${displayText}"`, {
              option: opt,
              availableKeys: Object.keys(opt || {}),
              optionString: JSON.stringify(opt)
            });
          }

          return {
            optionValue: value || String(index),
            optionText: displayText,
            foreignOptionText: displayText, // DataSource doesn't provide separate Arabic text
            isActive: true
          };
        });
    }

    // Otherwise, use static options from field.fieldOptions
    const staticOptions = field.fieldOptions || [];

    // Only warn if no options at all (no static and no DataSource)
    if (staticOptions.length === 0 && !this._loggedFieldNoOptions[field.id]) {
      if (field.fieldDataSource && field.fieldDataSource.isActive) {
        // DataSource is active but no options loaded - this is expected if DataSource failed
        // Only log if we're sure there's a problem
        if (!this.fieldDataSourceOptions[field.id] || this.fieldDataSourceOptions[field.id].length === 0) {
          console.warn(`[FormView] ⚠️ Field ${field.id} (${field.fieldCode || 'no-code'}) has no options. Check DataSource configuration.`);
        }
      }
      this._loggedFieldNoOptions[field.id] = true;
    }

    // Ensure static options also have proper text
    const processedOptions = staticOptions
      .filter(opt => opt !== null && opt !== undefined)
      .map((opt, index) => {
        // Create a copy to avoid mutating the original
        const option = { ...opt };

        // Ensure optionText is never undefined
        if (!option.optionText || String(option.optionText).trim() === '') {
          if (option.optionValue && String(option.optionValue).trim() !== '') {
            option.optionText = String(option.optionValue);
          } else if (option.foreignOptionText && String(option.foreignOptionText).trim() !== '') {
            option.optionText = String(option.foreignOptionText);
          } else {
            option.optionText = `Option ${index + 1}`;
          }
        }

        // Ensure optionValue is never undefined
        if (!option.optionValue || String(option.optionValue).trim() === '') {
          option.optionValue = String(index);
        }

        return option;
      });

    // Removed verbose logging

    return processedOptions;
  }

  /**
   * Check if field is loading options from DataSource
   */
  isLoadingFieldOptions(field: FormFieldDto): boolean {
    return field.id ? (this.loadingFieldOptions[field.id] || false) : false;
  }

  // ===== Field Type Helpers =====

  getFieldType(field: FormFieldDto): string {
    // Prefer explicit FieldType configuration if available
    const ft = field.fieldType;
    const typeName = (field.fieldTypeName || ft?.typeName || '').toLowerCase().trim();
    const dataType = (ft?.dataType || '').toLowerCase().trim();

    // Check for Grid type first
    if (typeName === 'grid') {
      return 'grid';
    }

    // Explicit mapping: Textbox => text input
    if (typeName === 'textbox' || typeName.includes('text box')) {
      return 'text';
    }

    // 1) Types with options (select / radio / checkbox)
    if (ft?.hasOptions) {
      // لو النوع اسمه يحتوي "checkbox" أو "check box" خليه مربعات اختيار
      if (typeName.includes('checkbox') || typeName.includes('check box')) {
        return 'checkbox';
      }

      // لو النوع اسمه يحتوي "radio" خليه radio buttons (التحقق أولاً)
      if (typeName.includes('radio')) {
        return 'radio';
      }

      // التحقق من fieldTypeName مباشرة (قد يكون "Radio" بحروف كبيرة)
      const fieldTypeNameLower = (field.fieldTypeName || '').toLowerCase();
      if (fieldTypeNameLower.includes('radio')) {
        return 'radio';
      }

      // إذا كان allowMultiple = false و hasOptions = true وليس select صراحة
      // (Radio buttons تسمح باختيار واحد فقط، بينما Select قد يكون single أو multiple)
      if (ft.allowMultiple === false && !typeName.includes('select') && !fieldTypeNameLower.includes('select')) {
        return 'radio';
      }

      // أي نوع آخر فيه اختيارات (hasOptions = true) يكون Dropdown
      return 'select';
    }

    // 2) Non-options fields based on dataType / name
    const combined = `${typeName} ${dataType}`.toLowerCase();

    // Email first
    if (combined.includes('email')) return 'email';

    // Number
    if (combined.includes('number') || combined.includes('numeric') || dataType === 'int' || dataType === 'decimal') {
      return 'number';
    }

    // Date
    if (combined.includes('date') || dataType === 'date' || dataType === 'datetime') {
      return 'date';
    }

    // File
    if (combined.includes('file') || dataType === 'file') {
      return 'file';
    }

    // Grid / Line Items Grid
    if (combined.includes('grid') || typeName.includes('grid') || typeName.includes('line items') || typeName.includes('lineitems')) {
      return 'grid';
    }

    // Switch / boolean
    if (combined.includes('switch') || combined.includes('toggle') || dataType === 'bool' || dataType === 'boolean') {
      return 'switch';
    }

    // Long text / textarea
    if (combined.includes('textarea') || (combined.includes('text') && (ft?.maxLength || 0) > 255)) {
      return 'textarea';
    }

    // Default to short text input
    return 'text';
  }

  // ===== Form Rules Evaluation =====

  /**
   * Initialize form rules after form is loaded
   */
  private initializeFormRules(): void {
    // Reset dynamic states
    this.resetDynamicFieldStates();

    // Evaluate rules with initial values
    this.evaluateFormRules();
  }

  /**
   * Evaluate all form rules and apply actions
   * Called whenever field values change
   */
  evaluateFormRules(): void {
    if (!this.form || !this.form.formRules || this.form.formRules.length === 0) {
      return;
    }

    // Sort rules by priority (higher priority first)
    const sortedRules = [...this.form.formRules]
      .filter(rule => rule.isActive)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));

    // Reset dynamic states to base field states
    this.resetDynamicFieldStates();

    // Evaluate each rule
    for (const rule of sortedRules) {
      if (this.evaluateCondition(rule.condition)) {
        this.applyActions(rule.actions);
      }
    }

    console.log('[FormView] Form rules evaluated, dynamic states:', this.dynamicFieldStates);
  }

  /**
   * Reset dynamic field states to base field configuration
   */
  private resetDynamicFieldStates(): void {
    this.dynamicFieldStates = {};
    if (this.tabs) {
      this.tabs.forEach(tab => {
        tab.fields?.forEach(field => {
          this.dynamicFieldStates[field.fieldCode] = {
            isVisible: field.isVisible ?? true,
            isRequired: field.isMandatory ?? false,
            isReadOnly: field.isEditable === false,
            value: undefined
          };
        });
      });
    }
  }

  /**
   * Evaluate a rule condition
   */
  private evaluateCondition(condition: RuleCondition): boolean {
    if (!condition || !condition.conditions || condition.conditions.length === 0) {
      return true; // Empty condition is always true
    }

    const results = condition.conditions.map(cond => this.evaluateFieldCondition(cond));

    // Apply operator (And/Or)
    if (condition.operator === 'Or') {
      return results.some(r => r === true);
    } else {
      // Default to And
      return results.every(r => r === true);
    }
  }

  /**
   * Evaluate a single field condition
   */
  private evaluateFieldCondition(condition: FieldCondition): boolean {
    const fieldValue = this.fieldValues[condition.fieldCode];
    const conditionValue = condition.value;

    switch (condition.operator) {
      case 'Equals':
        return this.compareValues(fieldValue, conditionValue, '===');
      case 'NotEquals':
        return !this.compareValues(fieldValue, conditionValue, '===');
      case 'Contains':
        return String(fieldValue || '').toLowerCase().includes(String(conditionValue || '').toLowerCase());
      case 'GreaterThan':
        return Number(fieldValue) > Number(conditionValue);
      case 'LessThan':
        return Number(fieldValue) < Number(conditionValue);
      case 'IsEmpty':
        return !fieldValue || String(fieldValue).trim() === '';
      case 'IsNotEmpty':
        return fieldValue !== undefined && fieldValue !== null && String(fieldValue).trim() !== '';
      case 'In':
        const inArray = Array.isArray(conditionValue) ? conditionValue : [conditionValue];
        return inArray.includes(fieldValue);
      case 'NotIn':
        const notInArray = Array.isArray(conditionValue) ? conditionValue : [conditionValue];
        return !notInArray.includes(fieldValue);
      default:
        console.warn(`[FormView] Unknown condition operator: ${condition.operator}`);
        return false;
    }
  }

  /**
   * Compare two values with type conversion
   */
  private compareValues(value1: any, value2: any, operator: '===' | '=='): boolean {
    // Try type conversion for numbers and booleans
    const v1 = this.convertValue(value1);
    const v2 = this.convertValue(value2);

    if (operator === '===') {
      return v1 === v2;
    } else {
      return v1 == v2; // eslint-disable-line eqeqeq
    }
  }

  /**
   * Convert value to appropriate type (number, boolean, or string)
   */
  private convertValue(value: any): any {
    if (value === null || value === undefined) {
      return value;
    }

    // Try boolean
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;

    // Try number
    const num = Number(value);
    if (!isNaN(num) && String(value).trim() === String(num)) {
      return num;
    }

    // Return as string
    return String(value);
  }

  /**
   * Apply rule actions
   */
  private applyActions(actions: RuleAction[]): void {
    if (!actions || actions.length === 0) {
      return;
    }

    for (const action of actions) {
      const state = this.dynamicFieldStates[action.fieldCode];
      if (!state) {
        // Field not found, skip
        continue;
      }

      switch (action.actionType) {
        case 'Show':
          state.isVisible = true;
          break;
        case 'Hide':
          state.isVisible = false;
          break;
        case 'SetRequired':
          state.isRequired = true;
          break;
        case 'SetOptional':
          state.isRequired = false;
          break;
        case 'SetReadOnly':
          state.isReadOnly = true;
          break;
        case 'SetEditable':
          state.isReadOnly = false;
          break;
        case 'SetValue':
          if (action.value !== undefined) {
            state.value = action.value;
            this.fieldValues[action.fieldCode] = action.value;
          }
          break;
        case 'SetDefaultValue':
          if (action.value !== undefined && this.fieldValues[action.fieldCode] === undefined) {
            state.value = action.value;
            this.fieldValues[action.fieldCode] = action.value;
          }
          break;
      }
    }
  }

  /**
   * Track field value changes for rule evaluation
   */
  onFieldValueChange(fieldCode: string, value: any): void {
    this.fieldValues[fieldCode] = value;
    // Re-evaluate rules when any field value changes
    this.evaluateFormRules();
  }

  /**
   * Handle checkbox change (multiple values)
   */
  onCheckboxChange(field: FormFieldDto, optionValue: any, event: Event): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    const currentValue = this.fieldValues[field.fieldCode] || this.getDefaultValue(field);

    try {
      let selectedValues: any[] = [];

      // Try to parse current value as JSON array
      if (currentValue && typeof currentValue === 'string') {
        try {
          const parsed = JSON.parse(currentValue);
          if (Array.isArray(parsed)) {
            selectedValues = [...parsed];
          }
        } catch {
          // Not JSON, treat as single value
          if (currentValue) {
            selectedValues = [currentValue];
          }
        }
      } else if (Array.isArray(currentValue)) {
        selectedValues = [...currentValue];
      }

      // Add or remove the option value
      if (isChecked) {
        if (!selectedValues.includes(optionValue)) {
          selectedValues.push(optionValue);
        }
      } else {
        selectedValues = selectedValues.filter(v => v !== optionValue);
      }

      // Update field value
      const newValue = selectedValues.length > 0 ? JSON.stringify(selectedValues) : '';
      this.onFieldValueChange(field.fieldCode, newValue);
    } catch (error) {
      console.error(`[FormView] Error handling checkbox change for field ${field.fieldCode}:`, error);
    }
  }

  /**
   * Check if field is required (base + dynamic rules)
   */
  isRequired(field: FormFieldDto): boolean {
    const dynamicState = this.dynamicFieldStates[field.fieldCode];
    if (dynamicState && dynamicState.isRequired !== undefined) {
      return dynamicState.isRequired;
    }
    return field.isMandatory === true;
  }

  /**
   * Check if field is visible (base + dynamic rules)
   */
  isFieldVisible(field: FormFieldDto): boolean {
    const dynamicState = this.dynamicFieldStates[field.fieldCode];
    if (dynamicState && dynamicState.isVisible !== undefined) {
      return dynamicState.isVisible;
    }
    return field.isVisible ?? true;
  }

  /**
   * Check if field is editable (base + dynamic rules)
   */
  isFieldEditable(field: FormFieldDto): boolean {
    const dynamicState = this.dynamicFieldStates[field.fieldCode];
    if (dynamicState && dynamicState.isReadOnly !== undefined) {
      return !dynamicState.isReadOnly;
    }
    return field.isEditable !== false;
  }

  getDefaultValue(field: FormFieldDto): string {
    // Check if defaultValueJson exists and is not empty
    if (!field.defaultValueJson || field.defaultValueJson.trim() === '') {
      return '';
    }

    try {
      // Try to parse JSON if it's a JSON string
      const parsed = JSON.parse(field.defaultValueJson);

      // Handle different types
      if (parsed === null || parsed === undefined) {
        return '';
      }

      // If it's an array, join it or return first element
      if (Array.isArray(parsed)) {
        return parsed.length > 0 ? parsed.map(String).join(', ') : '';
      }

      // If it's an object (but not null), stringify it
      if (typeof parsed === 'object') {
        return JSON.stringify(parsed);
      }

      // Otherwise, return as string
      return String(parsed).trim();
    } catch {
      // If not valid JSON, return as is (but trim it)
      return field.defaultValueJson.trim();
    }
  }

  getDisplayValue(field: FormFieldDto): string {
    const value = this.getDefaultValue(field);
    return value || '';
  }

  getSelectedOptionText(field: FormFieldDto): string {
    const selectedValue = this.getDefaultValue(field);
    const options = this.getFieldOptions(field);
    if (!selectedValue || !options || options.length === 0) {
      return '';
    }

    const selectedOption = options.find(opt =>
      String(opt.optionValue) === String(selectedValue)
    );

    if (!selectedOption) return '';

    // Use multilingual option text
    return this.getOptionText(selectedOption);
  }

  isOptionSelected(field: FormFieldDto, optionValue: any): boolean {
    const selectedValue = this.getDefaultValue(field);
    return String(selectedValue) === String(optionValue);
  }

  getSelectedCheckboxValues(field: FormFieldDto): string {
    const value = this.getDefaultValue(field);
    const options = this.getFieldOptions(field);
    if (!value || !options || options.length === 0) {
      return '';
    }

    try {
      // Try to parse as JSON array
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        const selectedOptions = options
          .filter(opt => parsed.includes(opt.optionValue))
          .map(opt => this.getOptionText(opt));
        return selectedOptions.length > 0 ? selectedOptions.join(', ') : '';
      }
    } catch {
      // If not JSON, treat as single value
      const selectedOption = options.find(opt =>
        String(opt.optionValue) === String(value)
      );
      return selectedOption ? this.getOptionText(selectedOption) : '';
    }

    return '';
  }

  isCheckboxSelected(field: FormFieldDto, optionValue: any): boolean {
    const value = this.getDefaultValue(field);
    const options = this.getFieldOptions(field);
    if (!value || !options || options.length === 0) {
      return false;
    }

    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.includes(optionValue);
      }
    } catch {
      return String(value) === String(optionValue);
    }

    return false;
  }

  formatDate(dateValue: string): string {
    if (!dateValue) {
      return '';
    }

    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        return dateValue; // Return as is if invalid date
      }
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateValue;
    }
  }

  isSwitchOn(field: FormFieldDto): boolean {
    const value = this.getDefaultValue(field);
    if (!value) {
      return false;
    }

    // Check for common truthy values
    const lowerValue = String(value).toLowerCase();
    return lowerValue === 'true' || lowerValue === '1' || lowerValue === 'on' || lowerValue === 'yes';
  }

  setActiveTab(index: number): void {
    this.activeTabIndex = index;
  }

  trackByFieldId(index: number, field: FormFieldDto): any {
    return field.id || index;
  }

  /**
   * Switch language for the form view
   */
  switchLanguage(lang: 'en' | 'ar'): void {
    this.translationService.setLanguage(lang);
    this.showLanguageDropdown = false;
  }

  /**
   * Close dropdown when clicking outside
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.language-dropdown-wrapper')) {
      this.showLanguageDropdown = false;
    }
  }

  /**
   * Handle file selection (supports single or multiple files)
   */
  onFileSelected(event: Event, field: FormFieldDto): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0 || !field.id) {
      return;
    }

    const files = Array.from(input.files);
    const fieldType = field.fieldType;
    const allowMultiple = fieldType?.allowMultiple || false;

    // If single file upload, take first file only
    const filesToUpload = allowMultiple ? files : [files[0]];

    // Validate all files
    const invalidFiles: string[] = [];
    for (const file of filesToUpload) {
      // Validate file extension
      if (!this.isFileExtensionAllowed(file, field)) {
        invalidFiles.push(file.name);
        continue;
      }

      // Validate file size
      const maxSize = this.getMaxFileSize(field);
      if (maxSize > 0 && file.size > maxSize) {
        invalidFiles.push(`${file.name} (${this.formatFileSize(file.size)})`);
        continue;
      }
    }

    if (invalidFiles.length > 0) {
      const currentLang = this.translationService.getCurrentLanguage();
      const allowedExts = this.getAllowedExtensions(field);
      const maxSize = this.getMaxFileSize(field);

      let errorMsg = '';
      if (invalidFiles.length === filesToUpload.length) {
        // All files invalid
        if (allowedExts.length > 0) {
          // Match backend error message format
          const allowedTypes = currentLang === 'ar'
            ? 'PDF، الصور (JPG، PNG)، Excel (XLS، XLSX)، Word (DOC، DOCX)'
            : 'PDF, Images (JPG, PNG), Excel (XLS, XLSX), Word (DOC, DOCX)';

          errorMsg = currentLang === 'ar'
            ? `نوع الملف غير مسموح. الأنواع المسموحة: ${allowedTypes}${maxSize > 0 ? `. الحجم الأقصى: ${this.formatFileSize(maxSize)}` : ''}`
            : `File type not allowed. Allowed types: ${allowedTypes}${maxSize > 0 ? `. Max size: ${this.formatFileSize(maxSize)}` : ''}`;
        } else {
          errorMsg = currentLang === 'ar'
            ? `الملفات غير صالحة${maxSize > 0 ? `. الحجم الأقصى: ${this.formatFileSize(maxSize)}` : ''}`
            : `Invalid files${maxSize > 0 ? `. Max size: ${this.formatFileSize(maxSize)}` : ''}`;
        }
      } else {
        errorMsg = currentLang === 'ar'
          ? `بعض الملفات غير صالحة: ${invalidFiles.join(', ')}`
          : `Some files are invalid: ${invalidFiles.join(', ')}`;
      }

      this.fileUploadErrors[field.id] = errorMsg;
      input.value = '';
      return;
    }

    // Clear any previous errors
    this.fileUploadErrors[field.id] = '';

    // Upload files
    if (allowMultiple && filesToUpload.length > 1) {
      this.uploadMultipleFiles(filesToUpload, field);
    } else {
      this.uploadFile(filesToUpload[0], field);
    }
  }

  /**
   * Upload file to server
   */
  uploadFile(file: File, field: FormFieldDto): void {
    if (!field.id) {
      console.error('[FormView] Field ID is missing');
      const currentLang = this.translationService.getCurrentLanguage();
      this.fileUploadErrors[field.id!] = currentLang === 'ar'
        ? 'معرف الحقل مفقود'
        : 'Field ID is missing';
      return;
    }

    // Note: submissionId will be set from the upload response
    // For now, we allow upload even if submissionId is 0 (backend should handle creating submission)
    // The submissionId will be updated from the response after successful upload

    this.uploadingFiles[field.id] = true;
    this.uploadProgress[field.id] = 0;
    this.fileUploadErrors[field.id] = '';

    // If submissionId is not set, use form ID as fallback (backend should handle this)
    const submissionIdToUse = this.submissionId || this.form?.id || 0;

    // Simulate progress (since HttpClient doesn't provide upload progress by default)
    // In a real scenario, you might want to use HttpEventType.UploadProgress
    const progressInterval = setInterval(() => {
      if (this.uploadProgress[field.id] < 90) {
        this.uploadProgress[field.id] += 10;
      }
    }, 200);

    this.fileUploadService.uploadFile(
      file,
      submissionIdToUse,
      field.id,
      field.fieldCode || ''
    ).subscribe({
      next: (response) => {
        clearInterval(progressInterval);
        this.uploadProgress[field.id!] = 100;
        setTimeout(() => {
          this.uploadingFiles[field.id!] = false;
          this.uploadProgress[field.id!] = 0;
        }, 500);

        // Update submissionId from response if available
        if (response.data?.submissionId && !this.submissionId) {
          this.submissionId = response.data.submissionId;
        }

        // Add to uploaded files list
        if (!this.uploadedFiles[field.id!]) {
          this.uploadedFiles[field.id!] = [];
        }
        if (response.data) {
          this.uploadedFiles[field.id!].push(response.data);
          // Generate preview URL for images and PDFs
          this.generatePreviewUrl(response.data);
        }

        // Reset file input
        const fileInput = document.getElementById(`file-${field.id}`) as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
      },
      error: (error) => {
        clearInterval(progressInterval);
        this.uploadingFiles[field.id!] = false;
        this.uploadProgress[field.id!] = 0;
        const currentLang = this.translationService.getCurrentLanguage();

        // Extract error message from response if available
        let errorMessage = currentLang === 'ar'
          ? 'فشل رفع الملف. يرجى المحاولة مرة أخرى.'
          : 'Failed to upload file. Please try again.';

        if (error?.error?.message) {
          errorMessage = error.error.message;
        } else if (error?.message) {
          errorMessage = error.message;
        }

        this.fileUploadErrors[field.id!] = errorMessage;
        console.error('Error uploading file:', error);
      }
    });
  }

  /**
   * Upload multiple files to server
   */
  uploadMultipleFiles(files: File[], field: FormFieldDto): void {
    if (!field.id) {
      console.error('[FormView] Field ID is missing');
      const currentLang = this.translationService.getCurrentLanguage();
      this.fileUploadErrors[field.id!] = currentLang === 'ar'
        ? 'معرف الحقل مفقود'
        : 'Field ID is missing';
      return;
    }

    // Note: submissionId will be set from the upload response
    // For now, we allow upload even if submissionId is 0 (backend should handle creating submission)
    // The submissionId will be updated from the response after successful upload

    this.uploadingFiles[field.id] = true;
    this.uploadProgress[field.id] = 0;
    this.fileUploadErrors[field.id] = '';

    // If submissionId is not set, use form ID as fallback (backend should handle this)
    const submissionIdToUse = this.submissionId || this.form?.id || 0;

    // Simulate progress for multiple files
    const progressInterval = setInterval(() => {
      if (this.uploadProgress[field.id] < 90) {
        this.uploadProgress[field.id] += 10;
      }
    }, 200);

    this.fileUploadService.uploadMultipleFiles(
      files,
      submissionIdToUse,
      field.id,
      field.fieldCode || ''
    ).subscribe({
      next: (response) => {
        clearInterval(progressInterval);
        this.uploadProgress[field.id!] = 100;
        setTimeout(() => {
          this.uploadingFiles[field.id!] = false;
          this.uploadProgress[field.id!] = 0;
        }, 500);

        // Update submissionId from response if available
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          const firstAttachment = response.data[0];
          if (firstAttachment.submissionId && !this.submissionId) {
            this.submissionId = firstAttachment.submissionId;
          }
        }

        // Add to uploaded files list
        if (!this.uploadedFiles[field.id!]) {
          this.uploadedFiles[field.id!] = [];
        }
        if (response.data && Array.isArray(response.data)) {
          response.data.forEach(attachment => {
            this.uploadedFiles[field.id!].push(attachment);
            // Generate preview URL for images and PDFs
            this.generatePreviewUrl(attachment);
          });
        }

        // Reset file input
        const fileInput = document.getElementById(`file-${field.id}`) as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
      },
      error: (error) => {
        clearInterval(progressInterval);
        this.uploadingFiles[field.id!] = false;
        this.uploadProgress[field.id!] = 0;
        const currentLang = this.translationService.getCurrentLanguage();

        // Extract error message from response if available
        let errorMessage = currentLang === 'ar'
          ? 'فشل رفع الملفات. يرجى المحاولة مرة أخرى.'
          : 'Failed to upload files. Please try again.';

        if (error?.error?.message) {
          errorMessage = error.error.message;
        } else if (error?.message) {
          errorMessage = error.message;
        }

        this.fileUploadErrors[field.id!] = errorMessage;
        console.error('Error uploading files:', error);
      }
    });
  }

  /**
   * Remove uploaded file
   */
  removeFile(fieldId: number, attachmentId: number): void {
    this.fileUploadService.deleteAttachment(attachmentId).subscribe({
      next: () => {
        // Remove from uploaded files list
        if (this.uploadedFiles[fieldId]) {
          this.uploadedFiles[fieldId] = this.uploadedFiles[fieldId].filter(
            file => file.id !== attachmentId
          );
        }
      },
      error: (error) => {
        console.error('Error deleting file:', error);
      }
    });
  }

  /**
   * Format file size
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get allowed file extensions from field's defaultValueJson
   * If no config is found, returns default allowed extensions (matching backend)
   */
  getAllowedExtensions(field: FormFieldDto): string[] {
    if (!field) {
      return this.DEFAULT_ALLOWED_EXTENSIONS;
    }

    if (!field.defaultValueJson || field.defaultValueJson.trim() === '') {
      return this.DEFAULT_ALLOWED_EXTENSIONS; // Use default extensions matching backend
    }

    try {
      const fileConfig = JSON.parse(field.defaultValueJson);

      // Check for allowedExtensions array
      if (fileConfig.allowedExtensions && Array.isArray(fileConfig.allowedExtensions) && fileConfig.allowedExtensions.length > 0) {
        const extensions = fileConfig.allowedExtensions
          .map((ext: string) => String(ext).toLowerCase().trim())
          .filter((ext: string) => ext.length > 0);
        return extensions;
      }

      // Also check for customExtensions (backward compatibility)
      if (fileConfig.customExtensions && Array.isArray(fileConfig.customExtensions) && fileConfig.customExtensions.length > 0) {
        const extensions = fileConfig.customExtensions
          .map((ext: string) => String(ext).toLowerCase().trim())
          .filter((ext: string) => ext.length > 0);
        return extensions;
      }
    } catch (e) {
      // Not a valid JSON, silently use defaults
    }

    return this.DEFAULT_ALLOWED_EXTENSIONS; // Use default extensions if config is invalid
  }

  /**
   * Get accepted file types string for input accept attribute
   */
  getAcceptedFileTypes(field: FormFieldDto): string {
    const allowedExtensions = this.getAllowedExtensions(field);
    if (allowedExtensions.length === 0) {
      return '*'; // Accept all if no restrictions
    }

    // Map extensions to MIME types and file extensions
    const mimeTypeMap: { [key: string]: string } = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'txt': 'text/plain',
      'csv': 'text/csv',
      'zip': 'application/zip',
      'rar': 'application/x-rar-compressed'
    };

    const mimeTypes: string[] = [];
    const extensions: string[] = [];

    allowedExtensions.forEach(ext => {
      const mimeType = mimeTypeMap[ext.toLowerCase()];
      if (mimeType) {
        mimeTypes.push(mimeType);
      }
      extensions.push(`.${ext.toLowerCase()}`);
    });

    return [...mimeTypes, ...extensions].join(',');
  }

  /**
   * Check if file extension is allowed
   */
  isFileExtensionAllowed(file: File, field: FormFieldDto): boolean {
    const allowedExtensions = this.getAllowedExtensions(field);

    // Always validate against allowed extensions (default or configured)
    if (allowedExtensions.length === 0) {
      return false; // No extensions allowed
    }

    // Get file extension
    const fileName = file.name.toLowerCase();
    const lastDot = fileName.lastIndexOf('.');
    if (lastDot === -1) {
      return false; // No extension
    }

    const fileExtension = fileName.substring(lastDot + 1).toLowerCase();
    return allowedExtensions.includes(fileExtension);
  }

  /**
   * Get file upload error message for a field
   */
  getFileUploadError(fieldId: number | undefined): string {
    if (!fieldId) return '';
    return this.fileUploadErrors[fieldId] || '';
  }

  /**
   * Get upload progress percentage for a field
   */
  getUploadProgress(fieldId: number | undefined): number {
    if (!fieldId) return 0;
    return this.uploadProgress[fieldId] || 0;
  }

  /**
   * Format allowed extensions for display
   */
  formatAllowedExtensions(extensions: string[]): string {
    if (extensions.length === 0) return '';
    return extensions.map(ext => `.${ext.toUpperCase()}`).join(', ');
  }

  /**
   * Get max file size from field configuration or environment
   */
  getMaxFileSize(field: FormFieldDto): number {
    // Check if maxValue is set in field (could be used for file size in KB)
    if (field.maxValue && field.maxValue > 0) {
      return field.maxValue * 1024; // Convert KB to bytes
    }

    // Use default from environment
    return environment.media?.maxFileSize || 10485760; // 10MB default
  }

  /**
   * Check if file is an image
   */
  isImageFile(attachment: FormSubmissionAttachmentDto): boolean {
    const contentType = attachment.contentType?.toLowerCase() || '';
    const fileName = attachment.fileName?.toLowerCase() || '';
    return contentType.startsWith('image/') ||
      /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
  }

  /**
   * Check if file is a PDF
   */
  isPdfFile(attachment: FormSubmissionAttachmentDto): boolean {
    const contentType = attachment.contentType?.toLowerCase() || '';
    const fileName = attachment.fileName?.toLowerCase() || '';
    return contentType === 'application/pdf' || fileName.endsWith('.pdf');
  }

  /**
   * Check if file can be previewed
   */
  canPreviewFile(attachment: FormSubmissionAttachmentDto): boolean {
    return this.isImageFile(attachment) || this.isPdfFile(attachment);
  }

  /**
   * Generate preview URL for file
   */
  generatePreviewUrl(attachment: FormSubmissionAttachmentDto): void {
    if (!attachment.id || !this.canPreviewFile(attachment)) {
      return;
    }

    // Use download URL as preview URL
    this.filePreviewUrls[attachment.id] = this.fileUploadService.getDownloadUrl(attachment.id);
  }

  /**
   * Get preview URL for attachment
   */
  getPreviewUrl(attachment: FormSubmissionAttachmentDto): string | null {
    if (!attachment.id) return null;
    return this.filePreviewUrls[attachment.id] || this.fileUploadService.getDownloadUrl(attachment.id);
  }

  /**
   * Open file preview modal
   */
  openPreview(attachment: FormSubmissionAttachmentDto): void {
    if (this.canPreviewFile(attachment)) {
      this.previewFile = attachment;
      this.showPreviewModal = true;
    }
  }

  /**
   * Close preview modal
   */
  closePreview(): void {
    this.showPreviewModal = false;
    this.previewFile = null;
  }

  /**
   * Get file type icon class
   */
  getFileIcon(attachment: FormSubmissionAttachmentDto): string {
    if (this.isImageFile(attachment)) {
      return 'pi-image';
    } else if (this.isPdfFile(attachment)) {
      return 'pi-file-pdf';
    } else if (attachment.contentType?.includes('word') || /\.(doc|docx)$/i.test(attachment.fileName || '')) {
      return 'pi-file-word';
    } else if (attachment.contentType?.includes('excel') || attachment.contentType?.includes('spreadsheet') || /\.(xls|xlsx)$/i.test(attachment.fileName || '')) {
      return 'pi-file-excel';
    } else {
      return 'pi-file';
    }
  }

  /**
   * Load uploaded files for a field
   * Note: This method requires a valid submissionId to work properly
   * This method should only be called after a file has been uploaded (when submissionId is available)
   * IMPORTANT: This method will NOT make any HTTP request if submissionId is 0 or invalid
   */
  loadFieldFiles(fieldId: number): void {
    if (!fieldId) return;

    // CRITICAL: Only try to load files if we have a valid submissionId
    // If submissionId is 0, null, undefined, or invalid, skip loading completely (no HTTP request)
    // This prevents 404 errors when the form is first loaded
    const hasValidSubmissionId = this.submissionId &&
      this.submissionId !== 0 &&
      this.submissionId !== null &&
      this.submissionId !== undefined &&
      !isNaN(this.submissionId) &&
      Number(this.submissionId) > 0;

    // DEBUG: Uncomment to see why loadFieldFiles is being called
    // console.log('[FormView] loadFieldFiles called', {
    //   fieldId,
    //   submissionId: this.submissionId,
    //   hasValidSubmissionId,
    //   type: typeof this.submissionId
    // });

    if (!hasValidSubmissionId) {
      // Silently skip - this is expected behavior when no files have been uploaded yet
      // Initialize empty array to prevent UI issues
      if (!this.uploadedFiles[fieldId]) {
        this.uploadedFiles[fieldId] = [];
      }
      return; // Exit early - NO HTTP REQUEST will be made
    }

    // Only make HTTP request if we have a valid submissionId
    // Pass submissionId to service to prevent HTTP request if it's 0 or invalid
    // The service will also check submissionId before making HTTP request
    // Use catchError to handle errors gracefully without breaking the UI
    this.fileUploadService.getFieldAttachments(fieldId, this.submissionId).pipe(
      catchError((error) => {
        // Silently handle all errors - don't log to console to avoid cluttering
        // 404 is normal when no files have been uploaded yet for this field
        // Other errors are also handled gracefully
        this.uploadedFiles[fieldId] = [];
        return of({ statusCode: 200, message: 'No files found', data: [] });
      })
    ).subscribe({
      next: (response) => {
        if (response && response.data && Array.isArray(response.data) && response.data.length > 0) {
          this.uploadedFiles[fieldId] = response.data;
          // Generate preview URLs for all loaded files
          response.data.forEach(attachment => {
            this.generatePreviewUrl(attachment);
          });
          // Only log success, not errors
          // console.log('[FormView] Loaded', response.data.length, 'files for field:', fieldId);
        } else {
          // No files found, initialize empty array
          if (!this.uploadedFiles[fieldId]) {
            this.uploadedFiles[fieldId] = [];
          }
        }
      }
    });
  }

  /**
   * Load all uploaded files for file fields in the form
   * Note: This method should only be called after a file has been uploaded (when submissionId is available)
   * It should NOT be called on initial form load to prevent 404 errors
   */
  loadAllFieldFiles(): void {
    if (!this.tabs || this.tabs.length === 0) return;

    // CRITICAL: Only load files if we have a valid submissionId
    // Check for valid submissionId (not 0, null, undefined, or NaN)
    const hasValidSubmissionId = this.submissionId &&
      this.submissionId !== 0 &&
      this.submissionId !== null &&
      this.submissionId !== undefined &&
      !isNaN(this.submissionId);

    if (!hasValidSubmissionId) {
      // Silently skip - this is expected behavior when no files have been uploaded yet
      return;
    }

    this.tabs.forEach(tab => {
      if (tab.fields && tab.fields.length > 0) {
        tab.fields.forEach(field => {
          // Only load files for file type fields
          if (this.getFieldType(field) === 'file' && field.id) {
            // Initialize empty array if not exists
            if (!this.uploadedFiles[field.id]) {
              this.uploadedFiles[field.id] = [];
            }
            // loadFieldFiles will check submissionId again, but we check here too for safety
            this.loadFieldFiles(field.id);
          }
        });
      }
    });
  }

  // ===== Multilingual Content Helpers =====

  /**
   * Get form name based on current language
   * Priority: Foreign fields > Default fields
   */
  getFormName(form: FormBuilderDto | null): string {
    if (!form) return '';
    const lang = this.translationService.getCurrentLanguage();

    if (lang === 'ar') {
      if (form.foreignFormName && form.foreignFormName.trim()) {
        return form.foreignFormName;
      }
    }

    return form.formName || '';
  }

  /**
   * Get form description based on current language
   */
  getFormDescription(form: FormBuilderDto | null): string {
    if (!form) return '';
    const lang = this.translationService.getCurrentLanguage();

    if (lang === 'ar') {
      if (form.foreignDescription && form.foreignDescription.trim()) {
        return form.foreignDescription;
      }
    }

    return form.description || '';
  }

  /**
   * Get tab name based on current language
   * Priority: Computed properties (name_ar/name_en) > Foreign fields > Default fields
   */
  getTabName(tab: FormTabDto): string {
    if (!tab) return '';
    const lang = this.translationService.getCurrentLanguage();

    // Debug log
    if (lang === 'ar') {
      // Try computed property first (from API)
      if (tab.name_ar && tab.name_ar.trim()) {
        return tab.name_ar;
      }
      // Try foreign field
      if (tab.foreignTabName && tab.foreignTabName.trim()) {
        return tab.foreignTabName;
      }
      // Fallback to English
      return tab.tabName || '';
    } else {
      // English: Try computed property first
      if (tab.name_en && tab.name_en.trim()) {
        return tab.name_en;
      }
      // Fallback to default
      return tab.tabName || '';
    }
  }

  /**
   * Get field label based on current language
   * Priority: Computed properties (label_ar/label_en) > Foreign fields > Default fields
   */
  getFieldLabel(field: FormFieldDto): string {
    if (!field) return '';
    const lang = this.translationService.getCurrentLanguage();

    // Use computed properties if available (from API)
    if (lang === 'ar') {
      // Try computed property first
      if (field.label_ar && field.label_ar.trim()) {
        return field.label_ar;
      }
      // Try foreign field
      if (field.foreignFieldName && field.foreignFieldName.trim()) {
        return field.foreignFieldName;
      }
      // Fallback to English
      return field.fieldName || '';
    } else {
      // English: Try computed property first
      if (field.label_en && field.label_en.trim()) {
        return field.label_en;
      }
      // Fallback to default
      return field.fieldName || '';
    }
  }

  /**
   * Get field placeholder based on current language
   * Priority: Computed properties (placeholder_ar/placeholder_en) > Foreign fields > Default fields
   */
  getFieldPlaceholder(field: FormFieldDto): string {
    if (!field) {
      return this.translationService.getCurrentLanguage() === 'ar' ? 'أدخل إجابتك' : 'Your answer';
    }

    const lang = this.translationService.getCurrentLanguage();
    const defaultPlaceholder = lang === 'ar' ? 'أدخل إجابتك' : 'Your answer';

    // Use computed properties if available (from API)
    if (lang === 'ar') {
      if (field.placeholder_ar && field.placeholder_ar.trim()) return field.placeholder_ar;
      if (field.foreignPlaceholder && field.foreignPlaceholder.trim()) return field.foreignPlaceholder;
    } else {
      if (field.placeholder_en && field.placeholder_en.trim()) return field.placeholder_en;
      if (field.placeholder && field.placeholder.trim()) return field.placeholder;
    }

    return defaultPlaceholder;
  }

  /**
   * Get field hint text based on current language
   */
  getFieldHintText(field: FormFieldDto): string {
    const lang = this.translationService.getCurrentLanguage();

    if (lang === 'ar' && field.foreignHintText) {
      return field.foreignHintText;
    }

    return field.hintText || '';
  }

  /**
   * Get field validation message based on current language
   */
  getFieldValidationMessage(field: FormFieldDto): string {
    const lang = this.translationService.getCurrentLanguage();

    if (lang === 'ar' && field.foreignValidationMessage) {
      return field.foreignValidationMessage;
    }

    return field.validationMessage || '';
  }

  /**
   * Get option text based on current language
   * Supports both FieldOptionDto and FieldOptionResponse
   * Handles JSON strings in text field
   */
  getOptionText(option: any): string {
    if (!option) return '';

    // Helper function to parse JSON string and extract readable text
    const parseJsonText = (text: string): string => {
      if (!text || typeof text !== 'string') return text;

      const trimmed = text.trim();
      // Check if it's a JSON string (starts with { or [)
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
          const parsed = JSON.parse(trimmed);

          // If it's an object, try to extract readable text
          if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            // Try common name patterns: first + last, name, title + first + last, etc.
            if (parsed.first && parsed.last) {
              const parts: string[] = [];
              if (parsed.title) parts.push(String(parsed.title));
              if (parsed.first) parts.push(String(parsed.first));
              if (parsed.last) parts.push(String(parsed.last));
              return parts.join(' ');
            }

            // Try name property
            if (parsed.name) {
              return String(parsed.name);
            }

            // Try text or label properties
            if (parsed.text) {
              return String(parsed.text);
            }
            if (parsed.label) {
              return String(parsed.label);
            }

            // Try title property
            if (parsed.title) {
              return String(parsed.title);
            }

            // Try to find first string property
            const keys = Object.keys(parsed);
            for (const key of keys) {
              const value = parsed[key];
              if (typeof value === 'string' && value.trim() !== '') {
                return value.trim();
              }
            }

            // If nothing found, return stringified version (but formatted)
            return JSON.stringify(parsed);
          }

          // If it's an array, return first element or stringified
          if (Array.isArray(parsed) && parsed.length > 0) {
            return String(parsed[0]);
          }

          return trimmed;
        } catch (e) {
          // If parsing fails, return original text
          return trimmed;
        }
      }

      return trimmed;
    };

    // Handle FieldOptionResponse (from DataSource) - check for text property first
    if ('text' in option) {
      let text = option.text !== undefined && option.text !== null ? String(option.text).trim() : '';

      // Parse JSON strings if present
      if (text) {
        text = parseJsonText(text);
      }

      // If text is empty, try to use value as fallback
      if (!text && 'value' in option && option.value !== undefined && option.value !== null) {
        const valueText = String(option.value).trim();
        return parseJsonText(valueText);
      }

      return text || '';
    }

    // Handle FieldOptionDto (static options)
    const lang = this.translationService.getCurrentLanguage();
    if (lang === 'ar' && option.foreignOptionText && String(option.foreignOptionText).trim()) {
      return parseJsonText(String(option.foreignOptionText).trim());
    }

    let optionText = option.optionText !== undefined && option.optionText !== null
      ? String(option.optionText).trim()
      : '';

    // Parse JSON strings if present
    if (optionText) {
      optionText = parseJsonText(optionText);
    }

    // If optionText is empty, try to use optionValue as fallback
    if (!optionText && option.optionValue !== undefined && option.optionValue !== null) {
      const valueText = String(option.optionValue).trim();
      return parseJsonText(valueText);
    }

    // Final fallback - return empty string instead of undefined
    return optionText || '';
  }

  /**
   * Get field type name based on current language
   */
  getFieldTypeName(field: FormFieldDto): string {
    if (!field.fieldType) return '';
    const lang = this.translationService.getCurrentLanguage();

    if (lang === 'ar') {
      if (field.fieldType.type_name_ar) return field.fieldType.type_name_ar;
      if (field.fieldType.foreignTypeName) return field.fieldType.foreignTypeName;
    } else {
      if (field.fieldType.type_name_en) return field.fieldType.type_name_en;
    }

    return field.fieldType.typeName || '';
  }
}


