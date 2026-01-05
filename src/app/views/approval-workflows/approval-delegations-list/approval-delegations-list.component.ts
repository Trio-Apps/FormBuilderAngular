import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApprovalDelegationService, ApprovalDelegationDto, CreateApprovalDelegationDto, UpdateApprovalDelegationDto } from '../../FormBuilder/services/approval-delegation.service';
import { StorageService } from '../../../auth/storage.service';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { PaginatorModule } from 'primeng/paginator';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'app-approval-delegations-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule,
    DialogModule,
    InputTextModule,
    CheckboxModule,
    ButtonModule,
    TableModule,
    PaginatorModule
  ],
  templateUrl: './approval-delegations-list.component.html',
  styleUrls: ['./approval-delegations-list.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class ApprovalDelegationsListComponent implements OnInit {
  delegations: ApprovalDelegationDto[] = [];
  filteredDelegations: ApprovalDelegationDto[] = [];
  currentUserId: string | null = null;

  loading = {
    delegations: false,
    save: false,
    delete: false
  };

  showModal = false;
  delegationForm!: FormGroup;
  editingDelegation: ApprovalDelegationDto | null = null;

  searchTerm = '';
  first = 0;
  rows = 10;
  totalRecords = 0;

  constructor(
    private delegationService: ApprovalDelegationService,
    private storageService: StorageService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    public translationService: TranslationService
  ) {
    this.delegationForm = this.fb.group({
      fromUserId: ['', [Validators.required]],
      toUserId: ['', [Validators.required]],
      startDate: [null, [Validators.required]],
      endDate: [null, [Validators.required]],
      isActive: [true]
    });
  }

  ngOnInit(): void {
    const adminLanguagePreference = localStorage.getItem('adminLanguagePreference');
    if (adminLanguagePreference) {
      this.translationService.setLanguage(adminLanguagePreference as 'en' | 'ar');
    } else {
      this.translationService.setLanguage('en');
    }

    // Get current user ID (assuming it's stored as string in storage)
    // TODO: Adjust based on your auth implementation
    this.currentUserId = this.storageService.getUserId()?.toString() || null;
    
    this.loadDelegations();
  }

  loadDelegations(): void {
    this.loading.delegations = true;
    this.delegationService.getAllDelegations().subscribe({
      next: (delegations: ApprovalDelegationDto[]) => {
        this.delegations = delegations || [];
        this.filteredDelegations = [...this.delegations];
        this.totalRecords = this.filteredDelegations.length;
        this.loading.delegations = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading delegations:', error);
        this.delegations = [];
        this.filteredDelegations = [];
        this.loading.delegations = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load delegations'
        });
        this.cdr.detectChanges();
      }
    });
  }

  filterDelegations(): void {
    if (!this.searchTerm.trim()) {
      this.filteredDelegations = [...this.delegations];
      this.totalRecords = this.filteredDelegations.length;
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredDelegations = this.delegations.filter(d =>
      d.fromUserName?.toLowerCase().includes(term) ||
      d.toUserName?.toLowerCase().includes(term) ||
      d.fromUserId?.toLowerCase().includes(term) ||
      d.toUserId?.toLowerCase().includes(term)
    );
    this.totalRecords = this.filteredDelegations.length;
  }

  onSearchChange(): void {
    this.filterDelegations();
    this.first = 0;
  }

  getPaginatedDelegations(): ApprovalDelegationDto[] {
    const start = this.first;
    const end = start + this.rows;
    return this.filteredDelegations.slice(start, end);
  }

  onPageChange(event: any): void {
    this.first = event.first;
    this.rows = event.rows;
  }

  openAddModal(): void {
    this.editingDelegation = null;
    this.showModal = true;
    
    this.delegationForm.reset({
      fromUserId: this.currentUserId || '',
      toUserId: '',
      startDate: null,
      endDate: null,
      isActive: true
    });
  }

  openEditModal(delegation: ApprovalDelegationDto): void {
    this.editingDelegation = delegation;
    this.showModal = true;
    
    // Convert dates to datetime-local format (YYYY-MM-DDTHH:mm)
    const formatDateForInput = (date: Date | string): string => {
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };
    
    this.delegationForm.patchValue({
      fromUserId: delegation.fromUserId,
      toUserId: delegation.toUserId,
      startDate: formatDateForInput(delegation.startDate),
      endDate: formatDateForInput(delegation.endDate),
      isActive: delegation.isActive !== false
    });
  }

  saveDelegation(): void {
    if (this.delegationForm.invalid) {
      this.markFormGroupTouched(this.delegationForm);
      this.messageService.add({ 
        severity: 'warn', 
        summary: 'Validation', 
        detail: 'Please fill all required fields correctly' 
      });
      return;
    }

    this.loading.save = true;
    const formData = this.delegationForm.value;

    if (this.editingDelegation && this.editingDelegation.id) {
      const updateDto: UpdateApprovalDelegationDto = {
        toUserId: formData.toUserId,
        startDate: formData.startDate,
        endDate: formData.endDate,
        isActive: formData.isActive !== undefined ? formData.isActive : true
      };

      this.delegationService.updateDelegation(this.editingDelegation.id, updateDto).subscribe({
        next: () => {
          this.loading.save = false;
          this.messageService.add({ 
            severity: 'success', 
            summary: 'Success', 
            detail: 'Delegation updated successfully' 
          });
          this.closeModal();
          this.loadDelegations();
        },
        error: (error: any) => {
          this.loading.save = false;
          console.error('Error updating delegation:', error);
          let errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to update delegation';
          this.messageService.add({ 
            severity: 'error', 
            summary: 'Error', 
            detail: errorMessage 
          });
          this.cdr.detectChanges();
        }
      });
    } else {
      const createDto: CreateApprovalDelegationDto = {
        fromUserId: formData.fromUserId,
        toUserId: formData.toUserId,
        startDate: formData.startDate,
        endDate: formData.endDate,
        isActive: formData.isActive !== undefined ? formData.isActive : true
      };

      this.delegationService.createDelegation(createDto).subscribe({
        next: () => {
          this.loading.save = false;
          this.messageService.add({ 
            severity: 'success', 
            summary: 'Success', 
            detail: 'Delegation created successfully' 
          });
          this.closeModal();
          this.loadDelegations();
        },
        error: (error: any) => {
          this.loading.save = false;
          console.error('Error creating delegation:', error);
          let errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to create delegation';
          this.messageService.add({ 
            severity: 'error', 
            summary: 'Error', 
            detail: errorMessage 
          });
          this.cdr.detectChanges();
        }
      });
    }
  }

  deleteDelegation(delegation: ApprovalDelegationDto): void {
    if (!delegation || !delegation.id) return;

    this.confirmationService.confirm({
      message: `Are you sure you want to delete this delegation? This action cannot be undone.`,
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.loading.delete = true;
        this.delegationService.deleteDelegation(delegation.id).subscribe({
          next: () => {
            this.loading.delete = false;
            this.messageService.add({ 
              severity: 'success', 
              summary: 'Success', 
              detail: 'Delegation deleted successfully' 
            });
            this.loadDelegations();
          },
          error: (error: any) => {
            this.loading.delete = false;
            console.error('Error deleting delegation:', error);
            let errorMessage = error?.error?.message || error?.error?.errorMessage || error?.message || 'Failed to delete delegation';
            this.messageService.add({ 
              severity: 'error', 
              summary: 'Error', 
              detail: errorMessage 
            });
            this.cdr.detectChanges();
          }
        });
      }
    });
  }

  formatDate(date: Date | string | null | undefined): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  }

  isDelegationActive(delegation: ApprovalDelegationDto): boolean {
    if (!delegation.isActive) return false;
    const now = new Date();
    const start = new Date(delegation.startDate);
    const end = new Date(delegation.endDate);
    return now >= start && now <= end;
  }

  markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  closeModal(): void {
    this.showModal = false;
    this.editingDelegation = null;
    this.delegationForm.reset();
  }
}

