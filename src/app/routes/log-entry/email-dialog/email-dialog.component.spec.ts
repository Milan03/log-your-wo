import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';

import { EmailDialogComponent, EmailDialogData } from './email-dialog.component';

describe('EmailDialogComponent', () => {
  let component: EmailDialogComponent;
  let fixture: ComponentFixture<EmailDialogComponent>;
  let dialogData: EmailDialogData | null;

  beforeEach(waitForAsync(() => {
    dialogData = null;
    TestBed.configureTestingModule({
      imports: [
        EmailDialogComponent,
        TranslateModule.forRoot()
      ],
      providers: [
        {
          provide: MatDialogRef,
          useValue: {
            close: () => {}
          }
        },
        {
          provide: MAT_DIALOG_DATA,
          useFactory: () => dialogData
        }
      ]
    })
    .compileComponents();
  }));

  afterEach(() => {
    fixture?.destroy();
  });

  function createComponent(data: EmailDialogData | null = null): void {
    dialogData = data;
    fixture = TestBed.createComponent(EmailDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create', () => {
    createComponent();

    expect(component).toBeTruthy();
  });

  it('associates the email label and reports invalid state after validation', () => {
    createComponent();
    component.emailForm.get('emailAddress').markAsTouched();
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('#email-address') as HTMLInputElement;
    const label = fixture.nativeElement.querySelector('label[for="email-address"]');

    expect(label).not.toBeNull();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('email-address-errors');
  });

  it('prefills the email address from dialog data', () => {
    createComponent({ initialEmail: 'athlete@example.com' });

    expect(component.emailForm.get('emailAddress').value).toBe('athlete@example.com');
  });
});
