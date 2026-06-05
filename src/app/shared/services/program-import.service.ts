import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import * as XLSX from 'xlsx';

import { Exercise } from '../models/exercise.model';
import {
    ImportedProgram,
    ImportedProgramDay,
    ImportedProgramExercise,
    ImportedProgramWeek,
    ImportedWorkoutState
} from '../models/imported-program.model';

@Injectable({
    providedIn: 'root'
})
export class ProgramImportService {
    private readonly programStorageKey = 'logYourWo.importedProgram';
    private readonly programsStorageKey = 'logYourWo.importedPrograms';
    private readonly workoutStorageKey = 'logYourWo.importedWorkoutStates';
    private readonly completionColorStorageKey = 'logYourWo.completionColor';
    private readonly defaultCompletionColor = '#2fb379';
    private readonly programSource = new BehaviorSubject<ImportedProgram>(this.getProgram());
    private readonly programsSource = new BehaviorSubject<ImportedProgram[]>(this.getPrograms());

    public program$ = this.programSource.asObservable();
    public programs$ = this.programsSource.asObservable();

    public async importWorkbook(file: File): Promise<ImportedProgram> {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array', cellDates: false });
        const weeks: ImportedProgramWeek[] = [];

        workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, {
                header: 1,
                raw: false,
                defval: ''
            });
            weeks.push(...this.parseSheet(rows));
        });

        const uniqueWeeks = this.dedupeWeeks(weeks);
        const program: ImportedProgram = {
            id: this.createId(),
            name: this.cleanFileName(file.name),
            importedAt: new Date().toISOString(),
            weeks: uniqueWeeks.sort((a, b) => a.weekNumber - b.weekNumber)
        };

        this.saveProgram(program);
        return program;
    }

    public getProgram(): ImportedProgram {
        const stored = localStorage.getItem(this.programStorageKey);
        const program = stored ? JSON.parse(stored) : undefined;

        if (program) {
            return program;
        }

        const programs = this.getPrograms();
        return programs.length ? programs[0] : undefined;
    }

    public getPrograms(): ImportedProgram[] {
        const stored = localStorage.getItem(this.programsStorageKey);

        if (stored) {
            return JSON.parse(stored);
        }

        const legacyProgram = localStorage.getItem(this.programStorageKey);
        return legacyProgram ? [JSON.parse(legacyProgram)] : [];
    }

    public saveProgram(program: ImportedProgram): void {
        this.saveProgramList([
            program,
            ...this.getPrograms().filter(currentProgram => currentProgram.id !== program.id)
        ]);
        localStorage.setItem(this.programStorageKey, JSON.stringify(program));
        this.programSource.next(program);
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

        localStorage.setItem(this.programStorageKey, JSON.stringify(program));
        this.programSource.next(program);
        return program;
    }

    public clearProgram(programId?: string): void {
        const activeProgram = this.getProgram();
        const idToDelete = programId || (activeProgram ? activeProgram.id : undefined);

        if (!idToDelete) {
            return;
        }

        const remainingPrograms = this.getPrograms().filter(program => program.id !== idToDelete);
        this.saveProgramList(remainingPrograms);
        this.deleteWorkoutStatesForProgram(idToDelete);

        const nextProgram = activeProgram && activeProgram.id === idToDelete ? remainingPrograms[0] : activeProgram;

        if (nextProgram) {
            localStorage.setItem(this.programStorageKey, JSON.stringify(nextProgram));
        } else {
            localStorage.removeItem(this.programStorageKey);
        }

        this.programSource.next(nextProgram);
    }

    public getCompletionColor(): string {
        return localStorage.getItem(this.completionColorStorageKey) || this.defaultCompletionColor;
    }

    public saveCompletionColor(color: string): void {
        localStorage.setItem(this.completionColorStorageKey, color);
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
            exercises: state.exercises.map(exercise => ({
                ...exercise,
                duration: undefined
            })),
            cardioExercises: (state.cardioExercises || []).map(exercise => ({
                ...exercise,
                duration: this.getDurationMilliseconds(exercise.duration) as any
            }))
        };

        if (existingIndex >= 0) {
            states[existingIndex] = cleanedState;
        } else {
            states.push(cleanedState);
        }

        localStorage.setItem(this.workoutStorageKey, JSON.stringify(states));
        this.programsSource.next(this.getPrograms());
        this.programSource.next(this.getProgram());
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

    private getDurationMilliseconds(duration: moment.Duration | number | undefined): number {
        if (duration && typeof (duration as moment.Duration).asMilliseconds === 'function') {
            return (duration as moment.Duration).asMilliseconds();
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
        const states = this.getWorkoutStates().filter(state => state.programId === program.id);
        let completed = 0;
        let started = 0;
        let total = 0;

        program.weeks.forEach(week => {
            week.days.forEach(day => {
                total++;
                const state = states.find(currentState => currentState.weekId === week.id && currentState.dayId === day.id);

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
        const stored = localStorage.getItem(this.workoutStorageKey);
        return stored ? JSON.parse(stored) : [];
    }

    private saveProgramList(programs: ImportedProgram[]): void {
        if (programs.length) {
            localStorage.setItem(this.programsStorageKey, JSON.stringify(programs));
        } else {
            localStorage.removeItem(this.programsStorageKey);
        }

        this.programsSource.next(programs);
    }

    private deleteWorkoutStatesForProgram(programId: string): void {
        const states = this.getWorkoutStates().filter(state => state.programId !== programId);

        if (states.length) {
            localStorage.setItem(this.workoutStorageKey, JSON.stringify(states));
        } else {
            localStorage.removeItem(this.workoutStorageKey);
        }
    }

    private parseSheet(rows: any[][]): ImportedProgramWeek[] {
        const weekStarts = rows
            .map((row, index) => ({ row, index }))
            .filter(entry => entry.row.some(cell => /^week\s+\d+/i.test(this.toText(cell))));

        return weekStarts.map((entry, weekIndex) => {
            const weekCell = entry.row.find(cell => /^week\s+\d+/i.test(this.toText(cell)));
            const weekNumberMatch = this.toText(weekCell).match(/\d+/);
            const weekNumber = weekNumberMatch ? Number(weekNumberMatch[0]) : weekIndex + 1;
            const endIndex = weekStarts[weekIndex + 1] ? weekStarts[weekIndex + 1].index : rows.length;
            const days = this.parseWeekDays(rows, entry.index, endIndex, weekNumber);

            return {
                id: `week-${weekNumber}`,
                name: `Week ${weekNumber}`,
                weekNumber,
                days
            };
        }).filter(week => week.days.length > 0);
    }

    private dedupeWeeks(weeks: ImportedProgramWeek[]): ImportedProgramWeek[] {
        const byWeekNumber = new Map<number, ImportedProgramWeek>();

        weeks.forEach(week => {
            if (!byWeekNumber.has(week.weekNumber)) {
                byWeekNumber.set(week.weekNumber, week);
            }
        });

        return Array.from(byWeekNumber.values());
    }

    private parseWeekDays(rows: any[][], startIndex: number, endIndex: number, weekNumber: number): ImportedProgramDay[] {
        const dayColumnPairs = [
            { name: 1, prescription: 2 },
            { name: 4, prescription: 5 },
            { name: 7, prescription: 8 }
        ];

        const daySections = [];

        for (let rowIndex = startIndex; rowIndex < endIndex; rowIndex++) {
            dayColumnPairs.forEach((pair, pairIndex) => {
                const dayName = this.toText(rows[rowIndex][pair.name]);

                if (this.isDayName(dayName)) {
                    daySections.push({
                        name: dayName,
                        startIndex: rowIndex,
                        pair,
                        pairIndex
                    });
                }
            });
        }

        return daySections.sort((a, b) => (a.pairIndex - b.pairIndex) || (a.startIndex - b.startIndex)).map((section, dayIndex) => {
            const nextSection = daySections.find(currentSection => currentSection.pairIndex === section.pairIndex && currentSection.startIndex > section.startIndex);
            const sectionEndIndex = nextSection ? nextSection.startIndex : endIndex;
            const exercises: ImportedProgramExercise[] = [];
            let currentExerciseName = '';

            for (let rowIndex = section.startIndex + 1; rowIndex < sectionEndIndex; rowIndex++) {
                const exerciseName = this.cleanExerciseName(this.toText(rows[rowIndex][section.pair.name]));
                const prescription = this.toText(rows[rowIndex][section.pair.prescription]);
                const rowExerciseName = exerciseName || (prescription ? currentExerciseName : '');

                if (!this.isExerciseRow(rowExerciseName, prescription)) {
                    continue;
                }

                if (exerciseName) {
                    currentExerciseName = exerciseName;
                }

                exercises.push({
                    id: `week-${weekNumber}-day-${dayIndex + 1}-exercise-${rowIndex}`,
                    exerciseName: rowExerciseName,
                    prescription,
                    ...this.parsePrescription(prescription)
                });
            }

            return {
                id: `week-${weekNumber}-day-${dayIndex + 1}`,
                name: `Day ${String(dayIndex + 1).padStart(2, '0')}`,
                exercises
            };
        }).filter(day => day.exercises.length > 0);
    }

    private parsePrescription(value: string): { weight?: string, reps?: string, sets?: string } {
        const normalized = value.replace(/\s+/g, ' ').trim();
        const match = normalized.match(/^(.+?)\s*x\s*([^x]+?)(?:\s*x\s*(.+))?$/i);

        if (!match) {
            return {};
        }

        const weight = match[1].trim();
        return {
            weight: weight.toLowerCase() === 'x' ? undefined : weight,
            reps: match[2] ? match[2].trim() : undefined,
            sets: match[3] ? match[3].trim() : undefined
        };
    }

    private isExerciseRow(exerciseName: string, prescription: string): boolean {
        if (!exerciseName || /^week\s+\d+/i.test(exerciseName) || this.isDayName(exerciseName)) {
            return false;
        }

        if (/^!+$/.test(exerciseName) || /^x$/i.test(exerciseName) || this.isAnnotation(exerciseName)) {
            return false;
        }

        return !!prescription || /[a-z]/i.test(exerciseName);
    }

    private isDayName(value: string): boolean {
        return /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i.test(value);
    }

    private cleanExerciseName(value: string): string {
        return value.replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
    }

    private isAnnotation(value: string): boolean {
        return /^\(/.test(value) || /^\)/.test(value) || /^\s*without\b/i.test(value) || /^\s*into\b/i.test(value);
    }

    private toText(value: any): string {
        if (value === undefined || value === null) {
            return '';
        }

        return String(value).replace(/\s+/g, ' ').trim();
    }

    private createId(): string {
        return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }

    private cleanFileName(fileName: string): string {
        return fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
    }
}
