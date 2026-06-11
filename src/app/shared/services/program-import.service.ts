import { Injectable, Optional } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import * as moment from 'moment';

import { Exercise } from '../models/exercise.model';
import {
    ImportedProgram,
    ImportedProgramDay,
    ImportedProgramWeek,
    ImportedWorkoutState,
    ProgramImportPreview
} from '../models/imported-program.model';
import { SupabaseDataService } from './supabase-data.service';
import { CloudSyncStatusService } from './cloud-sync-status.service';
import { ProgramWorkbookParserService } from './program-workbook-parser.service';

@Injectable({
    providedIn: 'root'
})
export class ProgramImportService {
    private readonly legacyProgramStorageKey = 'logYourWo.importedProgram';
    private readonly legacyProgramsStorageKey = 'logYourWo.importedPrograms';
    private readonly legacyWorkoutStorageKey = 'logYourWo.importedWorkoutStates';
    private readonly legacyCompletionColorStorageKey = 'logYourWo.completionColor';
    private readonly defaultCompletionColor = '#2fb379';
    private readonly maximumWorkbookBytes = 10 * 1024 * 1024;
    private activeUserId: string;
    private cloudWriteQueue: Promise<void> = Promise.resolve();
    private readonly deletedProgramIds = new Set<string>();
    private workoutStatesCacheRaw: string;
    private workoutStatesCache: ImportedWorkoutState[] = [];
    private readonly programSource = new BehaviorSubject<ImportedProgram>(this.getProgram());
    private readonly programsSource = new BehaviorSubject<ImportedProgram[]>(this.getPrograms());

    public program$ = this.programSource.asObservable();
    public programs$ = this.programsSource.asObservable();

    constructor(
        private cloudData?: SupabaseDataService,
        @Optional() private syncStatus?: CloudSyncStatusService,
        @Optional() private workbookParser?: ProgramWorkbookParserService
    ) { }

    public setUserContext(userId: string): void {
        this.activeUserId = userId;
        this.programsSource.next(this.getPrograms());
        this.programSource.next(this.getProgram());
    }

    public clearUserContext(): void {
        this.activeUserId = undefined;
        this.programsSource.next(this.getPrograms());
        this.programSource.next(this.getProgram());
    }

