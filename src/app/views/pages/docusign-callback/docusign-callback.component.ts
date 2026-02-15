import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DocuSignOAuthService } from '../../../auth/docusign-oauth.service';
import { FormSubmissionsService } from '../../form-submissions/services/form-submissions.service';

@Component({
  selector: 'app-docusign-callback',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './docusign-callback.component.html',
  styleUrls: ['./docusign-callback.component.scss']
})
export class DocuSignCallbackComponent implements OnInit {
  loading = true;
  success = false;
  message = 'Processing DocuSign login...';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly docusignOAuthService: DocuSignOAuthService,
    private readonly formSubmissionsService: FormSubmissionsService
  ) {}

  ngOnInit(): void {
    const code = this.route.snapshot.queryParamMap.get('code');
    const state = this.route.snapshot.queryParamMap.get('state') ?? undefined;
    const error = this.route.snapshot.queryParamMap.get('error');

    if (error) {
      this.loading = false;
      this.success = false;
      this.message = `DocuSign returned error: ${error}`;
      return;
    }

    if (!code) {
      this.loading = false;
      this.success = false;
      this.message = 'Missing authorization code from DocuSign callback.';
      return;
    }

    this.docusignOAuthService.exchangeCode(code, state).subscribe({
      next: (res) => {
        this.loading = false;
        if (!res?.ok || !res?.token?.accessToken) {
          this.success = false;
          this.message = res?.error || 'DocuSign token exchange failed.';
          return;
        }

        localStorage.setItem('docusign_access_token', res.token.accessToken);
        if (res.token.refreshToken) {
          localStorage.setItem('docusign_refresh_token', res.token.refreshToken);
        }
        if (res.account?.accountId) {
          localStorage.setItem('docusign_account_id', res.account.accountId);
        }
        if (res.account?.baseUri) {
          localStorage.setItem('docusign_base_uri', res.account.baseUri);
        }

        const storedReturnPath = this.docusignOAuthService.getStoredReturnPath();
        const returnPath = storedReturnPath && storedReturnPath.startsWith('/')
          ? storedReturnPath
          : '/my-submissions';
        const pendingSubmissionId = this.docusignOAuthService.getPendingSubmissionId();

        this.success = true;
        this.message = 'DocuSign connected successfully. Preparing signing page...';

        if (pendingSubmissionId) {
          this.formSubmissionsService.getSubmissionSigningUrlById(pendingSubmissionId).subscribe({
            next: (signingResponse) => {
              const signingUrl = signingResponse?.signingUrl || null;
              this.docusignOAuthService.clearPendingSubmission();
              this.docusignOAuthService.clearStoredReturnPath();

              if (signingUrl) {
                window.location.href = signingUrl;
                return;
              }

              this.message = 'Signing URL is not available. Redirecting back...';
              setTimeout(() => {
                this.router.navigateByUrl(returnPath);
              }, 1200);
            },
            error: () => {
              this.docusignOAuthService.clearPendingSubmission();
              this.docusignOAuthService.clearStoredReturnPath();
              this.message = 'Could not open signing page directly. Redirecting back...';
              setTimeout(() => {
                this.router.navigateByUrl(returnPath);
              }, 1200);
            }
          });
          return;
        }

        this.docusignOAuthService.clearStoredReturnPath();
        setTimeout(() => {
          this.router.navigateByUrl(returnPath);
        }, 1200);
      },
      error: (err) => {
        this.loading = false;
        this.success = false;
        this.message = err?.error?.error || err?.message || 'DocuSign callback request failed.';
      }
    });
  }
}
