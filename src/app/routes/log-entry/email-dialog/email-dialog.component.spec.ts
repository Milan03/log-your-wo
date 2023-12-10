import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { EmailDialogComponent } from './email-dialog.component';

describe('EmailDialogComponent', () => {
  let component: EmailDialogComponent;
  let fixture: ComponentFixture<EmailDialogComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ EmailDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EmailDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
