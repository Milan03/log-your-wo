import { inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Duration } from 'luxon';

import { Exercise } from '../models/exercise.model';
import {
    PersistedExercise,
    SavedSimpleLog,
    SimpleLog,
    SimpleLogSaveState
} from '../models/simple-log.model';
import { CloudSyncStatusService } from './cloud-sync-status.service';
import { SupabaseDataService } from './supabase-data.service';

@Injectable({
    providedIn: 'root'
})
export class SimpleLogService {
    private readonly legacyStorageKey = 'logYourWo.simpleLogs';
    private activeUserId: string;
    private cloudWriteQueue: Promise<void> = Promise.resolve();
    private readonly deletedLogIds = new Set<string>();
    private readonly logsSource = new BehaviorSubject<SavedSimpleLog[]>(this.getLogs());

    public readonly logs$ = this.logsSource.asObservable();

    private cloudData = inject(SupabaseDataService);
    private syncStatus = inject(CloudSyncStatusService, { optional: true });

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
        const accountStorageKey = this.storageKey(userId);
        await this.enqueueCloudWrite(
            () => this.retryPendingDeletes(userId),
            'Unable to retry deleted workout logs.'
        );
        const remoteLogs = await this.cloudData.getSimpleLogs(userId);
        const cachedLogs = this.readLogs(accountStorageKey);
        const legacyLogs = this.readLogs(this.legacyStorageKey);
        const mergedLogs = this.excludeDeletedLogs(
            this.mergeLogs(remoteLogs, cachedLogs, legacyLogs),
            userId
        );

        if (mergedLogs.length) {
            await this.enqueueCloudWrite(
                () => this.cloudData.saveSimpleLogs(
                    userId,
                    this.excludeDeletedLogs(mergedLogs, userId)
                ),
                'Unable to synchronize workout logs with Supabase.'
            );

            if (this.activeUserId !== userId) {
                return;
            }

            const latestCachedLogs = this.readLogs(accountStorageKey);
            this.writeLogs(
                this.excludeDeletedLogs(this.mergeLogs(mergedLogs, latestCachedLogs), userId),
                accountStorageKey
            );
        }

        if (legacyLogs.length) {
            localStorage.removeItem(this.legacyStorageKey);
        }

        if (this.activeUserId === userId) {
            this.deletedLogIds.clear();
            this.logsSource.next(this.getLogs());
        }
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

    public saveLog(log: SimpleLog, workoutDate: string, state: SimpleLogSaveState = {}): SavedSimpleLog {
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
            ...state
        };
        const logs = [
            savedLog,
            ...this.getLogs().filter(currentLog => currentLog.id !== id)
        ];

        this.writeLogs(logs);
        this.deletedLogIds.delete(id);
        this.removePendingDelete(id);
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
        this.deletedLogIds.add(id);
        this.addPendingDelete(id);
        this.deleteRemoteLog(id);
    }

    public hydrateLog(savedLog: SavedSimpleLog): SimpleLog {
        const log = new SimpleLog();
        log.logId = savedLog.id;
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

    private hydrateExercises(exercises: PersistedExercise[]): Exercise[] {
        return (exercises || []).map(exercise => {
            const hydrated = Object.assign(new Exercise(), exercise);
            hydrated.duration = Duration.fromMillis(this.durationMilliseconds(exercise.duration));
            return hydrated;
        });
    }

    private dateFromLocalValue(value: string): Date {
        const parts = value.split('-').map(part => Number(part));
        return new Date(parts[0], parts[1] - 1, parts[2], 12);
    }

    private storageKey(userId = this.activeUserId): string {
        return userId
            ? `logYourWo.${userId}.simpleLogs`
            : this.legacyStorageKey;
    }

    private pendingDeletesKey(userId = this.activeUserId): string {
        return userId
            ? `logYourWo.${userId}.deletedSimpleLogs`
            : '';
    }

    private readLogs(key: string): SavedSimpleLog[] {
        const stored = localStorage.getItem(key);

        try {
            const logs = stored ? JSON.parse(stored) as SavedSimpleLog[] : [];
            return Array.isArray(logs) ? logs : [];
        } catch {
            return [];
        }
    }

    private writeLogs(logs: SavedSimpleLog[], key = this.storageKey()): void {
        localStorage.setItem(key, JSON.stringify(logs));
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

    private excludeDeletedLogs(logs: SavedSimpleLog[], userId = this.activeUserId): SavedSimpleLog[] {
        const deletedIds = new Set([
            ...this.getPendingDeletes(userId),
            ...this.deletedLogIds
        ]);
        return deletedIds.size
            ? logs.filter(log => !deletedIds.has(log.id))
            : logs;
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

    private getPendingDeletes(userId = this.activeUserId): string[] {
        const key = this.pendingDeletesKey(userId);
        if (!key) {
            return [];
        }

        try {
            return JSON.parse(localStorage.getItem(key) || '[]') as string[];
        } catch {
            return [];
        }
    }

    private addPendingDelete(logId: string): void {
        if (!this.activeUserId) {
            return;
        }

        const pendingDeletes = Array.from(new Set([...this.getPendingDeletes(), logId]));
        localStorage.setItem(this.pendingDeletesKey(), JSON.stringify(pendingDeletes));
    }

    private removePendingDelete(logId: string, userId = this.activeUserId): void {
        const key = this.pendingDeletesKey(userId);
        if (!key) {
            return;
        }

        const pendingDeletes = this.getPendingDeletes(userId).filter(id => id !== logId);
        if (pendingDeletes.length) {
            localStorage.setItem(key, JSON.stringify(pendingDeletes));
        } else {
            localStorage.removeItem(key);
        }
    }

    private async retryPendingDeletes(userId: string): Promise<void> {
        for (const logId of this.getPendingDeletes(userId)) {
            await this.cloudData.deleteSimpleLog(userId, logId);
            this.removePendingDelete(logId, userId);
        }
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
            async () => {
                await this.cloudData.deleteSimpleLog(userId, logId);
                this.removePendingDelete(logId, userId);
            },
            'Unable to delete workout log from Supabase.'
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
}
