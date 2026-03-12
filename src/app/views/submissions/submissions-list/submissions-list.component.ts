import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { CrystalLayoutByDocumentTypeDto, CrystalReportsService } from '../../FormBuilder/services/crystal-reports.service';
import { SapIntegrationExecuteResultDto, SapIntegrationService } from '../../FormBuilder/services/sap-integration.service';
import { FormSubmissionDto, FormSubmissionsService } from '../../form-submissions/services/form-submissions.service';
import { TableShellComponent } from '../../../shared/table-shell/table-shell.component';

@Component({
  selector: 'app-submissions-list',
  standalone: true,
  imports: [CommonModule, DatePipe, TableShellComponent],
  templateUrl: './submissions-list.component.html',
  styleUrl: './submissions-list.component.scss'
})
export class SubmissionsListComponent implements OnInit {
  private readonly unavailableLayoutsStorageKey = 'submissions_unavailable_crystal_layout_doc_types';
  submissions: FormSubmissionDto[] = [];
  loading = false;
  pageError = '';
  searchTerm = '';
  statusFilter = 'all';
  currentPage = 1;
  pageSize = 10;
  readonly pageSizeOptions = [10, 20, 50];
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

  get totalSubmissions(): number {
    return this.submissions.length;
  }

  get filteredSubmissions(): FormSubmissionDto[] {
    const search = this.searchTerm.trim().toLowerCase();
    const status = this.statusFilter.trim().toLowerCase();

    return this.submissions.filter((submission) => {
      const submissionStatus = (submission.status || '').trim().toLowerCase();
      const matchesStatus = status === 'all' || submissionStatus === status;

      if (!matchesStatus) {
        return false;
      }

      if (!search) {
        return true;
      }

      const haystack = [
        submission.documentNumber,
        submission.formName,
        submission.documentTypeName,
        submission.submittedByUserName,
        submission.submittedByUserId,
        submission.status,
        submission.id?.toString()
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(search);
    });
  }

  get pagedSubmissions(): FormSubmissionDto[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredSubmissions.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredSubmissions.length / this.pageSize));
  }

  get pageStart(): number {
    if (!this.filteredSubmissions.length) {
      return 0;
    }

    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get pageEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredSubmissions.length);
  }

  get sapReadyCount(): number {
    return this.submissions.filter((submission) => submission.sapIntegrationEnabled).length;
  }

  get sapDisabledCount(): number {
    return this.submissions.filter((submission) => !submission.sapIntegrationEnabled).length;
  }

  loadSubmissions(): void {
    this.loading = true;
    this.pageError = '';

    this.formSubmissionsService.getAllSubmissions().subscribe({
      next: (list) => {
        this.submissions = (list || []).sort((a, b) => {
          const aTime = new Date((a.lastUpdatedDate || a.createdDate || a.submittedDate) as any).getTime() || 0;
          const bTime = new Date((b.lastUpdatedDate || b.createdDate || b.submittedDate) as any).getTime() || 0;
          return bTime - aTime;
        });

        this.currentPage = 1;
        this.prefetchAvailableLayouts();
        this.loading = false;
      },
      error: () => {
        this.submissions = [];
        this.pageError = 'Unable to load submissions right now.';
        this.loading = false;
      }
    });
  }

  executeSap(submission: FormSubmissionDto): void {
    const submissionId = Number(submission?.id || 0);
    if (!submissionId || this.executingBySubmission[submissionId] || !this.canExecuteSap(submission)) {
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
          formId: submission.formBuilderId || 0,
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

  canExecuteSap(submission: FormSubmissionDto): boolean {
    return !!submission?.sapIntegrationEnabled;
  }

  getSapButtonText(submission: FormSubmissionDto): string {
    const submissionId = Number(submission?.id || 0);

    if (this.executingBySubmission[submissionId]) {
      return 'Executing...';
    }

    return this.canExecuteSap(submission) ? 'Execute SAP' : 'SAP Disabled';
  }

  getSapButtonTitle(submission: FormSubmissionDto): string {
    if (this.canExecuteSap(submission)) {
      return 'Run the configured SAP integration for this submission.';
    }

    return 'SAP integration is not enabled for this submission.';
  }

  getStatusClass(status: string | null | undefined): string {
    const normalized = (status || '').trim().toLowerCase();

    if (normalized === 'approved') {
      return 'status-chip--approved';
    }

    if (normalized === 'rejected') {
      return 'status-chip--rejected';
    }

    if (normalized === 'draft') {
      return 'status-chip--draft';
    }

    return 'status-chip--submitted';
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
      return 'Unavailable';
    }

    return this.canDownloadReport(submission) ? 'Download' : 'No Report';
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

        if (normalizedMessage.includes('no active crystal layout')) {
          this.defaultLayoutByDocumentType[documentTypeId] = null;
          this.unavailableLayoutDocumentTypeIds.add(documentTypeId);
          this.persistUnavailableLayoutDocTypes();
        }
      }
    });
  }

  trackBySubmissionId(_: number, submission: FormSubmissionDto): number {
    return submission.id;
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
    this.currentPage = 1;
  }

  onStatusFilterChange(value: string): void {
    this.statusFilter = value;
    this.currentPage = 1;
  }

  onPageSizeChange(value: string): void {
    const nextSize = Number(value);
    if (!Number.isFinite(nextSize) || nextSize <= 0) {
      return;
    }

    this.pageSize = nextSize;
    this.currentPage = 1;
  }

  goToPage(page: number): void {
    const nextPage = Math.min(Math.max(page, 1), this.totalPages);
    this.currentPage = nextPage;
  }

  getVisiblePages(): number[] {
    const total = this.totalPages;
    const current = this.currentPage;
    const pages = new Set<number>([1, total, current - 1, current, current + 1]);

    return Array.from(pages)
      .filter((page) => page >= 1 && page <= total)
      .sort((a, b) => a - b);
  }

  private prefetchAvailableLayouts(): void {
    const nextMap: Record<number, CrystalLayoutByDocumentTypeDto | null> = {};
    const documentTypeIds = Array.from(
      new Set(
        (this.submissions || [])
          .map((submission) => Number(submission?.documentTypeId || 0))
          .filter((documentTypeId) => documentTypeId > 0 && !this.unavailableLayoutDocumentTypeIds.has(documentTypeId))
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
          .map((value: unknown) => Number(value))
          .filter((value: number) => Number.isFinite(value) && value > 0)
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
