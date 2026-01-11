import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import {
  FieldTypeDto,
  CreateFieldTypeDto,
  UpdateFieldTypeDto
} from '../form-builder/models/form-builder-dto.model';

@Injectable({
  providedIn: 'root'
})
export class FieldTypesService {

  // Static Field Types Array
  private staticFieldTypes: FieldTypeDto[] = [
    {
      id: 1,
      typeName: 'Text',
      foreignTypeName: 'نص',
      description: 'Text input field',
      dataType: 'string',
      maxLength: 255,
      hasOptions: false,
      allowMultiple: false,
      isActive: true,
      isDeleted: false
    },
    {
      id: 2,
      typeName: 'Number',
      foreignTypeName: 'رقم',
      description: 'Numeric input field',
      dataType: 'number',
      maxLength: undefined,
      hasOptions: false,
      allowMultiple: false,
      isActive: true,
      isDeleted: false
    },
    {
      id: 3,
      typeName: 'Date',
      foreignTypeName: 'تاريخ',
      description: 'Date picker field',
      dataType: 'date',
      maxLength: undefined,
      hasOptions: false,
      allowMultiple: false,
      isActive: true,
      isDeleted: false
    },
    {
      id: 4,
      typeName: 'Email',
      foreignTypeName: 'بريد إلكتروني',
      description: 'Email input field',
      dataType: 'string',
      maxLength: 255,
      hasOptions: false,
      allowMultiple: false,
      isActive: true,
      isDeleted: false
    },
    {
      id: 5,
      typeName: 'Text Area',
      foreignTypeName: 'نص طويل',
      description: 'Multi-line text input',
      dataType: 'string',
      maxLength: 4000,
      hasOptions: false,
      allowMultiple: false,
      isActive: true,
      isDeleted: false
    },
    {
      id: 6,
      typeName: 'Select',
      foreignTypeName: 'قائمة منسدلة',
      description: 'Dropdown select field',
      dataType: 'string',
      maxLength: undefined,
      hasOptions: true,
      allowMultiple: false,
      isActive: true,
      isDeleted: false
    },
    {
      id: 7,
      typeName: 'Radio',
      foreignTypeName: 'خيارات راديو',
      description: 'Radio button group',
      dataType: 'string',
      maxLength: undefined,
      hasOptions: true,
      allowMultiple: false,
      isActive: true,
      isDeleted: false
    },
    {
      id: 8,
      typeName: 'Checkbox',
      foreignTypeName: 'مربع اختيار',
      description: 'Checkbox field',
      dataType: 'boolean',
      maxLength: undefined,
      hasOptions: false,
      allowMultiple: false,
      isActive: true,
      isDeleted: false
    },
    {
      id: 9,
      typeName: 'Multiple Select',
      foreignTypeName: 'اختيار متعدد',
      description: 'Multi-select dropdown',
      dataType: 'array',
      maxLength: undefined,
      hasOptions: true,
      allowMultiple: true,
      isActive: true,
      isDeleted: false
    },
    {
      id: 10,
      typeName: 'File',
      foreignTypeName: 'ملف',
      description: 'File upload field',
      dataType: 'file',
      maxLength: undefined,
      hasOptions: false,
      allowMultiple: false,
      isActive: true,
      isDeleted: false
    },
    {
      id: 11,
      typeName: 'Multiple Files',
      foreignTypeName: 'ملفات متعددة',
      description: 'Multiple file upload field',
      dataType: 'file',
      maxLength: undefined,
      hasOptions: false,
      allowMultiple: true,
      isActive: true,
      isDeleted: false
    },
    {
      id: 12,
      typeName: 'Grid',
      foreignTypeName: 'جدول',
      description: 'Line items grid/table',
      dataType: 'json',
      maxLength: undefined,
      hasOptions: false,
      allowMultiple: false,
      isActive: true,
      isDeleted: false
    },
    {
      id: 13,
      typeName: 'Boolean',
      foreignTypeName: 'نعم/لا',
      description: 'Boolean/switch field',
      dataType: 'boolean',
      maxLength: undefined,
      hasOptions: false,
      allowMultiple: false,
      isActive: true,
      isDeleted: false
    },
    {
      id: 14,
      typeName: 'Calculated',
      foreignTypeName: 'محسوب',
      description: 'Calculated field with formula',
      dataType: 'number',
      maxLength: undefined,
      hasOptions: false,
      allowMultiple: false,
      isActive: true,
      isDeleted: false
    }
  ];

