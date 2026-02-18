import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormSubmissionDto, FormSubmissionsService } from '../../form-submissions/services/form-submissions.service';
import { SapIntegrationExecuteResultDto, SapIntegrationService } from '../../FormBuilder/services/sap-integration.service';

@Component({
  selector: 'app-submissions-list',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './submissions-list.component.html',
  styleUrl: './submissions-list.component.scss'
})
export class SubmissionsListComponent implements OnInit {
  submissions: FormSubmissionDto[] = [];
  loading = false;
  executingBySubmission: Record<number, boolean> = {};
  executionResultsBySubmission: Record<number, SapIntegrationExecuteResultDto> = {};

  constructor(
    private formSubmissionsService: FormSubmissionsService,
    private sapIntegrationService: SapIntegrationService
  ) {}

  ngOnInit(): void {
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
}

