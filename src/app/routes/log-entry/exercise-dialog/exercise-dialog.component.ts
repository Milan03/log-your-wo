import { Component, ElementRef, Inject, ViewChild } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { Observable, Subscription, map, startWith } from 'rxjs';

import { Exercise } from '../../../shared/models/exercise.model';
import { ExerciseDialogData } from 'src/app/shared/interfaces/exercise-dialog-data';
import { SharedService } from '../../../shared/services/shared.service';
import { TranslatorService } from '../../../core/translator/translator.service';
import { ExerciseDirectoryService } from '../../../shared/services/exercise-directory.service';

import { FormValues } from '../../../shared/common/common.constants';

import * as moment from 'moment';

@Component({
    selector: 'exercise-dialog',
    standalone: false,
    templateUrl: './exercise-dialog.component.html',
    styleUrl: './exercise-dialog.component.scss'
})
export class ExerciseDialogComponent {
    @ViewChild('strExerciseName', { read: MatAutocompleteTrigger }) strengthInputTrigger: MatAutocompleteTrigger;
    @ViewChild('carExerciseName', { read: MatAutocompleteTrigger }) cardioInputTrigger: MatAutocompleteTrigger;
    @ViewChild('strExerciseName') strExerciseNameInput: ElementRef;
    @ViewChild('carExerciseName') carExerciseNameInput: ElementRef;
    @ViewChild('weight') weightInput: ElementRef;
    @ViewChild('distance') distanceInput: ElementRef;

    public exerciseLogForm: UntypedFormGroup;
    private currentLanguage: string;
    public currentExercise: Exercise;
    public selectedWeightChip: string = 'lbs';
    public selectedDistanceChip: string = 'km';

