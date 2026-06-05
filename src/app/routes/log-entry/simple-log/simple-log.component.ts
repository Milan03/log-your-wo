import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { ExerciseDialogComponent } from '../exercise-dialog/exercise-dialog.component';
import { EmailDialogComponent } from '../email-dialog/email-dialog.component';
import { Exercise } from '../../../shared/models/exercise.model';
import { SimpleLog } from '../../../shared/models/simple-log.model';
import { EmailRequest } from '../../../shared/models/email-request.model';
import { ExerciseDialogData } from '../../../shared/interfaces/exercise-dialog-data';
import { SharedService } from '../../../shared/services/shared.service';
import { TranslatorService } from '../../../core/translator/translator.service';
import { EmailService } from '../../../shared/services/email.service';
import { GoogleAnalyticsService } from '../../../shared/services/google-analytics.service';
import { ProgramImportService } from '../../../shared/services/program-import.service';
import { ImportedProgramDay, ImportedProgramWeek, ImportedWorkoutState } from '../../../shared/models/imported-program.model';

import { LogTypes, FormValues } from '../../../shared/common/common.constants';

import * as moment from 'moment';
import { jsPDF, jsPDFOptions } from 'jspdf';

const swal = require('sweetalert');

interface ExerciseGroup {
    exerciseName: string;
    exercises: Exercise[];
}

@Component({
    selector: 'app-simple-log',
    standalone: false,
    templateUrl: './simple-log.component.html',
    styleUrls: ['./simple-log.component.scss']
})
export class SimpleLogComponent implements OnInit, OnDestroy {
    @ViewChild('exerciseTable', { static: false }) exerciseTable: ElementRef;

    public simpleLogForm: UntypedFormGroup;
    private currentLanguage: string;
    public currentLog: SimpleLog;
    private currentPDF: any
    public sbIsCollapsed: boolean;

    public readonly exerciseNameCharLimit: number = 50;
    public readonly exerciseAlphaNumericCharLimit: number = 15;
    public readonly titleCharLimit: number = 25;
    public readonly exerciseType: string = FormValues.ExerciseNameFormControl;
    public readonly cardioExerciseType: string = FormValues.CardioExerciseNameFormControl;
    public intensities = FormValues.ExerciseIntensities;
    public weightMeasure: string = 'lbs';
    public distanceMeasure: string = 'km';

    private langSub: Subscription;
    private sbToggleSub: Subscription;
    private measureToggleSub: Subscription;
    private openDialogSub: Subscription;
    private exerciseTitleSub: Subscription;
    private routeSub: Subscription;
    private elapsedTimerId: any;
    private strengthGroupSource: Exercise[];
    private strengthGroups: ExerciseGroup[] = [];
    private cardioGroupSource: Exercise[];
    private cardioGroups: ExerciseGroup[] = [];

    public importedWeek: ImportedProgramWeek;
    public importedDay: ImportedProgramDay;
    public isImportedWorkout = false;
    public workoutStartedAt: string;
    public workoutCompletedAt: string;
    public workoutPausedAt: string;
    public totalPausedMs = 0;
    public elapsedMs = 0;
    public completionStyles: { [key: string]: string } = {};

    constructor(
        private _formBuilder: UntypedFormBuilder,
        private _sharedService: SharedService,
        private _translatorService: TranslatorService,
        private _dialog: MatDialog,
        private _emailService: EmailService,
        private _googleAnalyticsService: GoogleAnalyticsService,
        private _programImportService: ProgramImportService,
        private _activatedRoute: ActivatedRoute,
        private _router: Router
    ) {
        this.simpleLogForm = this._formBuilder.group({
            'title': ['', Validators.compose([Validators.maxLength(25)])]
        });
    }

    ngOnInit(): void {
        this.currentLanguage = FormValues.ENCode;
        this.currentLog = new SimpleLog();
        this.refreshCompletionStyles();
        this._sharedService.emitLogType(LogTypes.SimpleLog);
        this._sharedService.emitLogStartDatim(this.currentLog.startDatim);
        this.subToLanguageChange();
        this.subToSidebarToggleChange();
        this.subToMeasureToggleChange();
        this.subToOpenDialogStream();
        this.subToExerciseTitleStream();
        this.subToRouteParams();
    }

