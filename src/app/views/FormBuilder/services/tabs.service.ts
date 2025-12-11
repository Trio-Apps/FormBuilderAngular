import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
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
    return this.http.get<FormTabDto[]>(`${this.baseUrl}/form/${formId}`).pipe(
      catchError(() => {
        return this.http.get<FormTabDto[]>(`${this.baseUrl}?formId=${formId}`).pipe(
          catchError(() => of([]))
        );
      })
    );
  }

  getTabById(tabId: number): Observable<FormTabDto> {
    return this.http.get<FormTabDto>(`${this.baseUrl}/${tabId}`);
  }

  createTab(dto: CreateFormTabDto): Observable<FormTabDto> {
    return this.http.post<FormTabDto>(this.baseUrl, dto);
  }

  updateTab(tabId: number, dto: UpdateFormTabDto): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${tabId}`, dto);
  }

  deleteTab(tabId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${tabId}`);
  }
}
