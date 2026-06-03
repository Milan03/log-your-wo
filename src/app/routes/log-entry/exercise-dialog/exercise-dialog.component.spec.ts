import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientModule } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TRANSLATE_HTTP_LOADER_CONFIG, TranslateHttpLoader } from '@ngx-translate/http-loader';

import { ExerciseDialogComponent } from './exercise-dialog.component';
import { SharedModule } from '../../../shared/shared.module';
import { TranslatorService } from '../../../core/translator/translator.service';

describe('ExerciseDialogComponent', () => {
  let component: ExerciseDialogComponent;
  let fixture: ComponentFixture<ExerciseDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientModule,
        NoopAnimationsModule,
        SharedModule,
        TranslateModule.forRoot({
          loader: {
            provide: TranslateLoader,
            useClass: TranslateHttpLoader
          }
        })
      ],
      declarations: [ExerciseDialogComponent],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            exerciseType: 'strength',
            measure: 'lbs'
          }
        },
        {
          provide: MatDialogRef,
          useValue: {
            close: () => {}
          }
        },
        {
          provide: TRANSLATE_HTTP_LOADER_CONFIG,
          useValue: {}
        },
        TranslatorService
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ExerciseDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