    public async syncWithCloud(): Promise<void> {
        if (!this.activeUserId) {
            return;
        }

        const userId = this.activeUserId;
        const accountProgramKey = this.programsStorageKey(userId);
        const accountWorkoutKey = this.workoutStorageKey(userId);
        await this.enqueueCloudWrite(
            () => this.retryPendingProgramDeletes(userId),
            'Unable to retry deleted imported programs.'
        );
        const [remotePrograms, remoteStates, preferences] = await Promise.all([
            this.cloudData.getPrograms(userId),
            this.cloudData.getWorkoutStates(userId),
            this.cloudData.getPreferences(userId)
        ]);
        const accountPrograms = this.readJson<ImportedProgram[]>(accountProgramKey, []);
        const guestPrograms = this.readJson<ImportedProgram[]>(this.legacyProgramsStorageKey, []);
        const guestActiveProgram = this.readJson<ImportedProgram>(this.legacyProgramStorageKey, undefined);
        const accountStates = this.readJson<ImportedWorkoutState[]>(accountWorkoutKey, []);
        const guestStates = this.readJson<ImportedWorkoutState[]>(this.legacyWorkoutStorageKey, []);
        const programs = this.excludeDeletedPrograms(this.mergePrograms(
            guestActiveProgram ? [guestActiveProgram, ...guestPrograms] : guestPrograms,
            accountPrograms,
            remotePrograms
        ), userId);
        const states = this.excludeDeletedWorkoutStates(
            this.mergeWorkoutStates(remoteStates, guestStates, accountStates),
            userId
        );
        const activeProgram = programs.find(program => program.id === preferences.activeProgramId)
            || guestActiveProgram
            || programs[0];
        const completionColor = preferences.completionColor
            || localStorage.getItem(this.legacyCompletionColorStorageKey)
            || this.defaultCompletionColor;

        await this.enqueueCloudWrite(async () => {
            const currentPrograms = this.excludeDeletedPrograms(programs, userId);
            const currentStates = this.excludeDeletedWorkoutStates(states, userId);
            await this.cloudData.savePrograms(userId, currentPrograms);
            await Promise.all([
                this.cloudData.saveWorkoutStates(userId, currentStates),
                this.cloudData.savePreferences(userId, {
                    activeProgramId: currentPrograms.some(program => program.id === activeProgram?.id)
                        ? activeProgram.id
                        : currentPrograms[0]?.id,
                    completionColor
                })
            ]);
        }, 'Unable to synchronize imported programs with Supabase.');

        if (this.activeUserId !== userId) {
            return;
        }

        const latestPrograms = this.readJson<ImportedProgram[]>(accountProgramKey, []);
        const latestStates = this.readJson<ImportedWorkoutState[]>(accountWorkoutKey, []);
        const latestActiveProgram = this.readJson<ImportedProgram>(this.programStorageKey(userId), undefined);
        const latestCompletionColor = localStorage.getItem(this.completionColorStorageKey(userId));
        const synchronizedPrograms = this.excludeDeletedPrograms(
            this.mergePrograms(programs, latestPrograms),
            userId
        );
        const synchronizedStates = this.excludeDeletedWorkoutStates(
            this.mergeWorkoutStates(states, latestStates),
            userId
        );
        const synchronizedActiveProgram = [latestActiveProgram, activeProgram, synchronizedPrograms[0]]
            .find(program => program && synchronizedPrograms.some(current => current.id === program.id));
        this.writePrograms(synchronizedPrograms, userId);
        this.writeWorkoutStates(synchronizedStates, userId);
        this.writeActiveProgram(synchronizedActiveProgram, userId);
        this.writeCompletionColor(latestCompletionColor || completionColor, userId);
        this.removeLegacyData();
        this.deletedProgramIds.clear();

        this.programsSource.next(this.getPrograms());
        this.programSource.next(this.getProgram());
    }

    public async importWorkbook(file: File): Promise<ImportedProgram> {
        const preview = await this.previewWorkbook(file);
        if (!preview.program || !preview.program.weeks.length) {
            throw new Error('No recognizable workout weeks were found in this workbook.');
        }

        this.saveProgram(preview.program);
        return preview.program;
    }

    public async previewWorkbook(file: File): Promise<ProgramImportPreview> {
        if (file.size > this.maximumWorkbookBytes) {
            throw new Error('Workbook files must be 10 MB or smaller.');
        }

        const data = await file.arrayBuffer();
        const parser = this.workbookParser || new ProgramWorkbookParserService();
        return parser.parse(data, file.name);
    }

    public getProgram(): ImportedProgram {
        const program = this.readJson<ImportedProgram>(this.programStorageKey(), undefined);

        if (program) {
            return this.normalizeProgram(program);
        }

        const programs = this.getPrograms();
        return programs.length ? programs[0] : undefined;
    }

    public getPrograms(): ImportedProgram[] {
        const programs = this.readJson<ImportedProgram[]>(this.programsStorageKey(), undefined);

        if (Array.isArray(programs)) {
            return programs
                .filter(program => program && typeof program === 'object')
                .map(program => this.normalizeProgram(program));
        }

        const legacyProgram = this.readJson<ImportedProgram>(this.programStorageKey(), undefined);
        return legacyProgram ? [this.normalizeProgram(legacyProgram)] : [];
    }

    public saveProgram(program: ImportedProgram): void {
        this.deletedProgramIds.delete(program.id);
        this.removePendingProgramDelete(program.id);
        this.saveProgramList([
            program,
            ...this.getPrograms().filter(currentProgram => currentProgram.id !== program.id)
        ]);
        this.writeActiveProgram(program);
        this.programSource.next(program);
        this.persistPrograms([program]);
        this.persistPreferences({ activeProgramId: program.id });
    }

