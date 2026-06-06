import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import * as moment from 'moment';

import { Exercise } from '../models/exercise.model';
import { SavedSimpleLog, SimpleLog, SimpleLogTimingState } from '../models/simple-log.model';
import { SupabaseDataService } from './supabase-data.service';

@Injectable({
    providedIn: 'root'
})
export class SimpleLogService {
    private readonly legacyStorageKey = 'logYourWo.simpleLogs';
    private activeUserId: string;
    private cloudWriteQueue: Promise<void> = Promise.resolve();
    private readonly logsSource = new BehaviorSubject<SavedSimpleLog[]>(this.getLogs());

    public readonly logs$ = this.logsSource.asObservable();

    constructor(private cloudData?: SupabaseDataService) { }

    public setUserContext(userId: string): void {
        this.activeUserId = userId;
        this.logsSource.next(this.getLogs());
    }

    public clearUserContext(): void {
        this.activeUserId = undefined;
        this.logsSource.next(this.getLogs());
    }

    public async syncWithCloud(): Promise<void> {
        if (!this.activeUserId) {
            return;
        }

        const userId = this.activeUserId;
        const remoteLogs = await this.cloudData.getSimpleLogs(userId);
        const cachedLogs = this.readLogs(this.storageKey());
        const legacyLogs = this.readLogs(this.legacyStorageKey);
        const mergedLogs = this.mergeLogs(remoteLogs, cachedLogs, legacyLogs);

        if (mergedLogs.length) {
            await this.cloudData.saveSimpleLogs(userId, mergedLogs);
            this.writeLogs(mergedLogs);
            if (legacyLogs.length) {
                localStorage.removeItem(this.legacyStorageKey);
            }
        }

        this.logsSource.next(this.getLogs());
    }

    public getLogs(): SavedSimpleLog[] {
        const logs = this.readLogs(this.storageKey());

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

        this.writeLogs(logs);
        this.logsSource.next(this.getLogs());
        this.persistLogs([savedLog]);
        return savedLog;
    }

    public deleteLog(id: string): void {
        const logs = this.getLogs().filter(log => log.id !== id);

        if (logs.length) {
            this.writeLogs(logs);
        } else {
            localStorage.removeItem(this.storageKey());
        }

        this.logsSource.next(logs);
        this.deleteRemoteLog(id);
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

    private storageKey(): string {
        return this.activeUserId
            ? `logYourWo.${this.activeUserId}.simpleLogs`
            : this.legacyStorageKey;
    }

    private readLogs(key: string): SavedSimpleLog[] {
        const stored = localStorage.getItem(key);

        try {
            return stored ? JSON.parse(stored) as SavedSimpleLog[] : [];
        } catch {
            return [];
        }
    }

    private writeLogs(logs: SavedSimpleLog[]): void {
        localStorage.setItem(this.storageKey(), JSON.stringify(logs));
    }

    private mergeLogs(...collections: SavedSimpleLog[][]): SavedSimpleLog[] {
        const byId = new Map<string, SavedSimpleLog>();

        collections.forEach(logs => logs.forEach(log => {
            const current = byId.get(log.id);
            if (!current || (log.updatedAt || '').localeCompare(current.updatedAt || '') > 0) {
                byId.set(log.id, log);
            }
        }));

        return Array.from(byId.values());
    }

    private persistLogs(logs: SavedSimpleLog[]): void {
        if (!this.activeUserId) {
            return;
        }

        const userId = this.activeUserId;
        this.enqueueCloudWrite(
            () => this.cloudData.saveSimpleLogs(userId, logs),
            'Unable to save workout log to Supabase.'
        );
    }

    private deleteRemoteLog(logId: string): void {
        if (!this.activeUserId) {
            return;
        }

        const userId = this.activeUserId;
        this.enqueueCloudWrite(
            () => this.cloudData.deleteSimpleLog(userId, logId),
            'Unable to delete workout log from Supabase.'
        );
    }

    private enqueueCloudWrite(action: () => Promise<void>, errorMessage: string): void {
        this.cloudWriteQueue = this.cloudWriteQueue
            .catch(() => undefined)
            .then(action)
            .catch(error => {
                console.error(errorMessage, error);
            });
    }
}
