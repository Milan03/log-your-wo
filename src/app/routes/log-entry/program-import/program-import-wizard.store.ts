import { inject, Injectable, signal } from '@angular/core';

import {
    ImportedProgramExercise,
    ImportedProgramWeek,
    ProgramImportPreview,
    ProgramImportWarning,
    WorkbookImportInput
} from '../../../shared/models/imported-program.model';
import { TrainingMax } from '../../../shared/models/profile.model';
import { WeightMeasure } from '../../../shared/models/simple-log.model';
import { ProgramImportService } from '../../../shared/services/program-import.service';
import { ProfileService } from '../../../shared/services/profile.service';
import { TranslatorService } from '../../../core/translator/translator.service';

/**
 * Component-scoped state and logic for the workbook import/review wizard:
 * previewing an uploaded workbook, the optional training-max setup step,
 * reviewing/editing the parsed weeks, and confirming the import (saving the
 * program and any confirmed training maxes). The host component owns the
 * program-library/browse view and just delegates here. Provided per component
 * instance, not in root. State is exposed as signals so OnPush/zoneless views
 * update from writes without manual change detection.
 */
@Injectable()
export class ProgramImportWizardStore {
    public readonly isImporting = signal(false);
    public readonly importError = signal('');
    public readonly importPreview = signal<ProgramImportPreview>(undefined);
    public readonly importReviewStep = signal<'setup' | 'review'>('review');
    public readonly setupError = signal('');
    public readonly selectedReviewWeekIndex = signal(0);

    private pendingTrainingMaxes: TrainingMax[] = [];

    private _programImportService = inject(ProgramImportService);
    private _profileService = inject(ProfileService, { optional: true });
    private _translatorService = inject(TranslatorService, { optional: true });

