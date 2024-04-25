import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, UntypedFormControl, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatTable } from '@angular/material/table';
import { Observable, ReplaySubject, Subscription } from 'rxjs';

import { Exercise } from '../../../shared/models/exercise.model';
import { SharedService } from '../../../shared/services/shared.service';
import { TranslatorService } from '../../../core/translator/translator.service';
import { EmailService } from '../../../shared/services/email.service';
import { GoogleAnalyticsService } from '../../../shared/services/google-analytics.service';

import { LogTypes, FormValues } from '../../../shared/common/common.constants';

@Component({
  selector: 'exercise-dialog',
  templateUrl: './exercise-dialog.component.html',
  styleUrl: './exercise-dialog.component.scss'
})
export class ExerciseDialogComponent {
    public exerciseLogForm: UntypedFormGroup;
    private currentLanguage: string;

    public readonly exerciseNameCharLimit: number = 50;
    public readonly exerciseNumericCharLimit: number = 5;
    public readonly exerciseAlphaNumericCharLimit: number = 15;
    
    private langSub: Subscription;
    constructor(
        private _formBuilder: UntypedFormBuilder,
        public _dialogRef: MatDialogRef<ExerciseDialogComponent>,
        private _sharedService: SharedService,
        private _translatorService: TranslatorService,
        private _googleAnalyticsService: GoogleAnalyticsService
    ) {
        this.exerciseLogForm = this._formBuilder.group({
            'exerciseName': ['', Validators.compose([Validators.required, Validators.maxLength(50)])],
            'sets': ['', Validators.compose([Validators.pattern("^[0-9]*$"), Validators.maxLength(5)])],
            'reps': ['', Validators.compose([Validators.pattern("^[0-9]*$"), Validators.maxLength(5)])],
            'weight': ['', Validators.compose([Validators.maxLength(15)])]
        });
    }

    ngOnInit(): void {
        this.currentLanguage = FormValues.ENCode;
    }

    ngOnDestroy(): void {
        if (this.langSub)
            this.langSub.unsubscribe();
    }

    submitForm($ev) {
        $ev.preventDefault();
        for (let c in this.exerciseLogForm.controls) {
            this.exerciseLogForm.controls[c].markAsTouched();
        }
        if (this.exerciseLogForm.valid) {
            this._dialogRef.close(this.exerciseLogForm.value);
        }
    }

    onCancel() {
        this._dialogRef.close();
    }
}
