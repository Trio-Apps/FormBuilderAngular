import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsService } from '../FormBuilder/services/forms.service';
import { TabsService } from '../FormBuilder/services/tabs.service';
import { FieldsService } from '../FormBuilder/services/fields.service';
import { FormBuilderDto, FormTabDto, FormFieldDto } from '../FormBuilder/form-builder/models/form-builder-dto.model';

@Component({
  selector: 'app-form-view',
  standalone: true,
  imports: [
    CommonModule
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

  constructor(
    private route: ActivatedRoute,
    private formsService: FormsService,
    private tabsService: TabsService,
    private fieldsService: FieldsService
  ) {}

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
  }

  // ===== Form Loading =====

  private loadForm(): void {
    this.loading = true;
    this.notFound = false;

    console.log('[FormView] Loading form with code:', this.formCode);

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
                .map(field => ({
                  ...field,
                  // Filter and sort field options (only active ones)
                  fieldOptions: (field.fieldOptions || [])
                    .filter(opt => opt?.isActive !== false)
                    .sort((a, b) => (a.optionOrder || 0) - (b.optionOrder || 0))
                }))
            }));
          this.activeTabIndex = 0;
          this.loading = false;
          console.log('[FormView] Form loaded successfully with', this.tabs.length, 'tabs');
          console.log('[FormView] Loading state:', this.loading);
          console.log('[FormView] NotFound state:', this.notFound);
          console.log('[FormView] Form:', this.form);
          console.log('[FormView] Tabs:', this.tabs);
          if (this.tabs.length > 0) {
            this.tabs.forEach((tab, index) => {
              console.log(`[FormView] Tab ${index} (${tab.tabName}):`, {
                id: tab.id,
                tabName: tab.tabName,
                fieldsCount: tab.fields?.length || 0,
                fields: tab.fields?.map(f => ({
                  id: f.id,
                  fieldName: f.fieldName,
                  fieldTypeName: f.fieldTypeName,
                  defaultValueJson: f.defaultValueJson,
                  placeholder: f.placeholder
                }))
              });
            });
          }
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

  // ===== Field Type Helpers =====

  getFieldType(field: FormFieldDto): string {
    // Prefer explicit FieldType configuration if available
    const ft = field.fieldType;
    const typeName = (field.fieldTypeName || ft?.typeName || '').toLowerCase().trim();
    const dataType = (ft?.dataType || '').toLowerCase().trim();

    // 1) Types with options (select / radio / checkbox)
    if (ft?.hasOptions) {
      // Multiple selection => checkbox group
      if (ft.allowMultiple) {
        return 'checkbox';
      }

      // Single selection: try to distinguish radio vs dropdown by name
      if (typeName.includes('radio')) {
        return 'radio';
      }
      if (typeName.includes('dropdown') || typeName.includes('select') || typeName.includes('list')) {
        return 'select';
      }

      // Fallback: treat any single‑select options field as dropdown
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

  isRequired(field: FormFieldDto): boolean {
    return field.isMandatory === true;
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
    if (!selectedValue || !field.fieldOptions) {
      return '';
    }
    
    const selectedOption = field.fieldOptions.find(opt => 
      String(opt.optionValue) === String(selectedValue)
    );
    
    return selectedOption ? selectedOption.optionText : '';
  }

  isOptionSelected(field: FormFieldDto, optionValue: any): boolean {
    const selectedValue = this.getDefaultValue(field);
    return String(selectedValue) === String(optionValue);
  }

  getSelectedCheckboxValues(field: FormFieldDto): string {
    const value = this.getDefaultValue(field);
    if (!value || !field.fieldOptions) {
      return '';
    }
    
    try {
      // Try to parse as JSON array
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        const selectedOptions = field.fieldOptions
          .filter(opt => parsed.includes(opt.optionValue))
          .map(opt => opt.optionText);
        return selectedOptions.length > 0 ? selectedOptions.join(', ') : '';
      }
    } catch {
      // If not JSON, treat as single value
      const selectedOption = field.fieldOptions.find(opt => 
        String(opt.optionValue) === String(value)
      );
      return selectedOption ? selectedOption.optionText : '';
    }
    
    return '';
  }

  isCheckboxSelected(field: FormFieldDto, optionValue: any): boolean {
    const value = this.getDefaultValue(field);
    if (!value || !field.fieldOptions) {
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
}


