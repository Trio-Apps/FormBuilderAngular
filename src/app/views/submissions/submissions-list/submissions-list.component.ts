import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormSubmissionDto, FormSubmissionsService } from '../../form-submissions/services/form-submissions.service';
import { CrystalLayoutByDocumentTypeDto, CrystalReportsService } from '../../FormBuilder/services/crystal-reports.service';
import { SapIntegrationExecuteResultDto, SapIntegrationService } from '../../FormBuilder/services/sap-integration.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-submissions-list',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './submissions-list.component.html',
  styleUrl: './submissions-list.component.scss'
})
export class SubmissionsListComponent implements OnInit {
  private readonly unavailableLayoutsStorageKey = 'submissions_unavailable_crystal_layout_doc_types';
  submissions: FormSubmissionDto[] = [];
  loading = false;
  executingBySubmission: Record<number, boolean> = {};
  executionResultsBySubmission: Record<number, SapIntegrationExecuteResultDto> = {};
  downloadingPdfBySubmission: Record<number, boolean> = {};
  pdfErrorBySubmission: Record<number, string> = {};
  defaultLayoutByDocumentType: Record<number, CrystalLayoutByDocumentTypeDto | null> = {};
  unavailableLayoutDocumentTypeIds = new Set<number>();
  isCrystalBridgeAvailable = true;

  constructor(
    private formSubmissionsService: FormSubmissionsService,
    private sapIntegrationService: SapIntegrationService,
    private crystalReportsService: CrystalReportsService
  ) {}

  ngOnInit(): void {
    this.loadUnavailableLayoutDocTypesFromStorage();
    this.loadSubmissions();
  }

  loadSubmissions(): void {
    this.loading = true;
    this.formSubmissionsService.getAllSubmissions().subscribe({
      next: (list) => {
        this.submissions = (list || []).sort((a, b) => {
          const aTime = new Date((a.lastUpdatedDate || a.createdDate || a.submittedDate) as any).getTime() || 0;
          const bTime = new Date((b.lastUpdatedDate || b.createdDate || b.submittedDate) as any).getTime() || 0;
          return bTime - aTime;
        });
        this.prefetchAvailableLayouts();
        this.loading = false;
      },
      error: () => {
        this.submissions = [];
        this.loading = false;
      }
    });
  }

  executeSap(submissionId: number): void {
    if (!submissionId || this.executingBySubmission[submissionId]) {
      return;
    }

    this.executingBySubmission[submissionId] = true;
    this.sapIntegrationService.execute(submissionId, 'OnSubmit').subscribe({
      next: (result) => {
        this.executionResultsBySubmission[submissionId] = result;
        this.executingBySubmission[submissionId] = false;
      },
      error: () => {
        this.executionResultsBySubmission[submissionId] = {
          success: false,
          formId: 0,
          submissionId,
          sapConfigId: 0,
          endpoint: '',
          eventType: 'OnSubmit',
          status: 'Failed',
          errorMessage: 'Failed to execute SAP integration request.',
          shouldBlockWorkflow: false
        };
        this.executingBySubmission[submissionId] = false;
      }
    });
  }

  canShowPdfButton(submission: FormSubmissionDto): boolean {
    if (!this.isCrystalBridgeAvailable) {
      return false;
    }

    const documentTypeId = Number(submission?.documentTypeId || 0);
    if (!documentTypeId) {
      return false;
    }

    if (this.unavailableLayoutDocumentTypeIds.has(documentTypeId)) {
      return false;
    }

    const layout = this.defaultLayoutByDocumentType[documentTypeId];
    return !!layout;
  }

  canDownloadReport(submission: FormSubmissionDto): boolean {
    return this.canShowPdfButton(submission);
  }

  getReportButtonText(submission: FormSubmissionDto): string {
    const submissionId = submission?.id || 0;
    if (this.downloadingPdfBySubmission[submissionId]) {
      return 'Downloading...';
    }

    if (!this.isCrystalBridgeAvailable) {
      return 'Report Unavailable';
    }

    return this.canDownloadReport(submission) ? 'Report' : 'No Report';
  }

  getReportButtonTitle(submission: FormSubmissionDto): string {
    if (!this.isCrystalBridgeAvailable) {
      return 'Report service is unavailable.';
    }

    return this.canDownloadReport(submission)
      ? 'Download report'
      : 'No active report layout for this document type';
  }

