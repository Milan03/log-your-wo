import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { DurationDialogComponent } from './duration-dialog.component';

describe('DurationDialogComponent', () => {
  let component: DurationDialogComponent;
  let fixture: ComponentFixture<DurationDialogComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ DurationDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DurationDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