    ngOnDestroy(): void {
        this.pauseActiveWorkoutForNavigation();
        if (this.langSub)
            this.langSub.unsubscribe();
        if (this.sbToggleSub)
            this.sbToggleSub.unsubscribe();
        if (this.measureToggleSub)
            this.measureToggleSub.unsubscribe();
        if (this.openDialogSub)
            this.openDialogSub.unsubscribe();
        if (this.exerciseTitleSub)
            this.exerciseTitleSub.unsubscribe();
        if (this.routeSub)
            this.routeSub.unsubscribe();
        this.stopElapsedTimer();
    }

    /**
     * Determine which submit was triggered and initiate the appropriate flow.
     * @param submitType - 'save' or 'email'
     */
    public submit(submitType: string): void {
        if (submitType == 'save')
            this.savePDFSubmit();
        else
            this.emailPDFSubmit();
    }

    private async savePDFSubmit(): Promise<void> {
        for (let c in this.simpleLogForm.controls) {
            this.simpleLogForm.controls[c].markAsTouched();
        }
        if (this.simpleLogForm.valid) {
            let createdPDF = await this.createPDF('save');
            createdPDF.save('tableToPdf.pdf');
            this._googleAnalyticsService.eventEmitter(`pdf_saved_success`, 'general', 'engagement');
        }
    }

    private emailPDFSubmit(): void {
        for (let c in this.simpleLogForm.controls) {
            this.simpleLogForm.controls[c].markAsTouched();
        }
        if (this.simpleLogForm.valid) {
            this.openEmailDialog();
        }
    }

    /**
     * Using the email address retrieved from email dialog, create an email request and 
     * initiate call the email service.
     * @param recipientEmailAddress 
     */
    public async emailAsPDF(recipientEmailAddress: string): Promise<void> {
        let createdPDF = await this.createPDF('email');
        this.currentPDF = btoa(createdPDF);
        let request = this.createEmailRequest(recipientEmailAddress);
        this._emailService.sendMail(request).subscribe({
            next: () => {
                this.swalEmailSent();
                this._googleAnalyticsService.eventEmitter('email_sent_success', 'general', 'engagement');
            },
            error: () => {
                this.swalEmailError();
            }
        });
    }

    /**
     * Create the PDF using jsPDF and the exercise HTML table.
     */
    private createPDF(type: string): Promise<any> {
        let orientation: jsPDFOptions = {
            orientation: 'p',
            unit: 'mm',
            format: 'a3',
            compress: true
        };
        const doc = new jsPDF(orientation);
        doc.setProperties({
            title: 'Log Your Workout'
        });
        const exerciseTable = this.exerciseTable.nativeElement;
        return new Promise(resolve => {
            doc.html(exerciseTable, {
                x: 40,
                y: 20,
                width: 522,
                windowWidth: exerciseTable.scrollWidth,
                callback: createdDoc => {
                    if (type == 'save')
                        resolve(createdDoc);
                    else
                        resolve(createdDoc.output());
                }
            });
        });
    }

    /**
     * Create the email request to be sent to the server depending on if log title is present and
     * the current language.
     * @param recipientEmailAddress - email to send to
     */
    private createEmailRequest(recipientEmailAddress: string): EmailRequest {
        const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        if (this.currentLanguage == FormValues.ENCode) {
            if (this.currentLog.title) {
                return new EmailRequest(
                    FormValues.NoReplyEmailAddress,
                    recipientEmailAddress,
                    `${this.currentLog.title} - ${this.currentLog.startDatim.toLocaleDateString(FormValues.ENCode, options)}`,
                    [this.currentPDF],
                    FormValues.EmailBody,
                    this.currentLog.startDatim.toDateString()
                );
            } else {
                return new EmailRequest(
                    FormValues.NoReplyEmailAddress,
                    recipientEmailAddress,
                    `${FormValues.LogYourWorkout} - ${this.currentLog.startDatim.toLocaleDateString(FormValues.ENCode, options)}`,
                    [this.currentPDF],
                    FormValues.EmailBody,
                    this.currentLog.startDatim.toDateString()
                );
            }
        } else {
            if (this.currentLog.title) {
                return new EmailRequest(
                    FormValues.NoReplyEmailAddress,
                    recipientEmailAddress,
                    `${this.currentLog.title} - ${this.currentLog.startDatim.toLocaleDateString(FormValues.FRCode, options)}`,
                    [this.currentPDF],
                    FormValues.EmailBodyFR,
                    this.currentLog.startDatim.toDateString()
                );
            } else {
                return new EmailRequest(
                    FormValues.NoReplyEmailAddress,
                    recipientEmailAddress,
                    `${FormValues.LogYourWorkout} - ${this.currentLog.startDatim.toLocaleDateString(FormValues.FRCode, options)}`,
                    [this.currentPDF],
                    FormValues.EmailBodyFR,
                    this.currentLog.startDatim.toDateString()
                );
            }
        }
    }

