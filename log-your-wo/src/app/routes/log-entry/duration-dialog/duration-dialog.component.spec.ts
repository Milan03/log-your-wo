import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DurationDialogComponent } from './duration-dialog.component';

describe('DurationDialogComponent', () => {
  let component: DurationDialogComponent;
  let fixture: ComponentFixture<DurationDialogComponent>;

  beforeEach(async(() => {
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
