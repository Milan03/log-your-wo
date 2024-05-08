import { Component, Inject } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Observable, Subscription, map, startWith } from 'rxjs';

import { Exercise } from '../../../shared/models/exercise.model';
import { DurationDialogComponent } from '../duration-dialog/duration-dialog.component';
import { SharedService } from '../../../shared/services/shared.service';
import { TranslatorService } from '../../../core/translator/translator.service';
import { GoogleAnalyticsService } from '../../../shared/services/google-analytics.service';
import { ExerciseDirectoryService } from '../../../shared/services/exercise-directory.service';

import { FormValues } from '../../../shared/common/common.constants';

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
    public exerciseList: string[] = [];
    public cardioExerciseList: string[] = [];
    public filteredExercises: Observable<string[]>;
    public filteredCardioExercises: Observable<string[]>;

    private langSub: Subscription;
    private exerciseSub: Subscription;
    private cardioExerciseSub: Subscription;

    constructor(
        @Inject(MAT_DIALOG_DATA) public _exerciseType: any,
        private _formBuilder: UntypedFormBuilder,
        public _dialogRef: MatDialogRef<ExerciseDialogComponent>,
        public _durrDialogRef: MatDialog,
        private _sharedService: SharedService,
        private _translatorService: TranslatorService,
        private _googleAnalyticsService: GoogleAnalyticsService,
        private _exerciseDirectoryService: ExerciseDirectoryService
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
        this.subToExerciseDirectoryService();
        this.subToCardioExerciseDirectoryService();
    }

    ngOnDestroy(): void {
        if (this.langSub)
            this.langSub.unsubscribe();
        if (this.exerciseSub)
            this.exerciseSub.unsubscribe();
        if (this.cardioExerciseSub)
            this.cardioExerciseSub.unsubscribe();
    }

    submitForm($ev) {
        $ev.preventDefault();
        for (let c in this.exerciseLogForm.controls) {
            this.exerciseLogForm.controls[c].markAsTouched();
        }
        if (this.exerciseLogForm.valid) {
            this.currentExercise.exerciseName = this.exerciseLogForm.get('exerciseName').value;
            this.currentExercise.weight = this.exerciseLogForm.get('weight').value;
            this.currentExercise.sets = this.exerciseLogForm.get('sets').value;
            this.currentExercise.reps = this.exerciseLogForm.get('reps').value;
            this.currentExercise.distance = this.exerciseLogForm.get('distance').value;
            this._dialogRef.close(this.currentExercise);
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
            this.currentExercise.intensity = intensity.value;
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

    private subToExerciseDirectoryService(): void {
        this.exerciseSub = this._exerciseDirectoryService.getExercises().subscribe({
            next: (data) => {
                this.exerciseList = data.exercises.map(exercise => exercise.name);
                this.filteredExercises = this.exerciseLogForm.get('exerciseName').valueChanges.pipe(
                    startWith(''),
                    map(value => this.filterExercises(value))
                );
            },
            error: (error) => {
                console.error('Error fetching exercises:', error);
            }
        });
    } 
    
    private subToCardioExerciseDirectoryService(): void {
        this.cardioExerciseSub = this._exerciseDirectoryService.getCardioExercises().subscribe({
            next: (data) => {
                this.cardioExerciseList = data.exercises.map(exercise => exercise.name);
                this.filteredCardioExercises = this.exerciseLogForm.get('exerciseName').valueChanges.pipe(
                    startWith(''),
                    map(value => this.filterCardioExercises(value))
                );
            },
            error: (error) => {
                console.error('Error fetching exercises:', error);
            }
        });
    } 

    private filterExercises(value: string): string[] {
        const filterValue = value.toLowerCase();
        return this.exerciseList.filter(option => option.toLowerCase().includes(filterValue));
    }

    private filterCardioExercises(value: string): string[] {
        const filterValue = value.toLowerCase();
        return this.cardioExerciseList.filter(option => option.toLowerCase().includes(filterValue));
    }
}
