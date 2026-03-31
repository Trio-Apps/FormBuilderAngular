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
import { UsersService, UserDto, UserGroupDto } from '../../FormBuilder/services/users.service';

@Component({
  selector: 'app-users-list',
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
  templateUrl: './users-list.component.html',
  styleUrls: ['./users-list.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class UsersListComponent implements OnInit {
  users: UserDto[] = [];
  filteredUsers: UserDto[] = [];
  paginatedUsers: UserDto[] = [];
  searchTerm = '';
  loading = false;
  saving = false;
  showUserModal = false;
  editingUser: UserDto | null = null;
  userGroups: UserGroupDto[] = [];
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 0;
  userForm: FormGroup;

  constructor(
    private usersService: UsersService,
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder,
    private messageService: MessageService
  ) {
    this.userForm = this.fb.group({
      username: ['', [Validators.required, Validators.maxLength(100)]],
      name: ['', [Validators.required, Validators.maxLength(200)]],
      email: ['', [Validators.email, Validators.maxLength(255)]],
      phone: ['', [Validators.maxLength(50)]],
      idUserType: [null, [Validators.required]],
      password: [''],
      isActive: [true]
    });
  }

  ngOnInit(): void {
    this.loadUserGroups();
    this.loadUsers();
  }

  loadUserGroups(): void {
    this.usersService.getActiveUserGroups().subscribe({
      next: (groups) => {
        this.userGroups = groups || [];
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('[UsersList] Error loading user groups:', error);
        this.userGroups = [];
        this.cdr.detectChanges();
      }
    });
  }

  loadUsers(): void {
    this.loading = true;
    this.usersService.getActiveUsers().subscribe({
      next: (users) => {
        this.users = (users || []).filter(user => user.isActive !== false);
        this.filteredUsers = [...this.users];
        this.currentPage = 1;
        this.updatePaginatedUsers();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('[UsersList] Error loading users:', error);
        this.users = [];
        this.filteredUsers = [];
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onSearch(): void {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      this.filteredUsers = [...this.users];
    } else {
      this.filteredUsers = this.users.filter(user =>
        (user.username || '').toLowerCase().includes(term) ||
        (user.name || '').toLowerCase().includes(term) ||
        (user.email || '').toLowerCase().includes(term) ||
        (user.phone || '').toLowerCase().includes(term)
      );
    }
    this.currentPage = 1;
    this.updatePaginatedUsers();
  }

  get activeUsersCount(): number {
    return this.users.filter(user => user.isActive !== false).length;
  }

  trackByUserId(_: number, user: UserDto): number {
    return user.id;
  }

  updatePaginatedUsers(): void {
    this.totalPages = Math.max(1, Math.ceil(this.filteredUsers.length / this.itemsPerPage));
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    this.paginatedUsers = this.filteredUsers.slice(startIndex, startIndex + this.itemsPerPage);
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePaginatedUsers();
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

  openUserModal(user?: UserDto): void {
    this.editingUser = user || null;
    const passwordControl = this.userForm.get('password');
    if (user) {
      passwordControl?.clearValidators();
    } else {
      passwordControl?.setValidators([Validators.required, Validators.minLength(6)]);
    }
    passwordControl?.updateValueAndValidity();

    this.userForm.reset({
      username: user?.username || '',
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      idUserType: user?.resolvedGroupId ?? user?.idUserType ?? null,
      password: '',
      isActive: user?.isActive ?? true
    });
    this.showUserModal = true;
  }

  closeUserModal(): void {
    this.showUserModal = false;
    this.editingUser = null;
    this.userForm.reset({
      username: '',
      name: '',
      email: '',
      phone: '',
      idUserType: null,
      password: '',
      isActive: true
    });
  }

  saveUser(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    const formValue = this.userForm.getRawValue();
    const payload: any = {
      username: formValue.username,
      name: formValue.name,
      email: formValue.email || null,
      phone: formValue.phone || null,
      idUserType: formValue.idUserType,
      isActive: formValue.isActive
    };

    if (formValue.password?.trim()) {
      payload.password = formValue.password.trim();
    }

    const request$ = this.editingUser
      ? this.usersService.updateUser(this.editingUser.id, payload)
      : this.usersService.createUser(payload);

    request$.subscribe({
      next: () => {
        this.saving = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `User ${this.editingUser ? 'updated' : 'created'} successfully.`
        });
        this.closeUserModal();
        this.loadUsers();
      },
      error: (error) => {
        console.error('[UsersList] Save user failed:', error);
        this.saving = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Save Failed',
          detail: error?.error?.message || 'The backend does not currently support saving users from this screen.'
        });
      }
    });
  }
}
