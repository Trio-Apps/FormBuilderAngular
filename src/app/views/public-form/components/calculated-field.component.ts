import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormFieldDto } from '../../FormBuilder/form-builder/models/form-builder-dto.model';
import { TranslationService } from '../../../core/services/translation.service';

@Component({
  selector: 'app-calculated-field',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calculated-field.component.html',
  styleUrls: ['./calculated-field.component.scss']
})
export class CalculatedFieldComponent implements OnInit, OnChanges {
  @Input() field!: FormFieldDto;
  @Input() value: any;

  displayValue: string = '';
  isLoading: boolean = false;

  constructor(public translationService: TranslationService) {}

  ngOnInit(): void {
    this.updateDisplayValue();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      this.updateDisplayValue();
    }
  }

  private updateDisplayValue(): void {
    if (this.value === null || this.value === undefined || this.value === '') {
      this.displayValue = this.getPlaceholder();
      return;
    }

    // Format based on result type
    const resultType = this.field.resultType?.toLowerCase() || 'integer';
    
    if (resultType === 'decimal') {
      const numValue = Number(this.value);
      this.displayValue = isNaN(numValue) ? String(this.value) : numValue.toFixed(2);
    } else if (resultType === 'integer') {
      const numValue = Number(this.value);
      this.displayValue = isNaN(numValue) ? String(this.value) : Math.round(numValue).toString();
    } else {
      // Text type
      this.displayValue = String(this.value);
    }
  }

  getPlaceholder(): string {
    if (this.field.placeholder) {
      return this.field.placeholder;
    }
    if (this.field.foreignPlaceholder && this.translationService.getCurrentLanguage() === 'ar') {
      return this.field.foreignPlaceholder;
    }
    return this.translationService.getCurrentLanguage() === 'ar' 
      ? 'سيتم الحساب تلقائياً' 
      : 'Will be calculated automatically';
  }

  getHintText(): string {
    if (this.field.hintText) {
      return this.field.hintText;
    }
    if (this.field.foreignHintText && this.translationService.getCurrentLanguage() === 'ar') {
      return this.field.foreignHintText;
    }
    return '';
  }
}

