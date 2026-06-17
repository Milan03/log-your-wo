import { TestBed } from '@angular/core/testing';

import { ImportedProgramStorageService } from './imported-program-storage.service';
import { ImportedProgram, ImportedWorkoutState } from '../models/imported-program.model';

describe('ImportedProgramStorageService', () => {
    let service: ImportedProgramStorageService;

    beforeEach(() => {
        localStorage.clear();
        TestBed.configureTestingModule({ providers: [ImportedProgramStorageService] });
        service = TestBed.inject(ImportedProgramStorageService);
    });

    afterEach(() => {
        localStorage.clear();
    });

    it('uses legacy guest keys until a user context is set', () => {
        expect(service.programsStorageKey()).toBe('logYourWo.importedPrograms');
        expect(service.completionColorStorageKey()).toBe('logYourWo.completionColor');

        service.setUserId('user-1');

        expect(service.programsStorageKey()).toBe('logYourWo.user-1.importedPrograms');
        expect(service.completionColorStorageKey()).toBe('logYourWo.user-1.completionColor');
    });

    it('removes empty collections instead of writing them', () => {
        service.writePrograms([program('program-1')]);
        expect(service.readJson<ImportedProgram[]>(service.programsStorageKey(), [])).toHaveSize(1);

        service.writePrograms([]);
        expect(service.readRaw(service.programsStorageKey())).toBeNull();
    });

    it('returns the serialized workout payload so callers can cache it', () => {
        const states: ImportedWorkoutState[] = [workoutState()];

        const serialized = service.writeWorkoutStates(states);

        expect(serialized).toBe(JSON.stringify(states));
        expect(service.writeWorkoutStates([])).toBeNull();
        expect(service.readRaw(service.workoutStorageKey())).toBeNull();
    });

    it('falls back to the provided default when stored JSON is unparseable', () => {
        localStorage.setItem('broken', '{ not json');
        expect(service.readJson('broken', 'fallback')).toBe('fallback');
    });

    it('ignores pending program deletes while in guest mode', () => {
        service.addPendingProgramDelete('program-1');
        expect(service.getPendingProgramDeletes()).toEqual([]);
    });

    it('tracks and clears pending program deletes for the active user', () => {
        service.setUserId('user-1');

        service.addPendingProgramDelete('program-1');
        service.addPendingProgramDelete('program-1');
        service.addPendingProgramDelete('program-2');
        expect(service.getPendingProgramDeletes()).toEqual(['program-1', 'program-2']);

        service.removePendingProgramDelete('program-1');
        expect(service.getPendingProgramDeletes()).toEqual(['program-2']);

        service.removePendingProgramDelete('program-2');
        expect(service.readRaw('logYourWo.user-1.deletedPrograms')).toBeNull();
    });

    it('clears every legacy guest key during migration', () => {
        localStorage.setItem(service.legacyProgramStorageKey, '{}');
        localStorage.setItem(service.legacyProgramsStorageKey, '[]');
        localStorage.setItem(service.legacyWorkoutStorageKey, '[]');
        localStorage.setItem(service.legacyCompletionColorStorageKey, '#fff');

        service.removeLegacyData();

        expect(service.readRaw(service.legacyProgramStorageKey)).toBeNull();
        expect(service.readRaw(service.legacyProgramsStorageKey)).toBeNull();
        expect(service.readRaw(service.legacyWorkoutStorageKey)).toBeNull();
        expect(service.readRaw(service.legacyCompletionColorStorageKey)).toBeNull();
    });
});

function program(id: string): ImportedProgram {
    return { id, name: id, importedAt: '2026-06-04T00:00:00.000Z', weeks: [] };
}

function workoutState(): ImportedWorkoutState {
    return {
        programId: 'program-1',
        weekId: 'week-1',
        dayId: 'week-1-day-1',
        exercises: []
    };
}
