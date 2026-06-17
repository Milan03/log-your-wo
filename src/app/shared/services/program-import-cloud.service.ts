import { inject, Injectable } from '@angular/core';

import { ImportedProgram, ImportedWorkoutState } from '../models/imported-program.model';
import { SupabaseDataService, UserPreferences } from './supabase-data.service';
import { CloudSyncStatusService } from './cloud-sync-status.service';
import { ImportedProgramStorageService } from './imported-program-storage.service';

/**
 * Owns the Supabase write side for imported programs: the serialized
 * `cloudWriteQueue`, the guarded per-record persistence helpers, and
 * delete/retry orchestration. `ProgramImportService` keeps the local-first
 * merge logic and drives this service for cloud reads/writes; everything here
 * is a no-op while signed out so the app stays fully usable offline.
 */
@Injectable({
    providedIn: 'root'
})
export class ProgramImportCloudService {
    private cloudData = inject(SupabaseDataService, { optional: true });
    private syncStatus = inject(CloudSyncStatusService, { optional: true });
    private storage = inject(ImportedProgramStorageService);

    private cloudWriteQueue: Promise<void> = Promise.resolve();

    public getPrograms(userId: string): Promise<ImportedProgram[]> {
        return this.cloudData.getPrograms(userId);
    }

    public getWorkoutStates(userId: string): Promise<ImportedWorkoutState[]> {
        return this.cloudData.getWorkoutStates(userId);
    }

    public getPreferences(userId: string): Promise<UserPreferences> {
        return this.cloudData.getPreferences(userId);
    }

    public savePrograms(userId: string, programs: ImportedProgram[]): Promise<void> {
        return this.cloudData.savePrograms(userId, programs);
    }

    public saveWorkoutStates(userId: string, states: ImportedWorkoutState[]): Promise<void> {
        return this.cloudData.saveWorkoutStates(userId, states);
    }

    public savePreferences(userId: string, preferences: UserPreferences): Promise<void> {
        return this.cloudData.savePreferences(userId, preferences);
    }

    public persistPrograms(programs: ImportedProgram[]): void {
        if (!this.storage.activeUserId) {
            return;
        }

        const userId = this.storage.activeUserId;
        this.enqueue(
            () => this.cloudData.savePrograms(userId, programs),
            'Unable to save imported program to Supabase.'
        );
    }

    public persistWorkoutStates(states: ImportedWorkoutState[]): void {
        if (!this.storage.activeUserId) {
            return;
        }

        const userId = this.storage.activeUserId;
        this.enqueue(
            () => this.cloudData.saveWorkoutStates(userId, states),
            'Unable to save imported workout state to Supabase.'
        );
    }

    public persistPreferences(preferences: UserPreferences): void {
        if (!this.storage.activeUserId) {
            return;
        }

        const userId = this.storage.activeUserId;
        this.enqueue(
            () => this.cloudData.savePreferences(userId, preferences),
            'Unable to save user preferences to Supabase.'
        );
    }

    public deleteProgram(programId: string): void {
        if (!this.storage.activeUserId) {
            return;
        }

        const userId = this.storage.activeUserId;
        this.enqueue(
            async () => {
                await this.cloudData.deleteProgram(userId, programId);
                this.storage.removePendingProgramDelete(programId, userId);
            },
            'Unable to delete imported program from Supabase.'
        );
    }

    public async retryPendingDeletes(userId: string): Promise<void> {
        for (const programId of this.storage.getPendingProgramDeletes(userId)) {
            await this.cloudData.deleteProgram(userId, programId);
            this.storage.removePendingProgramDelete(programId, userId);
        }
    }

    public enqueue(action: () => Promise<void>, errorMessage: string): Promise<void> {
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
