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
  searchTerm = '';
  loading = false;

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
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedProjects = this.filteredProjects.slice(startIndex, endIndex);
  }

  onPageChange(event: any): void {
    this.currentPage = event.page + 1;
    this.itemsPerPage = event.rows;
    this.updatePaginatedProjects();
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
      accept: () => {
        this.loading = true;
        this.projectsService.deleteProject(project.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Project deleted successfully'
            });
            this.loadProjects();
          },
          error: (error) => {
            console.error('[ProjectsList] Error deleting project:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: error.error?.message || 'Failed to delete project'
            });
            this.loading = false;
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

