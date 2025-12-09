import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FieldCreateComponent } from './field-create.component';

describe('FieldCreateComponent', () => {
  let component: FieldCreateComponent;
  let fixture: ComponentFixture<FieldCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FieldCreateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FieldCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
