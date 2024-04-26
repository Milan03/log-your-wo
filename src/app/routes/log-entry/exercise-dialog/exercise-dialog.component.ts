import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Inject } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, UntypedFormControl, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatTable } from '@angular/material/table';
import { Observable, ReplaySubject, Subscription } from 'rxjs';

import { Exercise } from '../../../shared/models/exercise.model';
import { SharedService } from '../../../shared/services/shared.service';
import { TranslatorService } from '../../../core/translator/translator.service';
import { EmailService } from '../../../shared/services/email.service';
import { GoogleAnalyticsService } from '../../../shared/services/google-analytics.service';

import { LogTypes, FormValues } from '../../../shared/common/common.constants';
import { DurationDialogComponent } from '../duration-dialog/duration-dialog.component';
import * as moment from 'moment';

@Component({
    selector: 'exercise-dialog',
    templateUrl: './exercise-dialog.component.html',
    styleUrl: './exercise-dialog.component.scss'
})
export class ExerciseDialogComponent {
    public exerciseLogForm: UntypedFormGroup;
    private currentLanguage: string;
    public currentExercise: Exercise;

    public readonly exerciseNameCharLimit: number = 50;
    public readonly exerciseNumericCharLimit: number = 5;
    public readonly exerciseAlphaNumericCharLimit: number = 15;
    public intensities = FormValues.ExerciseIntensities;

    private langSub: Subscription;
    constructor(
        @Inject(MAT_DIALOG_DATA) public _exerciseType: any,
        private _formBuilder: UntypedFormBuilder,
        public _dialogRef: MatDialogRef<ExerciseDialogComponent>,
        public _durrDialogRef: MatDialog,
        private _sharedService: SharedService,
        private _translatorService: TranslatorService,
        private _googleAnalyticsService: GoogleAnalyticsService
    ) {
        this.exerciseLogForm = this._formBuilder.group({
            'exerciseName': ['', Validators.compose([Validators.required, Validators.maxLength(50)])],
            'sets': ['', Validators.compose([Validators.pattern("^[0-9]*$"), Validators.maxLength(5)])],
            'reps': ['', Validators.compose([Validators.pattern("^[0-9]*$"), Validators.maxLength(5)])],
            'weight': ['', Validators.maxLength(15)],
            'duration': [''],
            'distance': ['', Validators.maxLength(15)],
            'intensity': ['']
        });
        this.currentExercise = new Exercise();
        this.exerciseLogForm.get('exerciseName').setValue('Snatch');
        this.exerciseLogForm.get('weight').setValue('155lbs');
        this.exerciseLogForm.get('sets').setValue(3);
        this.exerciseLogForm.get('reps').setValue(5);
        this.exerciseLogForm.get('distance').setValue('10km');
        //this.exerciseLogForm.get('duration').setValue(moment.duration(60).toISOString());
        this.exerciseLogForm.get('intensity').setValue(3);
        this.exerciseLogForm.get('exerciseName').setValue('Snatch');
        for (let c in this.exerciseLogForm.controls) {
            this.exerciseLogForm.controls[c].markAsTouched();
        }
        this.currentExercise.exerciseType = _exerciseType.exerciseType;
    }

    ngOnInit(): void {
        this.currentExercise.duration = moment.duration({
            hours: 0,
            minutes: 0,
            seconds: 0
          });
        this.currentLanguage = FormValues.ENCode;
        this.subToLanguageChange();
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

    openDurationDialog(): void {
        let dialogRef = this._durrDialogRef.open(DurationDialogComponent);
        this._sharedService.emitCvExercise(this.currentExercise);
        dialogRef.afterClosed().subscribe(result => {
            this.currentExercise = result;
        });
    }

    /**
    * Track exercise intensity set for the particular cardio exercise row.
    * @param intensity - i.e. easy, moderate, hard, maximal
    * @param exercise - exercise to be updated
    */
    public onIntensityChange(intensity: any): void {
        if (intensity) {
            //this.currentCardioExercise = this.current.cardioExercises.find(x => x.exerciseId == exercise.exerciseId);
            this.currentExercise.intensity = +intensity.value;
        }
    }

    /**
    * Track the language currently chosen by the user.
    */
    private subToLanguageChange(): void {
        this.langSub = this._translatorService.languageChangeEmitted$.subscribe(
            data => {
                this.currentLanguage = data;
                if (this.currentLanguage == FormValues.ENCode) {
                    this.intensities = FormValues.ExerciseIntensities;
                } else {
                    this.intensities = FormValues.ExerciseIntensitiesFR;
                }
            }
        );
    }
}
