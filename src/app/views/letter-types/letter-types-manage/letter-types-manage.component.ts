import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { TableShellComponent } from '../../../shared/table-shell/table-shell.component';
import { LetterTypesService, LetterTypeDto, PublicHolidayDto } from '../../FormBuilder/services/letter-types.service';
import { DocumentTypesService } from '../../FormBuilder/services/document-types.service';
import { DocumentType } from '../../FormBuilder/form-builder/models/document-types.model';

@Component({
  selector: 'app-letter-types-manage',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastModule, TableModule, TableShellComponent],
  templateUrl: './letter-types-manage.component.html',
  styleUrls: ['./letter-types-manage.component.scss'],
  providers: [MessageService]
})
export class LetterTypesManageComponent implements OnInit {
  documentTypes: DocumentType[] = [];
  selectedDocumentTypeId: number | null = null;

  letterTypes: LetterTypeDto[] = [];
  loading = false;

  holidays: PublicHolidayDto[] = [];
  loadingHolidays = false;
  newHolidayDate = '';
  newHolidayName = '';

  // modal
  showModal = false;
  editing: LetterTypeDto | null = null;
  form: Partial<LetterTypeDto> = this.blankForm();

  constructor(
    private letterTypesService: LetterTypesService,
    private docTypesService: DocumentTypesService,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.docTypesService.getActiveDocumentTypes().subscribe({
      next: (types) => {
        this.documentTypes = types || [];
        if (this.documentTypes.length && !this.selectedDocumentTypeId) {
          this.selectedDocumentTypeId = this.documentTypes[0].id;
          this.loadLetterTypes();
        }
        this.cdr.detectChanges();
      }
    });
    this.loadHolidays();
  }

  private blankForm(): Partial<LetterTypeDto> {
    return { name: '', code: '', escalationOrder: 1, deadlineDays: 0, requiresSignature: false, isActive: true };
  }

  onDocTypeChange(): void {
    this.loadLetterTypes();
  }

  loadLetterTypes(): void {
    if (!this.selectedDocumentTypeId) { this.letterTypes = []; return; }
    this.loading = true;
    this.letterTypesService.list(this.selectedDocumentTypeId).subscribe({
      next: (rows) => { this.letterTypes = rows || []; this.loading = false; this.cdr.detectChanges(); },
      error: () => { this.letterTypes = []; this.loading = false; this.cdr.detectChanges(); }
    });
  }

  openCreate(): void {
    if (!this.selectedDocumentTypeId) {
      this.messageService.add({ severity: 'warn', summary: 'Select document type', detail: 'Choose a document type first.' });
      return;
    }
    this.editing = null;
    this.form = this.blankForm();
    this.form.escalationOrder = (this.letterTypes.length ? Math.max(...this.letterTypes.map(l => l.escalationOrder)) : 0) + 1;
    this.showModal = true;
  }

  openEdit(row: LetterTypeDto): void {
    this.editing = row;
    this.form = { ...row };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editing = null;
  }

  save(): void {
    if (!this.form.name || !this.form.name.trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Name required', detail: 'Enter a letter type name.' });
      return;
    }
    if (this.editing) {
      this.letterTypesService.update(this.editing.id, this.form).subscribe({
        next: () => { this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'Letter type updated.' }); this.showModal = false; this.loadLetterTypes(); },
        error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update.' })
      });
    } else {
      const dto = { ...this.form, documentTypeId: this.selectedDocumentTypeId! };
      this.letterTypesService.create(dto).subscribe({
        next: () => { this.messageService.add({ severity: 'success', summary: 'Created', detail: 'Letter type created.' }); this.showModal = false; this.loadLetterTypes(); },
        error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to create.' })
      });
    }
  }

  remove(row: LetterTypeDto): void {
    this.letterTypesService.delete(row.id).subscribe({
      next: () => { this.messageService.add({ severity: 'success', summary: 'Deleted', detail: row.name }); this.loadLetterTypes(); },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete.' })
    });
  }

  // ---- Holidays ----
  loadHolidays(): void {
    this.loadingHolidays = true;
    this.letterTypesService.listHolidays().subscribe({
      next: (rows) => { this.holidays = rows || []; this.loadingHolidays = false; this.cdr.detectChanges(); },
      error: () => { this.holidays = []; this.loadingHolidays = false; this.cdr.detectChanges(); }
    });
  }

  addHoliday(): void {
    if (!this.newHolidayDate || !this.newHolidayName.trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Missing data', detail: 'Enter a date and a name.' });
      return;
    }
    this.letterTypesService.createHoliday({ holidayDate: this.newHolidayDate, name: this.newHolidayName.trim() }).subscribe({
      next: () => { this.messageService.add({ severity: 'success', summary: 'Added', detail: 'Holiday added.' }); this.newHolidayDate = ''; this.newHolidayName = ''; this.loadHolidays(); },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to add holiday.' })
    });
  }

  removeHoliday(h: PublicHolidayDto): void {
    this.letterTypesService.deleteHoliday(h.id).subscribe({
      next: () => { this.messageService.add({ severity: 'success', summary: 'Deleted', detail: h.name }); this.loadHolidays(); },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete holiday.' })
    });
  }
}
