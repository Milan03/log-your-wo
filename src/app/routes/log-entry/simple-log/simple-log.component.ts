import { DatePipe, NgStyle } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, OnDestroy, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { ExerciseDialogComponent } from '../exercise-dialog/exercise-dialog.component';
import { EmailDialogComponent } from '../email-dialog/email-dialog.component';
import { ExerciseGroup } from '../exercise-group-list/exercise-group-list.component';
import { CalendarDay, CalendarService } from '../../../shared/services/calendar.service';
import { Exercise } from '../../../shared/models/exercise.model';
import {
    DistanceMeasure,
    PersistedExercise,
    SavedSimpleLog,
    SimpleLog,
    SimpleLogTimingState,
    WeightMeasure
} from '../../../shared/models/simple-log.model';
import { ExerciseDialogData } from '../../../shared/interfaces/exercise-dialog-data';
import { LayoutService } from '../../../shared/services/layout.service';
import { WorkoutHeaderService } from '../../../shared/services/workout-header.service';
import { WorkoutInteractionService } from '../../../shared/services/workout-interaction.service';
import { TranslatorService } from '../../../core/translator/translator.service';
import { ProgramImportService } from '../../../shared/services/program-import.service';
import { MeasureConversionService } from '../../../shared/services/measure-conversion.service';
import {
    WorkoutTimerService,
    WorkoutTimingSnapshot
} from '../../../shared/services/workout-timer.service';
import { SimpleLogService } from '../../../shared/services/simple-log.service';
import { ImportedProgramDay, ImportedProgramWeek, ImportedWorkoutState } from '../../../shared/models/imported-program.model';
import { ProfileService } from '../../../shared/services/profile.service';
import {
    WorkoutExportContext,
    WorkoutExportService
} from '../../../shared/services/workout-export.service';

import { LogTypes, FormValues } from '../../../shared/common/common.constants';
import { ExerciseGroupListComponent } from '../exercise-group-list/exercise-group-list.component';
import { SimpleLogHistoryComponent } from '../simple-log-history/simple-log-history.component';

import { Duration } from 'luxon';

const swal = require('sweetalert');

interface SimpleLogForm {
    title: FormControl<string | null>;
}