    public setActiveProgram(programId: string): ImportedProgram {
        const program = this.getPrograms().find(currentProgram => currentProgram.id === programId);

        if (!program) {
            return undefined;
        }

        const activeProgram = this.getProgram();
        if (activeProgram && activeProgram.id === program.id) {
            return program;
        }

        this.writeActiveProgram(program);
        this.programSource.next(program);
        this.persistPreferences({ activeProgramId: program.id });
        return program;
    }

    public clearProgram(programId?: string): void {
        const activeProgram = this.getProgram();
        const idToDelete = programId || (activeProgram ? activeProgram.id : undefined);

        if (!idToDelete) {
            return;
        }

        const remainingPrograms = this.getPrograms().filter(program => program.id !== idToDelete);
        this.deletedProgramIds.add(idToDelete);
        this.addPendingProgramDelete(idToDelete);
        this.saveProgramList(remainingPrograms);
        this.deleteWorkoutStatesForProgram(idToDelete);

        const nextProgram = activeProgram && activeProgram.id === idToDelete ? remainingPrograms[0] : activeProgram;

        if (nextProgram) {
            this.writeActiveProgram(nextProgram);
        } else {
            localStorage.removeItem(this.programStorageKey());
        }

        this.programSource.next(nextProgram);
        this.deleteRemoteProgram(idToDelete);
        this.persistPreferences({ activeProgramId: nextProgram ? nextProgram.id : undefined });
    }

    public getCompletionColor(): string {
        return localStorage.getItem(this.completionColorStorageKey()) || this.defaultCompletionColor;
    }

    public saveCompletionColor(color: string): void {
        this.writeCompletionColor(color);
        this.persistPreferences({
            activeProgramId: this.getProgram() ? this.getProgram().id : undefined,
            completionColor: color
        });
    }

    public getWeek(weekId: string): ImportedProgramWeek {
        const program = this.getProgram();
        return program ? program.weeks.find(week => week.id === weekId) : undefined;
    }

    public getDay(weekId: string, dayId: string): ImportedProgramDay {
        const week = this.getWeek(weekId);
        return week ? week.days.find(day => day.id === dayId) : undefined;
    }

    public getWorkoutState(weekId: string, dayId: string, programId?: string): ImportedWorkoutState {
        const states = this.getWorkoutStates();
        const activeProgram = this.getProgram();
        const selectedProgramId = programId || (activeProgram ? activeProgram.id : undefined);

        return states.find(state =>
            state.weekId === weekId &&
            state.dayId === dayId &&
            (!selectedProgramId || !state.programId || state.programId === selectedProgramId)
        );
    }

    public saveWorkoutState(state: ImportedWorkoutState): void {
        const states = this.getWorkoutStates();
        const existingIndex = states.findIndex(currentState =>
            currentState.programId === state.programId &&
            currentState.weekId === state.weekId &&
            currentState.dayId === state.dayId
        );
        const cleanedState: ImportedWorkoutState = {
            ...state,
            updatedAt: new Date().toISOString(),
            exercises: state.exercises.map(exercise => ({
                ...exercise,
                duration: undefined
            })),
            cardioExercises: (state.cardioExercises || []).map(exercise => ({
                ...exercise,
                duration: this.getDurationMilliseconds(exercise.duration)
            }))
        };

        if (existingIndex >= 0) {
            states[existingIndex] = cleanedState;
        } else {
            states.push(cleanedState);
        }

        this.writeWorkoutStates(states);
        this.programsSource.next(this.getPrograms());
        this.programSource.next(this.getProgram());
        this.persistWorkoutStates([cleanedState]);
    }

    public createExercisesForDay(day: ImportedProgramDay): Exercise[] {
        return day.exercises.map(programExercise => {
            const exercise = new Exercise();
            exercise.exerciseType = 'strength';
            exercise.exerciseName = programExercise.exerciseName;
            exercise.weight = programExercise.weight;
            exercise.reps = programExercise.reps;
            exercise.sets = programExercise.sets;
            exercise.prescription = programExercise.prescription;
            exercise.sourceId = programExercise.id;
            exercise.completed = false;
            return exercise;
        });
    }

