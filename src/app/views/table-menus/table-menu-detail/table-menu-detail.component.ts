import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DialogShellComponent } from '../../../shared/dialog-shell/dialog-shell.component';
import { TableActionsComponent } from '../../../shared/table-actions/table-actions.component';
import { TableShellComponent } from '../../../shared/table-shell/table-shell.component';
import {
  CreateTableMenuDocumentDto,
  CreateTableSubMenuDto,
  TableMenuDocumentDto,
  TableMenuDto,
  TableMenusService,
  TableSubMenuDto,
  UpdateTableMenuDocumentDto,
  UpdateTableSubMenuDto
} from '../../../services/table-menus.service';
import { DocumentTypesService } from '../../FormBuilder/services/document-types.service';
import { DocumentType } from '../../FormBuilder/form-builder/models/document-types.model';
import { PermissionService } from '../../../services/permission.service';

type DetailTab = 'submenus' | 'documents';

@Component({
  selector: 'app-table-menu-detail',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    ButtonModule,
    CheckboxModule,
    ConfirmDialogModule,
    DialogModule,
    InputTextModule,
    TableModule,
    ToastModule,
    TooltipModule,
    DialogShellComponent,
    TableActionsComponent,
    TableShellComponent
  ],
  templateUrl: './table-menu-detail.component.html',
  styleUrls: ['./table-menu-detail.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class TableMenuDetailComponent implements OnInit, OnDestroy {
  menu: TableMenuDto | null = null;
  subMenus: TableSubMenuDto[] = [];
  documents: TableMenuDocumentDto[] = [];
  documentTypes: DocumentType[] = [];

  activeTab: DetailTab = 'submenus';
  selectedSubMenuForDocuments: TableSubMenuDto | null = null;

  loading = {
    menu: false,
    subMenus: false,
    documents: false,
    save: false,
    delete: false
  };

  showSubMenuModal = false;
  subMenuForm!: FormGroup;
  editingSubMenu: TableSubMenuDto | null = null;
  currentInputLanguage: 'en' | 'ar' = 'en';

  showMenuDocumentModal = false;
  menuDocumentForm!: FormGroup;
  editingMenuDocument: TableMenuDocumentDto | null = null;
  currentSubMenuForDocument: TableSubMenuDto | null = null;

  private menuId = 0;
  private subscriptions = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private tableMenusService: TableMenusService,
    private documentTypesService: DocumentTypesService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    public permissionService: PermissionService,
    private cdr: ChangeDetectorRef
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    const sub = this.route.paramMap.subscribe((params) => {
      const menuId = Number(params.get('menuId'));
      if (!menuId) {
        this.router.navigate(['/table-menus']);
        return;
      }

      this.menuId = menuId;
      this.loadInitialState();
    });
    this.subscriptions.add(sub);

    const querySub = this.route.queryParamMap.subscribe((params) => {
      const tab = params.get('tab');
      this.activeTab = tab === 'documents' ? 'documents' : 'submenus';

      const subMenuId = Number(params.get('subMenuId'));
      if (subMenuId && this.subMenus.length) {
        this.selectedSubMenuForDocuments = this.subMenus.find((item) => item.id === subMenuId) || null;
      } else if (!subMenuId) {
        this.selectedSubMenuForDocuments = null;
      }

      if (this.menuId) {
        if (this.activeTab === 'submenus') {
          this.loadSubMenus();
        } else {
          this.loadDocuments();
        }
      }
    });
    this.subscriptions.add(querySub);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private initializeForms(): void {
    this.subMenuForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
      foreignName: ['', [Validators.maxLength(200)]],
      displayOrder: [1, [Validators.required, Validators.min(1)]],
      isActive: [true],
      permissions: [[]]
    });

    this.menuDocumentForm = this.fb.group({
      documentTypeId: [null, [Validators.required]],
      subMenuId: [null],
      displayOrder: [1, [Validators.required, Validators.min(1)]],
      isActive: [true],
      permissions: [[]]
    });
  }

  private loadInitialState(): void {
    this.loadMenu();
    this.loadDocumentTypes();
    this.loadSubMenus();
    if (this.activeTab === 'documents') {
      this.loadDocuments();
    }
  }

  private loadMenu(): void {
    this.loading.menu = true;
    const sub = this.tableMenusService.getMenuById(this.menuId).subscribe({
      next: (menu) => {
        this.menu = menu;
        this.loading.menu = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.loading.menu = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.message || 'Failed to load menu details'
        });
        this.router.navigate(['/table-menus']);
      }
    });
    this.subscriptions.add(sub);
  }

  private loadDocumentTypes(): void {
    const sub = this.documentTypesService.getAllDocumentTypes().subscribe({
      next: (documentTypes) => {
        this.documentTypes = documentTypes.filter((item) => item.isActive && !item.isDeleted);
      },
      error: () => {
        this.documentTypes = [];
      }
    });
    this.subscriptions.add(sub);
  }

  loadSubMenus(): void {
    this.loading.subMenus = true;
    const sub = this.tableMenusService.getSubMenusByMenuId(this.menuId).subscribe({
      next: (subMenus) => {
        this.subMenus = subMenus || [];
        if (this.selectedSubMenuForDocuments) {
          this.selectedSubMenuForDocuments = this.subMenus.find((item) => item.id === this.selectedSubMenuForDocuments?.id) || null;
        }
        this.loading.subMenus = false;
      },
      error: (error) => {
        this.loading.subMenus = false;
        this.subMenus = [];
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.message || 'Failed to load sub menus'
        });
      }
    });
    this.subscriptions.add(sub);
  }

  loadDocuments(): void {
    this.loading.documents = true;
    const request = this.selectedSubMenuForDocuments
      ? this.tableMenusService.getMenuDocumentsBySubMenuId(this.selectedSubMenuForDocuments.id)
      : this.tableMenusService.getMenuDocumentsByMenuId(this.menuId);

    const sub = request.subscribe({
      next: (documents) => {
        this.documents = documents || [];
        this.loading.documents = false;
      },
      error: (error) => {
        this.loading.documents = false;
        this.documents = [];
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.message || 'Failed to load documents'
        });
      }
    });
    this.subscriptions.add(sub);
  }

  switchTab(tab: DetailTab): void {
    const queryParams: Record<string, string> = { tab };
    if (tab === 'documents' && this.selectedSubMenuForDocuments) {
      queryParams['subMenuId'] = String(this.selectedSubMenuForDocuments.id);
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: ''
    });
  }

  showDocumentsForSubMenu(subMenu: TableSubMenuDto): void {
    this.selectedSubMenuForDocuments = subMenu;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: 'documents', subMenuId: subMenu.id },
      queryParamsHandling: ''
    });
  }

  clearDocumentFilter(): void {
    this.selectedSubMenuForDocuments = null;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: 'documents' },
      queryParamsHandling: ''
    });
  }

  openSubMenuModal(subMenu?: TableSubMenuDto): void {
    this.editingSubMenu = subMenu || null;
    this.currentInputLanguage = 'en';

    if (subMenu) {
      this.subMenuForm.patchValue({
        name: subMenu.name,
        foreignName: subMenu.foreignName || '',
        displayOrder: subMenu.displayOrder,
        isActive: subMenu.isActive,
        permissions: subMenu.permissions || []
      });
    } else {
      this.subMenuForm.reset({
        name: '',
        foreignName: '',
        displayOrder: this.subMenus.length + 1,
        isActive: true,
        permissions: []
      });
    }

    this.showSubMenuModal = true;
  }

  closeSubMenuModal(): void {
    this.showSubMenuModal = false;
    this.editingSubMenu = null;
    this.currentInputLanguage = 'en';
    this.subMenuForm.reset({
      name: '',
      foreignName: '',
      displayOrder: 1,
      isActive: true,
      permissions: []
    });
  }

  saveSubMenu(): void {
    if (this.subMenuForm.invalid) {
      this.subMenuForm.markAllAsTouched();
      return;
    }

    this.loading.save = true;
    const formValue = this.subMenuForm.getRawValue();

    if (this.editingSubMenu) {
      const updateDto: UpdateTableSubMenuDto = {
        name: formValue.name,
        foreignName: formValue.foreignName || undefined,
        displayOrder: formValue.displayOrder,
        isActive: formValue.isActive,
        permissions: formValue.permissions || []
      };

      const sub = this.tableMenusService.updateSubMenu(this.editingSubMenu.id, updateDto).subscribe({
        next: () => {
          this.handleSubMenuSaveSuccess('Sub menu updated successfully');
        },
        error: (error) => this.handleSaveError(error, 'Failed to update sub menu')
      });
      this.subscriptions.add(sub);
      return;
    }

    const createDto: CreateTableSubMenuDto = {
      name: formValue.name,
      foreignName: formValue.foreignName || undefined,
      menuId: this.menuId,
      displayOrder: formValue.displayOrder,
      isActive: formValue.isActive,
      permissions: formValue.permissions || []
    };

    const sub = this.tableMenusService.createSubMenu(createDto).subscribe({
      next: () => {
        this.handleSubMenuSaveSuccess('Sub menu created successfully');
      },
      error: (error) => this.handleSaveError(error, 'Failed to create sub menu')
    });
    this.subscriptions.add(sub);
  }

  private handleSubMenuSaveSuccess(detail: string): void {
    this.loading.save = false;
    this.closeSubMenuModal();
    this.loadSubMenus();
    this.messageService.add({ severity: 'success', summary: 'Success', detail });
  }

  deleteSubMenu(subMenu: TableSubMenuDto): void {
    this.confirmationService.confirm({
      message: `Delete "${subMenu.name}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loading.delete = true;
        const sub = this.tableMenusService.softDeleteSubMenu(subMenu.id).subscribe({
          next: () => {
            this.loading.delete = false;
            if (this.selectedSubMenuForDocuments?.id === subMenu.id) {
              this.clearDocumentFilter();
            } else {
              this.loadSubMenus();
            }
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Sub menu deleted successfully' });
          },
          error: (error) => {
            this.loading.delete = false;
            this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message || 'Failed to delete sub menu' });
          }
        });
        this.subscriptions.add(sub);
      }
    });
  }

  openMenuDocumentModal(subMenu?: TableSubMenuDto, document?: TableMenuDocumentDto): void {
    this.currentSubMenuForDocument = subMenu || this.selectedSubMenuForDocuments || null;
    this.editingMenuDocument = document || null;

    if (document) {
      this.menuDocumentForm.patchValue({
        documentTypeId: document.documentTypeId,
        subMenuId: document.subMenuId || null,
        displayOrder: document.displayOrder,
        isActive: document.isActive,
        permissions: document.permissions || []
      });
      this.menuDocumentForm.get('documentTypeId')?.disable();
    } else {
      this.menuDocumentForm.get('documentTypeId')?.enable();
      this.menuDocumentForm.reset({
        documentTypeId: null,
        subMenuId: this.currentSubMenuForDocument?.id || null,
        displayOrder: this.documents.length + 1,
        isActive: true,
        permissions: []
      });
    }

    if (this.currentSubMenuForDocument) {
      this.menuDocumentForm.get('subMenuId')?.disable();
    } else {
      this.menuDocumentForm.get('subMenuId')?.enable();
    }

    this.showMenuDocumentModal = true;
  }

  closeMenuDocumentModal(): void {
    this.showMenuDocumentModal = false;
    this.editingMenuDocument = null;
    this.currentSubMenuForDocument = null;
    this.menuDocumentForm.get('documentTypeId')?.enable();
    this.menuDocumentForm.get('subMenuId')?.enable();
    this.menuDocumentForm.reset({
      documentTypeId: null,
      subMenuId: null,
      displayOrder: 1,
      isActive: true,
      permissions: []
    });
  }

  private resetMenuDocumentFormForNextAssignment(formValue: any): void {
    this.editingMenuDocument = null;
    this.menuDocumentForm.get('documentTypeId')?.enable();

    if (this.currentSubMenuForDocument || formValue.subMenuId) {
      this.menuDocumentForm.get('subMenuId')?.disable();
    } else {
      this.menuDocumentForm.get('subMenuId')?.enable();
    }

    this.menuDocumentForm.reset({
      documentTypeId: null,
      subMenuId: formValue.subMenuId || this.currentSubMenuForDocument?.id || null,
      displayOrder: 1,
      isActive: true,
      permissions: []
    });
  }

  saveMenuDocument(): void {
    if (this.menuDocumentForm.invalid) {
      this.menuDocumentForm.markAllAsTouched();
      return;
    }

    this.loading.save = true;
    const formValue = this.menuDocumentForm.getRawValue();

    if (this.editingMenuDocument) {
      const updateDto: UpdateTableMenuDocumentDto = {
        menuId: this.menuId,
        subMenuId: formValue.subMenuId || undefined,
        displayOrder: formValue.displayOrder,
        isActive: formValue.isActive,
        permissions: formValue.permissions || []
      };

      const sub = this.tableMenusService.updateMenuDocument(this.editingMenuDocument.id, updateDto).subscribe({
        next: () => {
          this.loading.save = false;
          this.closeMenuDocumentModal();
          this.loadDocuments();
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Document updated successfully' });
        },
        error: (error) => this.handleSaveError(error, 'Failed to update document assignment')
      });
      this.subscriptions.add(sub);
      return;
    }

    const createDto: CreateTableMenuDocumentDto = {
      documentTypeId: formValue.documentTypeId,
      menuId: this.menuId,
      subMenuId: formValue.subMenuId || undefined,
      displayOrder: formValue.displayOrder,
      isActive: formValue.isActive,
      permissions: formValue.permissions || []
    };

    const sub = this.tableMenusService.createMenuDocument(createDto).subscribe({
      next: () => {
        this.loading.save = false;
        this.loadDocuments();
        this.resetMenuDocumentFormForNextAssignment(formValue);
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Document assigned successfully' });
      },
      error: (error) => this.handleSaveError(error, 'Failed to assign document')
    });
    this.subscriptions.add(sub);
  }

  deleteMenuDocument(document: TableMenuDocumentDto): void {
    this.confirmationService.confirm({
      message: 'Remove this document assignment?',
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loading.delete = true;
        const sub = this.tableMenusService.softDeleteMenuDocument(document.id).subscribe({
          next: () => {
            this.loading.delete = false;
            this.loadDocuments();
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Document removed successfully' });
          },
          error: (error) => {
            this.loading.delete = false;
            this.messageService.add({ severity: 'error', summary: 'Error', detail: error.message || 'Failed to remove document' });
          }
        });
        this.subscriptions.add(sub);
      }
    });
  }

  private handleSaveError(error: Error, fallbackMessage: string): void {
    this.loading.save = false;
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || fallbackMessage
    });
  }

  getDocumentTypeName(documentTypeId: number): string {
    const docType = this.documentTypes.find((item) => item.id === documentTypeId);
    return docType ? (docType.menuCaption || docType.name) : `Document ${documentTypeId}`;
  }

  setInputLanguage(lang: 'en' | 'ar'): void {
    this.currentInputLanguage = lang;
  }

  goBack(): void {
    this.router.navigate(['/table-menus']);
  }
}