    /** Preview an uploaded workbook, moving into the setup/review flow. */
    public async previewFromFile(file: File): Promise<void> {
        this.isImporting.set(true);
        this.importError.set('');
        this.pendingTrainingMaxes = [];

        try {
            const preview = await this._programImportService.previewWorkbook(file);
            if (!preview.program) {
                this.importError.set(preview.warningDetails?.[0]
                    ? this.formatImportWarning(preview.warningDetails[0])
                    : preview.warnings[0]
                    || this.t('program-import.ImportError', undefined, 'That workbook could not be imported. Try another .xlsx file.'));
            } else {
                this.importPreview.set(preview);
                this.initializeWorkbookSetup();
                this.selectedReviewWeekIndex.set(0);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : '';
            this.importError.set(/10 MB/.test(message)
                ? this.t('program-import.WorkbookTooLarge', undefined, 'Workbook files must be 10 MB or smaller.')
                : this.t('program-import.ImportError', undefined, 'That workbook could not be imported. Try another .xlsx file.'));
        } finally {
            this.isImporting.set(false);
        }
    }

    public async confirmImport(): Promise<void> {
        const preview = this.importPreview();
        if (!preview?.program) {
            return;
        }

        const program = {
            ...preview.program,
            weeks: preview.program.weeks.map(week => ({
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
            this.importError.set(this.t(
                'program-import.NoReviewRows',
                undefined,
                'Keep at least one exercise before saving the imported program.'
            ));
            return;
        }

        this._programImportService.saveProgram(program);
        const trainingMaxes = this.pendingTrainingMaxes;
        this.resetWizardState();

        if (this._profileService && trainingMaxes.length) {
            try {
                await this._profileService.saveTrainingMaxes(trainingMaxes);
            } catch {
                this.importError.set(this.t(
                    'program-import.MaxSyncError',
                    undefined,
                    'The program was saved, but the training maxes could not be synchronized.'
                ));
            }
        }
    }

    public cancelImportReview(): void {
        this.resetWizardState();
    }

    private resetWizardState(): void {
        this.importPreview.set(undefined);
        this.importReviewStep.set('review');
        this.setupError.set('');
        this.selectedReviewWeekIndex.set(0);
        this.importError.set('');
        this.pendingTrainingMaxes = [];
    }

    public async continueToImportReview(): Promise<void> {
        const preview = this.importPreview();
        if (!preview?.setup || !this.workbookSetupValid) {
            this.setupError.set(this.t(
                'program-import.SetupValidation',
                undefined,
                'Enter a number greater than zero for each required max.'
            ));
            return;
        }

        const values = preview.setup.inputs.reduce((result, input) => {
            result[input.id] = Number(input.value);
            return result;
        }, {} as { [inputId: string]: number });
        const applied = await this._programImportService.applyWorkbookInputs(preview, values);
        applied.program.weightMeasure = this.workbookWeightMeasure;
        this.importPreview.set(applied);
        this.importReviewStep.set('review');
        this.setupError.set('');

        if (this._profileService && applied.setup.inputs.length) {
            this.pendingTrainingMaxes = applied.setup.inputs.map(input => ({
                id: this._profileService.findTrainingMax(input.exerciseName)?.id || input.id,
                exerciseName: input.exerciseName,
                value: Number(input.value)
            }));
        }
    }

    public editWorkbookMaxes(): void {
        this.importReviewStep.set('setup');
        this.setupError.set('');
    }

    public get workbookSetupValid(): boolean {
        const setup = this.importPreview()?.setup;
        return Boolean(setup) && setup.inputs.every(input => this.isWorkbookInputValid(input));
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
        const preview = this.importPreview();
        preview.program.weeks[weekIndex].days[dayIndex].exercises.splice(exerciseIndex, 1);
        // Re-emit a new preview reference so the signal notifies after the
        // in-place splice (the nested program object is intentionally shared).
        this.importPreview.set({ ...preview });
    }

    public trackExerciseById(index: number, exercise: ImportedProgramExercise): string {
        return exercise.id;
    }

    public selectReviewWeek(index: number): void {
        const lastIndex = (this.importPreview()?.program?.weeks.length || 1) - 1;
        this.selectedReviewWeekIndex.set(Math.max(0, Math.min(index, lastIndex)));
    }

    public previousReviewWeek(): void {
        this.selectReviewWeek(this.selectedReviewWeekIndex() - 1);
    }

    public nextReviewWeek(): void {
        this.selectReviewWeek(this.selectedReviewWeekIndex() + 1);
    }

    public get selectedReviewWeek(): ImportedProgramWeek {
        return this.importPreview()?.program?.weeks[this.selectedReviewWeekIndex()];
    }

    public get reviewExerciseCount(): number {
        const preview = this.importPreview();
        if (!preview?.program) {
            return 0;
        }
        return preview.program.weeks.reduce((total, week) =>
            total + week.days.reduce((dayTotal, day) => dayTotal + day.exercises.length, 0), 0);
    }

    public get importWarnings(): string[] {
        const preview = this.importPreview();
        if (!preview) {
            return [];
        }
        return preview.warningDetails?.length
            ? preview.warningDetails.map(warning => this.formatImportWarning(warning))
            : preview.warnings;
    }

    private initializeWorkbookSetup(): void {
        const preview = this.importPreview();
        const setup = preview?.setup;
        if (!setup) {
            this.importReviewStep.set('review');
            return;
        }

        setup.inputs.forEach(input => {
            const savedMax = this._profileService?.findTrainingMax(input.exerciseName);
            const value = savedMax?.value ?? input.originalValue;
            input.value = Number.isFinite(Number(value))
                ? this.roundTrainingMax(Number(value))
                : value;
        });
        preview.program.weightMeasure = this.workbookWeightMeasure;
        this.importReviewStep.set('setup');
        this.setupError.set('');
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
                    'This workbook layout could not be recognized reliably. '
                    + 'Please email the workbook to milansobat03@gmail.com so support can be added.'
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
