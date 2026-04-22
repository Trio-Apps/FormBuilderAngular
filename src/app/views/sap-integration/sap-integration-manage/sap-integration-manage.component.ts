import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';

import { DialogShellComponent } from '../../../shared/dialog-shell/dialog-shell.component';
import { TableActionsComponent } from '../../../shared/table-actions/table-actions.component';
import { TableShellComponent } from '../../../shared/table-shell/table-shell.component';
import { PermissionService } from '../../../services/permission.service';
import {
  CreateSapConnectionDto,
  SapHanaConfigDto,
  SapIntegrationService,
  UpdateSapConnectionDto
} from '../../FormBuilder/services/sap-integration.service';

@Component({
  selector: 'app-sap-integration-manage',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ToastModule,
    SelectModule,
    InputTextModule,
    CheckboxModule,
    ButtonModule,
    TableModule,
    TableShellComponent,
    TableActionsComponent,
    DialogShellComponent,
    TooltipModule
  ],
  templateUrl: './sap-integration-manage.component.html',
  styleUrls: ['./sap-integration-manage.component.scss'],
  providers: [MessageService]
})
export class SapIntegrationManageComponent implements OnInit, OnDestroy {
  sapConfigs: SapHanaConfigDto[] = [];
  filteredConfigs: SapHanaConfigDto[] = [];

  includeInactive = false;
  searchTerm = '';
  showModal = false;

  connectionForm: CreateSapConnectionDto = {
    name: '',
    integrationType: 'ServiceLayer',
    baseUrl: '',
    authenticationMethod: 'Session',
    companyDb: '',
    userName: '',
    password: '',
    verifySsl: true,
    hanaServer: '',
    hanaUserName: '',
    hanaPassword: '',
    hanaSchema: '',
    hanaMaxPoolSize: null,
    isActive: true
  };

  editingConnectionId: number | null = null;

  loading = {
    list: false,
    save: false,
    test: false,
    relogin: false,
    delete: false
  };

  private subs: Subscription[] = [];

  constructor(
    private sapIntegrationService: SapIntegrationService,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService,
    public permissionService: PermissionService
  ) {}

  ngOnInit(): void {
    this.permissionService.refreshPermissions().subscribe({
      next: () => this.cdr.detectChanges(),
      error: () => this.cdr.detectChanges()
    });

    this.resetForm();
    this.loadConnections();
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }

  loadConnections(): void {
    this.loading.list = true;
    const sub = this.sapIntegrationService.getSapConfigs(this.includeInactive).subscribe({
      next: (configs) => {
        this.sapConfigs = (configs || []).filter((c) => c.integrationType !== 'HanaOdbc');
        this.applyFilters();
        this.loading.list = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.sapConfigs = [];
        this.filteredConfigs = [];
        this.loading.list = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load SAP connections.' });
      }
    });
    this.subs.push(sub);
  }

  applyFilters(): void {
    const term = (this.searchTerm || '').trim().toLowerCase();
    if (!term) {
      this.filteredConfigs = [...(this.sapConfigs || [])];
      return;
    }

    this.filteredConfigs = (this.sapConfigs || []).filter((c) =>
      String(c.name || '').toLowerCase().includes(term) ||
      String(c.baseUrl || '').toLowerCase().includes(term) ||
      String(c.companyDb || '').toLowerCase().includes(term) ||
      String(c.userName || '').toLowerCase().includes(term)
    );
  }

  resetForm(): void {
    this.editingConnectionId = null;
    this.connectionForm = {
      name: '',
      integrationType: 'ServiceLayer',
      baseUrl: '',
      authenticationMethod: 'Session',
      companyDb: '',
      userName: '',
      password: '',
      verifySsl: true,
      hanaServer: '',
      hanaUserName: '',
      hanaPassword: '',
      hanaSchema: '',
      hanaMaxPoolSize: null,
      isActive: true
    };
  }

  openCreate(): void {
    this.resetForm();
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.resetForm();
  }

  editConnection(row: SapHanaConfigDto): void {
    this.editingConnectionId = row.id;
    this.connectionForm = {
      name: row.name || '',
      integrationType: 'ServiceLayer',
      baseUrl: row.baseUrl || '',
      authenticationMethod: (row.authenticationMethod as 'Session' | 'Token') || 'Session',
      companyDb: row.companyDb || '',
      userName: row.userName || '',
      password: '',
      verifySsl: row.verifySsl !== false,
      hanaServer: row.hanaServer || '',
      hanaUserName: row.hanaUserName || '',
      hanaPassword: '',
      hanaSchema: row.hanaSchema || '',
      hanaMaxPoolSize: row.hanaMaxPoolSize ?? null,
      isActive: row.isActive !== false
    };
    this.showModal = true;
  }