    public getDayCompletion(weekId: string, dayId: string): { completed: number, total: number } {
        const day = this.getDay(weekId, dayId);
        const state = this.getWorkoutState(weekId, dayId);
        const exercises = state ? state.exercises : (day ? this.createExercisesForDay(day) : []);
        const cardioExercises = state && state.cardioExercises ? state.cardioExercises : [];
        const allExercises = [...exercises, ...cardioExercises];
        return {
            completed: allExercises.filter(exercise => exercise.completed).length,
            total: allExercises.length
        };
    }

    private getDurationMilliseconds(duration: unknown): number {
        if (duration && typeof (duration as moment.Duration).asMilliseconds === 'function') {
            return (duration as moment.Duration).asMilliseconds();
        }

        if (typeof duration === 'string') {
            const milliseconds = moment.duration(duration).asMilliseconds();
            return Number.isFinite(milliseconds) ? milliseconds : 0;
        }

        const milliseconds = Number(duration);
        return Number.isFinite(milliseconds) ? milliseconds : 0;
    }

    public isWeekComplete(weekId: string): boolean {
        const week = this.getWeek(weekId);

        if (!week || !week.days.length) {
            return false;
        }

        return week.days.every(day => {
            const completion = this.getDayCompletion(weekId, day.id);
            return completion.total > 0 && completion.completed === completion.total;
        });
    }

    public getProgramProgress(program: ImportedProgram): { completed: number, total: number, started: number } {
        return this.calculateProgramProgress(
            program,
            this.getWorkoutStates().filter(state => state.programId === program.id)
        );
    }

    public getProgramProgresses(
        programs: ImportedProgram[]
    ): Map<string, { completed: number, total: number, started: number }> {
        const statesByProgram = new Map<string, ImportedWorkoutState[]>();
        this.getWorkoutStates().forEach(state => {
            const states = statesByProgram.get(state.programId) || [];
            states.push(state);
            statesByProgram.set(state.programId, states);
        });

        return new Map(programs.map(program => [
            program.id,
            this.calculateProgramProgress(program, statesByProgram.get(program.id) || [])
        ]));
    }

    private calculateProgramProgress(
        program: ImportedProgram,
        states: ImportedWorkoutState[]
    ): { completed: number, total: number, started: number } {
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

        return {
            completed,
            total,
            started
        };
    }

    public getProgramStatus(program: ImportedProgram): 'complete' | 'in-progress' | 'not-started' {
        const progress = this.getProgramProgress(program);

        if (progress.total > 0 && progress.completed === progress.total) {
            return 'complete';
        }

        if (progress.started > 0) {
            return 'in-progress';
        }

        return 'not-started';
    }

