import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';

import { DialogShellComponent } from '../../../shared/dialog-shell/dialog-shell.component';
import { TableShellComponent } from '../../../shared/table-shell/table-shell.component';
import { TableActionsComponent } from '../../../shared/table-actions/table-actions.component';
import { UsersService, UserGroupDto } from '../../FormBuilder/services/users.service';

@Component({
  selector: 'app-groups-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    ToastModule,
    ConfirmDialogModule,
    TableShellComponent,
    TableActionsComponent,
    DialogShellComponent
  ],
  templateUrl: './groups-list.component.html',
  styleUrls: ['./groups-list.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class GroupsListComponent implements OnInit {
  groups: UserGroupDto[] = [];
  filteredGroups: UserGroupDto[] = [];
  paginatedGroups: UserGroupDto[] = [];
  searchTerm = '';
  loading = false;
  saving = false;
  showGroupModal = false;
  editingGroup: UserGroupDto | null = null;
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;
  groupForm: FormGroup;

  constructor(
    private usersService: UsersService,
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder,
    private messageService: MessageService
  ) {
    this.groupForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(200)]],
      foreignName: ['', [Validators.maxLength(200)]],
      description: ['', [Validators.maxLength(500)]],
      isActive: [true]
    });
  }

  ngOnInit(): void {
    this.loadGroups();
  }

  loadGroups(): void {
    this.loading = true;
    this.usersService.getActiveUserGroups().subscribe({
      next: (groups) => {
        this.groups = (groups || []).filter(group => group.isActive !== false);
        this.filteredGroups = [...this.groups];
        this.currentPage = 1;
        this.updatePaginatedGroups();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('[GroupsList] Error loading groups:', error);
        this.groups = [];
        this.filteredGroups = [];
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onSearch(): void {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      this.filteredGroups = [...this.groups];
    } else {
      this.filteredGroups = this.groups.filter(group =>
        (group.name || '').toLowerCase().includes(term) ||
        (group.foreignName || '').toLowerCase().includes(term) ||
        (group.description || '').toLowerCase().includes(term)
      );
    }
    this.currentPage = 1;
    this.updatePaginatedGroups();
  }

  get activeGroupsCount(): number {
    return this.groups.filter(group => group.isActive !== false).length;
  }

  trackByGroupId(_: number, group: UserGroupDto): number {
    return group.id;
  }

  updatePaginatedGroups(): void {
    this.totalPages = Math.max(1, Math.ceil(this.filteredGroups.length / this.itemsPerPage));
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    this.paginatedGroups = this.filteredGroups.slice(startIndex, startIndex + this.itemsPerPage);
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePaginatedGroups();
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, start + 4);
    for (let page = start; page <= end; page++) {
      pages.push(page);
    }
    return pages;
  }

  openGroupModal(group?: UserGroupDto): void {
    this.editingGroup = group || null;
    this.groupForm.reset({
      name: group?.name || '',
      foreignName: group?.foreignName || '',
      description: group?.description || '',
      isActive: group?.isActive ?? true
    });
    this.showGroupModal = true;
  }

  closeGroupModal(): void {
    this.showGroupModal = false;
    this.editingGroup = null;
    this.groupForm.reset({
      name: '',
      foreignName: '',
      description: '',
      isActive: true
    });
  }

  saveGroup(): void {
    if (this.groupForm.invalid) {
      this.groupForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    const payload = this.groupForm.getRawValue();
    const request$ = this.editingGroup
      ? this.usersService.updateUserGroup(this.editingGroup.id, payload)
      : this.usersService.createUserGroup(payload);

    request$.subscribe({
      next: () => {
        this.saving = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `Group ${this.editingGroup ? 'updated' : 'created'} successfully.`
        });
        this.closeGroupModal();
        this.loadGroups();
      },
      error: (error) => {
        console.error('[GroupsList] Save group failed:', error);
        this.saving = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Save Failed',
          detail: error?.error?.message || 'The backend does not currently support saving groups from this screen.'
        });
      }
    });
  }
}