    public readonly exerciseNameCharLimit: number = 50;
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
        @Inject(MAT_DIALOG_DATA) public _exerciseDialogData: ExerciseDialogData,
        private _formBuilder: UntypedFormBuilder,
        public _dialogRef: MatDialogRef<ExerciseDialogComponent>,
        private _sharedService: SharedService,
        private _translatorService: TranslatorService,
        private _exerciseDirectoryService: ExerciseDirectoryService
    ) {
        this.exerciseLogForm = this._formBuilder.group({
            'exerciseName': ['', Validators.compose([Validators.required, Validators.maxLength(50)])],
            'weight': ['', Validators.maxLength(15)],
            'reps': ['', Validators.compose([Validators.pattern(/^\d+(?:[-+]\d+)?$/), Validators.maxLength(15)])],
            'sets': ['', Validators.compose([Validators.pattern(/^\d+(?:[-+]\d+)?$/), Validators.maxLength(15)])],
            'durationHours': [0, Validators.compose([Validators.min(0), Validators.max(99)])],
            'durationMinutes': [0, Validators.compose([Validators.min(0), Validators.max(59)])],
            'durationSeconds': [0, Validators.compose([Validators.min(0), Validators.max(59)])],
            'distance': ['', Validators.maxLength(15)],
            'intensity': ['']
        });
        this.currentExercise = _exerciseDialogData.exercise ? Object.assign(new Exercise(), _exerciseDialogData.exercise) : new Exercise();
        this.currentExercise.exerciseType = _exerciseDialogData.exerciseType;
        this.currentExercise.exerciseName = _exerciseDialogData.exerciseName || this.currentExercise.exerciseName;
        this.setSelectedChip(_exerciseDialogData.measure);
    }

    ngAfterViewInit() {
        this.focusInput(this.currentExercise.exerciseName);
    }

    ngOnInit(): void {
        this.currentExercise.duration = this.currentExercise.duration || moment.duration();
        this.populateForm();
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
            this.currentExercise.duration = moment.duration({
                hours: Number(this.exerciseLogForm.get('durationHours').value) || 0,
                minutes: Number(this.exerciseLogForm.get('durationMinutes').value) || 0,
                seconds: Number(this.exerciseLogForm.get('durationSeconds').value) || 0
            });
            this.currentExercise.intensity = this.exerciseLogForm.get('intensity').value;
            this._dialogRef.close(this.currentExercise);
        }
    }

    onCancel() {
        this._dialogRef.close();
    }

    onChipClick(value: string) {
        if (value === 'lbs' || value === 'kg') {
            if (value === this.selectedWeightChip) {
                return;
            }
            this.convertFormMeasurement('weight', value === 'kg' ? 1 / 2.205 : 2.205);
            this.selectedWeightChip = value;
        } else {
            if (value === this.selectedDistanceChip) {
                return;
            }
            this.convertFormMeasurement('distance', value === 'mi' ? 1 / 1.609 : 1.609);
            this.selectedDistanceChip = value;
        }
        this._sharedService.emitMeasureToggle(value);
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
        if (value) {
            const filterValue = value.toLowerCase();
            return this.exerciseList.filter(option => option.toLowerCase().includes(filterValue));
        }

        return [];
    }

    private filterCardioExercises(value: string): string[] {
        if (value) {
            const filterValue = value.toLowerCase();
            return this.cardioExerciseList.filter(option => option.toLowerCase().includes(filterValue));
        }

        return [];
    }

    private focusInput(exerciseName: string) {
        setTimeout(() => {
            if (!exerciseName) {
                if (this.currentExercise.exerciseType === 'strength' && this.strExerciseNameInput) {
                    this.strExerciseNameInput.nativeElement.focus();
                } else if (this.currentExercise.exerciseType === 'cardio' && this.carExerciseNameInput) {
                    this.carExerciseNameInput.nativeElement.focus();
                }
            } else {
                this.preventAutocompleteOnModalOpen();
                setTimeout(() => {
                    if (this.currentExercise.exerciseType === 'strength' && this.weightInput) {
                        this.weightInput.nativeElement.focus();
                    } else if (this.currentExercise.exerciseType === 'cardio' && this.distanceInput) {
                        this.distanceInput.nativeElement.focus();
                    }
                });
            }
        }, 250);
    }

    private preventAutocompleteOnModalOpen() {
        setTimeout(() => {
            if (this.currentExercise.exerciseType === 'strength' && this.strExerciseNameInput && this.strExerciseNameInput.nativeElement.value) {
                this.strengthInputTrigger.closePanel();
            } else if (this.currentExercise.exerciseType === 'cardio' && this.carExerciseNameInput && this.carExerciseNameInput.nativeElement.value) {
                this.cardioInputTrigger.closePanel();
            }
        });
    }

    private setSelectedChip(measure: string): void {
        if (measure) {
            if (measure === 'lbs' || measure === 'kg') {
                this.selectedWeightChip = measure;
            } else {
                this.selectedDistanceChip = measure;
            }
        }
    }

    private populateForm(): void {
        this.exerciseLogForm.patchValue({
            exerciseName: this.currentExercise.exerciseName || '',
            weight: this.currentExercise.weight,
            sets: this.currentExercise.sets,
            reps: this.currentExercise.reps,
            distance: this.currentExercise.distance,
            intensity: this.currentExercise.intensity,
            durationHours: Math.floor(this.currentExercise.duration.asHours()),
            durationMinutes: this.currentExercise.duration.minutes(),
            durationSeconds: this.currentExercise.duration.seconds()
        });
    }

    private convertFormMeasurement(controlName: string, factor: number): void {
        const control = this.exerciseLogForm.get(controlName);
        const numericValue = this.toNumericMeasurement(control.value);

        if (numericValue === undefined) {
            return;
        }

        control.setValue(this.roundMeasurement(numericValue * factor));
    }

    private toNumericMeasurement(value: any): number | undefined {
        if (value === undefined || value === null || String(value).trim() === '') {
            return undefined;
        }

        const normalized = String(value).trim();
        if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) {
            return undefined;
        }

        const numericValue = Number(normalized);
        return Number.isFinite(numericValue) ? numericValue : undefined;
    }

    private roundMeasurement(value: number): number {
        return Math.round(value * 10) / 10;
    }
}