@Component({
    selector: 'app-simple-log',
    standalone: true,
    imports: [
        DatePipe,
        NgStyle,
        ReactiveFormsModule,
        TranslateModule,
        MatDialogModule,
        ExerciseGroupListComponent,
        SimpleLogHistoryComponent
    ],
    templateUrl: './simple-log.component.html',
    styleUrls: ['./simple-log.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SimpleLogComponent implements OnInit, OnDestroy {
    public simpleLogForm: FormGroup<SimpleLogForm>;
    public currentLanguage: string;
    public currentLog: SimpleLog;
    public sbIsCollapsed: boolean;

    public readonly exerciseNameCharLimit: number = 50;
    public readonly exerciseAlphaNumericCharLimit: number = 15;
    public readonly titleCharLimit: number = 25;
    public readonly exerciseType: string = FormValues.ExerciseNameFormControl;
    public readonly cardioExerciseType: string = FormValues.CardioExerciseNameFormControl;
    public intensities = FormValues.ExerciseIntensities;
    public weightMeasure: WeightMeasure = 'lbs';
    public distanceMeasure: DistanceMeasure = 'km';

    private readonly destroyRef = inject(DestroyRef);
    private _cdr = inject(ChangeDetectorRef);
    private strengthGroupSource: Exercise[];
    private strengthGroups: ExerciseGroup[] = [];
    private cardioGroupSource: Exercise[];
    private cardioGroups: ExerciseGroup[] = [];
    private activeSimpleLogId: string;

    public importedWeek: ImportedProgramWeek;
    public importedDay: ImportedProgramDay;
    public isImportedWorkout = false;
    public workoutStartedAt: string;
    public workoutCompletedAt: string;
    public workoutPausedAt: string;
    public totalPausedMs = 0;
    public elapsedMs = 0;
    public completionStyles: { [key: string]: string } = {};
    public savedLogs: SavedSimpleLog[] = [];
    public selectedDateLogs: SavedSimpleLog[] = [];
    public workoutDate = '';
    public workoutDateTime = '';
    public calendarMonth = new Date();
    public calendarDays: CalendarDay[] = [];
    public isHistoryExpanded = true;
    public isEditingSimpleLogTitle = false;
    public simpleLogTitleDraft = '';
    public calendarWeekdays: string[] = [];

    private _formBuilder = inject(FormBuilder);
    private _layoutService = inject(LayoutService);
    private _workoutHeader = inject(WorkoutHeaderService);
    private _workoutInteraction = inject(WorkoutInteractionService);
    private _translatorService = inject(TranslatorService);
    private _dialog = inject(MatDialog);
    private _programImportService = inject(ProgramImportService);
    private _measureConversionService = inject(MeasureConversionService);
    private _calendarService = inject(CalendarService);
    private _workoutTimerService = inject(WorkoutTimerService);
    private _simpleLogService = inject(SimpleLogService);
    private _workoutExportService = inject(WorkoutExportService);
    private _activatedRoute = inject(ActivatedRoute);
    private _router = inject(Router);
    private _profileService = inject(ProfileService, { optional: true });

    constructor() {
        this.simpleLogForm = this._formBuilder.group({
            'title': ['', Validators.compose([Validators.maxLength(25)])]
        });
    }

    ngOnInit(): void {
        const profile = this._profileService ? this._profileService.profile : undefined;
        if (profile && profile.updatedAt) {
            this.weightMeasure = profile.unitSystem === 'metric' ? 'kg' : 'lbs';
            this.distanceMeasure = profile.unitSystem === 'metric' ? 'km' : 'mi';
        }
        this.currentLanguage = FormValues.ENCode;
        this.currentLog = new SimpleLog();
        this.workoutDate = this.toDateInputValue(this.currentLog.startDatim);
        this.workoutDateTime = this.toDateTimeInputValue(this.currentLog.startDatim);
        this.calendarMonth = new Date(this.currentLog.startDatim.getFullYear(), this.currentLog.startDatim.getMonth(), 1);
        this.refreshCompletionStyles();
        this._workoutHeader.setLogType(LogTypes.SimpleLog);
        this._workoutHeader.setLogStartDate(this.currentLog.startDatim);
        this.subToLanguageChange();
        this.subToSidebarToggleChange();
        this.subToMeasureToggleChange();
        this.subToOpenDialogStream();
        this.subToSimpleLogs();
        this.subToRouteParams();
    }

    ngOnDestroy(): void {
        this.pauseActiveWorkoutForNavigation();
        this._workoutTimerService.stop();
    }

    /**
     * Determine which submit was triggered and initiate the appropriate flow.
     * @param submitType - 'save' or 'email'
     */
    public submit(submitType: string): void {
        for (let c in this.simpleLogForm.controls) {
            this.simpleLogForm.controls[c].markAsTouched();
        }
        if (!this.simpleLogForm.valid) {
            return;
        }
        if (submitType == 'save') {
            this._workoutExportService.savePdf(this.buildExportContext());
        } else {
            this.openEmailDialog();
        }
    }

    private buildExportContext(): WorkoutExportContext {
        return {
            log: this.currentLog,
            weightMeasure: this.weightMeasure,
            distanceMeasure: this.distanceMeasure,
            elapsedTimeLabel: this.getElapsedTimeLabel(),
            language: this.currentLanguage,
            startedAt: this.workoutStartedAt,
            completedAt: this.workoutCompletedAt,
            pausedAt: this.workoutPausedAt,
            importedWorkout: this.isImportedWorkout
                ? {
                    weekName: this.importedWeek?.name || '',
                    dayName: this.importedDay?.name || ''
                }
                : undefined
        };
    }

    public checkForTitleValue(): void {
        let title = this.simpleLogForm.get('title').value;
        if (title)
            this.currentLog.title = title;
    }

    public openEmailDialog(): void {
        const dialogRef = this._dialog.open(EmailDialogComponent, {
            panelClass: 'email-dialog-panel',
            maxWidth: 'calc(100vw - 24px)'
        });
        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this._workoutExportService.emailPdf(result, this.buildExportContext());
            }
        });
    }

    public openExerciseDialog(type: string, name?: string, insertAfter?: Exercise): void {
        const exerciseCountBeforeAdd = this.getCurrentExerciseCount();
        let data: ExerciseDialogData = { exerciseType: type, measure: undefined };
        if (name) {
            data = { ...data, exerciseName: name };
        }
        data.measure = (type === 'strength') ? this.weightMeasure : this.distanceMeasure;
        const dialogRef = this._dialog.open(ExerciseDialogComponent, {
            data,
            panelClass: 'exercise-dialog-panel',
            maxWidth: 'calc(100vw - 24px)',
            maxHeight: 'calc(100dvh - 24px)'
        });
        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.addExerciseToLog(type, result, insertAfter);
                if (!this.isImportedWorkout && exerciseCountBeforeAdd === 0) {
                    this.ensureWorkoutStarted();
                }
                this.saveCurrentWorkoutState();
                this._cdr.markForCheck();
            }
        });
    }

    public addRow(exercise: Exercise) {
        this.openExerciseDialog(exercise.exerciseType, exercise.exerciseName, exercise);
    }

    public removeRow(exercise: Exercise) {
        if (exercise.exerciseType === 'strength') {
            this.currentLog.exercises = this.currentLog.exercises.filter(currentExercise => currentExercise.exerciseId !== exercise.exerciseId);
        } else {
            this.currentLog.cardioExercises = this.currentLog.cardioExercises.filter(currentExercise => currentExercise.exerciseId !== exercise.exerciseId);
        }
        this.saveCurrentWorkoutState();
    }

    public onExerciseRowClick(exercise: Exercise): void {
        this.toggleExerciseComplete(exercise);
    }

    public editRow(exercise: Exercise): void {
        const data: ExerciseDialogData = {
            exerciseType: exercise.exerciseType,
            exerciseName: exercise.exerciseName,
            exercise,
            isEdit: true,
            measure: exercise.exerciseType === 'strength' ? this.weightMeasure : this.distanceMeasure
        };
        const dialogRef = this._dialog.open(ExerciseDialogComponent, {
            data,
            panelClass: 'exercise-dialog-panel',
            maxWidth: 'calc(100vw - 24px)',
            maxHeight: 'calc(100dvh - 24px)'
        });
        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.replaceExercise(exercise, result);
                this.saveCurrentWorkoutState();
                this._cdr.markForCheck();
            }
        });
    }

    public toggleExerciseComplete(exercise: Exercise): void {
        this.ensureWorkoutStarted();
        exercise.completed = !exercise.completed;
        if (exercise.exerciseType === 'strength') {
            this.currentLog.exercises = [...this.currentLog.exercises];
        } else {
            this.currentLog.cardioExercises = [...this.currentLog.cardioExercises];
        }
        this.syncWorkoutCompletion();
        this.saveCurrentWorkoutState();
    }

    public startWorkout(): void {
        this.ensureWorkoutStarted();
        this.refreshElapsedMs();
        this.saveCurrentWorkoutState();
    }

    public navigateBackToWeek(): void {
        if (!this.importedWeek) {
            this._router.navigate(['/log-entry/import-program']);
            return;
        }

        this._router.navigate(['/log-entry/import-program'], {
            queryParams: {
                programId: this._programImportService.getProgram()?.id,
                weekId: this.importedWeek.id,
                dayId: this.importedDay?.id
            }
        });
    }

    public markWorkoutComplete(): void {
        this.ensureWorkoutStarted();
        this.currentLog.exercises = this.currentLog.exercises.map(exercise => ({
            ...exercise,
            completed: true
        }));
        this.currentLog.cardioExercises = this.currentLog.cardioExercises.map(exercise => ({
            ...exercise,
            completed: true
        }));
        this.completeWorkout();
        this.saveCurrentWorkoutState();
    }

    public markWorkoutIncomplete(): void {
        const lastCompletedExercise = this.findLastCompletedExercise();

        if (!lastCompletedExercise) {
            return;
        }

        this.currentLog.exercises = this.currentLog.exercises.map(exercise => ({
            ...exercise,
            completed: exercise.exerciseId === lastCompletedExercise.exerciseId ? false : exercise.completed
        }));
        this.currentLog.cardioExercises = this.currentLog.cardioExercises.map(exercise => ({
            ...exercise,
            completed: exercise.exerciseId === lastCompletedExercise.exerciseId ? false : exercise.completed
        }));
        this.workoutCompletedAt = undefined;
        this.workoutPausedAt = undefined;
        this.syncElapsedTimer();
        this.saveCurrentWorkoutState();
    }

    public async resetWorkout(): Promise<void> {
        if (!this.workoutStartedAt) {
            return;
        }

        const confirmed = await swal({
            title: this.t('log-entry.ResetTitle'),
            text: this.t('log-entry.ResetText'),
            icon: 'warning',
            buttons: [this.t('global.CancelLabel'), this.t('log-entry.ResetConfirm')],
            dangerMode: true
        });

        if (!confirmed) {
            return;
        }

        this.applyWorkoutReset();
        this._cdr.markForCheck();
    }

    private applyWorkoutReset(): void {
        this.currentLog.exercises = this.currentLog.exercises.map(exercise => ({
            ...exercise,
            completed: false
        }));
        this.currentLog.cardioExercises = this.currentLog.cardioExercises.map(exercise => ({
            ...exercise,
            completed: false
        }));
        this.clearWorkoutTiming();
        this.saveCurrentWorkoutState();
    }

    public unselectAllExercises(): void {
        this.currentLog.exercises = this.currentLog.exercises.map(exercise => ({
            ...exercise,
            completed: false
        }));
        this.currentLog.cardioExercises = this.currentLog.cardioExercises.map(exercise => ({
            ...exercise,
            completed: false
        }));
        this.workoutCompletedAt = undefined;
        this.syncElapsedTimer();
        this.saveCurrentWorkoutState();
    }

    public pauseWorkout(): void {
        if (this.workoutPausedAt || this.workoutCompletedAt) {
            return;
        }

        this.ensureWorkoutStarted();
        this.workoutPausedAt = new Date().toISOString();
        this.refreshElapsedMs();
        this.syncElapsedTimer();
        this.saveCurrentWorkoutState();
    }

    public resumeWorkout(): void {
        if (!this.workoutPausedAt) {
            return;
        }

        this.totalPausedMs = this._workoutTimerService.accumulatePauseMs(
            this.totalPausedMs,
            this.workoutPausedAt,
            new Date().toISOString()
        );
        this.workoutPausedAt = undefined;
        this.refreshElapsedMs();
        this.syncElapsedTimer();
        this.saveCurrentWorkoutState();
    }

    public getElapsedTimeLabel(): string {
        return this._programImportService.formatElapsedMs(this.elapsedMs);
    }

    public createNewSimpleLog(
        dateValue: string = this.toDateInputValue(new Date())
    ): void {
        const now = new Date();
        this.currentLog = new SimpleLog();
        this.activeSimpleLogId = undefined;
        this.currentLog.title = LogTypes.SimpleLog;
        this.workoutDate = dateValue;
        this.currentLog.startDatim = dateValue === this.toDateInputValue(now)
            ? now
            : this.dateFromInputValue(dateValue);
        this.workoutDateTime = this.toDateTimeInputValue(this.currentLog.startDatim);
        this.clearWorkoutTiming();
        this.isEditingSimpleLogTitle = false;
        this.calendarMonth = new Date(this.currentLog.startDatim.getFullYear(), this.currentLog.startDatim.getMonth(), 1);
        this.refreshCalendar();
        this._workoutHeader.setLogType(this.currentLog.title);
        this._workoutHeader.setLogStartDate(this.currentLog.startDatim);
        this._router.navigate(['/log-entry/simple-log']);
    }

    public selectSimpleLog(log: SavedSimpleLog): void {
        this.isHistoryExpanded = false;
        this._router.navigate(['/log-entry/simple-log'], {
            queryParams: { logId: log.id }
        });
    }

    public startNewLog(): void {
        this.isHistoryExpanded = false;
        this.createNewSimpleLog();
    }

    public selectCalendarDay(day: CalendarDay): void {
        this.workoutDate = day.dateValue;
        if (!day.inCurrentMonth) {
            this.calendarMonth = new Date(day.date.getFullYear(), day.date.getMonth(), 1);
            this.refreshCalendar();
        }

        // Selecting a day only surfaces that day's workouts; the calendar stays
        // open until the user opens a specific workout or starts a new log.
        if (!this.savedLogs.some(savedLog => savedLog.workoutDate === day.dateValue)) {
            this.createNewSimpleLog(day.dateValue);
        } else {
            this.refreshSelectedDateLogs();
        }
    }

    public changeCalendarMonth(offset: number): void {
        this.calendarMonth = new Date(this.calendarMonth.getFullYear(), this.calendarMonth.getMonth() + offset, 1);
        this.refreshCalendar();
    }

    public toggleHistory(): void {
        this.isHistoryExpanded = !this.isHistoryExpanded;
    }

    public beginSimpleLogTitleEdit(): void {
        this.simpleLogTitleDraft = this.currentLog.title || '';
        this.isEditingSimpleLogTitle = true;
    }

    public saveSimpleLogTitle(): void {
        const title = this.simpleLogTitleDraft.trim();
        this.currentLog.title = title || LogTypes.SimpleLog;
        this.isEditingSimpleLogTitle = false;
        this._workoutHeader.setLogType(this.currentLog.title);
        this.saveSimpleLogIfNeeded();
    }

    public cancelSimpleLogTitleEdit(): void {
        this.isEditingSimpleLogTitle = false;
    }

    public updateSimpleLogTitleDraft(event: Event): void {
        this.simpleLogTitleDraft = (event.currentTarget as HTMLInputElement).value;
    }

    public onWorkoutDateTimeChangeFromEvent(event: Event): void {
        this.onWorkoutDateTimeChange((event.currentTarget as HTMLInputElement).value);
    }

    public onWorkoutDateTimeChange(dateTimeValue: string): void {
        if (!dateTimeValue) {
            return;
        }

        this.workoutDateTime = dateTimeValue;
        this.currentLog.startDatim = this.dateTimeFromInputValue(dateTimeValue);
        this.workoutDate = this.toDateInputValue(this.currentLog.startDatim);
        this.calendarMonth = new Date(this.currentLog.startDatim.getFullYear(), this.currentLog.startDatim.getMonth(), 1);
        this._workoutHeader.setLogStartDate(this.currentLog.startDatim);
        this.saveSimpleLogIfNeeded();
        this.refreshCalendar();
    }

    public async deleteSimpleLog(): Promise<void> {
        if (!this.activeSimpleLogId) {
            return;
        }

        const confirmed = await swal({
            title: this.t('log-entry.DeleteTitle'),
            text: this.t('log-entry.DeleteText', {
                name: this.currentLog.title || this.t('log-entry.SimpleLog')
            }),
            icon: 'warning',
            buttons: [this.t('global.CancelLabel'), this.t('global.DeleteLabel')],
            dangerMode: true
        });

        if (!confirmed) {
            return;
        }

        this._simpleLogService.deleteLog(this.activeSimpleLogId);
        this.createNewSimpleLog();
        this._cdr.markForCheck();
    }

    public async deleteSavedSimpleLog(log: SavedSimpleLog): Promise<void> {
        const confirmed = await swal({
            title: this.t('log-entry.DeleteTitle'),
            text: this.t('log-entry.DeleteText', {
                name: log.title || this.t('log-entry.SimpleLog')
            }),
            icon: 'warning',
            buttons: [this.t('global.CancelLabel'), this.t('global.DeleteLabel')],
            dangerMode: true
        });

        if (!confirmed) {
            return;
        }

        this._simpleLogService.deleteLog(log.id);
        if (this.activeSimpleLogId === log.id) {
            this.createNewSimpleLog(log.workoutDate);
        }
        this._cdr.markForCheck();
    }

    private refreshSelectedDateLogs(): void {
        this.selectedDateLogs = this.savedLogs.filter(log => log.workoutDate === this.workoutDate);
    }

    public hasActiveSimpleLog(): boolean {
        return Boolean(this.activeSimpleLogId);
    }

    public getStrengthExerciseGroups(): ExerciseGroup[] {
        if (this.strengthGroupSource !== this.currentLog.exercises) {
            this.strengthGroupSource = this.currentLog.exercises;
            this.strengthGroups = this.getSequentialExerciseGroups(this.currentLog.exercises);
        }

        return this.strengthGroups;
    }

    public getCardioExerciseGroups(): ExerciseGroup[] {
        if (this.cardioGroupSource !== this.currentLog.cardioExercises) {
            this.cardioGroupSource = this.currentLog.cardioExercises;
            this.cardioGroups = this.getSequentialExerciseGroups(this.currentLog.cardioExercises);
        }

        return this.cardioGroups;
    }

    private getSequentialExerciseGroups(exercises: Exercise[]): ExerciseGroup[] {
        return exercises.reduce((groups: ExerciseGroup[], exercise: Exercise) => {
            const previousGroup = groups[groups.length - 1];

            if (previousGroup && previousGroup.exerciseName === exercise.exerciseName) {
                previousGroup.exercises.push(exercise);
            } else {
                groups.push({
                    exerciseName: exercise.exerciseName,
                    exercises: [exercise]
                });
            }

            return groups;
        }, []);
    }

    private refreshCompletionStyles(): void {
        const completionColor = this._programImportService.getCompletionColor();
        this.completionStyles = {
            '--completion-color': completionColor,
            '--completion-color-soft': this.hexToRgba(completionColor, 0.16),
            '--completion-color-softer': this.hexToRgba(completionColor, 0.09)
        };
    }

    private hexToRgba(hex: string, alpha: number): string {
        const normalized = hex.replace('#', '');
        const red = parseInt(normalized.substring(0, 2), 16);
        const green = parseInt(normalized.substring(2, 4), 16);
        const blue = parseInt(normalized.substring(4, 6), 16);

        return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
    }

    private addExerciseToLog(type: string, newExercise: Exercise, insertAfter?: Exercise): void {
        if (type === 'strength') {
            this.currentLog.exercises = this.insertExercise(this.currentLog.exercises, newExercise, insertAfter);
        } else {
            this.currentLog.cardioExercises = this.insertExercise(this.currentLog.cardioExercises, newExercise, insertAfter);
        }
    }

    private insertExercise(exercises: Exercise[], newExercise: Exercise, insertAfter?: Exercise): Exercise[] {
        if (!insertAfter) {
            return [...exercises, newExercise];
        }

        const insertIndex = exercises.findIndex(exercise => exercise.exerciseId === insertAfter.exerciseId);

        if (insertIndex < 0) {
            return [...exercises, newExercise];
        }

        return [
            ...exercises.slice(0, insertIndex + 1),
            newExercise,
            ...exercises.slice(insertIndex + 1)
        ];
    }

    private replaceExercise(originalExercise: Exercise, updatedExercise: Exercise): void {
        updatedExercise.exerciseId = originalExercise.exerciseId;
        updatedExercise.sourceId = originalExercise.sourceId;
        updatedExercise.completed = originalExercise.completed;
        updatedExercise.prescription = updatedExercise.prescription || originalExercise.prescription;

        if (originalExercise.exerciseType === 'strength') {
            this.currentLog.exercises = this.currentLog.exercises.map(exercise => exercise.exerciseId === originalExercise.exerciseId ? updatedExercise : exercise);
        } else {
            this.currentLog.cardioExercises = this.currentLog.cardioExercises.map(exercise => exercise.exerciseId === originalExercise.exerciseId ? updatedExercise : exercise);
        }
    }

    private transformWeightMeasure(data: WeightMeasure): void {
        const sourceMeasure = data === 'kg' ? 'lbs' : 'kg';
        this.currentLog.exercises = this._measureConversionService.convertWeights(
            this.currentLog.exercises,
            sourceMeasure,
            data
        );
    }

    private transformDistanceMeasure(data: DistanceMeasure): void {
        const sourceMeasure = data === 'mi' ? 'km' : 'mi';
        this.currentLog.cardioExercises = this._measureConversionService.convertDistances(
            this.currentLog.cardioExercises,
            sourceMeasure,
            data
        );
    }

    /**
     * Inter component communication Subscriptions
     */
    private subToLanguageChange(): void {
        this._translatorService.languageChangeEmitted$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(
            data => {
                this.currentLanguage = data;
                if (this.currentLanguage == FormValues.ENCode) {
                    this.intensities = FormValues.ExerciseIntensities;
                } else {
                    this.intensities = FormValues.ExerciseIntensitiesFR;
                }
                this.calendarWeekdays = this._calendarService.weekdays(this.currentLanguage);
                this._cdr.markForCheck();
            }
        );
    }

    private subToSidebarToggleChange(): void {
        this._layoutService.sidebarCollapsed$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(
            data => {
                this.sbIsCollapsed = data;
                this._cdr.markForCheck();
            }
        );
    }

    private subToMeasureToggleChange(): void {
        this._workoutInteraction.measureChanged$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(
            data => {
                if (data === 'lbs' || data === 'kg') {
                    if (data !== this.weightMeasure) {
                        this.weightMeasure = data;
                        this.transformWeightMeasure(this.weightMeasure);
                        this.saveCurrentWorkoutState();
                    }
                } else if (data === 'km' || data === 'mi') {
                    if (data !== this.distanceMeasure) {
                        this.distanceMeasure = data;
                        this.transformDistanceMeasure(this.distanceMeasure);
                        this.saveCurrentWorkoutState();
                    }
                }
                this._cdr.markForCheck();
            }
        );
    }

    private subToOpenDialogStream(): void {
        this._workoutInteraction.exerciseDialogRequested$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(
            data => {
                if (data) {
                    if (data === 'strength') {
                        this.openExerciseDialog('strength');
                    } else {
                        this.openExerciseDialog('cardio');
                    }
                }
            }
        )
    }

    private subToSimpleLogs(): void {
        this._simpleLogService.logs$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(logs => {
            this.savedLogs = logs;
            this.refreshCalendar();
            this._cdr.markForCheck();
        });
    }

    private subToRouteParams(): void {
        this._activatedRoute.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
            const weekId = params.get('weekId');
            const dayId = params.get('dayId');
            const programId = params.get('programId');
            const simpleLogId = params.get('logId');

            if (weekId && dayId) {
                if (programId) {
                    this._programImportService.setActiveProgram(programId);
                }
                if (!this.isImportedWorkout || this.importedWeek?.id !== weekId || this.importedDay?.id !== dayId) {
                    this.pauseActiveWorkoutForNavigation();
                }
                this.loadImportedWorkout(weekId, dayId);
            } else {
                const isChangingSimpleLog = Boolean(
                    this.activeSimpleLogId &&
                    simpleLogId !== this.activeSimpleLogId
                );
                if (this.isImportedWorkout || isChangingSimpleLog) {
                    this.pauseActiveWorkoutForNavigation();
                }
                this.isImportedWorkout = false;
                this.importedWeek = undefined;
                this.importedDay = undefined;
                this.clearWorkoutTiming();
                if (simpleLogId) {
                    this.loadSimpleLog(simpleLogId);
                } else if (!this.currentLog || this.hasLogContent(this.currentLog)) {
                    this.createNewSimpleLog();
                } else {
                    this.activeSimpleLogId = undefined;
                }
            }
            this._cdr.markForCheck();
        });
    }

    private loadSimpleLog(logId: string): void {
        const savedLog = this._simpleLogService.getLog(logId);

        if (!savedLog) {
            this.createNewSimpleLog();
            return;
        }

        this.currentLog = this._simpleLogService.hydrateLog(savedLog);
        const sourceWeightMeasure = savedLog.weightMeasure || 'lbs';
        const sourceDistanceMeasure = savedLog.distanceMeasure || 'km';
        this.currentLog.exercises = this._measureConversionService.convertWeights(
            this.currentLog.exercises,
            sourceWeightMeasure,
            this.weightMeasure
        );
        this.currentLog.cardioExercises = this._measureConversionService.convertDistances(
            this.currentLog.cardioExercises,
            sourceDistanceMeasure,
            this.distanceMeasure
        );
        this.activeSimpleLogId = savedLog.id;
        this.workoutDate = savedLog.workoutDate;
        this.workoutDateTime = this.toDateTimeInputValue(this.currentLog.startDatim);
        this.calendarMonth = new Date(this.currentLog.startDatim.getFullYear(), this.currentLog.startDatim.getMonth(), 1);
        this.refreshCalendar();
        this.loadWorkoutTiming(savedLog);
        if (sourceWeightMeasure !== this.weightMeasure || sourceDistanceMeasure !== this.distanceMeasure) {
            this.saveSimpleLogIfNeeded();
        }
        this._workoutHeader.setLogType(this.currentLog.title);
        this._workoutHeader.setLogStartDate(this.currentLog.startDatim);
    }

    private loadImportedWorkout(weekId: string, dayId: string): void {
        this.importedWeek = this._programImportService.getWeek(weekId);
        this.importedDay = this._programImportService.getDay(weekId, dayId);

        if (!this.importedWeek || !this.importedDay) {
            return;
        }

        const state = this._programImportService.getWorkoutState(weekId, dayId);
        this.currentLog = new SimpleLog();
        this.currentLog.title = `${this.importedWeek.name} - ${this.importedDay.name}`;
        if (state?.startedAt) {
            const startedAt = new Date(state.startedAt);
            if (Number.isFinite(startedAt.getTime())) {
                this.currentLog.startDatim = startedAt;
            }
        }
        const sourceWeightMeasure = state?.weightMeasure
            || this._programImportService.getProgram()?.weightMeasure
            || 'lbs';
        const exercises = state
            ? this.hydrateExercises(state.exercises)
            : this._programImportService.createExercisesForDay(this.importedDay);
        this.currentLog.exercises = this._measureConversionService.convertWeights(exercises, sourceWeightMeasure, this.weightMeasure);
        this.currentLog.cardioExercises = state && state.cardioExercises
            ? this._measureConversionService.convertDistances(
                this.hydrateExercises(state.cardioExercises),
                state.distanceMeasure || 'km',
                this.distanceMeasure
            )
            : [];
        this.isImportedWorkout = true;
        this.loadWorkoutTiming(state);
        this._workoutHeader.setLogType(this.currentLog.title);
        this._workoutHeader.setLogStartDate(this.currentLog.startDatim);
        if (state && (
            sourceWeightMeasure !== this.weightMeasure ||
            (state.distanceMeasure || 'km') !== this.distanceMeasure
        )) {
            this.saveImportedWorkoutState();
        }
    }

    private hydrateExercises(exercises: PersistedExercise[]): Exercise[] {
        return exercises.map(exercise => {
            const hydratedExercise = Object.assign(new Exercise(), exercise);
            hydratedExercise.duration = Duration.fromMillis(this.durationMilliseconds(exercise.duration));
            return hydratedExercise;
        });
    }

    private durationMilliseconds(duration: unknown): number {
        if (Duration.isDuration(duration)) {
            return duration.toMillis();
        }

        if (typeof duration === 'string') {
            const milliseconds = Duration.fromISO(duration).toMillis();
            return Number.isFinite(milliseconds) ? milliseconds : 0;
        }

        const milliseconds = Number(duration);
        return Number.isFinite(milliseconds) ? milliseconds : 0;
    }

    private findLastCompletedExercise(): Exercise | undefined {
        const exercises = [...this.currentLog.exercises, ...this.currentLog.cardioExercises];

        for (let index = exercises.length - 1; index >= 0; index--) {
            if (exercises[index].completed) {
                return exercises[index];
            }
        }

        return undefined;
    }

    private pauseActiveWorkoutForNavigation(): void {
        if (!this.workoutStartedAt || this.workoutPausedAt || this.workoutCompletedAt) {
            return;
        }

        this.workoutPausedAt = new Date().toISOString();
        this.refreshElapsedMs();
        this.saveCurrentWorkoutState();
    }

    private saveImportedWorkoutState(): void {
        if (!this.isImportedWorkout || !this.importedWeek || !this.importedDay) {
            return;
        }

        const program = this._programImportService.getProgram();
        if (!program) {
            return;
        }

        this._programImportService.saveWorkoutState({
            programId: program.id,
            weekId: this.importedWeek.id,
            dayId: this.importedDay.id,
            weightMeasure: this.weightMeasure,
            distanceMeasure: this.distanceMeasure,
            exercises: this.currentLog.exercises,
            cardioExercises: this.currentLog.cardioExercises,
            startedAt: this.workoutStartedAt,
            completedAt: this.workoutCompletedAt,
            pausedAt: this.workoutPausedAt,
            totalPausedMs: this.totalPausedMs,
            elapsedMs: this.elapsedMs
        });
    }

    private saveCurrentWorkoutState(): void {
        if (this.isImportedWorkout) {
            this.saveImportedWorkoutState();
        } else {
            this.saveSimpleLogIfNeeded();
        }
    }

    private saveSimpleLogIfNeeded(): void {
        if (!this.currentLog || (!this.activeSimpleLogId && !this.hasLogContent(this.currentLog))) {
            return;
        }

        const savedLog = this._simpleLogService.saveLog(this.currentLog, this.workoutDate, {
            weightMeasure: this.weightMeasure,
            distanceMeasure: this.distanceMeasure,
            startedAt: this.workoutStartedAt,
            completedAt: this.workoutCompletedAt,
            pausedAt: this.workoutPausedAt,
            totalPausedMs: this.totalPausedMs,
            elapsedMs: this.elapsedMs
        });
        if (!this.activeSimpleLogId) {
            this.activeSimpleLogId = savedLog.id;
            this._router.navigate(['/log-entry/simple-log'], {
                queryParams: { logId: savedLog.id },
                replaceUrl: true
            });
        }
    }

    private hasLogContent(log: SimpleLog): boolean {
        return Boolean(
            (log.exercises && log.exercises.length) ||
            (log.cardioExercises && log.cardioExercises.length) ||
            (log.title && log.title !== LogTypes.SimpleLog) ||
            this.workoutStartedAt
        );
    }

    private getCurrentExerciseCount(): number {
        return (this.currentLog.exercises || []).length + (this.currentLog.cardioExercises || []).length;
    }

    private refreshCalendar(): void {
        const workoutDates = new Set(this.savedLogs.map(log => log.workoutDate));
        this.calendarDays = this._calendarService.buildMonth(this.calendarMonth, new Date(), workoutDates);
        this.refreshSelectedDateLogs();
    }

    private toDateInputValue(date: Date): string {
        return this._calendarService.toDateValue(date);
    }

    private dateFromInputValue(value: string): Date {
        return this._calendarService.fromDateValue(value);
    }

    private toDateTimeInputValue(date: Date): string {
        return this._calendarService.toDateTimeValue(date);
    }

    private dateTimeFromInputValue(value: string): Date {
        return this._calendarService.fromDateTimeValue(value);
    }

    private ensureWorkoutStarted(): void {
        if (this.workoutStartedAt) {
            return;
        }

        this.workoutStartedAt = new Date().toISOString();
        this.isHistoryExpanded = false;
        this.syncElapsedTimer();
    }

    private syncWorkoutCompletion(): void {
        const exercises = [...this.currentLog.exercises, ...this.currentLog.cardioExercises];

        if (!exercises.length) {
            return;
        }

        if (exercises.every(exercise => exercise.completed)) {
            this.completeWorkout();
        } else {
            this.workoutCompletedAt = undefined;
            this.syncElapsedTimer();
        }
    }

    private completeWorkout(): void {
        const completedAt = new Date().toISOString();
        if (this.workoutPausedAt) {
            this.totalPausedMs = this._workoutTimerService.accumulatePauseMs(
                this.totalPausedMs,
                this.workoutPausedAt,
                completedAt
            );
        }
        this.workoutCompletedAt = completedAt;
        this.workoutPausedAt = undefined;
        this.refreshElapsedMs(completedAt);
        this.syncElapsedTimer();
    }

    private loadWorkoutTiming(state: ImportedWorkoutState | SimpleLogTimingState): void {
        this.workoutStartedAt = state ? state.startedAt : undefined;
        this.workoutCompletedAt = state ? state.completedAt : undefined;
        this.workoutPausedAt = state ? state.pausedAt : undefined;
        this.totalPausedMs = state && state.totalPausedMs ? state.totalPausedMs : 0;
        this.elapsedMs = state && state.elapsedMs ? state.elapsedMs : 0;
        this.refreshElapsedMs();
        this.syncElapsedTimer();
    }

    private clearWorkoutTiming(): void {
        this.workoutStartedAt = undefined;
        this.workoutCompletedAt = undefined;
        this.workoutPausedAt = undefined;
        this.totalPausedMs = 0;
        this.elapsedMs = 0;

        this._workoutTimerService.stop();
    }

    private timingSnapshot(): WorkoutTimingSnapshot {
        return {
            startedAt: this.workoutStartedAt,
            completedAt: this.workoutCompletedAt,
            pausedAt: this.workoutPausedAt,
            totalPausedMs: this.totalPausedMs
        };
    }

    private syncElapsedTimer(): void {
        if (this._workoutTimerService.isRunning(this.timingSnapshot())) {
            this._workoutTimerService.start(() => {
                this.refreshElapsedMs();
                this._cdr.markForCheck();
            });
        } else {
            this._workoutTimerService.stop();
        }
    }

    private refreshElapsedMs(nowIso?: string): void {
        this.elapsedMs = this._workoutTimerService.elapsedMs(this.timingSnapshot(), nowIso);
    }

    /**
     * Sweet alert prompts.
     */
    private t(key: string, params?: object): string {
        return this._translatorService.translate.instant(key, params);
    }
}
