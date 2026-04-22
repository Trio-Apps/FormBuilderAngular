import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslationService } from '../../../core/services/translation.service';
import { ButtonModule } from 'primeng/button';
import { FormSubmissionsService } from '../../form-submissions/services/form-submissions.service';
import { StorageService } from '../../../auth/storage.service';

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
    private formSubmissionsService: FormSubmissionsService,
    private storageService: StorageService
  ) {}

  ngOnInit(): void {
    // Get submissionId, formCode, and documentNumber from query params
    this.submissionId = this.route.snapshot.queryParams['submissionId'] 
      ? +this.route.snapshot.queryParams['submissionId'] 
      : null;
    this.formCode = this.route.snapshot.queryParams['formCode'] || null;
    this.documentNumber = this.route.snapshot.queryParams['documentNumber'] || null;

    // Refresh from backend only when query params do not already provide a document number.
    if (this.submissionId && this.submissionId > 0 && !this.documentNumber && this.storageService.hasToken()) {
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
      const isAuthenticatedPreview = this.router.url.includes('/form-preview/submission/success');

      // Preserve original context if present.
      const passthroughParams = ['documentTypeId', 'projectId', 'seriesId', 'userId', 'lang'];
      for (const key of passthroughParams) {
        const value = this.route.snapshot.queryParams[key];
        if (value !== undefined && value !== null && value !== '') {
          queryParams[key] = value;
        }
      }

      this.router.navigate(
        [isAuthenticatedPreview ? '/form-preview' : '/forms/view', this.formCode],
        { queryParams }
      );
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
