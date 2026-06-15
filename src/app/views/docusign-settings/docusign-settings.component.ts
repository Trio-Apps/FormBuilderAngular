import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { TableShellComponent } from '../../shared/table-shell/table-shell.component';
import { DocuSignSettingsService, DocuSignSettingsDto } from '../FormBuilder/services/docusign-settings.service';

@Component({
  selector: 'app-docusign-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ToastModule, TableShellComponent],
  templateUrl: './docusign-settings.component.html',
  styleUrls: ['./docusign-settings.component.scss'],
  providers: [MessageService]
})
export class DocuSignSettingsComponent implements OnInit {
  loading = false;
  saving = false;
  form: DocuSignSettingsDto = {};
  hasPrivateKey = false;
  newPrivateKey = '';
  revealing = false;

  constructor(
    private service: DocuSignSettingsService,
    private cdr: ChangeDetectorRef,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.service.get().subscribe({
      next: (s) => {
        this.form = s || {};
        this.hasPrivateKey = !!s?.hasPrivateKey;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  reveal(): void {
    if (!this.hasPrivateKey || this.revealing) { return; }
    this.revealing = true;
    this.service.revealPrivateKey().subscribe({
      next: (pem) => {
        this.revealing = false;
        this.newPrivateKey = pem || '';
        if (!pem) {
          this.messageService.add({ severity: 'info', summary: 'No key', detail: 'No private key is stored.' });
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.revealing = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load the stored key.' });
        this.cdr.detectChanges();
      }
    });
  }

  save(): void {
    this.saving = true;
    const dto = {
      ...this.form,
      // Only send a new key when the admin typed one; otherwise keep the stored key.
      privateKeyPem: this.newPrivateKey?.trim() ? this.newPrivateKey.trim() : null
    };
    this.service.save(dto).subscribe({
      next: (res) => {
        this.saving = false;
        this.hasPrivateKey = !!res?.hasPrivateKey;
        this.newPrivateKey = '';
        this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'DocuSign settings saved.' });
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.saving = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.error?.message || 'Failed to save settings.' });
        this.cdr.detectChanges();
      }
    });
  }
}
