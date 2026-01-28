import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class FormSubmissionService {
  private base = `${environment.apiUrl}/FormSubmissions`;

  constructor(private http: HttpClient) {}

  submit(submissionId: number, submittedByUserId: string): Observable<any> {
    return this.http.post(`${this.base}/submit`, { submissionId, submittedByUserId });
  }

  approve(submissionId: number, stageId: number, actionByUserId: string, comments?: string): Observable<any> {
    return this.http.post(`${this.base}/approve`, { submissionId, stageId, actionByUserId, comments });
  }

  reject(submissionId: number, stageId: number, actionByUserId: string, comments?: string): Observable<any> {
    return this.http.post(`${this.base}/reject`, { submissionId, stageId, actionByUserId, comments });
  }

  getById(id: number): Observable<any> {
    return this.http.get(`${this.base}/${id}`);
  }

  testSmtp(to: string, subject: string, body: string, isHtml = true): Observable<any> {
    return this.http.post(`${environment.apiUrl}/EmailTest/send-simple`, { to, subject, body, isHtml });
  }
}
