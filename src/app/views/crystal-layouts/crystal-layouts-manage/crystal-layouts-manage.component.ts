import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { TableShellComponent } from '../../../shared/table-shell/table-shell.component';
import { PdfPreviewComponent } from '../../../shared/pdf-preview/pdf-preview.component';
import { CrystalLayoutsService, CrystalLayoutDto } from '../../FormBuilder/services/crystal-layouts.service';
import { DocumentTypesService } from '../../FormBuilder/services/document-types.service';
import { DocumentType } from '../../FormBuilder/form-builder/models/document-types.model';
import { ProjectsService } from '../../projects/services/projects.service';
import { ProjectDto } from '../../projects/models/project-dto.model';
import { UsersService, UserDto } from '../../FormBuilder/services/users.service';

type ScopeMode = 'global' | 'project' | 'user';

@Component({
  selector: 'app-crystal-layouts-manage',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastModule, TableModule, TableShellComponent, PdfPreviewComponent],
  templateUrl: './crystal-layouts-manage.component.html',
  styleUrls: ['./crystal-layouts-manage.component.scss'],
  providers: [MessageService]
})
export class CrystalLayoutsManageComponent implements OnInit {
  documentTypes: DocumentType[] = [];
  selectedDocumentTypeId: number | null = null;

  projects: ProjectDto[] = [];
  users: UserDto[] = [];

  layouts: CrystalLayoutDto[] = [];
  loading = false;

  // create/edit modal
  showModal = false;
  editing: CrystalLayoutDto | null = null;
  form: Partial<CrystalLayoutDto> = this.blankForm();
  scopeMode: ScopeMode = 'global';

  // preview modal
  showPreview = false;
  previewLayoutId = 0;
  previewObjectId = 0;
  previewSampleId: number | null = null;
  previewName = 'Report';

  constructor(
    private layoutsService: CrystalLayoutsService,
    private docTypesService: DocumentTypesService,
    private projectsService: ProjectsService,
    private usersService: UsersService,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.docTypesService.getActiveDocumentTypes().subscribe({
      next: (types) => {
        this.documentTypes = types || [];
        if (this.documentTypes.length && !this.selectedDocumentTypeId) {
          this.selectedDocumentTypeId = this.documentTypes[0].id;
          this.loadLayouts();
        }
        this.cdr.detectChanges();
      }
    });
    this.projectsService.getActiveProjects().subscribe({
      next: (p) => { this.projects = p || []; this.cdr.detectChanges(); },
      error: () => { this.projects = []; }
    });
    this.usersService.getActiveUsers().subscribe({
      next: (u) => { this.users = u || []; this.cdr.detectChanges(); },
      error: () => { this.users = []; }
    });
  }

  private blankForm(): Partial<CrystalLayoutDto> {
    return { layoutName: '', layoutPath: '', isDefault: false, isActive: true, projectId: null, userId: null };
  }

  onDocTypeChange(): void {
    this.loadLayouts();
  }

  loadLayouts(): void {
    if (!this.selectedDocumentTypeId) { this.layouts = []; return; }
    this.loading = true;
    this.layoutsService.list(this.selectedDocumentTypeId).subscribe({
      next: (rows) => { this.layouts = rows || []; this.loading = false; this.cdr.detectChanges(); },
      error: () => { this.layouts = []; this.loading = false; this.cdr.detectChanges(); }
    });
  }

  projectName(id?: number | null): string {
    if (!id) return '';
    return this.projects.find(p => p.id === id)?.name || `#${id}`;
  }

  userName(id?: string | null): string {
    if (!id) return '';
    const u = this.users.find(x => String(x.id) === String(id));
    return u ? (u.name || u.username) : `#${id}`;
  }

  openCreate(): void {
    if (!this.selectedDocumentTypeId) {
      this.messageService.add({ severity: 'warn', summary: 'Select document type', detail: 'Choose a document type first.' });
      return;
    }
    this.editing = null;
    this.form = this.blankForm();
    this.scopeMode = 'global';
    this.showModal = true;
  }

  openEdit(row: CrystalLayoutDto): void {
    this.editing = row;
    this.form = { ...row };
    this.scopeMode = row.userId ? 'user' : (row.projectId ? 'project' : 'global');
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editing = null;
  }

  onScopeModeChange(): void {
    if (this.scopeMode !== 'project') this.form.projectId = null;
    if (this.scopeMode !== 'user') this.form.userId = null;
  }

  save(): void {
    if (!this.form.layoutName || !this.form.layoutName.trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Name required', detail: 'Enter a layout name.' });
      return;
    }
    if (!this.form.layoutPath || !this.form.layoutPath.trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Path required', detail: 'Enter the layout path/file.' });
      return;
    }
    // Normalize scope.
    const projectId = this.scopeMode === 'project' ? (this.form.projectId || null) : null;
    const userId = this.scopeMode === 'user' ? (this.form.userId || null) : null;
    if (this.scopeMode === 'project' && !projectId) {
      this.messageService.add({ severity: 'warn', summary: 'Project required', detail: 'Pick a project for project scope.' });
      return;
    }
    if (this.scopeMode === 'user' && !userId) {
      this.messageService.add({ severity: 'warn', summary: 'User required', detail: 'Pick a user for user scope.' });
      return;
    }

    if (this.editing) {
      const dto: Partial<CrystalLayoutDto> = {
        layoutName: this.form.layoutName, layoutPath: this.form.layoutPath,
        projectId, userId, isDefault: !!this.form.isDefault, isActive: !!this.form.isActive
      };
      this.layoutsService.update(this.editing.id, dto).subscribe({
        next: () => { this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'Layout updated.' }); this.showModal = false; this.loadLayouts(); },
        error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update.' })
      });
    } else {
      const dto: Partial<CrystalLayoutDto> = {
        documentTypeId: this.selectedDocumentTypeId!,
        layoutName: this.form.layoutName, layoutPath: this.form.layoutPath,
        projectId, userId, isDefault: !!this.form.isDefault, isActive: !!this.form.isActive
      };
      this.layoutsService.create(dto).subscribe({
        next: () => { this.messageService.add({ severity: 'success', summary: 'Created', detail: 'Layout created.' }); this.showModal = false; this.loadLayouts(); },
        error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to create.' })
      });
    }
  }

  remove(row: CrystalLayoutDto): void {
    this.layoutsService.delete(row.id).subscribe({
      next: () => { this.messageService.add({ severity: 'success', summary: 'Deleted', detail: row.layoutName }); this.loadLayouts(); },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete.' })
    });
  }

  // ---- Inline preview ----
  openPreview(row: CrystalLayoutDto): void {
    this.previewLayoutId = row.id;
    this.previewName = row.layoutName || 'Report';
    this.previewSampleId = null;
    this.previewObjectId = 0;
    this.showPreview = true;
  }

  runPreview(): void {
    if (!this.previewSampleId || this.previewSampleId <= 0) {
      this.messageService.add({ severity: 'warn', summary: 'Sample needed', detail: 'Enter a submission ID to render.' });
      return;
    }
    this.previewObjectId = this.previewSampleId;
  }

  closePreview(): void {
    this.showPreview = false;
    this.previewObjectId = 0;
  }
}
