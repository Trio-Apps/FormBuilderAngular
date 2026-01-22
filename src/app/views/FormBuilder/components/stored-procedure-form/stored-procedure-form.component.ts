import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { StoredProceduresService } from '../../services/stored-procedures.service';
import { StoredProcedure, CreateStoredProcedureDto, UpdateStoredProcedureDto } from '../../form-builder/models/stored-procedure.model';
import { MessageService } from 'primeng/api';

// PrimeNG Modules
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-stored-procedure-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    DialogModule,
    ToastModule,
    CheckboxModule,
    InputNumberModule,
    TooltipModule
  ],
  templateUrl: './stored-procedure-form.component.html',
  styleUrls: ['./stored-procedure-form.component.scss'],
  providers: [MessageService]
})
export class StoredProcedureFormComponent implements OnInit {
  @Input() storedProcedure: StoredProcedure | null = null;
  @Output() close = new EventEmitter<void>();

  spForm!: FormGroup;
  loading = false;
  activeTab: 'basic' | 'code' = 'basic';

  // Available options
  databases: string[] = ['FormBuilder', 'AKHManageIT'];
  usageTypes: string[] = ['Rule', 'Options'];

  constructor(
    private fb: FormBuilder,
    private spService: StoredProceduresService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.initForm();
    
    if (this.storedProcedure) {
      this.loadStoredProcedure();
    }
  }

  initForm(): void {
    this.spForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      databaseName: ['FormBuilder', Validators.required],
      schemaName: ['dbo', Validators.required],
      procedureName: [''],
      procedureCode: ['', Validators.required],
      usageType: ['Rule'],
      isReadOnly: [false],
      executionOrder: [1, [Validators.min(0)]],
      isActive: [true]
    });
  }

  loadStoredProcedure(): void {
    if (!this.storedProcedure) return;

    this.spForm.patchValue({
      title: this.storedProcedure.title || '',
      description: this.storedProcedure.description || '',
      databaseName: this.storedProcedure.databaseName || 'FormBuilder',
      schemaName: this.storedProcedure.schemaName || 'dbo',
      procedureName: this.storedProcedure.procedureName || '',
      procedureCode: this.storedProcedure.procedureCode || '',
      usageType: this.storedProcedure.usageType || 'Rule',
      isReadOnly: this.storedProcedure.isReadOnly || false,
      executionOrder: this.storedProcedure.executionOrder || 1,
      isActive: this.storedProcedure.isActive !== undefined ? this.storedProcedure.isActive : true
    });
  }

  onSubmit(): void {
    if (this.spForm.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Please fill all required fields'
      });
      return;
    }

    this.loading = true;
    const formValue = this.spForm.value;

    if (this.storedProcedure?.id) {
      // Update
      const updateDto: UpdateStoredProcedureDto = {
        title: formValue.title,
        description: formValue.description,
        databaseName: formValue.databaseName,
        schemaName: formValue.schemaName,
        procedureName: formValue.procedureName,
        procedureCode: formValue.procedureCode,
        usageType: formValue.usageType,
        isReadOnly: formValue.isReadOnly,
        executionOrder: formValue.executionOrder,
        isActive: formValue.isActive
      };

      this.spService.update(this.storedProcedure.id, updateDto).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Stored procedure updated successfully'
          });
          this.loading = false;
          this.close.emit();
        },
        error: (error) => {
          console.error('Error updating stored procedure:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error?.error?.message || 'Failed to update stored procedure'
          });
          this.loading = false;
        }
      });
    } else {
      // Create
      const createDto: CreateStoredProcedureDto = {
        title: formValue.title,
        description: formValue.description,
        databaseName: formValue.databaseName,
        schemaName: formValue.schemaName,
        procedureName: formValue.procedureName,
        procedureCode: formValue.procedureCode,
        usageType: formValue.usageType,
        isReadOnly: formValue.isReadOnly,
        executionOrder: formValue.executionOrder
      };

      this.spService.create(createDto).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Stored procedure created successfully'
          });
          this.loading = false;
          this.close.emit();
        },
        error: (error) => {
          console.error('Error creating stored procedure:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error?.error?.message || 'Failed to create stored procedure'
          });
          this.loading = false;
        }
      });
    }
  }

  onCancel(): void {
    this.close.emit();
  }

  formatSQL(): void {
    const code = this.spForm.get('procedureCode')?.value || '';
    if (!code.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'No SQL code to format'
      });
      return;
    }
    
    // Basic SQL formatting (indent)
    const formatted = code
      .split('\n')
      .map((line: string) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('END') || trimmed.startsWith('END;')) {
          return 'END';
        }
        return trimmed;
      })
      .join('\n');
    
    this.spForm.patchValue({ procedureCode: formatted });
    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: 'SQL code formatted'
    });
  }

  validateSQL(): void {
    const code = this.spForm.get('procedureCode')?.value || '';
    if (!code.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Procedure code is required'
      });
      return;
    }

    // Basic validation
    const hasCreate = /CREATE\s+(OR\s+ALTER\s+)?PROCEDURE/i.test(code);
    const hasBegin = /BEGIN/i.test(code);
    const hasEnd = /END/i.test(code);

    if (!hasCreate) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'SQL code must start with CREATE OR ALTER PROCEDURE'
      });
      return;
    }

    if (!hasBegin || !hasEnd) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Warning',
        detail: 'SQL code should have BEGIN and END blocks'
      });
      return;
    }

    this.messageService.add({
      severity: 'success',
      summary: 'Validation Success',
      detail: 'SQL syntax appears valid'
    });
  }

}

