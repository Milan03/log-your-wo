import { AsyncPipe } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    ElementRef,
    inject,
    OnInit,
    signal,
    viewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, map, startWith } from 'rxjs';

import { Exercise, Intensity } from '../../../shared/models/exercise.model';
import { ExerciseDialogData } from 'src/app/shared/interfaces/exercise-dialog-data';
import { WorkoutInteractionService } from '../../../shared/services/workout-interaction.service';
import { TranslatorService } from '../../../core/translator/translator.service';
import { ExerciseDirectoryService } from '../../../shared/services/exercise-directory.service';
import { ExerciseNameLocalizerService } from '../../../shared/services/exercise-name-localizer.service';

import { FormValues } from '../../../shared/common/common.constants';

import { Duration } from 'luxon';

interface LocalizedExerciseOption {
    name: string;
    localizedName: string;
    searchText: string;
}

interface ExerciseForm {
    exerciseName: FormControl<string | null>;
    weight: FormControl<string | number | null>;
    reps: FormControl<string | number | null>;
    sets: FormControl<string | number | null>;
    durationHours: FormControl<number | null>;
    durationMinutes: FormControl<number | null>;
    durationSeconds: FormControl<number | null>;
    distance: FormControl<string | number | null>;
    intensity: FormControl<Intensity | null>;
}