    public checkForTitleValue(): void {
        let title = this.simpleLogForm.get('title').value;
        if (title)
            this.currentLog.title = title;
    }

    public openEmailDialog(): void {
        let dialogRef = this._dialog.open(EmailDialogComponent);
        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.swalEmailSending();
                this.emailAsPDF(result);
            }
        });
    }

    public openExerciseDialog(type: string, name?: string, insertAfter?: Exercise): void {
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
                this.saveImportedWorkoutState();
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
        this.saveImportedWorkoutState();
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
                this.saveImportedWorkoutState();
            }
        });
    }

    public toggleExerciseComplete(exercise: Exercise): void {
        if (this.isImportedWorkout) {
            this.ensureWorkoutStarted();
        }
        exercise.completed = !exercise.completed;
        if (exercise.exerciseType === 'strength') {
            this.currentLog.exercises = [...this.currentLog.exercises];
        } else {
            this.currentLog.cardioExercises = [...this.currentLog.cardioExercises];
        }
        if (this.isImportedWorkout) {
            this.syncWorkoutCompletion();
            this.saveImportedWorkoutState();
        }
    }

    public startWorkout(): void {
        this.ensureWorkoutStarted();
        this.refreshElapsedMs();
        this.saveImportedWorkoutState();
    }

    public navigateBackToWeek(): void {
        if (!this.importedWeek) {
            this._router.navigate(['/log-entry/import-program']);
            return;
        }

        this._router.navigate(['/log-entry/import-program'], {
            queryParams: {
                programId: this._programImportService.getProgram()?.id,
                weekId: this.importedWeek.id
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
        this.saveImportedWorkoutState();
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
        this.saveImportedWorkoutState();
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
        this.saveImportedWorkoutState();
    }

    public pauseWorkout(): void {
        if (!this.isImportedWorkout || this.workoutPausedAt || this.workoutCompletedAt) {
            return;
        }

        this.ensureWorkoutStarted();
        this.workoutPausedAt = new Date().toISOString();
        this.refreshElapsedMs();
        this.syncElapsedTimer();
        this.saveImportedWorkoutState();
    }

    public resumeWorkout(): void {
        if (!this.workoutPausedAt) {
            return;
        }

        this.totalPausedMs += Date.now() - new Date(this.workoutPausedAt).getTime();
        this.workoutPausedAt = undefined;
        this.refreshElapsedMs();
        this.syncElapsedTimer();
        this.saveImportedWorkoutState();
    }

    public getElapsedTimeLabel(): string {
        return this._programImportService.formatElapsedMs(this.elapsedMs);
    }

    public getWeightDisplay(exercise: Exercise): string {
        const weight = exercise.weight === undefined || exercise.weight === null ? '' : String(exercise.weight).trim();

        if (!weight || weight.toLowerCase() === 'x') {
            return '';
        }

        return `${weight} ${this.weightMeasure}`;
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

    public getDistanceDisplay(exercise: Exercise): string {
        const distance = exercise.distance === undefined || exercise.distance === null ? '' : String(exercise.distance).trim();
        return distance ? `${distance} ${this.distanceMeasure}` : '';
    }

    public getDurationDisplay(exercise: Exercise): string {
        return exercise.duration && exercise.duration.asMilliseconds() > 0
            ? this.formatDuration(exercise.duration)
            : 'N/A';
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

    private formatDuration(duration: moment.Duration): string {
        const hours = Math.floor(duration.asHours());
        const minutes = duration.minutes();
        const seconds = duration.seconds();
        const parts = [];

        if (hours) {
            parts.push(`${hours}h`);
        }
        if (minutes) {
            parts.push(`${minutes}m`);
        }
        if (seconds || !parts.length) {
            parts.push(`${seconds}s`);
        }

        return parts.join(' ');
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

    private transformWeightMeasure(data: string) {
        const factor = data === 'kg' ? 1 / 2.205 : 2.205;
        this.currentLog.exercises = this.currentLog.exercises.map(exercise => ({
            ...exercise,
            weight: this.convertMeasurementValue(exercise.weight, factor)
        }));
    }

    private tranformDistanceMeasure(data: string) {
        const factor = data === 'mi' ? 1 / 1.609 : 1.609;
        this.currentLog.cardioExercises = this.currentLog.cardioExercises.map(exercise => ({
            ...exercise,
            distance: this.convertMeasurementValue(exercise.distance, factor)
        }));
    }

    private convertMeasurementValue(value: any, factor: number): any {
        if (value === undefined || value === null || String(value).trim() === '') {
            return value;
        }

        const normalized = String(value).trim();
        if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) {
            return value;
        }

        const numericValue = Number(normalized);
        return Number.isFinite(numericValue)
            ? Math.round(numericValue * factor * 10) / 10
            : value;
    }

    /**
     * Inter component communication Subscriptions
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

    private subToSidebarToggleChange(): void {
        this.sbToggleSub = this._sharedService.sidebarToggleEmitted$.subscribe(
            data => {
                this.sbIsCollapsed = data;
            }
        );
    }

    private subToMeasureToggleChange(): void {
        this.measureToggleSub = this._sharedService.measureToggleSource$.subscribe(
            data => {
                if (data === 'lbs' || data === 'kg') {
                    if (data !== this.weightMeasure) {
                        this.weightMeasure = data;
                        this.transformWeightMeasure(this.weightMeasure);
                    }
                } else {
                    if (data !== this.distanceMeasure) {
                        this.distanceMeasure = data;
                        this.tranformDistanceMeasure(this.distanceMeasure);
                    }
                }
            }
        );
    }

    private subToOpenDialogStream(): void {
        this.openDialogSub = this._sharedService.openExerciseDialogEmitted$.subscribe(
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

    private subToExerciseTitleStream(): void {
        this.exerciseTitleSub = this._sharedService.exerciseTitleEmitted$.subscribe(
          data => {
            this.currentLog.title = data;
            this.saveImportedWorkoutState();
          }  
        );
    }

    private subToRouteParams(): void {
        this.routeSub = this._activatedRoute.queryParamMap.subscribe(params => {
            const weekId = params.get('weekId');
            const dayId = params.get('dayId');
            const programId = params.get('programId');

            if (weekId && dayId) {
                if (programId) {
                    this._programImportService.setActiveProgram(programId);
                }
                if (this.isImportedWorkout && (this.importedWeek?.id !== weekId || this.importedDay?.id !== dayId)) {
                    this.pauseActiveWorkoutForNavigation();
                }
                this.loadImportedWorkout(weekId, dayId);
            } else {
                this.pauseActiveWorkoutForNavigation();
                this.isImportedWorkout = false;
                this.importedWeek = undefined;
                this.importedDay = undefined;
                this.clearWorkoutTiming();
            }
        });
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
        this.currentLog.exercises = state ? this.hydrateExercises(state.exercises) : this._programImportService.createExercisesForDay(this.importedDay);
        this.currentLog.cardioExercises = state && state.cardioExercises
            ? this.hydrateExercises(state.cardioExercises)
            : [];
        this.isImportedWorkout = true;
        this.loadWorkoutTiming(state);
        this._sharedService.emitLogType(this.currentLog.title);
        this._sharedService.emitLogStartDatim(this.currentLog.startDatim);
        this.saveImportedWorkoutState();
    }

    private hydrateExercises(exercises: Exercise[]): Exercise[] {
        return exercises.map(exercise => {
            const hydratedExercise = Object.assign(new Exercise(), exercise);
            hydratedExercise.duration = moment.duration((exercise as any).duration || 0);
            return hydratedExercise;
        });
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
        if (!this.isImportedWorkout || !this.workoutStartedAt || this.workoutPausedAt || this.workoutCompletedAt) {
            return;
        }

        this.workoutPausedAt = new Date().toISOString();
        this.refreshElapsedMs();
        this.saveImportedWorkoutState();
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
            exercises: this.currentLog.exercises,
            cardioExercises: this.currentLog.cardioExercises,
            startedAt: this.workoutStartedAt,
            completedAt: this.workoutCompletedAt,
            pausedAt: this.workoutPausedAt,
            totalPausedMs: this.totalPausedMs,
            elapsedMs: this.elapsedMs
        });
    }

    private ensureWorkoutStarted(): void {
        if (!this.isImportedWorkout || this.workoutStartedAt) {
            return;
        }

        this.workoutStartedAt = new Date().toISOString();
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
            this.totalPausedMs += new Date(completedAt).getTime() - new Date(this.workoutPausedAt).getTime();
        }
        this.workoutCompletedAt = completedAt;
        this.workoutPausedAt = undefined;
        this.refreshElapsedMs(completedAt);
        this.syncElapsedTimer();
    }

    private loadWorkoutTiming(state: ImportedWorkoutState): void {
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

        this.stopElapsedTimer();
    }

    private startElapsedTimer(): void {
        if (this.elapsedTimerId) {
            clearInterval(this.elapsedTimerId);
        }

        this.elapsedTimerId = setInterval(() => this.refreshElapsedMs(), 1000);
    }

    private stopElapsedTimer(): void {
        if (this.elapsedTimerId) {
            clearInterval(this.elapsedTimerId);
            this.elapsedTimerId = undefined;
        }
    }

    private syncElapsedTimer(): void {
        if (this.workoutStartedAt && !this.workoutPausedAt && !this.workoutCompletedAt) {
            this.startElapsedTimer();
        } else {
            this.stopElapsedTimer();
        }
    }

    private refreshElapsedMs(nowIso?: string): void {
        if (!this.workoutStartedAt) {
            this.elapsedMs = 0;
            return;
        }

        const now = nowIso ? new Date(nowIso).getTime() : Date.now();
        const endTime = this.workoutCompletedAt ? new Date(this.workoutCompletedAt).getTime() : now;
        const pausedWindowMs = this.workoutPausedAt && !this.workoutCompletedAt ? now - new Date(this.workoutPausedAt).getTime() : 0;
        this.elapsedMs = Math.max(endTime - new Date(this.workoutStartedAt).getTime() - this.totalPausedMs - pausedWindowMs, 0);
    }

    /**
     * Sweet alert prompts.
     */
    private swalEmailSending(): void {
        if (this.currentLanguage == FormValues.ENCode) {
            swal({
                title: 'Sending email...',
                text: 'Please wait',
                icon: 'info',
                buttons: false,
                closeOnClickOutside: false
            });
        } else {
            swal({
                title: 'Envoi d\'un e-mail ...',
                text: 'S\'il vous pla\u00EEt, attendez',
                icon: 'info',
                buttons: false,
                closeOnClickOutside: false
            });
        }
    }

    private swalEmailSent(): void {
        if (this.currentLanguage == FormValues.ENCode) {
            swal({
                title: 'Email Sent',
                text: 'Email has been sent to the provided email address.',
                icon: 'success',
                buttons: false,
                timer: 1500
            });
        } else {
            swal({
                title: 'Email envoy\u00E9',
                text: 'Un e-mail a \u00E9t\u00E9 envoy\u00E9 \u00E0 l\'adresse e-mail fournie.',
                icon: 'success',
                buttons: false,
                timer: 1500
            });
        }
    }

    private swalEmailError(): void {
        if (this.currentLanguage == FormValues.ENCode) {
            swal({
                title: 'Problem Sending Email',
                text: 'There was a problem trying to send to the provided email address. Please try again.',
                icon: 'error',
                showConfirmButton: true
            });
        } else {
            swal({
                title: 'Probl\u00E9me d\'envoi d\'e-mail',
                text: `Un probl\u00E8me est survenu lors de l'envoi à l'adresse e-mail fournie. Veuillez r\u00E9essayer.`,
                icon: 'error',
                showConfirmButton: true
            });
        }
    }
}
