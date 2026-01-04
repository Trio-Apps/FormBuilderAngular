import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { MultiSelectModule } from 'primeng/multiselect';
import { CheckboxModule } from 'primeng/checkbox';
import { FormFieldDto } from '../../form-builder/models/form-builder-dto.model';

export interface FieldSelectorConfig {
  operationType: 'arithmetic' | 'math' | 'statistical';
  operationName: string;
  minFields?: number;
  maxFields?: number;
  allowMultiple?: boolean;
}

@Component({
  selector: 'app-field-selector-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    MultiSelectModule,
    CheckboxModule
  ],
  template: `
    <p-dialog
      [(visible)]="visible"
      [header]="config?.operationName || 'Select Fields'"
      [modal]="true"
      [style]="{ width: '600px' }"
      [draggable]="false"
      [resizable]="false"
      (onHide)="onCancel()">
      
      <div class="field-selector-content">
        <div class="info-message" *ngIf="config">
          <p>
            <strong>{{ config.operationName }}</strong>
            <span *ngIf="config.minFields"> - Select at least {{ config.minFields }} field(s)</span>
            <span *ngIf="config.maxFields"> - Maximum {{ config.maxFields }} field(s)</span>
          </p>
        </div>

        <div class="fields-list">
          <p-multiSelect
            *ngIf="config?.allowMultiple !== false"
            [options]="availableFields"
            [(ngModel)]="selectedFields"
            [display]="'chip'"
            [filter]="true"
            [placeholder]="'Select fields...'"
            [maxSelectedLabels]="3"
            [selectedItemsLabel]="'{0} fields selected'"
            optionLabel="displayName"
            optionValue="fieldCode"
            [style]="{ width: '100%' }">
            <ng-template let-field pTemplate="selectedItem">
              <span class="field-code">[{{ field.fieldCode }}]</span>
            </ng-template>
            <ng-template let-field pTemplate="item">
              <div class="field-item">
                <span class="field-code">[{{ field.fieldCode }}]</span>
                <span class="field-name">{{ field.fieldName }}</span>
                <span class="field-type" *ngIf="field.fieldTypeName">({{ field.fieldTypeName }})</span>
              </div>
            </ng-template>
          </p-multiSelect>

          <div *ngIf="config?.allowMultiple === false" class="single-select">
            <select [(ngModel)]="selectedSingleField" class="form-select" style="width: 100%; padding: 8px;">
              <option [value]="null">Select a field...</option>
              <option *ngFor="let field of availableFields" [value]="field.fieldCode">
                [{{ field.fieldCode }}] {{ field.fieldName }} ({{ field.fieldTypeName || 'Unknown' }})
              </option>
            </select>
          </div>
        </div>

        <div class="selected-preview" *ngIf="getSelectedFieldsDisplay().length > 0">
          <h4>Selected Fields:</h4>
          <div class="selected-chips">
            <span *ngFor="let fieldCode of getSelectedFieldsDisplay()" class="chip">
              [{{ fieldCode }}]
            </span>
          </div>
        </div>
      </div>

      <ng-template pTemplate="footer">
        <button 
          pButton 
          label="Cancel" 
          icon="pi pi-times" 
          class="p-button-secondary" 
          (click)="onCancel()">
        </button>
        <button 
          pButton 
          label="Apply" 
          icon="pi pi-check" 
          class="p-button-primary" 
          (click)="onApply()"
          [disabled]="!isValidSelection()">
        </button>
      </ng-template>
    </p-dialog>
  `,
  styles: [`
    .field-selector-content {
      padding: 1rem 0;
    }

    .info-message {
      background-color: #e7f3ff;
      border: 1px solid #b3d9ff;
      border-radius: 4px;
      padding: 12px;
      margin-bottom: 20px;
    }

    .info-message p {
      margin: 0;
      color: #0066cc;
    }

    .fields-list {
      margin-bottom: 20px;
    }

    .field-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 0;
    }

    .field-code {
      font-weight: bold;
      color: #007bff;
      font-family: monospace;
    }

    .field-name {
      flex: 1;
    }

    .field-type {
      color: #6c757d;
      font-size: 0.9em;
    }

    .selected-preview {
      margin-top: 20px;
      padding: 12px;
      background-color: #f8f9fa;
      border-radius: 4px;
    }

    .selected-preview h4 {
      margin: 0 0 10px 0;
      font-size: 14px;
      color: #495057;
    }

    .selected-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .chip {
      background-color: #007bff;
      color: white;
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 500;
      font-family: monospace;
    }

    .single-select {
      margin-bottom: 10px;
    }

    .form-select {
      border: 1px solid #ced4da;
      border-radius: 4px;
    }
  `]
})
export class FieldSelectorDialogComponent implements OnInit {
  @Input() visible: boolean = false;
  @Input() availableFields: FormFieldDto[] = [];
  @Input() config: FieldSelectorConfig | null = null;
  @Output() fieldsSelected = new EventEmitter<string[]>();
  @Output() cancelled = new EventEmitter<void>();

  selectedFields: string[] = [];
  selectedSingleField: string | null = null;

  ngOnInit() {
    // Initialize selected fields
    this.selectedFields = [];
    this.selectedSingleField = null;
  }

  getSelectedFieldsDisplay(): string[] {
    if (this.config?.allowMultiple === false) {
      return this.selectedSingleField ? [this.selectedSingleField] : [];
    }
    return this.selectedFields || [];
  }

  isValidSelection(): boolean {
    const selected = this.getSelectedFieldsDisplay();
    
    if (!this.config) {
      return selected.length > 0;
    }

    if (this.config.minFields && selected.length < this.config.minFields) {
      return false;
    }

    if (this.config.maxFields && selected.length > this.config.maxFields) {
      return false;
    }

    return selected.length > 0;
  }

  onApply() {
    const selected = this.getSelectedFieldsDisplay();
    if (this.isValidSelection()) {
      this.fieldsSelected.emit(selected);
      this.reset();
    }
  }

  onCancel() {
    this.cancelled.emit();
    this.reset();
  }

  reset() {
    this.selectedFields = [];
    this.selectedSingleField = null;
  }
}

