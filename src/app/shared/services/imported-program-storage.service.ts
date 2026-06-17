import { Injectable } from '@angular/core';

import { ImportedProgram, ImportedWorkoutState } from '../models/imported-program.model';

/**
 * Owns the localStorage keying, raw read/write, legacy-key migration, and
 * pending-delete bookkeeping for imported programs. Guest data uses the legacy
 * `logYourWo.*` keys; signed-in data is scoped to `logYourWo.<user-id>.*`.
 * `ProgramImportService` composes merge/sync/normalization on top of this.
 */
@Injectable({
    providedIn: 'root'
})
export class ImportedProgramStorageService {
    public readonly legacyProgramStorageKey = 'logYourWo.importedProgram';
    public readonly legacyProgramsStorageKey = 'logYourWo.importedPrograms';
    public readonly legacyWorkoutStorageKey = 'logYourWo.importedWorkoutStates';
    public readonly legacyCompletionColorStorageKey = 'logYourWo.completionColor';

    private userId: string;

    public get activeUserId(): string {
        return this.userId;
    }

    public setUserId(userId: string): void {
        this.userId = userId;
    }

    public programStorageKey(userId = this.userId): string {
        return this.scopedKey('importedProgram', this.legacyProgramStorageKey, userId);
    }

    public programsStorageKey(userId = this.userId): string {
        return this.scopedKey('importedPrograms', this.legacyProgramsStorageKey, userId);
    }

    public workoutStorageKey(userId = this.userId): string {
        return this.scopedKey('importedWorkoutStates', this.legacyWorkoutStorageKey, userId);
    }

    public completionColorStorageKey(userId = this.userId): string {
        return this.scopedKey('completionColor', this.legacyCompletionColorStorageKey, userId);
    }

    public readJson<T>(key: string, fallback: T): T {
        const value = localStorage.getItem(key);

        try {
            return value ? JSON.parse(value) as T : fallback;
        } catch {
            return fallback;
        }
    }

    public readRaw(key: string): string {
        return localStorage.getItem(key);
    }

    public writePrograms(programs: ImportedProgram[], userId = this.userId): void {
        const key = this.programsStorageKey(userId);
        if (programs.length) {
            localStorage.setItem(key, JSON.stringify(programs));
        } else {
            localStorage.removeItem(key);
        }
    }

    public writeActiveProgram(program: ImportedProgram, userId = this.userId): void {
        const key = this.programStorageKey(userId);
        if (program) {
            localStorage.setItem(key, JSON.stringify(program));
        } else {
            localStorage.removeItem(key);
        }
    }

    /**
     * Persists workout states and returns the serialized payload (or `null`
     * when cleared) so callers can keep their read-through cache in sync.
     */
    public writeWorkoutStates(states: ImportedWorkoutState[], userId = this.userId): string {
        const key = this.workoutStorageKey(userId);
        if (states.length) {
            const serialized = JSON.stringify(states);
            localStorage.setItem(key, serialized);
            return serialized;
        }

        localStorage.removeItem(key);
        return null;
    }

    public writeCompletionColor(color: string, userId = this.userId): void {
        localStorage.setItem(this.completionColorStorageKey(userId), color);
    }

    public removeLegacyData(): void {
        localStorage.removeItem(this.legacyProgramStorageKey);
        localStorage.removeItem(this.legacyProgramsStorageKey);
        localStorage.removeItem(this.legacyWorkoutStorageKey);
        localStorage.removeItem(this.legacyCompletionColorStorageKey);
    }

    public getPendingProgramDeletes(userId = this.userId): string[] {
        const key = this.pendingProgramDeletesKey(userId);
        return key ? this.readJson<string[]>(key, []) : [];
    }

    public addPendingProgramDelete(programId: string): void {
        if (!this.userId) {
            return;
        }

        const pendingDeletes = Array.from(new Set([...this.getPendingProgramDeletes(), programId]));
        localStorage.setItem(this.pendingProgramDeletesKey(), JSON.stringify(pendingDeletes));
    }

    public removePendingProgramDelete(programId: string, userId = this.userId): void {
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

    private pendingProgramDeletesKey(userId = this.userId): string {
        return userId ? `logYourWo.${userId}.deletedPrograms` : '';
    }

    private scopedKey(name: string, legacyKey: string, userId = this.userId): string {
        return userId ? `logYourWo.${userId}.${name}` : legacyKey;
    }
}
