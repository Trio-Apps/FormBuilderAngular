import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { FieldsListComponent } from './fields-list.component';

describe('FieldsListComponent', () => {
  let component: FieldsListComponent;
  let fixture: ComponentFixture<FieldsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FieldsListComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FieldsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
