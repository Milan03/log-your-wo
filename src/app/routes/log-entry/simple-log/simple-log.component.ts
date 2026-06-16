import { DatePipe, NgStyle } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, OnDestroy, OnInit, signal } from '@angular/core';
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
import { SimpleLogCalendarStore } from './simple-log-calendar.store';
import { WorkoutTimingStore } from './workout-timing.store';
import { ImportedWorkoutStore } from './imported-workout.store';
import { MeasureSettingsStore } from './measure-settings.store';

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
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [SimpleLogCalendarStore, WorkoutTimingStore, ImportedWorkoutStore, MeasureSettingsStore]
})
export class SimpleLogComponent implements OnInit, OnDestroy {
    public simpleLogForm: FormGroup<SimpleLogForm>;
    public sbIsCollapsed: boolean;

    public readonly exerciseNameCharLimit: number = 50;
    public readonly exerciseAlphaNumericCharLimit: number = 15;
    public readonly titleCharLimit: number = 25;
    public readonly exerciseType: string = FormValues.ExerciseNameFormControl;
    public readonly cardioExerciseType: string = FormValues.CardioExerciseNameFormControl;
    public intensities = FormValues.ExerciseIntensities;

    private readonly destroyRef = inject(DestroyRef);
    private _cdr = inject(ChangeDetectorRef);
    private strengthGroupSource: Exercise[];
    private strengthGroups: ExerciseGroup[] = [];
    private cardioGroupSource: Exercise[];
    private cardioGroups: ExerciseGroup[] = [];
    private activeSimpleLogId: string;

    // Component-local view state is held in signals so OnPush views update from
    // signal writes; get/set accessors preserve the existing field-style API for
    // the template and call sites. `currentLog` is mutated in place in several
    // flows, so it uses `equal: () => false` to still notify on re-set.
    private readonly _currentLanguage = signal<string>('');
    private readonly _currentLog = signal<SimpleLog>(new SimpleLog(), { equal: () => false });
    private readonly _completionStyles = signal<{ [key: string]: string }>({});
    private readonly _workoutDate = signal<string>('');
    private readonly _workoutDateTime = signal<string>('');
    private readonly _isEditingSimpleLogTitle = signal<boolean>(false);
    private readonly _simpleLogTitleDraft = signal<string>('');

    public get currentLanguage(): string { return this._currentLanguage(); }
    public set currentLanguage(value: string) { this._currentLanguage.set(value); }
    public get currentLog(): SimpleLog { return this._currentLog(); }
    public set currentLog(value: SimpleLog) { this._currentLog.set(value); }
    public get completionStyles(): { [key: string]: string } { return this._completionStyles(); }
    public set completionStyles(value: { [key: string]: string }) { this._completionStyles.set(value); }
    public get workoutDate(): string { return this._workoutDate(); }
    public set workoutDate(value: string) { this._workoutDate.set(value); }
    public get workoutDateTime(): string { return this._workoutDateTime(); }
    public set workoutDateTime(value: string) { this._workoutDateTime.set(value); }
    public get isEditingSimpleLogTitle(): boolean { return this._isEditingSimpleLogTitle(); }
    public set isEditingSimpleLogTitle(value: boolean) { this._isEditingSimpleLogTitle.set(value); }
    public get simpleLogTitleDraft(): string { return this._simpleLogTitleDraft(); }
    public set simpleLogTitleDraft(value: string) { this._simpleLogTitleDraft.set(value); }

    private _calendarStore = inject(SimpleLogCalendarStore);
    private _timing = inject(WorkoutTimingStore);
    private _importedWorkout = inject(ImportedWorkoutStore);
    private _measures = inject(MeasureSettingsStore);

    // Active weight/distance units live in MeasureSettingsStore; these accessors
    // keep the template and existing call sites pointed at it.
    public get weightMeasure(): WeightMeasure { return this._measures.weightMeasure(); }
    public get distanceMeasure(): DistanceMeasure { return this._measures.distanceMeasure(); }

