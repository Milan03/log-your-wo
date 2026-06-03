import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';

import { EmailDialogComponent } from './email-dialog.component';
import { SharedModule } from '../../../shared/shared.module';

describe('EmailDialogComponent', () => {
  let component: EmailDialogComponent;
  let fixture: ComponentFixture<EmailDialogComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        SharedModule,
        TranslateModule.forRoot()
      ],
      declarations: [ EmailDialogComponent ],
      providers: [
        {
          provide: MatDialogRef,
          useValue: {
            close: () => {}
          }
        }
      ]
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
