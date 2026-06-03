import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';

import { DurationDialogComponent } from './duration-dialog.component';
import { SharedModule } from '../../../shared/shared.module';
import { Exercise } from '../../../shared/models/exercise.model';

describe('DurationDialogComponent', () => {
  let component: DurationDialogComponent;
  let fixture: ComponentFixture<DurationDialogComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        SharedModule,
        TranslateModule.forRoot()
      ],
      declarations: [ DurationDialogComponent ],
      providers: [
        {
          provide: MatDialogRef,
          useValue: {
            close: () => {}
          }
        },
        {
          provide: MAT_DIALOG_DATA,
          useValue: new Exercise()
        }
      ]
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