  constructor() {}

  // ================= FIELD TYPES CRUD ================
  
  // Get all field types (from static array)
  getAllFieldTypes(): Observable<FieldTypeDto[]> {
    return of([...this.staticFieldTypes]);
  }

  // Get active field types only (from static array)
  getActiveFieldTypes(): Observable<FieldTypeDto[]> {
    return of(this.staticFieldTypes.filter(type => type.isActive));
  }

  // Get field type by ID (from static array)
  getFieldTypeById(id: number): Observable<FieldTypeDto | null> {
    const fieldType = this.staticFieldTypes.find(type => type.id === id);
    return of(fieldType || null);
  }

  // Create field type (add to static array)
  createFieldType(dto: CreateFieldTypeDto): Observable<FieldTypeDto> {
    // Validate required fields
    if (!dto.typeName || dto.typeName.trim() === '') {
      return new Observable(observer => {
        observer.error(new Error('Type name is required'));
      });
    }

    // Generate new ID (get max ID + 1)
    const maxId = Math.max(...this.staticFieldTypes.map(t => t.id), 0);
    const newFieldType: FieldTypeDto = {
      id: maxId + 1,
      typeName: dto.typeName,
      foreignTypeName: dto.foreignTypeName,
      description: dto.description,
      dataType: dto.dataType,
      maxLength: dto.maxLength,
      hasOptions: dto.hasOptions,
      allowMultiple: dto.allowMultiple,
      isActive: dto.isActive,
      isDeleted: false
    };

    this.staticFieldTypes.push(newFieldType);
    return of({ ...newFieldType });
  }

  // Update field type (update in static array)
  updateFieldType(id: number, dto: UpdateFieldTypeDto): Observable<FieldTypeDto> {
    const fieldTypeId = Number(id);
    if (isNaN(fieldTypeId) || fieldTypeId <= 0) {
      return new Observable(observer => {
        observer.error(new Error(`Invalid field type ID: ${id}`));
      });
    }

    const index = this.staticFieldTypes.findIndex(t => t.id === fieldTypeId);
    if (index === -1) {
      return new Observable(observer => {
        observer.error(new Error('Field type not found'));
      });
    }

    // Update the field type
    this.staticFieldTypes[index] = {
      ...this.staticFieldTypes[index],
      ...dto,
      id: fieldTypeId // Ensure ID doesn't change
    };

    return of({ ...this.staticFieldTypes[index] });
  }

  // Delete field type (remove from static array)
  deleteFieldType(id: number): Observable<void> {
    const fieldTypeId = Number(id);
    const index = this.staticFieldTypes.findIndex(t => t.id === fieldTypeId);
    
    if (index === -1) {
      return new Observable(observer => {
        observer.error(new Error('Field type not found'));
      });
    }

    this.staticFieldTypes.splice(index, 1);
    return of(void 0);
  }

  // Soft delete field type (update isActive to false)
  softDeleteFieldType(id: number): Observable<FieldTypeDto> {
    return this.updateFieldType(id, { isActive: false });
  }

  // Toggle field type status (update in static array)
  toggleFieldTypeStatus(id: number, isActive: boolean): Observable<FieldTypeDto> {
    const fieldTypeId = Number(id);
    if (isNaN(fieldTypeId) || fieldTypeId <= 0) {
      return new Observable(observer => {
        observer.error(new Error(`Invalid field type ID: ${id}`));
      });
    }

    return this.updateFieldType(fieldTypeId, { isActive });
  }
}
