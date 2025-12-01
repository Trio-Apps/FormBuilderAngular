import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TabEditComponent } from './tab-edit.component';

describe('TabEditComponent', () => {
  let component: TabEditComponent;
  let fixture: ComponentFixture<TabEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TabEditComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TabEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
