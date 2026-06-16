import { inject, Injectable, signal } from '@angular/core';
import { Duration } from 'luxon';

import { Exercise } from '../../../shared/models/exercise.model';
import {
    DistanceMeasure,
    PersistedExercise,
    SimpleLog,
    WeightMeasure
} from '../../../shared/models/simple-log.model';
import {
    ImportedProgramDay,
    ImportedProgramWeek,
    ImportedWorkoutState
} from '../../../shared/models/imported-program.model';
import { ProgramImportService } from '../../../shared/services/program-import.service';
import { MeasureConversionService } from '../../../shared/services/measure-conversion.service';
import { WorkoutTimingState } from './workout-timing.store';

/** The active weight/distance units a workout is displayed in. */
export interface ActiveMeasures {
    weightMeasure: WeightMeasure;
    distanceMeasure: DistanceMeasure;
}

/** Result of loading an imported workout into a hydrated log. */
export interface LoadedImportedWorkout {
    log: SimpleLog;
    state?: ImportedWorkoutState;
    /** True when measure conversion changed the stored values and a re-save is due. */
    needsResave: boolean;
}

/**
 * Component-scoped orchestration for imported-program workouts in the simple
 * log. Owns the active week/day context, builds a hydrated `SimpleLog` from the
 * persisted program state (hydration + measure conversion) and persists workout
 * state back. The host component still owns `currentLog`, timing and header
 * wiring. State is exposed as signals so OnPush views update without manual
 * change detection. Provided per component instance, not in root.
 */
@Injectable()
export class ImportedWorkoutStore {
    private _programImportService = inject(ProgramImportService);
    private _measureConversionService = inject(MeasureConversionService);

    public readonly week = signal<ImportedProgramWeek | undefined>(undefined);
    public readonly day = signal<ImportedProgramDay | undefined>(undefined);
    public readonly isActive = signal<boolean>(false);

    /** Clear imported context (returning to a plain simple log). */
    public clear(): void {
        this.isActive.set(false);
        this.week.set(undefined);
        this.day.set(undefined);
    }

    public setActiveProgram(programId: string): void {
        this._programImportService.setActiveProgram(programId);
    }

    public programId(): string | undefined {
        return this._programImportService.getProgram()?.id;
    }

    /** Whether the given week/day is already the active imported workout. */
    public isSameWorkout(weekId: string, dayId: string): boolean {
        return this.isActive() && this.week()?.id === weekId && this.day()?.id === dayId;
    }

    /**
     * Resolve the week/day and build a hydrated `SimpleLog` for the imported
     * workout, converting to the active measures. Returns null when the
     * week/day can't be found. `state` is the persisted workout state (or
     * undefined) so the caller can hydrate timing; `needsResave` flags when
     * measure conversion changed the stored values.
     */
    public load(weekId: string, dayId: string, measures: ActiveMeasures): LoadedImportedWorkout | null {
        const week = this._programImportService.getWeek(weekId);
        const day = this._programImportService.getDay(weekId, dayId);
        this.week.set(week);
        this.day.set(day);

        if (!week || !day) {
            return null;
        }

        const state = this._programImportService.getWorkoutState(weekId, dayId);
        const log = new SimpleLog();
        log.title = `${week.name} - ${day.name}`;
        if (state?.startedAt) {
            const startedAt = new Date(state.startedAt);
            if (Number.isFinite(startedAt.getTime())) {
                log.startDatim = startedAt;
            }
        }

        const sourceWeightMeasure = state?.weightMeasure
            || this._programImportService.getProgram()?.weightMeasure
            || 'lbs';
        const exercises = state
            ? this.hydrateExercises(state.exercises)
            : this._programImportService.createExercisesForDay(day);
        log.exercises = this._measureConversionService.convertWeights(exercises, sourceWeightMeasure, measures.weightMeasure);
        log.cardioExercises = state && state.cardioExercises
            ? this._measureConversionService.convertDistances(
                this.hydrateExercises(state.cardioExercises),
                state.distanceMeasure || 'km',
                measures.distanceMeasure
            )
            : [];
        this.isActive.set(true);

        const needsResave = state
            ? sourceWeightMeasure !== measures.weightMeasure || (state.distanceMeasure || 'km') !== measures.distanceMeasure
            : false;

        return { log, state, needsResave };
    }

    /** Persist the current imported workout state. No-op when not active. */
    public save(log: SimpleLog, measures: ActiveMeasures, timing: WorkoutTimingState): void {
        const week = this.week();
        const day = this.day();
        if (!this.isActive() || !week || !day) {
            return;
        }

        const program = this._programImportService.getProgram();
        if (!program) {
            return;
        }

        this._programImportService.saveWorkoutState({
            programId: program.id,
            weekId: week.id,
            dayId: day.id,
            weightMeasure: measures.weightMeasure,
            distanceMeasure: measures.distanceMeasure,
            exercises: log.exercises,
            cardioExercises: log.cardioExercises,
            ...timing
        });
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
}
