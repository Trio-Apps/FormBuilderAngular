import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslationService } from '../../../core/services/translation.service';
import { ButtonModule } from 'primeng/button';

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
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    // Get submissionId, formCode, and documentNumber from query params
    this.submissionId = this.route.snapshot.queryParams['submissionId'] 
      ? +this.route.snapshot.queryParams['submissionId'] 
      : null;
    this.formCode = this.route.snapshot.queryParams['formCode'] || null;
    this.documentNumber = this.route.snapshot.queryParams['documentNumber'] || null;
  }

  goBack(): void {
    // Go back to form view if formCode is available
    if (this.formCode) {
      this.router.navigate(['/forms/view', this.formCode]);
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

