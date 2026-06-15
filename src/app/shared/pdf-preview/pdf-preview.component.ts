import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CrystalReportsService } from '../../views/FormBuilder/services/crystal-reports.service';

/**
 * Reusable inline PDF preview modal.
 * Renders a Crystal layout for a given object (submission) inside an iframe,
 * with a Download button — instead of forcing an immediate download.
 *
 * Usage:
 *   <app-pdf-preview *ngIf="show" [layoutId]="id" [objectId]="subId" [fileName]="'Report'" (closed)="show=false">
 */
@Component({
  selector: 'app-pdf-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pdf-preview.component.html',
  styleUrls: ['./pdf-preview.component.scss']
})
export class PdfPreviewComponent implements OnChanges, OnDestroy {
  /** Crystal layout id. 0/undefined => resolve default server-side via getLayoutPdf with idLayout=0 is not allowed, so caller must pass a real id. */
  @Input() layoutId = 0;
  /** Submission / object id to render. When > 0 the preview loads. */
  @Input() objectId = 0;
  @Input() fileName = 'Report';
  @Input() title = 'Document Preview';
  @Output() closed = new EventEmitter<void>();

  loading = false;
  error = '';
  safeUrl: SafeResourceUrl | null = null;
  private objectUrl: string | null = null;

  constructor(
    private crystal: CrystalReportsService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['objectId'] || changes['layoutId']) && this.objectId > 0 && this.layoutId > 0) {
      this.load();
    }
  }

  private load(): void {
    this.revoke();
    this.error = '';
    this.safeUrl = null;
    this.loading = true;
    this.crystal.getLayoutPdf(this.layoutId, this.objectId, this.fileName).subscribe({
      next: (resp) => {
        const body = resp.body;
        if (!body) {
          this.error = 'Empty response from layout service.';
          this.loading = false;
          this.cdr.detectChanges();
          return;
        }
        this.objectUrl = URL.createObjectURL(body);
        this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.objectUrl);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err?.error?.detail || err?.message || 'Failed to render the layout. The Crystal bridge service may be offline.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  download(): void {
    if (!this.objectUrl) return;
    const a = document.createElement('a');
    a.href = this.objectUrl;
    a.download = `${this.fileName || 'Report'}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  close(): void {
    this.revoke();
    this.closed.emit();
  }

  private revoke(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
    this.safeUrl = null;
  }

  ngOnDestroy(): void {
    this.revoke();
  }
}
