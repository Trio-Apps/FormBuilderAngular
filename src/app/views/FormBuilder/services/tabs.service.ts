import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  FormTabDto,
  CreateFormTabDto,
  UpdateFormTabDto
} from '../form-builder/models/form-builder-dto.model';

@Injectable({
  providedIn: 'root'
})
export class TabsService {

  private baseUrl = 'https://localhost:7276/api/FormTabs';

  constructor(private http: HttpClient) {}

  getTabs(formId: number): Observable<FormTabDto[]> {
    if (!formId || isNaN(formId)) {
      return of([]);
    }

    // نحاول المسار الذي يستخدم formId كـ query parameter أولاً
    return this.http.get<any>(`${this.baseUrl}?formId=${formId}`).pipe(
      map((response: any) => {
        // في حالة أن الـ API ترجع كائن مغلف (ServiceResult أو مشابه)
        if (response && typeof response === 'object' && !Array.isArray(response)) {
          const data = response.data || response.items || response.result || [];
          return Array.isArray(data) ? data : [];
        }
        // في حالة أن الـ API ترجع مباشرة مصفوفة من FormTabDto
        return Array.isArray(response) ? response : [];
      }),
      catchError(() => {
        // إذا فشل، نجرب المسار البديل /form/{formId}
        return this.http.get<any>(`${this.baseUrl}/form/${formId}`).pipe(
          map((response: any) => {
            if (response && typeof response === 'object' && !Array.isArray(response)) {
              const data = response.data || response.items || response.result || [];
              return Array.isArray(data) ? data : [];
            }
            return Array.isArray(response) ? response : [];
          }),
          catchError(() => of([]))
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
