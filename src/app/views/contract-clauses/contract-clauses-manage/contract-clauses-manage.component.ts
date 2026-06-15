import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { TableShellComponent } from '../../../shared/table-shell/table-shell.component';
import { ContractClausesService, ContractClauseDto } from '../../FormBuilder/services/contract-clauses.service';
import { DocumentTypesService } from '../../FormBuilder/services/document-types.service';
import { DocumentType } from '../../FormBuilder/form-builder/models/document-types.model';

@Component({
  selector: 'app-contract-clauses-manage',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastModule, TableModule, TableShellComponent],
  templateUrl: './contract-clauses-manage.component.html',
  styleUrls: ['./contract-clauses-manage.component.scss'],
  providers: [MessageService]
})
export class ContractClausesManageComponent implements OnInit {
  documentTypes: DocumentType[] = [];
  filterDocTypeId: number | null = null;

  clauses: ContractClauseDto[] = [];
  loading = false;

  showModal = false;
  editing: ContractClauseDto | null = null;
  form: Partial<ContractClauseDto> = this.blank();

  constructor(
    private clausesService: ContractClausesService,
    private docTypesService: DocumentTypesService,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.docTypesService.getActiveDocumentTypes().subscribe({
      next: (t) => { this.documentTypes = t || []; this.cdr.detectChanges(); }
    });
    this.load();
  }

  private blank(): Partial<ContractClauseDto> {
    return { clauseCode: '', title: '', body: '', sortOrder: 0, isActive: true, documentTypeId: null, projectId: null };
  }

  docTypeName(id?: number | null): string {
    if (!id) return 'All types';
    const d = this.documentTypes.find(x => x.id === id);
    return d ? d.name : ('#' + id);
  }

  load(): void {
    this.loading = true;
    this.clausesService.list(this.filterDocTypeId || undefined).subscribe({
      next: (rows) => { this.clauses = rows || []; this.loading = false; this.cdr.detectChanges(); },
      error: () => { this.clauses = []; this.loading = false; this.cdr.detectChanges(); }
    });
  }

  openCreate(): void {
    this.editing = null;
    this.form = this.blank();
    if (this.filterDocTypeId) this.form.documentTypeId = this.filterDocTypeId;
    this.showModal = true;
  }

  openEdit(row: ContractClauseDto): void {
    this.editing = row;
    this.form = { ...row };
    this.showModal = true;
  }

  closeModal(): void { this.showModal = false; this.editing = null; }

  save(): void {
    if (!this.form.clauseCode?.trim() || !this.form.title?.trim()) {
      this.messageService.add({ severity: 'warn', summary: 'Required', detail: 'Clause code and title are required.' });
      return;
    }
    const done = (msg: string) => { this.messageService.add({ severity: 'success', summary: 'Saved', detail: msg }); this.showModal = false; this.load(); };
    const fail = () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Operation failed.' });
    if (this.editing) {
      this.clausesService.update(this.editing.id, this.form).subscribe({ next: () => done('Clause updated.'), error: fail });
    } else {
      this.clausesService.create(this.form).subscribe({ next: () => done('Clause created.'), error: fail });
    }
  }

  remove(row: ContractClauseDto): void {
    this.clausesService.delete(row.id).subscribe({
      next: () => { this.messageService.add({ severity: 'success', summary: 'Deleted', detail: row.title }); this.load(); },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete.' })
    });
  }

  propagate(row: ContractClauseDto): void {
    this.clausesService.propagate(row.id).subscribe({
      next: (res) => this.messageService.add({ severity: 'success', summary: 'Propagated', detail: `Updated ${res?.updated ?? 0} attached document(s) to v${row.version}.` }),
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to propagate.' })
    });
  }
}
