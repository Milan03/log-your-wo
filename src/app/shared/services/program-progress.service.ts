import { Injectable } from '@angular/core';

import {
    ImportedProgram,
    ImportedProgramDay,
    ImportedProgramWeek,
    ImportedWorkoutState
} from '../models/imported-program.model';

/** Aggregate completion counts for a program. */
export interface ProgramProgress {
    completed: number;
    total: number;
    started: number;
}

/** Completion counts for a single workout day. */
export interface DayCompletion {
    completed: number;
    total: number;
}

/**
 * Stateless progress/stats calculations for imported programs. Every method is
 * pure over the program and workout-state data it is handed — no storage, no
 * cloud, no `Exercise` construction — so `ProgramImportService` can own
 * persistence and delegate the maths here.
 */
@Injectable({ providedIn: 'root' })
export class ProgramProgressService {
    /** Format milliseconds as `HH:MM:SS`. */
    public formatElapsedMs(elapsedMs: number): string {
        const totalSeconds = Math.floor(elapsedMs / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const pad = (value: number) => value < 10 ? `0${value}` : `${value}`;

        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }

    /** Elapsed time between two ISO instants, less paused time, clamped at 0. */
    public calculateElapsedMs(startedAt: string, completedAt: string, totalPausedMs: number): number {
        return Math.max(new Date(completedAt).getTime() - new Date(startedAt).getTime() - totalPausedMs, 0);
    }

    /** Elapsed time recorded for a workout state (stored value or derived). */
    public dayElapsedMs(state: ImportedWorkoutState | undefined): number {
        if (!state) {
            return 0;
        }

        if (state.elapsedMs) {
            return state.elapsedMs;
        }

        if (state.startedAt && state.completedAt) {
            return this.calculateElapsedMs(state.startedAt, state.completedAt, state.totalPausedMs || 0);
        }

        return 0;
    }

    /**
     * Completed/total exercise counts for a day. Without a saved state the day's
     * prescribed exercises are all considered incomplete.
     */
    public dayCompletion(day: ImportedProgramDay | undefined, state: ImportedWorkoutState | undefined): DayCompletion {
        if (state) {
            const allExercises = [...state.exercises, ...(state.cardioExercises || [])];
            return {
                completed: allExercises.filter(exercise => exercise.completed).length,
                total: allExercises.length
            };
        }

        return { completed: 0, total: day ? day.exercises.length : 0 };
    }

    /** Whether every day in the week is fully completed. */
    public weekComplete(
        week: ImportedProgramWeek | undefined,
        dayCompletionFor: (dayId: string) => DayCompletion
    ): boolean {
        if (!week || !week.days.length) {
            return false;
        }

        return week.days.every(day => {
            const completion = dayCompletionFor(day.id);
            return completion.total > 0 && completion.completed === completion.total;
        });
    }

    /** Completed/started/total day counts for one program. */
    public programProgress(program: ImportedProgram, states: ImportedWorkoutState[]): ProgramProgress {
        const statesByWorkout = new Map(states.map(state => [
            `${state.weekId}:${state.dayId}`,
            state
        ]));
        let completed = 0;
        let started = 0;
        let total = 0;

        program.weeks.forEach(week => {
            week.days.forEach(day => {
                total++;
                const state = statesByWorkout.get(`${week.id}:${day.id}`);

                if (!state) {
                    return;
                }

                const allExercises = [...state.exercises, ...(state.cardioExercises || [])];
                const completedExercises = allExercises.filter(exercise => exercise.completed).length;
                if (allExercises.length > 0 && completedExercises === allExercises.length) {
                    completed++;
                }

                if (state.startedAt || state.completedAt || state.elapsedMs || completedExercises > 0) {
                    started++;
                }
            });
        });

        return { completed, total, started };
    }

    /** Progress for several programs, given the full workout-state collection. */
    public programProgresses(
        programs: ImportedProgram[],
        allStates: ImportedWorkoutState[]
    ): Map<string, ProgramProgress> {
        const statesByProgram = new Map<string, ImportedWorkoutState[]>();
        allStates.forEach(state => {
            const states = statesByProgram.get(state.programId) || [];
            states.push(state);
            statesByProgram.set(state.programId, states);
        });

        return new Map(programs.map(program => [
            program.id,
            this.programProgress(program, statesByProgram.get(program.id) || [])
        ]));
    }

    public programStatus(progress: ProgramProgress): 'complete' | 'in-progress' | 'not-started' {
        if (progress.total > 0 && progress.completed === progress.total) {
            return 'complete';
        }

        if (progress.started > 0) {
            return 'in-progress';
        }

        return 'not-started';
    }

    /**
     * The next workout to surface: the most recently active incomplete workout,
     * else the first incomplete one, else the last workout in the program.
     */
    public currentWorkout(
        program: ImportedProgram,
        states: ImportedWorkoutState[]
    ): { week: ImportedProgramWeek, day: ImportedProgramDay } | undefined {
        if (!program) {
            return undefined;
        }

        const statesByWorkout = new Map(states.map(state => [
            `${state.weekId}:${state.dayId}`,
            state
        ]));
        const workouts = program.weeks.reduce((result, week) => {
            week.days.forEach(day => result.push({ week, day }));
            return result;
        }, [] as Array<{ week: ImportedProgramWeek, day: ImportedProgramDay }>);
        const incompleteWorkouts = workouts.filter(workout => {
            const state = statesByWorkout.get(`${workout.week.id}:${workout.day.id}`);
            const exercises = state
                ? [...state.exercises, ...(state.cardioExercises || [])]
                : undefined;
            return !exercises || exercises.length === 0 || exercises.some(exercise => !exercise.completed);
        });
        const inProgressWorkout = incompleteWorkouts
            .map(workout => ({
                workout,
                state: statesByWorkout.get(`${workout.week.id}:${workout.day.id}`)
            }))
            .filter(({ state }) => {
                const exercises = state ? [...state.exercises, ...(state.cardioExercises || [])] : [];
                return !!state && (
                    !!state.startedAt ||
                    !!state.pausedAt ||
                    !!state.elapsedMs ||
                    exercises.some(exercise => exercise.completed)
                );
            })
            .sort((first, second) =>
                this.stateActivityTimestamp(second.state).localeCompare(this.stateActivityTimestamp(first.state))
            )[0]?.workout;

        return inProgressWorkout || incompleteWorkouts[0] || workouts[workouts.length - 1];
    }

    private stateActivityTimestamp(state: ImportedWorkoutState): string {
        return state?.updatedAt || state?.completedAt || state?.pausedAt || state?.startedAt || '';
    }
}
