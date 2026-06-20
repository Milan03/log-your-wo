import { ChangeDetectionStrategy, DestroyRef, Component, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Params, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { Exercise } from '../../../shared/models/exercise.model';
import {
    ImportedProgram,
    ImportedProgramDay,
    ImportedProgramWeek,
    ImportedWorkoutState
} from '../../../shared/models/imported-program.model';
import { UnitSystem } from '../../../shared/models/profile.model';
import { DistanceMeasure, SavedSimpleLog, WeightMeasure } from '../../../shared/models/simple-log.model';
import { MeasureConversionService } from '../../../shared/services/measure-conversion.service';
import { ProfileService } from '../../../shared/services/profile.service';
import { ProgramImportService } from '../../../shared/services/program-import.service';
import { SimpleLogService } from '../../../shared/services/simple-log.service';

interface ProgressSummaryCard {
    labelKey: string;
    value: string;
    detail?: string;
}

interface ProgressSummaryTotals {
    totalWorkouts: number;
    startedWorkouts: number;
    completedWorkouts: number;
    elapsedMs: number;
    strengthVolume: number;
    cardioDistance: number;
    entryCount: number;
}

interface ProgressSummarySection {
    id: 'combined' | 'simple-log' | 'import-program';
    titleKey: string;
    descriptionKey: string;
    cards: ProgressSummaryCard[];
}

interface ProgressWorkoutSummary {
    title: string;
    date: Date;
    route: string[];
    queryParams?: Params;
    cards: ProgressSummaryCard[];
}

@Component({
    selector: 'app-progress-summary',
    standalone: true,
    imports: [RouterLink, TranslateModule],
    templateUrl: './progress-summary.component.html',
    styleUrls: ['./progress-summary.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProgressSummaryComponent implements OnInit {
    private readonly destroyRef = inject(DestroyRef);
    private readonly simpleLogService = inject(SimpleLogService);
    private readonly programImportService = inject(ProgramImportService);
    private readonly measureConversion = inject(MeasureConversionService);
    private readonly profileService = inject(ProfileService, { optional: true });

    public readonly logs = signal<SavedSimpleLog[]>([]);
    public readonly programs = signal<ImportedProgram[]>([]);
    public readonly importedWorkoutStates = signal<ImportedWorkoutState[]>([]);
    private readonly unitSystem = signal<UnitSystem>(this.profileService?.profile?.unitSystem || 'imperial');
    public readonly hasProgress = computed(() => Boolean(this.logs().length || this.programs().length));
    public readonly summarySections = computed(() => this.buildSummarySections());
    public readonly latestWorkout = computed(() => this.getLatestWorkout());
    public readonly latestWorkoutCards = computed(() => this.latestWorkout()?.cards || []);
    public readonly latestWorkoutDateLabel = computed(() => {
        const latest = this.latestWorkout();
        if (!latest) {
            return '';
        }

        return latest.date.toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    });

    public ngOnInit(): void {
        this.logs.set(this.simpleLogService.getLogs());
        this.refreshImportedProgress();

        this.simpleLogService.logs$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(logs => this.logs.set(logs));

        this.programImportService.programs$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.refreshImportedProgress());

        if (this.profileService?.profile$) {
            this.profileService.profile$
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe(profile => this.unitSystem.set(profile.unitSystem));
        }
    }

    public get weightMeasure(): WeightMeasure {
        return this.unitSystem() === 'metric' ? 'kg' : 'lbs';
    }

    public get distanceMeasure(): DistanceMeasure {
        return this.unitSystem() === 'metric' ? 'km' : 'mi';
    }

    public getSummarySections(): ProgressSummarySection[] {
        return this.summarySections();
    }

    public getLatestWorkoutCards(): ProgressSummaryCard[] {
        return this.latestWorkoutCards();
    }

    public getLatestWorkoutDateLabel(): string {
        return this.latestWorkoutDateLabel();
    }

    public statusLabelKey(log: SavedSimpleLog | ImportedWorkoutState): string {
        if (log.completedAt) {
            return 'log-entry.Completed';
        }

        return log.startedAt ? 'log-entry.InProgress' : 'log-entry.NotStarted';
    }

    private buildSummarySections(): ProgressSummarySection[] {
        const simpleTotals = this.getSimpleLogTotals();
        const importedTotals = this.getImportedProgramTotals();
        const combinedTotals = this.combineTotals(simpleTotals, importedTotals);

        return [
            {
                id: 'combined',
                titleKey: 'log-entry.CombinedProgress',
                descriptionKey: 'log-entry.CombinedProgressDescription',
                cards: this.getSummaryCards(combinedTotals)
            },
            {
                id: 'simple-log',
                titleKey: 'log-entry.SimpleLogWorkouts',
                descriptionKey: 'log-entry.SimpleLogWorkoutsDescription',
                cards: this.getSummaryCards(simpleTotals)
            },
            {
                id: 'import-program',
                titleKey: 'log-entry.ImportProgramWorkouts',
                descriptionKey: 'log-entry.ImportProgramWorkoutsDescription',
                cards: this.getSummaryCards(importedTotals)
            }
        ];
    }

    private refreshImportedProgress(): void {
        this.programs.set(this.programImportService.getPrograms());
        this.importedWorkoutStates.set(this.programImportService.getWorkoutStates());
    }

    private getSummaryCards(totals: ProgressSummaryTotals): ProgressSummaryCard[] {
        return [
            {
                labelKey: 'log-entry.TotalWorkouts',
                value: this.formatInteger(totals.totalWorkouts)
            },
            {
                labelKey: 'log-entry.StartedWorkouts',
                value: this.formatInteger(totals.startedWorkouts)
            },
            {
                labelKey: 'log-entry.CompletedWorkouts',
                value: this.formatInteger(totals.completedWorkouts)
            },
            {
                labelKey: 'log-entry.TotalTime',
                value: this.formatElapsedMs(totals.elapsedMs)
            },
            {
                labelKey: 'log-entry.StrengthVolume',
                value: this.formatMeasureValue(totals.strengthVolume),
                detail: this.weightMeasure
            },
            {
                labelKey: 'log-entry.CardioDistance',
                value: this.formatMeasureValue(totals.cardioDistance),
                detail: this.distanceMeasure
            },
            {
                labelKey: 'log-entry.TotalEntries',
                value: this.formatInteger(totals.entryCount)
            }
        ];
    }

    private getSimpleLogTotals(): ProgressSummaryTotals {
        const logs = this.logs();

        return {
            totalWorkouts: logs.length,
            startedWorkouts: logs.filter(log => this.isStartedLog(log)).length,
            completedWorkouts: logs.filter(log => Boolean(log.completedAt)).length,
            elapsedMs: logs.reduce((total, log) => total + (log.elapsedMs || 0), 0),
            strengthVolume: logs.reduce((total, log) => total + this.calculateSavedStrengthVolume(log), 0),
            cardioDistance: logs.reduce((total, log) => total + this.calculateSavedCardioDistance(log), 0),
            entryCount: logs.reduce((total, log) => total + this.countSavedEntries(log), 0)
        };
    }

    private getImportedProgramTotals(): ProgressSummaryTotals {
        const programs = this.programs();
        const states = this.importedStatesForCurrentPrograms();
        const statesByWorkout = new Map(states.map(state => [this.importedWorkoutKey(state), state]));
        const progressByProgram = this.programImportService.getProgramProgresses(programs);
        const entryCount = programs.reduce((programTotal, program) => programTotal + program.weeks.reduce(
            (weekTotal, week) => weekTotal + week.days.reduce((dayTotal, day) => {
                const state = statesByWorkout.get(`${program.id}:${week.id}:${day.id}`);
                return dayTotal + (state ? this.countStateEntries(state) : day.exercises.length);
            }, 0),
            0
        ), 0);

        return {
            totalWorkouts: programs.reduce((total, program) =>
                total + program.weeks.reduce((weekTotal, week) => weekTotal + week.days.length, 0),
            0),
            startedWorkouts: Array.from(progressByProgram.values()).reduce((total, progress) => total + progress.started, 0),
            completedWorkouts: Array.from(progressByProgram.values()).reduce((total, progress) => total + progress.completed, 0),
            elapsedMs: states.reduce((total, state) => total + (state.elapsedMs || 0), 0),
            strengthVolume: states.reduce((total, state) => total + this.calculateStateStrengthVolume(state), 0),
            cardioDistance: states.reduce((total, state) => total + this.calculateStateCardioDistance(state), 0),
            entryCount
        };
    }

    private combineTotals(...totals: ProgressSummaryTotals[]): ProgressSummaryTotals {
        return totals.reduce((combined, current) => ({
            totalWorkouts: combined.totalWorkouts + current.totalWorkouts,
            startedWorkouts: combined.startedWorkouts + current.startedWorkouts,
            completedWorkouts: combined.completedWorkouts + current.completedWorkouts,
            elapsedMs: combined.elapsedMs + current.elapsedMs,
            strengthVolume: combined.strengthVolume + current.strengthVolume,
            cardioDistance: combined.cardioDistance + current.cardioDistance,
            entryCount: combined.entryCount + current.entryCount
        }), this.emptyTotals());
    }

    private getLatestWorkout(): ProgressWorkoutSummary | undefined {
        const latestSimpleLog = this.logs()
            .map(log => this.createSimpleWorkoutSummary(log))
            .filter(Boolean)
            .sort((first, second) => second.date.getTime() - first.date.getTime())[0];
        const latestImportedWorkout = this.importedStatesForCurrentPrograms()
            .map(state => this.createImportedWorkoutSummary(state))
            .filter(Boolean)
            .sort((first, second) => second.date.getTime() - first.date.getTime())[0];

        return [latestSimpleLog, latestImportedWorkout]
            .filter(Boolean)
            .sort((first, second) => second.date.getTime() - first.date.getTime())[0];
    }

    private createSimpleWorkoutSummary(log: SavedSimpleLog): ProgressWorkoutSummary {
        const date = this.dateFromLog(log);

        return {
            title: log.title || 'Simple Log',
            date,
            route: ['/log-entry/simple-log'],
            queryParams: { logId: log.id },
            cards: [
                {
                    labelKey: 'log-entry.Status',
                    value: this.statusLabelKey(log)
                },
                {
                    labelKey: 'log-entry.ExercisesDone',
                    value: `${this.countCompletedExercises(log)}/${this.countExercises(log)}`,
                    detail: 'global.Entries'
                },
                {
                    labelKey: 'log-entry.ElapsedTime',
                    value: this.formatElapsedMs(log.elapsedMs || 0)
                },
                {
                    labelKey: 'log-entry.StrengthVolume',
                    value: this.formatMeasureValue(this.calculateSavedStrengthVolume(log)),
                    detail: this.weightMeasure
                }
            ]
        };
    }

    private createImportedWorkoutSummary(state: ImportedWorkoutState): ProgressWorkoutSummary | undefined {
        const workout = this.findImportedWorkout(state);
        if (!workout) {
            return undefined;
        }

        return {
            title: `${workout.program.name}: ${workout.week.name} - ${workout.day.name}`,
            date: this.dateFromImportedState(state),
            route: ['/log-entry/simple-log'],
            queryParams: {
                programId: state.programId,
                weekId: state.weekId,
                dayId: state.dayId
            },
            cards: [
                {
                    labelKey: 'log-entry.Status',
                    value: this.statusLabelKey(state)
                },
                {
                    labelKey: 'log-entry.ExercisesDone',
                    value: `${this.countCompletedStateExercises(state)}/${this.countStateEntries(state)}`,
                    detail: 'global.Entries'
                },
                {
                    labelKey: 'log-entry.ElapsedTime',
                    value: this.formatElapsedMs(state.elapsedMs || 0)
                },
                {
                    labelKey: 'log-entry.StrengthVolume',
                    value: this.formatMeasureValue(this.calculateStateStrengthVolume(state)),
                    detail: this.weightMeasure
                }
            ]
        };
    }

    private calculateSavedStrengthVolume(log: SavedSimpleLog): number {
        return this.calculateStrengthVolume(this.convertWeightExercises(
            (log.exercises || []) as Exercise[],
            log.weightMeasure || 'lbs'
        ));
    }

    private calculateSavedCardioDistance(log: SavedSimpleLog): number {
        return this.calculateCardioDistance(this.convertDistanceExercises(
            (log.cardioExercises || []) as Exercise[],
            log.distanceMeasure || 'km'
        ));
    }

    private calculateStateStrengthVolume(state: ImportedWorkoutState): number {
        return this.calculateStrengthVolume(this.convertWeightExercises(
            (state.exercises || []) as Exercise[],
            state.weightMeasure || this.findProgram(state.programId)?.weightMeasure || 'lbs'
        ));
    }

    private calculateStateCardioDistance(state: ImportedWorkoutState): number {
        return this.calculateCardioDistance(this.convertDistanceExercises(
            (state.cardioExercises || []) as Exercise[],
            state.distanceMeasure || 'km'
        ));
    }

    private convertWeightExercises(exercises: Exercise[], sourceMeasure: WeightMeasure): Exercise[] {
        return this.measureConversion.convertWeights(exercises, sourceMeasure, this.weightMeasure);
    }

    private convertDistanceExercises(exercises: Exercise[], sourceMeasure: DistanceMeasure): Exercise[] {
        return this.measureConversion.convertDistances(exercises, sourceMeasure, this.distanceMeasure);
    }

    private calculateStrengthVolume(exercises: Exercise[] = []): number {
        return exercises.reduce((total, exercise) => {
            const weight = this.numericValue(exercise.weight);
            const reps = this.numericValue(exercise.reps);
            const sets = this.numericValue(exercise.sets);

            return weight && reps && sets
                ? total + (weight * reps * sets)
                : total;
        }, 0);
    }

    private calculateCardioDistance(exercises: Exercise[] = []): number {
        return exercises.reduce((total, exercise) => total + this.numericValue(exercise.distance), 0);
    }

    private countExercises(log: SavedSimpleLog): number {
        return this.countSavedEntries(log);
    }

    private countSavedEntries(log: SavedSimpleLog): number {
        return (log.exercises || []).length + (log.cardioExercises || []).length;
    }

    private countCompletedExercises(log: SavedSimpleLog): number {
        return [...(log.exercises || []), ...(log.cardioExercises || [])]
            .filter(exercise => exercise.completed).length;
    }

    private countStateEntries(state: ImportedWorkoutState): number {
        return (state.exercises || []).length + (state.cardioExercises || []).length;
    }

    private countCompletedStateExercises(state: ImportedWorkoutState): number {
        return [...(state.exercises || []), ...(state.cardioExercises || [])]
            .filter(exercise => exercise.completed).length;
    }

    private isStartedLog(log: SavedSimpleLog): boolean {
        return Boolean(log.startedAt || log.elapsedMs || this.countSavedEntries(log));
    }

    private importedStatesForCurrentPrograms(): ImportedWorkoutState[] {
        const programIds = new Set(this.programs().map(program => program.id));
        return this.importedWorkoutStates().filter(state => programIds.has(state.programId));
    }

    private importedWorkoutKey(state: ImportedWorkoutState): string {
        return `${state.programId}:${state.weekId}:${state.dayId}`;
    }

    private findImportedWorkout(
        state: ImportedWorkoutState
    ): { program: ImportedProgram, week: ImportedProgramWeek, day: ImportedProgramDay } | undefined {
        const program = this.findProgram(state.programId);
        const week = program?.weeks.find(currentWeek => currentWeek.id === state.weekId);
        const day = week?.days.find(currentDay => currentDay.id === state.dayId);

        return program && week && day ? { program, week, day } : undefined;
    }

    private findProgram(programId: string): ImportedProgram | undefined {
        return this.programs().find(program => program.id === programId);
    }

    private dateFromLog(log: SavedSimpleLog): Date {
        return this.validDate(log.updatedAt)
            || this.validDate(log.completedAt)
            || this.validDate(log.startedAt)
            || this.validDate(log.workoutDateTime)
            || this.dateFromInputValue(log.workoutDate);
    }

    private dateFromImportedState(state: ImportedWorkoutState): Date {
        return this.validDate(state.updatedAt)
            || this.validDate(state.completedAt)
            || this.validDate(state.startedAt)
            || new Date(0);
    }

    private validDate(value: string | undefined): Date | undefined {
        if (!value) {
            return undefined;
        }

        const date = new Date(value);
        return Number.isFinite(date.getTime()) ? date : undefined;
    }

    private emptyTotals(): ProgressSummaryTotals {
        return {
            totalWorkouts: 0,
            startedWorkouts: 0,
            completedWorkouts: 0,
            elapsedMs: 0,
            strengthVolume: 0,
            cardioDistance: 0,
            entryCount: 0
        };
    }

    private numericValue(value: number | string | undefined): number {
        if (value === undefined || value === null || String(value).trim() === '') {
            return 0;
        }

        const normalized = String(value).trim();
        return /^-?\d+(?:\.\d+)?$/.test(normalized)
            ? Number(normalized)
            : 0;
    }

    private formatMeasureValue(value: number): string {
        return new Intl.NumberFormat(undefined, {
            maximumFractionDigits: value < 10 && value % 1 !== 0 ? 1 : 0
        }).format(value);
    }

    private formatInteger(value: number): string {
        return new Intl.NumberFormat(undefined, {
            maximumFractionDigits: 0
        }).format(value);
    }

    private formatElapsedMs(elapsedMs: number): string {
        const totalSeconds = Math.floor(elapsedMs / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const pad = (value: number) => value < 10 ? `0${value}` : `${value}`;

        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }

    private dateFromInputValue(value: string): Date {
        const [year, month, day] = value.split('-').map(part => Number(part));
        return new Date(year, month - 1, day, 12);
    }
}
