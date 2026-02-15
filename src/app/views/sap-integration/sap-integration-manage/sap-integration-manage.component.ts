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
    TableShellComponent
  ],
  templateUrl: './sap-integration-manage.component.html',
  styleUrls: ['./sap-integration-manage.component.scss'],
  providers: [MessageService]
})
export class SapIntegrationManageComponent implements OnInit, OnDestroy {
  sapConfigs: SapHanaConfigDto[] = [];

  connectionForm: CreateSapConnectionDto = {
    name: '',
    integrationType: 'ServiceLayer',
    baseUrl: '',
    authenticationMethod: 'Session',
    companyDb: '',
    userName: '',
    password: '',
    verifySsl: true,
    isActive: true
  };

  editingConnectionId: number | null = null;

  loading = {
    list: false,
    save: false,
    test: false,
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
    const sub = this.sapIntegrationService.getSapConfigs(true).subscribe({
      next: (configs) => {
        this.sapConfigs = (configs || []).filter((c) => c.integrationType !== 'HanaOdbc');
        this.loading.list = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.sapConfigs = [];
        this.loading.list = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load SAP connections.' });
      }
    });
    this.subs.push(sub);
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
      isActive: true
    };
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
      isActive: row.isActive !== false
    };
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

    this.loading.save = true;

    const request$ = this.editingConnectionId
      ? this.sapIntegrationService.updateSapConfig(this.editingConnectionId, this.connectionForm as UpdateSapConnectionDto)
      : this.sapIntegrationService.createSapConfig(this.connectionForm);

    const sub = request$.subscribe({
      next: () => {
        this.loading.save = false;
        this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'SAP connection saved successfully.' });
        this.resetForm();
        this.loadConnections();
      },
      error: () => {
        this.loading.save = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save SAP connection.' });
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
      error: () => {
        this.loading.delete = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete SAP connection.' });
      }
    });

    this.subs.push(sub);
  }

  testConnection(): void {
    if (!this.editingConnectionId) {
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Save connection first, then test it.' });
      return;
    }

    this.loading.test = true;
    const sub = this.sapIntegrationService.getServiceLayerEndpoints(this.editingConnectionId).subscribe({
      next: () => {
        this.loading.test = false;
        this.messageService.add({ severity: 'success', summary: 'Connection OK', detail: 'SAP Service Layer connection is working.' });
      },
      error: () => {
        this.loading.test = false;
        this.messageService.add({ severity: 'error', summary: 'Connection Failed', detail: 'Unable to connect to SAP Service Layer.' });
      }
    });

    this.subs.push(sub);
  }
}
