import { TestBed } from '@angular/core/testing';

import { ProgramImportCloudService } from './program-import-cloud.service';
import { SupabaseDataService } from './supabase-data.service';
import { CloudSyncStatusService } from './cloud-sync-status.service';
import { ImportedProgramStorageService } from './imported-program-storage.service';
import { ImportedProgram } from '../models/imported-program.model';

describe('ProgramImportCloudService', () => {
    let cloud: jasmine.SpyObj<SupabaseDataService>;
    let syncStatus: jasmine.SpyObj<CloudSyncStatusService>;
    let storage: ImportedProgramStorageService;
    let service: ProgramImportCloudService;

    beforeEach(() => {
        localStorage.clear();
        cloud = jasmine.createSpyObj<SupabaseDataService>('SupabaseDataService', [
            'savePrograms',
            'saveWorkoutStates',
            'savePreferences',
            'deleteProgram'
        ]);
        cloud.savePrograms.and.resolveTo();
        cloud.saveWorkoutStates.and.resolveTo();
        cloud.savePreferences.and.resolveTo();
        cloud.deleteProgram.and.resolveTo();
        syncStatus = jasmine.createSpyObj<CloudSyncStatusService>('CloudSyncStatusService', ['report']);

        TestBed.configureTestingModule({
            providers: [
                ProgramImportCloudService,
                ImportedProgramStorageService,
                { provide: SupabaseDataService, useValue: cloud },
                { provide: CloudSyncStatusService, useValue: syncStatus }
            ]
        });

        storage = TestBed.inject(ImportedProgramStorageService);
        service = TestBed.inject(ProgramImportCloudService);
    });

    afterEach(() => {
        localStorage.clear();
    });

    it('does not write to the cloud while signed out', () => {
        service.persistPrograms([program('program-1')]);
        service.persistWorkoutStates([]);
        service.persistPreferences({ activeProgramId: 'program-1' });
        service.deleteProgram('program-1');

        expect(cloud.savePrograms).not.toHaveBeenCalled();
        expect(cloud.saveWorkoutStates).not.toHaveBeenCalled();
        expect(cloud.savePreferences).not.toHaveBeenCalled();
        expect(cloud.deleteProgram).not.toHaveBeenCalled();
    });

    it('persists records for the active user', async () => {
        storage.setUserId('user-1');

        service.persistPrograms([program('program-1')]);
        await service.enqueue(() => Promise.resolve(), 'flush');

        expect(cloud.savePrograms).toHaveBeenCalledWith('user-1', [program('program-1')]);
    });

    it('runs queued cloud writes one at a time in order', async () => {
        const order: string[] = [];
        const first = service.enqueue(async () => {
            await Promise.resolve();
            order.push('first');
        }, 'first');
        const second = service.enqueue(async () => {
            order.push('second');
        }, 'second');

        await Promise.all([first, second]);

        expect(order).toEqual(['first', 'second']);
    });

    it('keeps the queue alive and reports status after a failed write', async () => {
        spyOn(console, 'error');

        await service.enqueue(() => Promise.reject(new Error('offline')), 'boom').catch(() => undefined);
        await service.enqueue(() => Promise.resolve(), 'ok');

        expect(syncStatus.report).toHaveBeenCalled();
        expect(console.error).toHaveBeenCalled();
    });

    it('clears the pending delete after a successful remote delete', async () => {
        storage.setUserId('user-1');
        storage.addPendingProgramDelete('program-1');

        service.deleteProgram('program-1');
        await service.enqueue(() => Promise.resolve(), 'flush');

        expect(cloud.deleteProgram).toHaveBeenCalledWith('user-1', 'program-1');
        expect(storage.getPendingProgramDeletes()).toEqual([]);
    });

    it('retries every pending delete and clears the queue when they succeed', async () => {
        storage.setUserId('user-1');
        storage.addPendingProgramDelete('program-1');
        storage.addPendingProgramDelete('program-2');

        await service.retryPendingDeletes('user-1');

        expect(cloud.deleteProgram).toHaveBeenCalledTimes(2);
        expect(storage.getPendingProgramDeletes()).toEqual([]);
    });
});

function program(id: string): ImportedProgram {
    return { id, name: id, importedAt: '2026-06-04T00:00:00.000Z', weeks: [] };
}