@Component({
    selector: 'exercise-dialog',
    standalone: true,
    imports: [
        AsyncPipe,
        ReactiveFormsModule,
        TranslateModule,
        MatAutocompleteModule,
        MatButtonToggleModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule
    ],
    templateUrl: './exercise-dialog.component.html',
    styleUrl: './exercise-dialog.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExerciseDialogComponent implements OnInit {
    private readonly strengthInputTrigger = viewChild('strExerciseName', { read: MatAutocompleteTrigger });
    private readonly cardioInputTrigger = viewChild('carExerciseName', { read: MatAutocompleteTrigger });
    private readonly strExerciseNameInput = viewChild<ElementRef<HTMLInputElement>>('strExerciseName');
    private readonly carExerciseNameInput = viewChild<ElementRef<HTMLInputElement>>('carExerciseName');
    private readonly weightInput = viewChild<ElementRef<HTMLInputElement>>('weight');
    private readonly distanceInput = viewChild<ElementRef<HTMLInputElement>>('distance');

    public exerciseLogForm: FormGroup<ExerciseForm>;
    public currentExercise: Exercise;
    public selectedWeightChip: string = 'lbs';
    public selectedDistanceChip: string = 'km';

    public readonly exerciseNameCharLimit: number = 50;
    public readonly exerciseAlphaNumericCharLimit: number = 15;

    private readonly currentLanguage = signal<string>(FormValues.ENCode);
    private readonly exerciseNames = signal<string[]>([]);
    private readonly cardioExerciseNames = signal<string[]>([]);

    public readonly intensities = computed(() => this.currentLanguage() === FormValues.ENCode
        ? FormValues.ExerciseIntensities
        : FormValues.ExerciseIntensitiesFR);
    private readonly exerciseList = computed(() => this.localizeExerciseNames(this.exerciseNames()));
    private readonly cardioExerciseList = computed(() => this.localizeExerciseNames(this.cardioExerciseNames()));

    public filteredExercises: Observable<LocalizedExerciseOption[]>;
    public filteredCardioExercises: Observable<LocalizedExerciseOption[]>;
    private readonly destroyRef = inject(DestroyRef);

    public _exerciseDialogData = inject<ExerciseDialogData>(MAT_DIALOG_DATA);
    private _formBuilder = inject(FormBuilder);
    public _dialogRef = inject(MatDialogRef) as MatDialogRef<ExerciseDialogComponent>;
    private _workoutInteraction = inject(WorkoutInteractionService);
    private _translatorService = inject(TranslatorService);
    private _exerciseDirectoryService = inject(ExerciseDirectoryService);
    private _exerciseNameLocalizer = inject(ExerciseNameLocalizerService);

    constructor() {
        this.exerciseLogForm = this._formBuilder.group<ExerciseForm>({
            exerciseName: new FormControl('', Validators.compose([Validators.required, Validators.maxLength(50)])),
            weight: new FormControl<string | number | null>('', Validators.maxLength(15)),
            reps: new FormControl<string | number | null>('', Validators.compose([Validators.pattern(/^\d+(?:[-+]\d+)?$/), Validators.maxLength(15)])),
            sets: new FormControl<string | number | null>('', Validators.compose([Validators.pattern(/^\d+(?:[-+]\d+)?$/), Validators.maxLength(15)])),
            durationHours: new FormControl(0, Validators.compose([Validators.min(0), Validators.max(99)])),
            durationMinutes: new FormControl(0, Validators.compose([Validators.min(0), Validators.max(59)])),
            durationSeconds: new FormControl(0, Validators.compose([Validators.min(0), Validators.max(59)])),
            distance: new FormControl<string | number | null>('', Validators.maxLength(15)),
            intensity: new FormControl<Intensity | null>(null)
        });
        this.currentExercise = this._exerciseDialogData.exercise ? Object.assign(new Exercise(), this._exerciseDialogData.exercise) : new Exercise();
        this.currentExercise.exerciseType = this._exerciseDialogData.exerciseType;
        this.currentExercise.exerciseName = this._exerciseDialogData.exerciseName || this.currentExercise.exerciseName;
        this.setSelectedChip(this._exerciseDialogData.measure);

        // Focus the relevant input once the dialog's open animation has finished
        // so the field is reliably present and visible before we move focus to it.
        this._dialogRef.afterOpened().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(
            () => this.focusInput(this.currentExercise.exerciseName)
        );
    }

    public ngOnInit(): void {
        this.currentExercise.duration = this.currentExercise.duration || Duration.fromMillis(0);
        this.populateForm();
        this.filteredExercises = this.exerciseLogForm.get('exerciseName').valueChanges.pipe(
            startWith(''),
            map(value => this.filterExercises(value))
        );
        this.filteredCardioExercises = this.exerciseLogForm.get('exerciseName').valueChanges.pipe(
            startWith(''),
            map(value => this.filterCardioExercises(value))
        );
        this.subToLanguageChange();
        this.subToExerciseDirectoryService();
        this.subToCardioExerciseDirectoryService();
    }

    public submitForm(event: Event): void {
        event.preventDefault();
        this.exerciseLogForm.markAllAsTouched();
        if (this.exerciseLogForm.valid) {
            const controls = this.exerciseLogForm.controls;
            this.currentExercise.exerciseName = controls.exerciseName.value ?? undefined;
            this.currentExercise.weight = controls.weight.value ?? undefined;
            this.currentExercise.sets = controls.sets.value ?? undefined;
            this.currentExercise.reps = controls.reps.value ?? undefined;
            this.currentExercise.distance = controls.distance.value ?? undefined;
            this.currentExercise.duration = Duration.fromObject({
                hours: Number(controls.durationHours.value) || 0,
                minutes: Number(controls.durationMinutes.value) || 0,
                seconds: Number(controls.durationSeconds.value) || 0
            });
            this.currentExercise.intensity = controls.intensity.value ?? undefined;
            this._dialogRef.close(this.currentExercise);
        }
    }

    public onCancel(): void {
        this._dialogRef.close();
    }

    public onChipClick(value: string): void {
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
        this._workoutInteraction.notifyMeasureChanged(value);
    }

    /**
    * Track the language currently chosen by the user. The localized exercise
    * lists and intensity labels are derived signals, so they update automatically.
    */
    private subToLanguageChange(): void {
        this._translatorService.languageChangeEmitted$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(
            data => this.currentLanguage.set(data)
        );
    }

    private subToExerciseDirectoryService(): void {
        this._exerciseDirectoryService.getExercises().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (data) => {
                this.exerciseNames.set(data.exercises.map(exercise => exercise.name));
            },
            error: (error) => {
                console.error('Error fetching exercises:', error);
            }
        });
    }

    private subToCardioExerciseDirectoryService(): void {
        this._exerciseDirectoryService.getCardioExercises().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (data) => {
                this.cardioExerciseNames.set(data.exercises.map(exercise => exercise.name));
            },
            error: (error) => {
                console.error('Error fetching exercises:', error);
            }
        });
    }

    public displayExerciseName = (name: string): string =>
        this._exerciseNameLocalizer.localize(name, this.currentLanguage());

    private filterExercises(value: string): LocalizedExerciseOption[] {
        if (value) {
            const filterValue = this._exerciseNameLocalizer.normalize(value);
            return this.exerciseList().filter(option => option.searchText.includes(filterValue));
        }

        return [];
    }

    private filterCardioExercises(value: string): LocalizedExerciseOption[] {
        if (value) {
            const filterValue = this._exerciseNameLocalizer.normalize(value);
            return this.cardioExerciseList().filter(option => option.searchText.includes(filterValue));
        }

        return [];
    }

    private focusInput(exerciseName: string) {
        if (!exerciseName) {
            if (this.currentExercise.exerciseType === 'strength') {
                this.strExerciseNameInput()?.nativeElement.focus();
            } else if (this.currentExercise.exerciseType === 'cardio') {
                this.carExerciseNameInput()?.nativeElement.focus();
            }
        } else {
            this.preventAutocompleteOnModalOpen();
            setTimeout(() => {
                if (this.currentExercise.exerciseType === 'strength') {
                    this.weightInput()?.nativeElement.focus();
                } else if (this.currentExercise.exerciseType === 'cardio') {
                    this.distanceInput()?.nativeElement.focus();
                }
            });
        }
    }

    private localizeExerciseNames(names: string[]): LocalizedExerciseOption[] {
        return names.map(name => {
            const localizedName = this._exerciseNameLocalizer.localize(name, this.currentLanguage());
            return {
                name,
                localizedName,
                searchText: this._exerciseNameLocalizer.normalize(`${name} ${localizedName}`)
            };
        });
    }

    private preventAutocompleteOnModalOpen() {
        setTimeout(() => {
            const strInput = this.strExerciseNameInput();
            const carInput = this.carExerciseNameInput();
            if (this.currentExercise.exerciseType === 'strength' && strInput && strInput.nativeElement.value) {
                this.strengthInputTrigger()?.closePanel();
            } else if (this.currentExercise.exerciseType === 'cardio' && carInput && carInput.nativeElement.value) {
                this.cardioInputTrigger()?.closePanel();
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
        const durationParts = (this.currentExercise.duration || Duration.fromMillis(0))
            .shiftTo('hours', 'minutes', 'seconds');
        this.exerciseLogForm.patchValue({
            exerciseName: this.currentExercise.exerciseName || '',
            weight: this.currentExercise.weight,
            sets: this.currentExercise.sets,
            reps: this.currentExercise.reps,
            distance: this.currentExercise.distance,
            intensity: this.currentExercise.intensity,
            durationHours: Math.floor(durationParts.hours),
            durationMinutes: Math.floor(durationParts.minutes),
            durationSeconds: Math.floor(durationParts.seconds)
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

    private toNumericMeasurement(value: unknown): number | undefined {
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
