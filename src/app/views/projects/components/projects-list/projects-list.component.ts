import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProjectsService } from '../../services/projects.service';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ProjectDto, CreateProjectDto, UpdateProjectDto } from '../../models/project-dto.model';
import { Subscription } from 'rxjs';

// PrimeNG Modules
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { PaginatorModule } from 'primeng/paginator';
import { CheckboxModule } from 'primeng/checkbox';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { TranslationService } from '../../../../core/services/translation.service';

@Component({
  selector: 'app-projects-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    TableModule,
    InputTextModule,
    DialogModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule,
    PaginatorModule,
    CheckboxModule,
    TranslatePipe
  ],

  templateUrl: './projects-list.component.html',
  styleUrls: ['./projects-list.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class ProjectsListComponent implements OnInit, OnDestroy {
  projects: ProjectDto[] = [];
  filteredProjects: ProjectDto[] = [];
  deletedProjects: ProjectDto[] = [];
  searchTerm = '';
  loading = false;
  loadingDeleted = false;
  showDeletedProjects = false; // Toggle to show/hide deleted projects

  // Project Modal
  showProjectModal = false;
  projectForm: FormGroup;
  editingProject: ProjectDto | null = null;

  // Pagination
  paginatedProjects: ProjectDto[] = [];
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;
  totalPages = 0;

  constructor(
    private projectsService: ProjectsService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    public translationService: TranslationService
  ) {
    this.projectForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
      code: ['', [Validators.required, Validators.pattern('^[A-Za-z0-9_]+$'), Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      isActive: [true]
    });
  }

  ngOnInit(): void {
    this.loadProjects();
    this.loadDeletedProjects();
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  loadProjects(): void {
    this.loading = true;
    this.projectsService.getProjects(this.currentPage, this.itemsPerPage).subscribe({
      next: (result) => {
        this.projects = result.items || [];
        this.totalItems = result.totalCount || 0;
        this.totalPages = result.totalPages || 0;
        this.filteredProjects = [...this.projects];
        this.updatePaginatedProjects();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('[ProjectsList] Error loading projects:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load projects'
        });
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Load deleted projects from API
   */
  loadDeletedProjects(): void {
    this.loadingDeleted = true;
    this.projectsService.getDeletedProjects(1, 100).subscribe({
      next: (result) => {
        this.deletedProjects = result.items || [];
        console.log('[ProjectsList] Loaded deleted projects:', this.deletedProjects.length);
        this.loadingDeleted = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('[ProjectsList] Error loading deleted projects:', error);
        this.deletedProjects = [];
        this.loadingDeleted = false;
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Toggle showing deleted projects
   */
  toggleDeletedProjects(): void {
    this.showDeletedProjects = !this.showDeletedProjects;
    if (this.showDeletedProjects) {
      this.loadDeletedProjects();
    }
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredProjects = [...this.projects];
    } else {
      const term = this.searchTerm.toLowerCase().trim();
      this.filteredProjects = this.projects.filter(project =>
        project.name.toLowerCase().includes(term) ||
        project.code.toLowerCase().includes(term) ||
        (project.description && project.description.toLowerCase().includes(term))
      );
    }
    this.currentPage = 1;
    this.updatePaginatedProjects();
  }

  updatePaginatedProjects(): void {
    this.totalPages = Math.ceil(this.filteredProjects.length / this.itemsPerPage);
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedProjects = this.filteredProjects.slice(startIndex, endIndex);
  }

  onPageChange(event: any): void {
    if (event && typeof event.first === 'number') {
      this.currentPage = Math.floor(event.first / this.itemsPerPage) + 1;
      if (event.rows) {
        this.itemsPerPage = event.rows;
      }
    } else {
      this.currentPage = event.page + 1;
      this.itemsPerPage = event.rows;
    }
    this.updatePaginatedProjects();
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;

    let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  openProjectModal(project?: ProjectDto): void {
    this.editingProject = project || null;
    if (project) {
      this.projectForm.patchValue({
        name: project.name,
        code: project.code,
        description: project.description || '',
        isActive: project.isActive
      });
    } else {
      this.projectForm.reset({
        name: '',
        code: '',
        description: '',
        isActive: true
      });
    }
    this.showProjectModal = true;
  }

  closeProjectModal(): void {
    this.showProjectModal = false;
    this.editingProject = null;
    this.projectForm.reset({
      name: '',
      code: '',
      description: '',
      isActive: true
    });
  }

  saveProject(): void {
    if (this.projectForm.invalid) {
      this.markFormGroupTouched(this.projectForm);
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please fill in all required fields correctly'
      });
      return;
    }

    const formValue = this.projectForm.value;

    // Check if code exists (for new projects or when code changes)
    if (!this.editingProject || formValue.code !== this.editingProject.code) {
      this.projectsService.codeExists(formValue.code, this.editingProject?.id).subscribe({
        next: (exists) => {
          if (exists) {
            this.messageService.add({
              severity: 'error',
              summary: 'Validation Error',
              detail: `Project code '${formValue.code}' already exists`
            });
            return;
          }
          this.performSave(formValue);
        },
        error: () => {
          // If check fails, still try to save (server will validate)
          this.performSave(formValue);
        }
      });
    } else {
      this.performSave(formValue);
    }
  }

  private performSave(formValue: any): void {
    this.loading = true;

    if (this.editingProject) {
      // Update existing project
      const updateDto: UpdateProjectDto = {
        name: formValue.name,
        code: formValue.code,
        description: formValue.description,
        isActive: formValue.isActive
      };

      this.projectsService.updateProject(this.editingProject.id, updateDto).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Project updated successfully'
          });
          this.closeProjectModal();
          this.loadProjects();
        },
        error: (error) => {
          console.error('[ProjectsList] Error updating project:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.error?.message || 'Failed to update project'
          });
          this.loading = false;
        }
      });
    } else {
      // Create new project
      const createDto: CreateProjectDto = {
        name: formValue.name,
        code: formValue.code,
        description: formValue.description,
        isActive: formValue.isActive !== false
      };

      this.projectsService.createProject(createDto).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Project created successfully'
          });
          this.closeProjectModal();
          this.loadProjects();
        },
        error: (error) => {
          console.error('[ProjectsList] Error creating project:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.error?.message || 'Failed to create project'
          });
          this.loading = false;
        }
      });
    }
  }

  deleteProject(project: ProjectDto): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete project "${project.name}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        console.log('[ProjectsList] User confirmed deletion for project:', project.id);
        this.loading = true;
        this.projectsService.softDelete(project.id).subscribe({
          next: () => {
            console.log('[ProjectsList] Soft delete API response received');

            // Remove from active projects list
            this.projects = this.projects.filter(p => p.id !== project.id);
            this.filteredProjects = this.filteredProjects.filter(p => p.id !== project.id);
            this.paginatedProjects = this.paginatedProjects.filter(p => p.id !== project.id);
            this.totalItems = Math.max(0, this.totalItems - 1);

            // Reload deleted projects to show the newly deleted project
            this.loadDeletedProjects();

            this.loading = false;

            // Force change detection to update UI immediately
            this.cdr.detectChanges();

            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Project deleted successfully',
              life: 5000
            });
          },
          error: (error) => {
            this.loading = false;
            console.error('[ProjectsList] Error deleting project:', error);

            let errorMessage = 'Failed to delete project';
            if (error?.error?.message) {
              errorMessage = error.error.message;
            } else if (error?.message) {
              errorMessage = error.message;
            }

            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: errorMessage
            });
          }
        });
      }
    });
  }

  /**
   * Restore a soft-deleted project
   */
  restoreProject(project: ProjectDto): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to restore "${project.name}"?`,
      header: 'Confirm Restore',
      icon: 'pi pi-refresh',
      acceptButtonStyleClass: 'p-button-success',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        console.log('[ProjectsList] User confirmed restoration for project:', project.id);
        this.loading = true;
        this.projectsService.restore(project.id).subscribe({
          next: (restoredProject) => {
            console.log('[ProjectsList] Project restored successfully:', restoredProject);

            // Remove from deleted projects list
            this.deletedProjects = this.deletedProjects.filter(p => p.id !== project.id);

            // Add to active projects list
            this.projects.push(restoredProject);
            this.filteredProjects = [...this.projects];
            this.updatePaginatedProjects();
            this.totalItems = this.totalItems + 1;

            this.loading = false;

            // Force change detection to update UI immediately
            this.cdr.detectChanges();

            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Project restored successfully',
              life: 5000
            });
          },
          error: (error: any) => {
            this.loading = false;
            console.error('[ProjectsList] Error restoring project:', error);

            let errorMessage = 'Failed to restore project';
            if (error?.error?.message) {
              errorMessage = error.error.message;
            } else if (error?.message) {
              errorMessage = error.message;
            }

            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: errorMessage
            });
          }
        });
      }
    });
  }

  toggleActive(project: ProjectDto): void {
    const newActiveStatus = !project.isActive;
    const updateDto: UpdateProjectDto = {
      isActive: newActiveStatus
    };

    this.projectsService.updateProject(project.id, updateDto).subscribe({
      next: () => {
        // Update the project in all arrays
        project.isActive = newActiveStatus;
        
        // Update in projects array
        const projectIndex = this.projects.findIndex(p => p.id === project.id);
        if (projectIndex !== -1) {
          this.projects[projectIndex].isActive = newActiveStatus;
        }
        
        // Update in filteredProjects array
        const filteredIndex = this.filteredProjects.findIndex(p => p.id === project.id);
        if (filteredIndex !== -1) {
          this.filteredProjects[filteredIndex].isActive = newActiveStatus;
        }
        
        // Update in paginatedProjects array
        const paginatedIndex = this.paginatedProjects.findIndex(p => p.id === project.id);
        if (paginatedIndex !== -1) {
          this.paginatedProjects[paginatedIndex].isActive = newActiveStatus;
        }
        
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `Project ${newActiveStatus ? 'activated' : 'deactivated'} successfully`
        });
        
        // Force change detection
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('[ProjectsList] Error toggling project status:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.error?.message || 'Failed to update project status'
        });
      }
    });
  }

  getActiveProjectsCount(): number {
    return this.projects.filter(p => p.isActive).length;
  }

  getDeletedProjectsCount(): number {
    return this.deletedProjects.length;
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
}