    // Imported-workout context lives in ImportedWorkoutStore; these accessors
    // keep the template and existing call sites pointed at it.
    public get importedWeek(): ImportedProgramWeek { return this._importedWorkout.week(); }
    public get importedDay(): ImportedProgramDay { return this._importedWorkout.day(); }
    public get isImportedWorkout(): boolean { return this._importedWorkout.isActive(); }
    public set isImportedWorkout(value: boolean) { this._importedWorkout.isActive.set(value); }

    // Workout timing state lives in WorkoutTimingStore; these accessors keep the
    // template and existing call sites pointed at it.
    public get workoutStartedAt(): string { return this._timing.startedAt(); }
    public set workoutStartedAt(value: string) { this._timing.startedAt.set(value); }
    public get workoutCompletedAt(): string { return this._timing.completedAt(); }
    public get workoutPausedAt(): string { return this._timing.pausedAt(); }
    public get totalPausedMs(): number { return this._timing.totalPausedMs(); }
    public get elapsedMs(): number { return this._timing.elapsedMs(); }

    // Calendar/history view state lives in SimpleLogCalendarStore; these
    // accessors keep the template and existing call sites pointed at it.
    public get savedLogs(): SavedSimpleLog[] { return this._calendarStore.savedLogs(); }
    public get selectedDateLogs(): SavedSimpleLog[] { return this._calendarStore.selectedDateLogs(); }
    public get calendarDays(): CalendarDay[] { return this._calendarStore.calendarDays(); }
    public get calendarWeekdays(): string[] { return this._calendarStore.calendarWeekdays(); }
    public get calendarMonth(): Date { return this._calendarStore.calendarMonth(); }
    public get isHistoryExpanded(): boolean { return this._calendarStore.isHistoryExpanded(); }
    public set isHistoryExpanded(value: boolean) { this._calendarStore.isHistoryExpanded.set(value); }

