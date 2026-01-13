import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { GridColumnOptionsService } from '../../FormBuilder/services/grid-column-options.service';
import { GridColumnOptionDto, CreateGridColumnOptionDto, UpdateGridColumnOptionDto } from '../../FormBuilder/form-builder/models/grid-dto.model';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-grid-column-options-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule
  ],
  templateUrl: './grid-column-options-list.component.html',
  styleUrls: ['./grid-column-options-list.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class GridColumnOptionsListComponent implements OnInit, OnDestroy {
  // Route Parameters
  columnId?: number;

  // Data Arrays
  gridColumnOptions: GridColumnOptionDto[] = [];
  filteredGridColumnOptions: GridColumnOptionDto[] = [];
  private deletedGridColumnOptionIds: Set<number> = new Set(); // Track deleted option IDs to filter them out

  // Loading States
  loading = {
    gridColumnOptions: false,
    save: false,
    delete: false
  };

  // Grid Column Option Modal
  showGridColumnOptionModal = false;
  editingGridColumnOption: GridColumnOptionDto | null = null;

  // Reactive Form
  gridColumnOptionForm: FormGroup;

  // Search Filter
  searchTerm = '';
  selectedColumnId?: number;

  constructor(
    private route: ActivatedRoute,
    private gridColumnOptionsService: GridColumnOptionsService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {
    // Initialize the form
    this.gridColumnOptionForm = this.fb.group({
      columnId: ['', Validators.required],
      optionValue: ['', [Validators.required, Validators.maxLength(100)]],
      optionText: ['', [Validators.required, Validators.maxLength(200)]],
      foreignOptionText: ['', Validators.maxLength(200)],
      optionOrder: [1, [Validators.required, Validators.min(1)]],
      isActive: [true]
    });
  }

  ngOnInit(): void {
    // Get columnId from route if available
    this.route.params.subscribe(params => {
      if (params['columnId']) {
        this.columnId = +params['columnId'];
        this.selectedColumnId = this.columnId;
        this.gridColumnOptionForm.patchValue({ columnId: this.columnId });
        // Load deleted option IDs from localStorage when columnId is available
        this.loadDeletedGridColumnOptionIds();
        this.loadGridColumnOptions();
      }
    });
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  /**
   * Load deleted grid column option IDs from localStorage (persists across sessions and logins)
   */
  private loadDeletedGridColumnOptionIds(): void {
    try {
      if (!this.selectedColumnId) return;
      const savedIds = localStorage.getItem(`deletedGridColumnOptionIds_${this.selectedColumnId}`);
      if (savedIds) {
        const idsArray = JSON.parse(savedIds) as number[];
        this.deletedGridColumnOptionIds = new Set(idsArray);
        console.log('[GridColumnOptionsList] Loaded deleted grid column option IDs from localStorage:', Array.from(this.deletedGridColumnOptionIds));
      }
    } catch (error) {
      console.error('[GridColumnOptionsList] Error loading deleted grid column option IDs from localStorage:', error);
      this.deletedGridColumnOptionIds = new Set();
    }
  }

  /**
   * Save deleted grid column option IDs to localStorage (persists across sessions and logins)
   */
  private saveDeletedGridColumnOptionIds(): void {
    try {
      if (!this.selectedColumnId) return;
      const idsArray = Array.from(this.deletedGridColumnOptionIds);
      localStorage.setItem(`deletedGridColumnOptionIds_${this.selectedColumnId}`, JSON.stringify(idsArray));
      console.log('[GridColumnOptionsList] Saved deleted grid column option IDs to localStorage:', idsArray);
    } catch (error) {
      console.error('[GridColumnOptionsList] Error saving deleted grid column option IDs to localStorage:', error);
    }
  }

  loadGridColumnOptions(): void {
    if (!this.selectedColumnId) {
      this.gridColumnOptions = [];
      this.filteredGridColumnOptions = [];
      return;
    }

    this.loading.gridColumnOptions = true;
    this.gridColumnOptionsService.getOptionsByColumnId(this.selectedColumnId).subscribe({
      next: (options: GridColumnOptionDto[]) => {
        const allOptions = options || [];
        
        // Reload deleted option IDs when columnId changes
        this.loadDeletedGridColumnOptionIds();

        // Filter out deleted options before processing
        const activeOptions = allOptions.filter(option => !this.deletedGridColumnOptionIds.has(option.id!));

        // Clean up deletedGridColumnOptionIds - remove IDs that are no longer in the API response
        const apiOptionIds = new Set(allOptions.map(o => o.id));
        const idsToRemove: number[] = [];
        this.deletedGridColumnOptionIds.forEach(deletedId => {
          const optionInApi = allOptions.find(o => o.id === deletedId);
          if (!optionInApi) {
            // Option not in API response - it was hard deleted from server, remove from tracking
            idsToRemove.push(deletedId);
          } else if (optionInApi.isActive !== false) {
            // Option is back in API and active again (might have been reactivated)
            idsToRemove.push(deletedId);
            console.log('[GridColumnOptionsList] Grid column option was reactivated, removing from deleted tracking:', deletedId);
          }
        });
        if (idsToRemove.length > 0) {
          idsToRemove.forEach(id => this.deletedGridColumnOptionIds.delete(id));
          this.saveDeletedGridColumnOptionIds();
          console.log('[GridColumnOptionsList] Cleaned up deleted grid column option IDs:', idsToRemove);
        }

        // Show all options (including inactive ones) - don't filter by isActive
        // User can see inactive options and reactivate them
        const visibleOptions = activeOptions;
        
        this.gridColumnOptions = visibleOptions.sort((a, b) => (a.optionOrder || 0) - (b.optionOrder || 0));
        this.filteredGridColumnOptions = [...this.gridColumnOptions];
        this.loading.gridColumnOptions = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.gridColumnOptions = [];
        this.filteredGridColumnOptions = [];
        this.loading.gridColumnOptions = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load grid column options' });
      }
    });
  }

  onColumnChange(): void {
    if (this.selectedColumnId) {
      this.gridColumnOptionForm.patchValue({ columnId: this.selectedColumnId });
      // Load deleted option IDs from localStorage when column changes
      this.loadDeletedGridColumnOptionIds();
      this.loadGridColumnOptions();
    }
  }

  filterGridColumnOptions(): void {
    if (!this.searchTerm.trim()) {
      this.filteredGridColumnOptions = [...this.gridColumnOptions];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredGridColumnOptions = this.gridColumnOptions.filter(option =>
      option.optionValue.toLowerCase().includes(term) ||
      option.optionText.toLowerCase().includes(term) ||
      (option.foreignOptionText && option.foreignOptionText.toLowerCase().includes(term))
    );
  }

  openAddGridColumnOptionModal(): void {
    if (!this.selectedColumnId) {
      this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Please select a column first' });
      return;
    }

    this.editingGridColumnOption = null;
    this.showGridColumnOptionModal = true;

    const nextOrder = this.gridColumnOptions.length > 0 
      ? Math.max(...this.gridColumnOptions.map(o => o.optionOrder || 0)) + 1 
      : 1;

    this.gridColumnOptionForm.reset({
      columnId: this.selectedColumnId,
      optionValue: '',
      optionText: '',
      foreignOptionText: '',
      optionOrder: nextOrder,
      isActive: true
    });
  }

  openEditGridColumnOptionModal(gridColumnOption: GridColumnOptionDto): void {
    this.editingGridColumnOption = gridColumnOption;
    this.showGridColumnOptionModal = true;

    this.gridColumnOptionForm.patchValue({
      columnId: gridColumnOption.columnId || this.selectedColumnId,
      optionValue: gridColumnOption.optionValue || '',
      optionText: gridColumnOption.optionText || '',
      foreignOptionText: gridColumnOption.foreignOptionText || '',
      optionOrder: gridColumnOption.optionOrder || 1,
      isActive: gridColumnOption.isActive !== false
    });
  }

  closeGridColumnOptionModal(): void {
    this.showGridColumnOptionModal = false;
    this.editingGridColumnOption = null;
    this.gridColumnOptionForm.reset({
      isActive: true
    });
  }

  saveGridColumnOption(): void {
    if (this.gridColumnOptionForm.invalid) {
      this.markFormGroupTouched(this.gridColumnOptionForm);
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Please fill all required fields correctly' });
      return;
    }

    this.loading.save = true;
    const gridColumnOptionData = this.gridColumnOptionForm.value;

    if (this.editingGridColumnOption && this.editingGridColumnOption.id) {
      const updateDto: UpdateGridColumnOptionDto = {
        optionValue: gridColumnOptionData.optionValue,
        optionText: gridColumnOptionData.optionText,
        foreignOptionText: gridColumnOptionData.foreignOptionText,
        optionOrder: Number(gridColumnOptionData.optionOrder),
        isActive: gridColumnOptionData.isActive !== false
      };

      this.gridColumnOptionsService.updateOption(this.editingGridColumnOption.id, updateDto).subscribe({
        next: () => {
          this.loading.save = false;
          this.loadGridColumnOptions();
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Grid column option updated successfully' });
          this.closeGridColumnOptionModal();
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.loading.save = false;
          let errorMessage = 'Failed to update grid column option';
          if (error.error?.message) errorMessage = error.error.message;
          this.messageService.add({ severity: 'error', summary: 'Error', detail: errorMessage });
        }
      });
    } else {
      const createDto: CreateGridColumnOptionDto = {
        columnId: Number(gridColumnOptionData.columnId),
        optionValue: gridColumnOptionData.optionValue,
        optionText: gridColumnOptionData.optionText,
        foreignOptionText: gridColumnOptionData.foreignOptionText,
        optionOrder: Number(gridColumnOptionData.optionOrder),
        isActive: gridColumnOptionData.isActive !== false
      };

      this.gridColumnOptionsService.createOption(createDto).subscribe({
        next: () => {
          this.loading.save = false;
          this.loadGridColumnOptions();
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Grid column option created successfully' });
          this.closeGridColumnOptionModal();
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.loading.save = false;
          let errorMessage = 'Failed to create grid column option';
          if (error.error?.message) errorMessage = error.error.message;
          this.messageService.add({ severity: 'error', summary: 'Error', detail: errorMessage });
        }
      });
    }
  }

  deleteGridColumnOption(optionId: number): void {
    const optionToDelete = this.gridColumnOptions.find(o => o.id === optionId);
    if (!optionToDelete) return;

    this.confirmationService.confirm({
      message: `Are you sure you want to delete the option "${optionToDelete.optionText}"?`,
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loading.delete = true;
        this.gridColumnOptionsService.deleteOption(optionId).subscribe({
          next: () => {
            // Add to deleted options set to filter it out even after refresh/login
            this.deletedGridColumnOptionIds.add(optionId);
            // Save to localStorage to persist across page refreshes, logout/login, and browser sessions
            this.saveDeletedGridColumnOptionIds();

            // Remove option from the list immediately
            const optionIndex = this.gridColumnOptions.findIndex(o => o.id === optionId);
            if (optionIndex !== -1) {
              this.gridColumnOptions.splice(optionIndex, 1);
            }
            const filteredIndex = this.filteredGridColumnOptions.findIndex(o => o.id === optionId);
            if (filteredIndex !== -1) {
              this.filteredGridColumnOptions.splice(filteredIndex, 1);
            }

            this.loading.delete = false;
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Grid column option deleted successfully' });
            this.cdr.detectChanges();
          },
          error: () => {
            this.loading.delete = false;
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete grid column option' });
          }
        });
      }
    });
  }

  toggleGridColumnOptionStatus(gridColumnOption: GridColumnOptionDto): void {
    if (!gridColumnOption.id) return;

    const newStatus = !gridColumnOption.isActive;
    const action = newStatus ? 'activate' : 'deactivate';

    this.confirmationService.confirm({
      message: `Are you sure you want to ${action} the option "${gridColumnOption.optionText}"?`,
      header: 'Confirm Status Change',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.gridColumnOptionsService.toggleActiveStatus(gridColumnOption.id!, newStatus).subscribe({
          next: () => {
            // If reactivating, remove from deleted options set
            if (newStatus && this.deletedGridColumnOptionIds.has(gridColumnOption.id!)) {
              this.deletedGridColumnOptionIds.delete(gridColumnOption.id!);
              this.saveDeletedGridColumnOptionIds();
            }
            
            // Update option in array without reloading - keep it in list even if inactive
            const index = this.gridColumnOptions.findIndex(o => o.id === gridColumnOption.id);
            if (index !== -1) {
              this.gridColumnOptions[index] = {
                ...this.gridColumnOptions[index],
                isActive: newStatus
              };
              // Maintain sorted order
              this.gridColumnOptions = this.gridColumnOptions.sort((a, b) => (a.optionOrder || 0) - (b.optionOrder || 0));
              this.filteredGridColumnOptions = [...this.gridColumnOptions];
            }
            
            this.messageService.add({ 
              severity: 'success', 
              summary: 'Success', 
              detail: `Grid column option ${action}d successfully` 
            });
            this.cdr.detectChanges();
          },
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: `Failed to ${action} grid column option` });
          }
        });
      }
    });
  }

  getGridColumnOptionStatusClass(gridColumnOption: GridColumnOptionDto): string {
    if (!gridColumnOption.isActive) return 'status-inactive';
    return 'status-active';
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // Form Validation Helpers
  isFieldInvalid(fieldName: string): boolean {
    const control = this.gridColumnOptionForm.get(fieldName);
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }

  getFieldErrorMessage(fieldName: string): string {
    const control = this.gridColumnOptionForm.get(fieldName);
    if (!control || !control.errors) return '';

    if (control.errors['required']) return 'This field is required';
    if (control.errors['minlength']) return `Minimum length is ${control.errors['minlength'].requiredLength}`;
    if (control.errors['maxlength']) return `Maximum length is ${control.errors['maxlength'].requiredLength}`;
    if (control.errors['min']) return `Minimum value is ${control.errors['min'].min}`;
    return 'Invalid value';
  }
}