  downloadPdf(submission: FormSubmissionDto): void {
    const submissionId = submission?.id || 0;
    const documentTypeId = Number(submission?.documentTypeId || 0);
    const defaultLayout = this.defaultLayoutByDocumentType[documentTypeId];

    if (!submissionId || !documentTypeId || !defaultLayout || this.downloadingPdfBySubmission[submissionId]) {
      return;
    }

    this.pdfErrorBySubmission[submissionId] = '';
    this.downloadingPdfBySubmission[submissionId] = true;

    const fallbackFileName = (submission.documentNumber || `Submission_${submissionId}`)
      .replace(/[^\w\-]+/g, '_');

    this.crystalReportsService.getLayoutPdf(defaultLayout.id, submissionId, fallbackFileName).pipe(
      finalize(() => {
        this.downloadingPdfBySubmission[submissionId] = false;
      })
    ).subscribe({
      next: (response) => {
        const blob = response.body;
        if (!blob) {
          this.pdfErrorBySubmission[submissionId] = 'Empty report content.';
          return;
        }

        const fileName = this.resolveFileName(response.headers.get('content-disposition'))
          || `${fallbackFileName}.pdf`;

        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = fileName;
        anchor.click();
        URL.revokeObjectURL(url);
      },
      error: async (error) => {
        const resolved = await this.resolveReportErrorMessage(error);
        const message = typeof resolved === 'string' && resolved.trim()
          ? resolved.trim()
          : 'Failed to download report.';
        this.pdfErrorBySubmission[submissionId] = message;

        const normalizedMessage = message.toLowerCase();
        if (normalizedMessage.includes('unable to reach crystal bridge')
          || normalizedMessage.includes('connection refused')
          || normalizedMessage.includes('connection reset')
          || normalizedMessage.includes('no connection could be made')) {
          this.isCrystalBridgeAvailable = false;
          this.pdfErrorBySubmission[submissionId] = 'Report service is currently unavailable.';
        }

        if (String(message).toLowerCase().includes('no active crystal layout')) {
          this.defaultLayoutByDocumentType[documentTypeId] = null;
          this.unavailableLayoutDocumentTypeIds.add(documentTypeId);
          this.persistUnavailableLayoutDocTypes();
        }
      }
    });
  }

  private prefetchAvailableLayouts(): void {
    const nextMap: Record<number, CrystalLayoutByDocumentTypeDto | null> = {};
    const documentTypeIds = Array.from(
      new Set(
        (this.submissions || [])
          .map(x => Number(x?.documentTypeId || 0))
          .filter(x => x > 0 && !this.unavailableLayoutDocumentTypeIds.has(x))
      )
    );

    if (!documentTypeIds.length) {
      this.defaultLayoutByDocumentType = nextMap;
      return;
    }

    this.crystalReportsService.getDefaultLayouts(documentTypeIds).subscribe({
      next: (layouts) => {
        for (const id of documentTypeIds) {
          nextMap[id] = null;
        }

        for (const layout of layouts || []) {
          const docTypeId = Number(layout.documentTypeId);
          nextMap[docTypeId] = layout;
          this.unavailableLayoutDocumentTypeIds.delete(docTypeId);
        }

        for (const id of documentTypeIds) {
          if (!nextMap[id]) {
            this.unavailableLayoutDocumentTypeIds.add(id);
          }
        }
        this.persistUnavailableLayoutDocTypes();

        this.defaultLayoutByDocumentType = nextMap;
      },
      error: () => {
        // If layouts check fails, keep all as unavailable to avoid repeated failing calls.
        for (const id of documentTypeIds) {
          nextMap[id] = null;
          this.unavailableLayoutDocumentTypeIds.add(id);
        }
        this.persistUnavailableLayoutDocTypes();
        this.defaultLayoutByDocumentType = nextMap;
      }
    });
  }

  private resolveFileName(contentDisposition: string | null): string | null {
    if (!contentDisposition) {
      return null;
    }

    const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
    if (utf8Match?.[1]) {
      return decodeURIComponent(utf8Match[1]);
    }

    const asciiMatch = /filename=\"?([^\";]+)\"?/i.exec(contentDisposition);
    return asciiMatch?.[1] ?? null;
  }

  private async resolveReportErrorMessage(error: any): Promise<string> {
    const fallbackMessage = 'Failed to download report.';
    const payload = error?.error;

    if (payload instanceof Blob) {
      try {
        const text = (await payload.text())?.trim();
        if (!text) {
          return fallbackMessage;
        }

        try {
          const json = JSON.parse(text);
          return json?.detail || json?.message || text;
        } catch {
          return text;
        }
      } catch {
        return fallbackMessage;
      }
    }

    if (typeof payload === 'string' && payload.trim()) {
      return payload.trim();
    }

    if (payload?.detail) {
      return payload.detail;
    }

    if (payload?.message) {
      return payload.message;
    }

    if (typeof error?.message === 'string' && error.message.trim()) {
      return error.message.trim();
    }

    return fallbackMessage;
  }

  private loadUnavailableLayoutDocTypesFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.unavailableLayoutsStorageKey);
      if (!stored) {
        return;
      }

      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) {
        return;
      }

      this.unavailableLayoutDocumentTypeIds = new Set(
        parsed
          .map((x: unknown) => Number(x))
          .filter((x: number) => Number.isFinite(x) && x > 0)
      );
    } catch {
      this.unavailableLayoutDocumentTypeIds = new Set<number>();
    }
  }

  private persistUnavailableLayoutDocTypes(): void {
    try {
      const values = Array.from(this.unavailableLayoutDocumentTypeIds.values()).sort((a, b) => a - b);
      localStorage.setItem(this.unavailableLayoutsStorageKey, JSON.stringify(values));
    } catch {
      // Ignore storage access issues.
    }
  }
}
