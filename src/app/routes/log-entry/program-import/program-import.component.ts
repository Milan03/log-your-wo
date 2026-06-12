import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, Optional, QueryList, ViewChildren } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, Subscription } from 'rxjs';

import {
    ImportedProgram,
    ImportedProgramDay,
    ImportedProgramExercise,
    ImportedProgramWeek,
    ProgramImportWarning,
    ProgramImportPreview,
    WorkbookImportInput
} from '../../../shared/models/imported-program.model';
import { TrainingMax } from '../../../shared/models/profile.model';
import { WeightMeasure } from '../../../shared/models/simple-log.model';
import { ProgramImportService } from '../../../shared/services/program-import.service';
import { ProfileService } from '../../../shared/services/profile.service';
import { SharedService } from '../../../shared/services/shared.service';
import { TranslatorService } from '../../../core/translator/translator.service';

const swal = require('sweetalert');

@Component({
    selector: 'app-program-import',
    standalone: false,
    templateUrl: './program-import.component.html',
    styleUrls: ['./program-import.component.scss']
})
export class ProgramImportComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChildren('weekTab') private weekTabElements: QueryList<ElementRef<HTMLElement>>;
    @ViewChildren('dayCard') private dayCardElements: QueryList<ElementRef<HTMLElement>>;

    public program: ImportedProgram;
    public programs: ImportedProgram[] = [];
    public programCards: ProgramImportCard[] = [];
    public weekCards: ProgramWeekCard[] = [];
    public dayCards: ProgramDayCard[] = [];
    public selectedWeek: ImportedProgramWeek;
    public isImporting = false;
    public importError = '';
    public importPreview: ProgramImportPreview;
    public importReviewStep: 'setup' | 'review' = 'review';
    public setupError = '';
    public selectedReviewWeekIndex = 0;
    public completionColor = '#2fb379';
    public completionStyles: { [key: string]: string } = {};
    public completionColorOptions = [
        '#2fb379',
        '#2f80ed',
        '#9b51e0',
        '#f2994a',
        '#eb5757',
        '#111827'
    ];

    private programSub: Subscription;
    private programsSub: Subscription;
    private routeSub: Subscription;
    private navigationSub: Subscription;
    private languageSub: Subscription;
    private weekTabsSub: Subscription;
    private dayCardsSub: Subscription;
    private focusTimerId: ReturnType<typeof setTimeout>;
    private scrollFrameId: number;
    private selectedWeekId: string;
    private pendingFocusWeekId: string;
    private pendingFocusDayId: string;
    private selectedProgramId: string;
    private pendingTrainingMaxes: TrainingMax[] = [];

    constructor(
        private _programImportService: ProgramImportService,
        private _sharedService: SharedService,
        private _router: Router,
        private _activatedRoute: ActivatedRoute,
        @Optional() private _translatorService?: TranslatorService,
        @Optional() private _profileService?: ProfileService
    ) { }

    ngOnInit(): void {
        this._sharedService.emitLogType(undefined);
        this.completionColor = this._programImportService.getCompletionColor();
        this.refreshCompletionStyles();
        this.routeSub = this._activatedRoute.queryParamMap.subscribe(params => {
            this.selectedProgramId = params.get('programId');
            this.selectedWeekId = params.get('weekId');
            this.pendingFocusWeekId = this.selectedWeekId;
            this.pendingFocusDayId = params.get('dayId');
            if (this.selectedProgramId) {
                this._programImportService.setActiveProgram(this.selectedProgramId);
            }
            this.selectWeekFromProgram();
        });
        this.programSub = this._programImportService.program$.subscribe(program => {
            this.program = program;
            this.selectWeekFromProgram();
            this.refreshWeekCards();
        });
        this.programsSub = this._programImportService.programs$.subscribe(programs => {
            this.programs = programs;
            this.refreshProgramCards();
        });
        this.navigationSub = this._router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe(() => this.queueRequestedFocus());
        if (this._translatorService) {
            this.languageSub = this._translatorService.languageChangeEmitted$.subscribe(() => {
                this.refreshProgramCards();
                this.refreshDayCards();
            });
        }
    }

    ngAfterViewInit(): void {
        this.weekTabsSub = this.weekTabElements.changes.subscribe(() => this.queueRequestedFocus());
        this.dayCardsSub = this.dayCardElements.changes.subscribe(() => this.queueRequestedFocus());
        this.queueRequestedFocus();
    }

    ngOnDestroy(): void {
        if (this.programSub) {
            this.programSub.unsubscribe();
        }
        if (this.routeSub) {
            this.routeSub.unsubscribe();
        }
        if (this.programsSub) {
            this.programsSub.unsubscribe();
        }
        if (this.dayCardsSub) {
            this.dayCardsSub.unsubscribe();
        }
        if (this.weekTabsSub) {
            this.weekTabsSub.unsubscribe();
        }
        if (this.navigationSub) {
            this.navigationSub.unsubscribe();
        }
        if (this.languageSub) {
            this.languageSub.unsubscribe();
        }
        if (this.focusTimerId !== undefined) {
            clearTimeout(this.focusTimerId);
            this.focusTimerId = undefined;
        }
        if (this.scrollFrameId !== undefined) {
            cancelAnimationFrame(this.scrollFrameId);
            this.scrollFrameId = undefined;
        }
    }

    public async onFileSelected(event: Event): Promise<void> {
        const input = event.target as HTMLInputElement;
        const file = input.files && input.files.length ? input.files[0] : undefined;

        if (!file) {
            return;
        }

        this.isImporting = true;
        this.importError = '';
        this.pendingTrainingMaxes = [];

        try {
            const preview = await this._programImportService.previewWorkbook(file);
            if (!preview.program) {
                this.importError = preview.warningDetails?.[0]
                    ? this.formatImportWarning(preview.warningDetails[0])
                    : preview.warnings[0]
                    || this.t('program-import.ImportError', undefined, 'That workbook could not be imported. Try another .xlsx file.');
            } else {
                this.importPreview = preview;
                this.initializeWorkbookSetup();
                this.selectedReviewWeekIndex = 0;
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : '';
            this.importError = /10 MB/.test(message)
                ? this.t('program-import.WorkbookTooLarge', undefined, 'Workbook files must be 10 MB or smaller.')
                : this.t('program-import.ImportError', undefined, 'That workbook could not be imported. Try another .xlsx file.');
        } finally {
            this.isImporting = false;
            input.value = '';
        }
    }

    public async confirmImport(): Promise<void> {
        if (!this.importPreview?.program) {
            return;
        }

        const program = {
            ...this.importPreview.program,
            weeks: this.importPreview.program.weeks.map(week => ({
                ...week,
                days: week.days.map(day => ({
                    ...day,
                    exercises: day.exercises
                        .filter(exercise => exercise.exerciseName.trim())
                        .map(exercise => {
                            const savedExercise = { ...exercise };
                            delete savedExercise.workbookCalculation;
                            delete savedExercise.workbookCalculations;
                            return {
                                ...savedExercise,
                                exerciseName: exercise.exerciseName.trim(),
                                prescription: this.buildReviewedPrescription(exercise)
                            };
                        })
                })).filter(day => day.exercises.length > 0)
            })).filter(week => week.days.length > 0)
        };

        if (!program.weeks.length) {
            this.importError = this.t(
                'program-import.NoReviewRows',
                undefined,
                'Keep at least one exercise before saving the imported program.'
            );
            return;
        }

        this._programImportService.saveProgram(program);
        const trainingMaxes = this.pendingTrainingMaxes;
        this.importPreview = undefined;
        this.importReviewStep = 'review';
        this.setupError = '';
        this.selectedReviewWeekIndex = 0;
        this.importError = '';
        this.pendingTrainingMaxes = [];

        if (this._profileService && trainingMaxes.length) {
            try {
                await this._profileService.saveTrainingMaxes(trainingMaxes);
            } catch {
                this.importError = this.t(
                    'program-import.MaxSyncError',
                    undefined,
                    'The program was saved, but the training maxes could not be synchronized.'
                );
            }
        }
    }

    public cancelImportReview(): void {
        this.importPreview = undefined;
        this.importReviewStep = 'review';
        this.setupError = '';
        this.selectedReviewWeekIndex = 0;
        this.importError = '';
        this.pendingTrainingMaxes = [];
    }

    public continueToImportReview(): void {
        if (!this.importPreview?.setup || !this.workbookSetupValid) {
            this.setupError = this.t(
                'program-import.SetupValidation',
                undefined,
                'Enter a number greater than zero for each required max.'
            );
            return;
        }

        const values = this.importPreview.setup.inputs.reduce((result, input) => {
            result[input.id] = Number(input.value);
            return result;
        }, {} as { [inputId: string]: number });
        this.importPreview = this._programImportService.applyWorkbookInputs(this.importPreview, values);
        this.importPreview.program.weightMeasure = this.workbookWeightMeasure;
        this.importReviewStep = 'review';
        this.setupError = '';

        if (this._profileService && this.importPreview.setup.inputs.length) {
            this.pendingTrainingMaxes = this.importPreview.setup.inputs.map(input => ({
                id: this._profileService.findTrainingMax(input.exerciseName)?.id || input.id,
                exerciseName: input.exerciseName,
                value: Number(input.value)
            }));
        }
    }

    public editWorkbookMaxes(): void {
        this.importReviewStep = 'setup';
        this.setupError = '';
    }

    public get workbookSetupValid(): boolean {
        return Boolean(this.importPreview?.setup)
            && this.importPreview.setup.inputs.every(input => this.isWorkbookInputValid(input));
    }

    public isWorkbookInputValid(input: WorkbookImportInput): boolean {
        return Number.isFinite(Number(input.value)) && Number(input.value) > 0;
    }

    public normalizeWorkbookInput(input: WorkbookImportInput): void {
        const value = Number(input.value);
        if (Number.isFinite(value) && value > 0) {
            input.value = this.roundTrainingMax(value);
        }
    }

    public get workbookWeightUnit(): string {
        return this._profileService?.profile.unitSystem === 'metric' ? 'kg' : 'lb';
    }

    public deleteReviewExercise(weekIndex: number, dayIndex: number, exerciseIndex: number): void {
        this.importPreview.program.weeks[weekIndex].days[dayIndex].exercises.splice(exerciseIndex, 1);
    }

    public trackExerciseById(index: number, exercise: ImportedProgramExercise): string {
        return exercise.id;
    }

    public selectReviewWeek(index: number): void {
        const lastIndex = (this.importPreview?.program?.weeks.length || 1) - 1;
        this.selectedReviewWeekIndex = Math.max(0, Math.min(index, lastIndex));
    }

    public previousReviewWeek(): void {
        this.selectReviewWeek(this.selectedReviewWeekIndex - 1);
    }

    public nextReviewWeek(): void {
        this.selectReviewWeek(this.selectedReviewWeekIndex + 1);
    }

    public get selectedReviewWeek(): ImportedProgramWeek {
        return this.importPreview?.program?.weeks[this.selectedReviewWeekIndex];
    }

    public get reviewExerciseCount(): number {
        if (!this.importPreview?.program) {
            return 0;
        }
        return this.importPreview.program.weeks.reduce((total, week) =>
            total + week.days.reduce((dayTotal, day) => dayTotal + day.exercises.length, 0), 0);
    }

    public get importWarnings(): string[] {
        if (!this.importPreview) {
            return [];
        }
        return this.importPreview.warningDetails?.length
            ? this.importPreview.warningDetails.map(warning => this.formatImportWarning(warning))
            : this.importPreview.warnings;
    }

    private initializeWorkbookSetup(): void {
        const setup = this.importPreview?.setup;
        if (!setup) {
            this.importReviewStep = 'review';
            return;
        }

        setup.inputs.forEach(input => {
            const savedMax = this._profileService?.findTrainingMax(input.exerciseName);
            const value = savedMax?.value ?? input.originalValue;
            input.value = Number.isFinite(Number(value))
                ? this.roundTrainingMax(Number(value))
                : value;
        });
        this.importPreview.program.weightMeasure = this.workbookWeightMeasure;
        this.importReviewStep = 'setup';
        this.setupError = '';
    }

    public selectWeek(week: ImportedProgramWeek): void {
        this.selectedWeekId = week.id;
        this.pendingFocusWeekId = undefined;
        this.pendingFocusDayId = undefined;
        this.selectedWeek = week;
        this.refreshDayCards();
    }

    public openWorkout(weekId: string, dayId: string): void {
        this._router.navigate(['/log-entry/import-program/workout'], {
            queryParams: {
                programId: this.program.id,
                weekId,
                dayId
            }
        });
    }

    public async clearProgram(): Promise<void> {
        if (!this.program) {
            return;
        }

        await this.confirmAndDeleteProgram(this.program);
    }

    public selectProgram(program: ImportedProgram): void {
        const selectedProgram = this._programImportService.setActiveProgram(program.id);

        if (selectedProgram) {
            this.program = selectedProgram;
            this.selectedWeekId = undefined;
            this.selectWeekFromProgram();
            this.refreshProgramView();
        }

        this._router.navigate(['/log-entry/import-program'], {
            queryParams: {
                programId: program.id
            }
        });
    }

    public async deleteProgram(event: Event, program: ImportedProgram): Promise<void> {
        event.stopPropagation();
        await this.confirmAndDeleteProgram(program);
    }

    public markDayComplete(event: Event, weekId: string, dayId: string): void {
        event.stopPropagation();

        if (!this.isDayComplete(weekId, dayId)) {
            const scrollX = window.scrollX;
            const scrollY = window.scrollY;
            this._programImportService.markDayComplete(weekId, dayId);
            if (this.scrollFrameId !== undefined) {
                cancelAnimationFrame(this.scrollFrameId);
            }
            this.scrollFrameId = requestAnimationFrame(() => {
                this.scrollFrameId = undefined;
                window.scrollTo(scrollX, scrollY);
            });
        }
    }

    public trackDayById(index: number, day: ImportedProgramDay): string {
        return day.id;
    }

    public trackWeekById(index: number, week: ImportedProgramWeek): string {
        return week.id;
    }

    public isDayComplete(weekId: string, dayId: string): boolean {
        const completion = this._programImportService.getDayCompletion(weekId, dayId);
        return completion.total > 0 && completion.completed === completion.total;
    }

    public onCompletionColorChange(color: string): void {
        this.completionColor = color;
        this._programImportService.saveCompletionColor(color);
        this.refreshCompletionStyles();
    }

    private refreshCompletionStyles(): void {
        this.completionStyles = {
            '--completion-color': this.completionColor,
            '--completion-color-soft': this.hexToRgba(this.completionColor, 0.12),
            '--completion-color-softer': this.hexToRgba(this.completionColor, 0.06)
        };
    }

    public getExercisePreview(exercises: ImportedProgramExercise[]): string[] {
        return exercises.reduce((exerciseNames, exercise) => {
            if (exercise.exerciseName && exerciseNames.indexOf(exercise.exerciseName) === -1) {
                exerciseNames.push(exercise.exerciseName);
            }

            return exerciseNames;
        }, [] as string[]);
    }

    private selectWeekFromProgram(): void {
        if (!this.program || !this.program.weeks.length) {
            this.selectedWeek = undefined;
            this.weekCards = [];
            this.dayCards = [];
            return;
        }

        const hasRequestedWeek = !!this.selectedWeekId;
        const requestedWeek = this.program.weeks.find(week => week.id === this.selectedWeekId);
        const currentWorkout = !hasRequestedWeek
            ? this._programImportService.getCurrentWorkout(this.program)
            : undefined;
        this.selectedWeek = requestedWeek || currentWorkout?.week || this.program.weeks[0];
        this.selectedWeekId = this.selectedWeek.id;

        if (!requestedWeek && currentWorkout) {
            this.pendingFocusWeekId = currentWorkout.week.id;
            this.pendingFocusDayId = currentWorkout.day.id;
            this.queueRequestedFocus();
        }

        if (this.pendingFocusWeekId && hasRequestedWeek && !requestedWeek) {
            this.pendingFocusWeekId = undefined;
        }
        if (this.pendingFocusDayId && !this.selectedWeek.days.some(day => day.id === this.pendingFocusDayId)) {
            this.pendingFocusDayId = undefined;
        }

        this.refreshDayCards();
    }

    private refreshProgramCards(): void {
        const progressByProgram = this._programImportService.getProgramProgresses(this.programs);
        this.programCards = this.programs.map(program => {
            const progress = progressByProgram.get(program.id) || {
                completed: 0,
                total: 0,
                started: 0
            };
            const status = this.getStatusFromProgress(progress);

            return {
                program,
                status,
                statusLabel: this.formatProgramStatus(status),
                statusClass: `program-import__library-status--${status}`,
                progressLabel: `${progress.completed}/${progress.total} ${this.t('global.Days', undefined, 'days')}`,
                progressPercent: progress.total ? (progress.completed / progress.total) * 100 : 0
            };
        });
    }

    private refreshProgramView(): void {
        this.refreshWeekCards();
        this.refreshDayCards();
    }

    private refreshWeekCards(): void {
        this.weekCards = this.program ? this.program.weeks.map(week => ({
            ...week,
            complete: this._programImportService.isWeekComplete(week.id)
        })) : [];
    }

    private refreshDayCards(): void {
        this.dayCards = this.selectedWeek ? this.selectedWeek.days.map(day => this.createDayCard(day)) : [];
    }

    private createDayCard(day: ImportedProgramDay): ProgramDayCard {
        const completion = this._programImportService.getDayCompletion(this.selectedWeek.id, day.id);
        const elapsedMs = this._programImportService.getDayElapsedMs(this.selectedWeek.id, day.id);

        return {
            ...day,
            completionLabel: `${completion.completed}/${completion.total}`,
            completionPercent: completion.total ? (completion.completed / completion.total) * 100 : 0,
            complete: completion.total > 0 && completion.completed === completion.total,
            elapsedLabel: elapsedMs ? this._programImportService.formatElapsedMs(elapsedMs) : '',
            exercisePreview: this.getExercisePreview(day.exercises)
        };
    }

    private focusRequestedDay(): void {
        if (!this.pendingFocusDayId || !this.dayCardElements) {
            return;
        }

        const dayElement = this.dayCardElements.find(element =>
            element.nativeElement.dataset.dayId === this.pendingFocusDayId
        );

        if (!dayElement) {
            return;
        }

        dayElement.nativeElement.scrollIntoView({
            behavior: 'auto',
            block: 'center',
            inline: 'center'
        });
        dayElement.nativeElement.focus({ preventScroll: true });
        this.pendingFocusDayId = undefined;
    }

    private focusRequestedWeek(): void {
        if (!this.pendingFocusWeekId || !this.weekTabElements) {
            return;
        }

        const weekElement = this.weekTabElements.find(element =>
            element.nativeElement.dataset.weekId === this.pendingFocusWeekId
        );

        if (!weekElement) {
            return;
        }

        weekElement.nativeElement.scrollIntoView({
            behavior: 'auto',
            block: 'nearest',
            inline: 'center'
        });
        this.pendingFocusWeekId = undefined;
    }

    private queueRequestedFocus(): void {
        if (!this.pendingFocusWeekId && !this.pendingFocusDayId) {
            return;
        }

        if (this.focusTimerId !== undefined) {
            clearTimeout(this.focusTimerId);
        }

        this.focusTimerId = setTimeout(() => {
            this.focusTimerId = undefined;
            this.focusRequestedWeek();
            this.focusRequestedDay();
        });
    }

    private formatProgramStatus(status: ProgramImportStatus): string {
        if (status === 'complete') {
            return this.t('global.Complete', undefined, 'Complete');
        }

        return status === 'in-progress'
            ? this.t('log-entry.InProgress', undefined, 'In progress')
            : this.t('log-entry.NotStarted', undefined, 'Not started');
    }

    private getStatusFromProgress(progress: { completed: number, total: number, started: number }): ProgramImportStatus {
        if (progress.total > 0 && progress.completed === progress.total) {
            return 'complete';
        }

        return progress.started > 0 ? 'in-progress' : 'not-started';
    }

    private async confirmAndDeleteProgram(program: ImportedProgram): Promise<void> {
        const confirmed = await swal({
            title: this.t('program-import.DeleteTitle', undefined, 'Delete imported program?'),
            text: this.t(
                'program-import.DeleteText',
                { name: program.name },
                `"${program.name}" and its saved workout progress will be removed.`
            ),
            icon: 'warning',
            buttons: [
                this.t('global.CancelLabel', undefined, 'Cancel'),
                this.t('global.DeleteLabel', undefined, 'Delete')
            ],
            dangerMode: true
        });

        if (!confirmed) {
            return;
        }

        this._programImportService.clearProgram(program.id);
    }

    private hexToRgba(hex: string, alpha: number): string {
        const normalized = hex.replace('#', '');
        const red = parseInt(normalized.substring(0, 2), 16);
        const green = parseInt(normalized.substring(2, 4), 16);
        const blue = parseInt(normalized.substring(4, 6), 16);

        return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
    }

    private buildReviewedPrescription(exercise: ImportedProgramExercise): string {
        const parts: string[] = [];
        const percentage = /%/.test(exercise.weight || '')
            ? exercise.weight
            : exercise.percentage1Rm;
        if (percentage && exercise.reps && exercise.sets) {
            parts.push(`${exercise.sets} x ${exercise.reps} @ ${percentage}`);
        } else if (exercise.weight && exercise.reps && exercise.sets) {
            parts.push(`${exercise.weight} x ${exercise.reps} x ${exercise.sets}`);
        } else if (exercise.sets && exercise.reps) {
            parts.push(`${exercise.sets} x ${exercise.reps}`);
        } else {
            if (exercise.weight) parts.push(`Weight: ${exercise.weight}`);
            if (exercise.sets) parts.push(`Sets: ${exercise.sets}`);
            if (exercise.reps) parts.push(`Reps: ${exercise.reps}`);
        }
        if (exercise.percentage1Rm && !percentage) parts.push(exercise.percentage1Rm);
        if (exercise.rest) parts.push(`Rest: ${exercise.rest}`);
        if (exercise.tempo) parts.push(`Tempo: ${exercise.tempo}`);
        if (exercise.rpe) parts.push(`RPE: ${exercise.rpe}`);
        if (exercise.notes) parts.push(`Notes: ${exercise.notes}`);
        return parts.join(' | ') || exercise.prescription || '';
    }

    private get workbookWeightMeasure(): WeightMeasure {
        return this._profileService?.profile.unitSystem === 'metric' ? 'kg' : 'lbs';
    }

    private roundTrainingMax(value: number): number {
        return Math.round(value * 2) / 2;
    }

    private formatImportWarning(warning: ProgramImportWarning): string {
        switch (warning.code) {
            case 'workbook-unreadable':
                return this.t('program-import.WorkbookUnreadable', undefined, 'The workbook could not be read.');
            case 'workbook-empty':
                return this.t('program-import.WorkbookEmpty', undefined, 'The workbook does not contain any non-empty sheets.');
            case 'workbook-too-complex':
                return this.t('program-import.WorkbookTooComplex', undefined, 'The workbook is too large or complex to import safely.');
            case 'no-workout-rows':
                return this.t(
                    'program-import.NoWorkoutRows',
                    undefined,
                    'No workout rows were detected. Check that the sheet includes exercise names and prescriptions.'
                );
            case 'low-confidence':
                return this.t(
                    'program-import.LowConfidence',
                    undefined,
                    'This workbook layout was only partially recognized. Review and clean up the detected rows before saving.'
                );
            case 'unknown-formulas':
                return this.t(
                    warning.count === 1
                        ? 'program-import.UnknownFormula'
                        : 'program-import.UnknownFormulas',
                    { count: warning.count || 0 },
                    `${warning.count || 0} workbook formulas could not be recalculated and will use Excel's saved values.`
                );
        }
    }

    private t(key: string, params?: object, fallback?: string): string {
        return this._translatorService
            ? this._translatorService.translate.instant(key, params)
            : fallback || key;
    }
}

type ProgramImportStatus = 'complete' | 'in-progress' | 'not-started';

interface ProgramImportCard {
    program: ImportedProgram;
    status: ProgramImportStatus;
    statusLabel: string;
    statusClass: string;
    progressLabel: string;
    progressPercent: number;
}

interface ProgramWeekCard extends ImportedProgramWeek {
    complete: boolean;
}

interface ProgramDayCard extends ImportedProgramDay {
    completionLabel: string;
    completionPercent: number;
    complete: boolean;
    elapsedLabel: string;
    exercisePreview: string[];
}
