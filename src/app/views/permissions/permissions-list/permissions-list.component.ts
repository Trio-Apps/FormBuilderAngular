import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';

import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';

import { TableShellComponent } from '../../../shared/table-shell/table-shell.component';
import { environment } from '../../../environments/environment';

export interface PermissionDto {
  id?: number;
  name: string;
  description?: string;
  screenName?: string;
  isActive?: boolean;
}

@Component({
  selector: 'app-permissions-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    TableShellComponent,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    ToastModule,
    ConfirmDialogModule
  ],
  templateUrl: './permissions-list.component.html',
  styleUrls: ['./permissions-list.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class PermissionsListComponent implements OnInit {
  private baseUrl = `${environment.apiUrl}/UserPermission`;

  permissions: PermissionDto[] = [];
  loading = false;

  searchTerm = '';

  showDialog = false;
  isEdit = false;
  current: PermissionDto = { name: '', screenName: '' };

  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.loadPermissions();
  }

  loadPermissions(): void {
    this.loading = true;
    this.http.get<PermissionDto[]>(this.baseUrl).subscribe({
      next: (res) => {
        this.permissions = res || [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load permissions'
        });
      }
    });
  }

  // ====== New / Edit ======
  openNew(): void {
    this.isEdit = false;
    this.current = { name: '', screenName: '', description: '', isActive: true };
    this.showDialog = true;
  }

  openEdit(row: PermissionDto): void {
    this.isEdit = true;
    this.current = { ...row };
    this.showDialog = true;
  }

  save(): void {
    const payload: PermissionDto = {
      ...this.current,
      name: (this.current.name || '').trim()
    };

    if (!payload.name) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Name is required'
      });
      return;
    }

    if (this.isEdit && payload.id) {
      this.http.put<void>(`${this.baseUrl}/${payload.id}`, payload).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Updated',
            detail: 'Permission updated successfully'
          });
          this.showDialog = false;
          this.loadPermissions();
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to update permission'
          });
        }
      });
    } else {
      this.http.post<PermissionDto>(this.baseUrl, payload).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Created',
            detail: 'Permission created successfully'
          });
          this.showDialog = false;
          this.loadPermissions();
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to create permission'
          });
        }
      });
    }
  }

  // ====== Delete ======
  confirmDelete(row: PermissionDto): void {
    if (!row.id) return;

    this.confirmationService.confirm({
      header: 'Delete Permission',
      message: `Delete permission "${row.name}"?`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.delete(row.id!)
    });
  }

  private delete(id: number): void {
    this.http.delete<void>(`${this.baseUrl}/${id}`).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Deleted',
          detail: 'Permission deleted successfully'
        });
        this.loadPermissions();
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to delete permission'
        });
      }
    });
  }

  get filteredPermissions(): PermissionDto[] {
    const term = (this.searchTerm || '').trim().toLowerCase();
    if (!term) return this.permissions;
    return (this.permissions || []).filter(p =>
      (p.name || '').toLowerCase().includes(term) ||
      (p.screenName || '').toLowerCase().includes(term) ||
      (p.description || '').toLowerCase().includes(term)
    );
  }
}