  saveConnection(): void {
    if (!this.connectionForm.name || !this.connectionForm.baseUrl || !this.connectionForm.companyDb || !this.connectionForm.userName) {
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Connection Name, Base URL, Company DB, and Username are required.' });
      return;
    }

    if (!this.editingConnectionId && !this.connectionForm.password) {
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Password is required for new connection.' });
      return;
    }

    const hasAnyHanaValue = !!(
      (this.connectionForm.hanaServer || '').trim() ||
      (this.connectionForm.hanaUserName || '').trim() ||
      (this.connectionForm.hanaPassword || '').trim() ||
      (this.connectionForm.hanaSchema || '').trim() ||
      this.connectionForm.hanaMaxPoolSize
    );

    if (hasAnyHanaValue && (!(this.connectionForm.hanaServer || '').trim() || !(this.connectionForm.hanaUserName || '').trim())) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'When using HANA settings, HANA Server and HANA Username are required.'
      });
      return;
    }

    if (hasAnyHanaValue && !this.editingConnectionId && !(this.connectionForm.hanaPassword || '').trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'HANA Password is required for a new connection when HANA settings are provided.'
      });
      return;
    }

    this.loading.save = true;

    const request$ = this.editingConnectionId
      ? this.sapIntegrationService.updateSapConfig(this.editingConnectionId, this.connectionForm as UpdateSapConnectionDto)
      : this.sapIntegrationService.createSapConfig(this.connectionForm);

    const sub = request$.subscribe({
      next: () => {
        this.loading.save = false;
        this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'SAP connection saved successfully.' });
        this.showModal = false;
        this.resetForm();
        this.loadConnections();
      },
      error: (err) => {
        this.loading.save = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: this.extractApiErrorMessage(err) || 'Failed to save SAP connection.'
        });
      }
    });
    this.subs.push(sub);
  }

  deleteConnection(row: SapHanaConfigDto): void {
    this.loading.delete = true;
    const sub = this.sapIntegrationService.deleteSapConfig(row.id).subscribe({
      next: () => {
        this.loading.delete = false;
        this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'SAP connection deleted.' });
        if (this.editingConnectionId === row.id) {
          this.resetForm();
        }
        this.loadConnections();
      },
      error: (err) => {
        this.loading.delete = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: this.extractApiErrorMessage(err) || 'Failed to delete SAP connection.'
        });
      }
    });

    this.subs.push(sub);
  }

  testConnection(row?: SapHanaConfigDto): void {
    const targetId = row?.id ?? this.editingConnectionId;
    if (!targetId) {
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Save connection first, then test it.' });
      return;
    }

    this.loading.test = true;
    const sub = this.sapIntegrationService.getServiceLayerEndpoints(targetId).subscribe({
      next: () => {
        this.loading.test = false;
        this.messageService.add({ severity: 'success', summary: 'Connection OK', detail: 'SAP Service Layer connection is working.' });
      },
      error: (err) => {
        this.loading.test = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Connection Failed',
          detail: this.extractApiErrorMessage(err) || 'Unable to connect to SAP Service Layer.'
        });
      }
    });

    this.subs.push(sub);
  }

  reloginConnection(row?: SapHanaConfigDto): void {
    const targetId = row?.id ?? this.editingConnectionId;
    if (!targetId) {
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Select or save connection first.' });
      return;
    }

    this.loading.relogin = true;
    const sub = this.sapIntegrationService.reloginConnection(targetId).subscribe({
      next: () => {
        this.loading.relogin = false;
        this.messageService.add({ severity: 'success', summary: 'Re-Login OK', detail: 'SAP session refreshed successfully.' });
      },
      error: (err) => {
        this.loading.relogin = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Re-Login Failed',
          detail: this.extractApiErrorMessage(err) || 'Unable to re-login to SAP Service Layer.'
        });
      }
    });

    this.subs.push(sub);
  }

  private extractApiErrorMessage(error: any): string {
    if (!error) return '';
    if (typeof error === 'string') return error;

    const payload = error.error;
    if (typeof payload === 'string') return payload;
    if (payload?.message && typeof payload.message === 'string') return payload.message;
    if (payload?.error && typeof payload.error === 'string') return payload.error;

    return '';
  }
}
