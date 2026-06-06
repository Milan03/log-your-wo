import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import * as moment from 'moment';

import { Exercise } from '../models/exercise.model';
import { SavedSimpleLog, SimpleLog, SimpleLogTimingState } from '../models/simple-log.model';

@Injectable({
    providedIn: 'root'
})
export class SimpleLogService {
    private readonly storageKey = 'logYourWo.simpleLogs';
    private readonly logsSource = new BehaviorSubject<SavedSimpleLog[]>(this.getLogs());

    public readonly logs$ = this.logsSource.asObservable();

    public getLogs(): SavedSimpleLog[] {
        const stored = localStorage.getItem(this.storageKey);
        const logs = stored ? JSON.parse(stored) as SavedSimpleLog[] : [];

        return logs.sort((first, second) =>
            second.workoutDate.localeCompare(first.workoutDate) ||
            second.updatedAt.localeCompare(first.updatedAt)
        );
    }

    public getLog(id: string): SavedSimpleLog | undefined {
        return this.getLogs().find(log => log.id === id);
    }

    public saveLog(log: SimpleLog, workoutDate: string, timing: SimpleLogTimingState = {}): SavedSimpleLog {
        const now = new Date().toISOString();
        const id = log.logId ? log.logId.toString() : now;
        const existing = this.getLog(id);
        const savedLog: SavedSimpleLog = {
            id,
            title: log.title || 'Simple Log',
            workoutDate,
            workoutDateTime: log.startDatim ? log.startDatim.toISOString() : undefined,
            createdAt: existing ? existing.createdAt : now,
            updatedAt: now,
            exercises: log.exercises || [],
            cardioExercises: log.cardioExercises || [],
            notes: log.notes,
            ...timing
        };
        const logs = [
            savedLog,
            ...this.getLogs().filter(currentLog => currentLog.id !== id)
        ];

        localStorage.setItem(this.storageKey, JSON.stringify(logs));
        this.logsSource.next(this.getLogs());
        return savedLog;
    }

    public deleteLog(id: string): void {
        const logs = this.getLogs().filter(log => log.id !== id);

        if (logs.length) {
            localStorage.setItem(this.storageKey, JSON.stringify(logs));
        } else {
            localStorage.removeItem(this.storageKey);
        }

        this.logsSource.next(logs);
    }

    public hydrateLog(savedLog: SavedSimpleLog): SimpleLog {
        const log = new SimpleLog();
        log.logId = savedLog.id as any;
        log.title = savedLog.title;
        log.startDatim = savedLog.workoutDateTime
            ? new Date(savedLog.workoutDateTime)
            : savedLog.startedAt
                ? new Date(savedLog.startedAt)
            : this.dateFromLocalValue(savedLog.workoutDate);
        log.exercises = this.hydrateExercises(savedLog.exercises);
        log.cardioExercises = this.hydrateExercises(savedLog.cardioExercises);
        log.notes = savedLog.notes;
        return log;
    }

    private hydrateExercises(exercises: Exercise[]): Exercise[] {
        return (exercises || []).map(exercise => {
            const hydrated = Object.assign(new Exercise(), exercise);
            hydrated.duration = moment.duration((exercise as any).duration || 0);
            return hydrated;
        });
    }

    private dateFromLocalValue(value: string): Date {
        const parts = value.split('-').map(part => Number(part));
        return new Date(parts[0], parts[1] - 1, parts[2], 12);
    }
}
