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
    private readonly workoutStorageKey = 'logYourWo.importedWorkoutStates';
    private readonly completionColorStorageKey = 'logYourWo.completionColor';
    private readonly defaultCompletionColor = '#2fb379';
    private readonly programSource = new BehaviorSubject<ImportedProgram>(this.getProgram());

    public program$ = this.programSource.asObservable();

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
        return stored ? JSON.parse(stored) : undefined;
    }

    public saveProgram(program: ImportedProgram): void {
        localStorage.setItem(this.programStorageKey, JSON.stringify(program));
        this.programSource.next(program);
    }

    public clearProgram(): void {
        localStorage.removeItem(this.programStorageKey);
        localStorage.removeItem(this.workoutStorageKey);
        this.programSource.next(undefined);
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

    public getWorkoutState(weekId: string, dayId: string): ImportedWorkoutState {
        const states = this.getWorkoutStates();
        return states.find(state => state.weekId === weekId && state.dayId === dayId);
    }

    public saveWorkoutState(state: ImportedWorkoutState): void {
        const states = this.getWorkoutStates();
        const existingIndex = states.findIndex(currentState => currentState.weekId === state.weekId && currentState.dayId === state.dayId);
        const cleanedState = {
            ...state,
            exercises: state.exercises.map(exercise => ({
                ...exercise,
                duration: undefined
            }))
        };

        if (existingIndex >= 0) {
            states[existingIndex] = cleanedState;
        } else {
            states.push(cleanedState);
        }

        localStorage.setItem(this.workoutStorageKey, JSON.stringify(states));
    }

    public createExercisesForDay(day: ImportedProgramDay): Exercise[] {
        return day.exercises.map(programExercise => {
            const exercise = new Exercise();
            exercise.exerciseType = 'strength';
            exercise.exerciseName = programExercise.exerciseName;
            exercise.weight = programExercise.weight as any;
            exercise.reps = programExercise.reps as any;
            exercise.sets = programExercise.sets as any;
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
        return {
            completed: exercises.filter(exercise => exercise.completed).length,
            total: exercises.length
        };
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