    private _formBuilder = inject(FormBuilder);
    private _layoutService = inject(LayoutService);
    private _workoutHeader = inject(WorkoutHeaderService);
    private _workoutInteraction = inject(WorkoutInteractionService);
    private _translatorService = inject(TranslatorService);
    private _dialog = inject(MatDialog);
    private _programImportService = inject(ProgramImportService);
    private _calendarService = inject(CalendarService);
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
        this._measures.initFromProfile(this._profileService?.profile);
        this._timing.setTickHandler(() => this._cdr.markForCheck());
        this.currentLanguage = FormValues.ENCode;
        this.currentLog = new SimpleLog();
        this.workoutDate = this.toDateInputValue(this.currentLog.startDatim);
        this.workoutDateTime = this.toDateTimeInputValue(this.currentLog.startDatim);
        this._calendarStore.setMonthFromDate(this.currentLog.startDatim);
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
        this._timing.stop();
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
        data.measure = this._measures.measureFor(type);
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
            measure: this._measures.measureFor(exercise.exerciseType)
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
        this._timing.refreshElapsed();
        this.saveCurrentWorkoutState();
    }

    public navigateBackToWeek(): void {
        const week = this._importedWorkout.week();
        if (!week) {
            this._router.navigate(['/log-entry/import-program']);
            return;
        }

        this._router.navigate(['/log-entry/import-program'], {
            queryParams: {
                programId: this._importedWorkout.programId(),
                weekId: week.id,
                dayId: this._importedWorkout.day()?.id
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
        this._timing.complete();
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
        this._timing.reopen();
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
        this._timing.clear();
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
        this._timing.clearCompletion();
        this.saveCurrentWorkoutState();
    }

    public pauseWorkout(): void {
        if (this.workoutPausedAt || this.workoutCompletedAt) {
            return;
        }

        this.ensureWorkoutStarted();
        this._timing.pause();
        this.saveCurrentWorkoutState();
    }

    public resumeWorkout(): void {
        if (!this.workoutPausedAt) {
            return;
        }

        this._timing.resume();
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
        this._timing.clear();
        this.isEditingSimpleLogTitle = false;
        this._calendarStore.setMonthFromDate(this.currentLog.startDatim);
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
            this._calendarStore.setMonthFromDate(day.date);
            this.refreshCalendar();
        }

        // Selecting a day only surfaces that day's workouts; the calendar stays
        // open until the user opens a specific workout or starts a new log.
        if (!this._calendarStore.hasLogForDate(day.dateValue)) {
            this.createNewSimpleLog(day.dateValue);
        } else {
            this.refreshSelectedDateLogs();
        }
    }

    public changeCalendarMonth(offset: number): void {
        this._calendarStore.changeMonth(offset, this.workoutDate);
    }

    public toggleHistory(): void {
        this._calendarStore.toggleHistory();
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
        this._calendarStore.setMonthFromDate(this.currentLog.startDatim);
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
        this._calendarStore.refreshSelectedDateLogs(this.workoutDate);
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
                this._calendarStore.updateWeekdays(this.currentLanguage);
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
                if (this._measures.applyMeasureChange(data, this.currentLog)) {
                    this.saveCurrentWorkoutState();
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
            this._calendarStore.setSavedLogs(logs, this.workoutDate);
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
                    this._importedWorkout.setActiveProgram(programId);
                }
                if (!this._importedWorkout.isSameWorkout(weekId, dayId)) {
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
                this._importedWorkout.clear();
                this._timing.clear();
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
        const converted = this._measures.convertToActive(
            this.currentLog,
            savedLog.weightMeasure || 'lbs',
            savedLog.distanceMeasure || 'km'
        );
        this.activeSimpleLogId = savedLog.id;
        this.workoutDate = savedLog.workoutDate;
        this.workoutDateTime = this.toDateTimeInputValue(this.currentLog.startDatim);
        this._calendarStore.setMonthFromDate(this.currentLog.startDatim);
        this.refreshCalendar();
        this.loadWorkoutTiming(savedLog);
        if (converted) {
            this.saveSimpleLogIfNeeded();
        }
        this._workoutHeader.setLogType(this.currentLog.title);
        this._workoutHeader.setLogStartDate(this.currentLog.startDatim);
    }

    private loadImportedWorkout(weekId: string, dayId: string): void {
        const loaded = this._importedWorkout.load(weekId, dayId, {
            weightMeasure: this.weightMeasure,
            distanceMeasure: this.distanceMeasure
        });

        if (!loaded) {
            return;
        }

        this.currentLog = loaded.log;
        this.loadWorkoutTiming(loaded.state);
        this._workoutHeader.setLogType(this.currentLog.title);
        this._workoutHeader.setLogStartDate(this.currentLog.startDatim);
        if (loaded.needsResave) {
            this.saveImportedWorkoutState();
        }
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
        if (this._timing.pauseForNavigation()) {
            this.saveCurrentWorkoutState();
        }
    }

    private saveImportedWorkoutState(): void {
        this._importedWorkout.save(
            this.currentLog,
            { weightMeasure: this.weightMeasure, distanceMeasure: this.distanceMeasure },
            this._timing.toState()
        );
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
        this._calendarStore.refresh(this.workoutDate);
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
        if (this._timing.ensureStarted()) {
            this.isHistoryExpanded = false;
        }
    }

    private syncWorkoutCompletion(): void {
        const exercises = [...this.currentLog.exercises, ...this.currentLog.cardioExercises];

        if (!exercises.length) {
            return;
        }

        if (exercises.every(exercise => exercise.completed)) {
            this._timing.complete();
        } else {
            this._timing.clearCompletion();
        }
    }

    private loadWorkoutTiming(state: ImportedWorkoutState | SimpleLogTimingState): void {
        this._timing.load(state);
    }

    /**
     * Sweet alert prompts.
     */
    private t(key: string, params?: object): string {
        return this._translatorService.translate.instant(key, params);
    }
}
