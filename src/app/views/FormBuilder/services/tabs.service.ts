import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  FormTabDto,
  CreateFormTabDto,
  UpdateFormTabDto
} from '../form-builder/models/form-builder-dto.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TabsService {

  private baseUrl = `${environment.apiUrl}/FormTabs`;

  constructor(private http: HttpClient) {}

  getTabs(formId: number): Observable<FormTabDto[]> {
    if (!formId || isNaN(formId)) {
      return of([]);
    }

    // استخدام المسار الصحيح: /api/FormTabs/form/{formId}
    // أو /api/FormTabs/by-form/{formId} حسب ما هو متوفر في الباك إند
    return this.http.get<any>(`${this.baseUrl}/form/${formId}`).pipe(
      map((response: any) => {
        // في حالة أن الـ API ترجع كائن مغلف (ServiceResult أو مشابه)
        if (response && typeof response === 'object' && !Array.isArray(response)) {
          const data = response.data || response.items || response.result || [];
          return Array.isArray(data) ? data : [];
        }
        // في حالة أن الـ API ترجع مباشرة مصفوفة من FormTabDto
        return Array.isArray(response) ? response : [];
      }),
      catchError((error) => {
        console.warn(`Failed to get tabs for form ${formId}, trying alternative endpoint:`, error);
        // محاولة المسار البديل /by-form/{formId}
        return this.http.get<any>(`${this.baseUrl}/by-form/${formId}`).pipe(
          map((response: any) => {
            if (response && typeof response === 'object' && !Array.isArray(response)) {
              const data = response.data || response.items || response.result || [];
              return Array.isArray(data) ? data : [];
            }
            return Array.isArray(response) ? response : [];
          }),
          catchError(() => {
            console.error(`Failed to get tabs for form ${formId} from all endpoints`);
            return of([]);
          })
        );
      })
    );
  }

  getTabById(tabId: number): Observable<FormTabDto> {
    return this.http.get<any>(`${this.baseUrl}/${tabId}`).pipe(
      map((response: any) => {
        // إذا كان response مغلف في object يحتوي على data
        if (response && typeof response === 'object' && !response.id) {
          return response.data || response.result || response;
        }
        // إذا كان response مباشرة FormTabDto
        return response;
      }),
      catchError(() => of(null as any))
    );
  }

  createTab(dto: CreateFormTabDto): Observable<FormTabDto> {
    return this.http.post<any>(this.baseUrl, dto).pipe(
      map((response: any) => {
        // إذا كان response مغلف في object يحتوي على data
        if (response && typeof response === 'object' && !response.id) {
          return response.data || response.result || response;
        }
        // إذا كان response مباشرة FormTabDto
        return response;
      }),
      catchError((error) => {
        console.error('Error creating tab:', error);
        throw error;
      })
    );
  }

  updateTab(tabId: number, dto: UpdateFormTabDto): Observable<FormTabDto> {
    return this.http.put<any>(`${this.baseUrl}/${tabId}`, dto).pipe(
      map((response: any) => {
        // إذا كان response مغلف في object يحتوي على data
        if (response && typeof response === 'object' && !response.id) {
          return response.data || response.result || response;
        }
        // إذا كان response مباشرة FormTabDto أو void
        return response;
      }),
      catchError((error) => {
        console.error('Error updating tab:', error);
        throw error;
      })
    );
  }

  deleteTab(tabId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${tabId}`);
  }
}
