import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslationService } from '../../../core/services/translation.service';
import { ButtonModule } from 'primeng/button';
import { FormSubmissionsService } from '../../form-submissions/services/form-submissions.service';

@Component({
  selector: 'app-form-submission-success',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  templateUrl: './form-submission-success.component.html',
  styleUrls: ['./form-submission-success.component.scss']
})
export class FormSubmissionSuccessComponent implements OnInit {
  submissionId: number | null = null;
  formCode: string | null = null;
  documentNumber: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public translationService: TranslationService,
    private formSubmissionsService: FormSubmissionsService
  ) {}

  ngOnInit(): void {
    // Get submissionId, formCode, and documentNumber from query params
    this.submissionId = this.route.snapshot.queryParams['submissionId'] 
      ? +this.route.snapshot.queryParams['submissionId'] 
      : null;
    this.formCode = this.route.snapshot.queryParams['formCode'] || null;
    this.documentNumber = this.route.snapshot.queryParams['documentNumber'] || null;

    // Always refresh document number from backend if submissionId is available.
    // This avoids showing stale value from query params in race conditions.
    if (this.submissionId && this.submissionId > 0) {
      this.formSubmissionsService.getSubmissionById(this.submissionId).subscribe({
        next: (submission) => {
          if (submission?.documentNumber) {
            this.documentNumber = submission.documentNumber;
          }
        },
        error: () => {
          // Keep existing value from query params as fallback.
        }
      });
    }
  }

  goBack(): void {
    // Go back to form view if formCode is available
    if (this.formCode) {
      const queryParams: any = {};

      if (this.submissionId) {
        queryParams.submissionId = this.submissionId;
      }
      if (this.documentNumber) {
        queryParams.documentNumber = this.documentNumber;
      }

      // Preserve original context if present.
      const passthroughParams = ['documentTypeId', 'projectId', 'seriesId', 'userId', 'lang'];
      for (const key of passthroughParams) {
        const value = this.route.snapshot.queryParams[key];
        if (value !== undefined && value !== null && value !== '') {
          queryParams[key] = value;
        }
      }

      this.router.navigate(['/forms/view', this.formCode], { queryParams });
    } else {
      // Otherwise go to home
      this.router.navigate(['/']);
    }
  }

  goToSubmissions(): void {
    // Navigate to submissions list if submissionId is available
    if (this.submissionId) {
      // Try to get documentTypeId from query params or use default
      const documentTypeId = this.route.snapshot.queryParams['documentTypeId'] 
        ? +this.route.snapshot.queryParams['documentTypeId'] 
        : null;
      
      if (documentTypeId) {
        this.router.navigate(['/document-types', documentTypeId, 'submissions']);
      } else {
        this.router.navigate(['/document-types']);
      }
    } else {
      this.router.navigate(['/document-types']);
    }
  }
}