    public getCurrentWorkout(program = this.getProgram()): { week: ImportedProgramWeek, day: ImportedProgramDay } | undefined {
        if (!program) {
            return undefined;
        }

        const states = this.getWorkoutStates().filter(state => state.programId === program.id);
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
                : this.createExercisesForDay(workout.day);
            return exercises.length === 0 || exercises.some(exercise => !exercise.completed);
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

    public getDayElapsedMs(weekId: string, dayId: string): number {
        const state = this.getWorkoutState(weekId, dayId);

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

    public formatElapsedMs(elapsedMs: number): string {
        const totalSeconds = Math.floor(elapsedMs / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const pad = (value: number) => value < 10 ? `0${value}` : `${value}`;

        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }

    public markDayComplete(weekId: string, dayId: string): void {
        const program = this.getProgram();
        const day = this.getDay(weekId, dayId);

        if (!program || !day) {
            return;
        }

        const state = this.getWorkoutState(weekId, dayId);
        const exercises = state ? state.exercises : this.createExercisesForDay(day);
        const now = new Date().toISOString();
        const startedAt = state && state.startedAt ? state.startedAt : now;
        const totalPausedMs = state && state.totalPausedMs ? state.totalPausedMs : 0;
        const elapsedMs = this.calculateElapsedMs(startedAt, now, totalPausedMs);

        this.saveWorkoutState({
            programId: program.id,
            weekId,
            dayId,
            weightMeasure: state?.weightMeasure || 'lbs',
            distanceMeasure: state?.distanceMeasure || 'km',
            exercises: exercises.map(exercise => ({
                ...exercise,
                completed: true
            })),
            cardioExercises: (state && state.cardioExercises ? state.cardioExercises : []).map(exercise => ({
                ...exercise,
                completed: true
            })),
            startedAt,
            completedAt: now,
            pausedAt: undefined,
            totalPausedMs,
            elapsedMs
        });
    }

    private calculateElapsedMs(startedAt: string, completedAt: string, totalPausedMs: number): number {
        return Math.max(new Date(completedAt).getTime() - new Date(startedAt).getTime() - totalPausedMs, 0);
    }

    private getWorkoutStates(): ImportedWorkoutState[] {
        const stored = localStorage.getItem(this.workoutStorageKey());
        if (stored === this.workoutStatesCacheRaw) {
            return this.workoutStatesCache;
        }

        const parsedStates = this.readJson<ImportedWorkoutState[]>(
            this.workoutStorageKey(),
            []
        );
        this.workoutStatesCacheRaw = stored;
        this.workoutStatesCache = (Array.isArray(parsedStates) ? parsedStates : []).map(state => ({
            ...state,
            exercises: this.combineCompoundExerciseNames(state.exercises || [])
        }));
        return this.workoutStatesCache;
    }

    private stateActivityTimestamp(state: ImportedWorkoutState): string {
        return state?.updatedAt || state?.completedAt || state?.pausedAt || state?.startedAt || '';
    }

    private saveProgramList(programs: ImportedProgram[]): void {
        if (programs.length) {
            this.writePrograms(programs);
        } else {
            localStorage.removeItem(this.programsStorageKey());
        }

        this.programsSource.next(programs);
    }

    private deleteWorkoutStatesForProgram(programId: string): void {
        const states = this.getWorkoutStates().filter(state => state.programId !== programId);

        if (states.length) {
            this.writeWorkoutStates(states);
        } else {
            localStorage.removeItem(this.workoutStorageKey());
        }
    }

    private mergePrograms(...collections: ImportedProgram[][]): ImportedProgram[] {
        const byId = new Map<string, ImportedProgram>();
        collections.forEach(programs => programs.forEach(program => byId.set(program.id, program)));
        return Array.from(byId.values()).sort((first, second) =>
            (second.importedAt || '').localeCompare(first.importedAt || '')
        );
    }

    private mergeWorkoutStates(...collections: ImportedWorkoutState[][]): ImportedWorkoutState[] {
        const byId = new Map<string, ImportedWorkoutState>();
        collections.forEach(states => states.forEach(state => {
            const key = `${state.programId}:${state.weekId}:${state.dayId}`;
            const current = byId.get(key);
            if (!current || (state.updatedAt || '').localeCompare(current.updatedAt || '') >= 0) {
                byId.set(key, state);
            }
        }));
        return Array.from(byId.values());
    }

    private excludeDeletedPrograms(
        programs: ImportedProgram[],
        userId = this.activeUserId
    ): ImportedProgram[] {
        const deletedIds = this.deletedProgramIdSet(userId);
        return deletedIds.size
            ? programs.filter(program => !deletedIds.has(program.id))
            : programs;
    }

    private excludeDeletedWorkoutStates(
        states: ImportedWorkoutState[],
        userId = this.activeUserId
    ): ImportedWorkoutState[] {
        const deletedIds = this.deletedProgramIdSet(userId);
        return deletedIds.size
            ? states.filter(state => !deletedIds.has(state.programId))
            : states;
    }

    private deletedProgramIdSet(userId = this.activeUserId): Set<string> {
        return new Set([
            ...this.getPendingProgramDeletes(userId),
            ...this.deletedProgramIds
        ]);
    }

    private programStorageKey(userId = this.activeUserId): string {
        return this.scopedKey('importedProgram', this.legacyProgramStorageKey, userId);
    }

    private programsStorageKey(userId = this.activeUserId): string {
        return this.scopedKey('importedPrograms', this.legacyProgramsStorageKey, userId);
    }

    private workoutStorageKey(userId = this.activeUserId): string {
        return this.scopedKey('importedWorkoutStates', this.legacyWorkoutStorageKey, userId);
    }

    private completionColorStorageKey(userId = this.activeUserId): string {
        return this.scopedKey('completionColor', this.legacyCompletionColorStorageKey, userId);
    }

    private pendingProgramDeletesKey(userId = this.activeUserId): string {
        return userId ? `logYourWo.${userId}.deletedPrograms` : '';
    }

    private scopedKey(name: string, legacyKey: string, userId = this.activeUserId): string {
        return userId ? `logYourWo.${userId}.${name}` : legacyKey;
    }

    private writePrograms(programs: ImportedProgram[], userId = this.activeUserId): void {
        const key = this.programsStorageKey(userId);
        if (programs.length) {
            localStorage.setItem(key, JSON.stringify(programs));
        } else {
            localStorage.removeItem(key);
        }
    }

    private writeActiveProgram(program: ImportedProgram, userId = this.activeUserId): void {
        const key = this.programStorageKey(userId);
        if (program) {
            localStorage.setItem(key, JSON.stringify(program));
        } else {
            localStorage.removeItem(key);
        }
    }

    private writeWorkoutStates(states: ImportedWorkoutState[], userId = this.activeUserId): void {
        const key = this.workoutStorageKey(userId);
        if (states.length) {
            const serialized = JSON.stringify(states);
            localStorage.setItem(key, serialized);
            if (key === this.workoutStorageKey()) {
                this.workoutStatesCacheRaw = serialized;
                this.workoutStatesCache = states;
            }
        } else {
            localStorage.removeItem(key);
            if (key === this.workoutStorageKey()) {
                this.workoutStatesCacheRaw = null;
                this.workoutStatesCache = [];
            }
        }
    }

    private writeCompletionColor(color: string, userId = this.activeUserId): void {
        localStorage.setItem(this.completionColorStorageKey(userId), color);
    }

    private readJson<T>(key: string, fallback: T): T {
        const value = localStorage.getItem(key);

        try {
            return value ? JSON.parse(value) as T : fallback;
        } catch {
            return fallback;
        }
    }

    private getPendingProgramDeletes(userId = this.activeUserId): string[] {
        const key = this.pendingProgramDeletesKey(userId);
        return key ? this.readJson<string[]>(key, []) : [];
    }

    private addPendingProgramDelete(programId: string): void {
        if (!this.activeUserId) {
            return;
        }

        const pendingDeletes = Array.from(new Set([...this.getPendingProgramDeletes(), programId]));
        localStorage.setItem(this.pendingProgramDeletesKey(), JSON.stringify(pendingDeletes));
    }

    private removePendingProgramDelete(programId: string, userId = this.activeUserId): void {
        const key = this.pendingProgramDeletesKey(userId);
        if (!key) {
            return;
        }

        const pendingDeletes = this.getPendingProgramDeletes(userId).filter(id => id !== programId);
        if (pendingDeletes.length) {
            localStorage.setItem(key, JSON.stringify(pendingDeletes));
        } else {
            localStorage.removeItem(key);
        }
    }

    private async retryPendingProgramDeletes(userId: string): Promise<void> {
        for (const programId of this.getPendingProgramDeletes(userId)) {
            await this.cloudData.deleteProgram(userId, programId);
            this.removePendingProgramDelete(programId, userId);
        }
    }

    private removeLegacyData(): void {
        localStorage.removeItem(this.legacyProgramStorageKey);
        localStorage.removeItem(this.legacyProgramsStorageKey);
        localStorage.removeItem(this.legacyWorkoutStorageKey);
        localStorage.removeItem(this.legacyCompletionColorStorageKey);
    }

    private persistPrograms(programs: ImportedProgram[]): void {
        if (!this.activeUserId) {
            return;
        }

        const userId = this.activeUserId;
        this.enqueueCloudWrite(
            () => this.cloudData.savePrograms(userId, programs),
            'Unable to save imported program to Supabase.'
        );
    }

    private persistWorkoutStates(states: ImportedWorkoutState[]): void {
        if (!this.activeUserId) {
            return;
        }

        const userId = this.activeUserId;
        this.enqueueCloudWrite(
            () => this.cloudData.saveWorkoutStates(userId, states),
            'Unable to save imported workout state to Supabase.'
        );
    }

    private persistPreferences(preferences: { activeProgramId?: string, completionColor?: string }): void {
        if (!this.activeUserId) {
            return;
        }

        const mergedPreferences = {
            activeProgramId: preferences.activeProgramId,
            completionColor: preferences.completionColor || this.getCompletionColor()
        };
        const userId = this.activeUserId;
        this.enqueueCloudWrite(
            () => this.cloudData.savePreferences(userId, mergedPreferences),
            'Unable to save user preferences to Supabase.'
        );
    }

    private deleteRemoteProgram(programId: string): void {
        if (!this.activeUserId) {
            return;
        }

        const userId = this.activeUserId;
        this.enqueueCloudWrite(
            async () => {
                await this.cloudData.deleteProgram(userId, programId);
                this.removePendingProgramDelete(programId, userId);
            },
            'Unable to delete imported program from Supabase.'
        );
    }

    private enqueueCloudWrite(action: () => Promise<void>, errorMessage: string): Promise<void> {
        const operation = this.cloudWriteQueue
            .catch(() => undefined)
            .then(action);
        this.cloudWriteQueue = operation.catch(error => {
                console.error(errorMessage, error);
                this.syncStatus?.report();
            });
        return operation;
    }

    private combineCompoundExerciseNames<T extends { exerciseName?: string }>(exercises: T[]): T[] {
        const combined = exercises.map(exercise => ({ ...exercise }));

        for (let startIndex = 0; startIndex < combined.length; startIndex++) {
            if (!this.hasCompoundContinuation(combined[startIndex].exerciseName)) {
                continue;
            }

            const names: string[] = [];
            let endIndex = startIndex;
            let foundTerminator = false;

            while (endIndex < combined.length) {
                const name = combined[endIndex].exerciseName || '';
                const normalizedName = name.replace(/\s*\+\s*$/, '').trim();
                if (normalizedName && names[names.length - 1] !== normalizedName) {
                    names.push(normalizedName);
                }

                if (!this.hasCompoundContinuation(name)) {
                    foundTerminator = true;
                    break;
                }

                endIndex++;
            }

            if (!foundTerminator || names.length < 2) {
                continue;
            }

            const compoundName = names.join(' + ');
            const terminalName = names[names.length - 1];
            while (
                endIndex + 1 < combined.length &&
                (combined[endIndex + 1].exerciseName || '').trim() === terminalName
            ) {
                endIndex++;
            }
            for (let exerciseIndex = startIndex; exerciseIndex <= endIndex; exerciseIndex++) {
                combined[exerciseIndex].exerciseName = compoundName;
            }
            startIndex = endIndex;
        }

        return combined;
    }

    private normalizeProgram(program: ImportedProgram): ImportedProgram {
        return {
            ...program,
            weeks: (program.weeks || []).map(week => ({
                ...week,
                days: (week.days || []).map(day => ({
                    ...day,
                    exercises: this.combineCompoundExerciseNames(day.exercises || [])
                }))
            }))
        };
    }

    private hasCompoundContinuation(name: string): boolean {
        return /\+\s*$/.test(name || '');
    }
}
