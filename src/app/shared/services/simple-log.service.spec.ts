import { TestBed } from '@angular/core/testing';
import { Duration } from 'luxon';

import { Exercise } from '../models/exercise.model';
import { SavedSimpleLog, SimpleLog } from '../models/simple-log.model';
import { SimpleLogService } from './simple-log.service';
import { SupabaseDataService } from './supabase-data.service';
import { CloudSyncStatusService } from './cloud-sync-status.service';

describe('SimpleLogService', () => {
    let service: SimpleLogService;

    beforeEach(() => {
        localStorage.clear();
        TestBed.configureTestingModule({});
        service = TestBed.inject(SimpleLogService);
    });

    afterEach(() => {
        localStorage.clear();
    });

    it('saves and restores standalone workout logs', () => {
        const log = new SimpleLog();
        const exercise = new Exercise();
        exercise.exerciseType = 'strength';
        exercise.exerciseName = 'Back Squat';
        log.title = 'Saturday strength';
        log.exercises = [exercise];

        const saved = service.saveLog(log, '2026-06-06');
        const restored = service.hydrateLog(service.getLog(saved.id));

        expect(service.getLogs().length).toBe(1);
        expect(restored.title).toBe('Saturday strength');
        expect(restored.startDatim.getFullYear()).toBe(2026);
        expect(restored.exercises[0] instanceof Exercise).toBeTrue();
    });

    it('updates an existing log instead of creating a duplicate', () => {
        const log = new SimpleLog();
        log.exercises = [new Exercise()];

        service.saveLog(log, '2026-06-05');
        log.title = 'Updated workout';
        service.saveLog(log, '2026-06-06');

        expect(service.getLogs().length).toBe(1);
        expect(service.getLogs()[0].title).toBe('Updated workout');
        expect(service.getLogs()[0].workoutDate).toBe('2026-06-06');
    });

    it('persists workout timing and the selected time of day', () => {
        const log = new SimpleLog();
        log.startDatim = new Date(2026, 5, 6, 18, 30);
        log.exercises = [new Exercise()];

        const saved = service.saveLog(log, '2026-06-06', {
            startedAt: '2026-06-06T21:00:00.000Z',
            completedAt: '2026-06-06T22:00:00.000Z',
            elapsedMs: 3600000
        });
        const restored = service.hydrateLog(saved);

        expect(saved.startedAt).toBe('2026-06-06T21:00:00.000Z');
        expect(saved.elapsedMs).toBe(3600000);
        expect(restored.startDatim.getHours()).toBe(18);
        expect(restored.startDatim.getMinutes()).toBe(30);
    });

    it('uses the workout start time for legacy logs without a saved date-time', () => {
        const log = new SimpleLog();
        log.exercises = [new Exercise()];
        const saved = service.saveLog(log, '2026-06-06', {
            startedAt: '2026-06-06T18:45:00.000Z'
        });
        saved.workoutDateTime = undefined;

        const restored = service.hydrateLog(saved);

        expect(restored.startDatim.toISOString()).toBe('2026-06-06T18:45:00.000Z');
    });

    it('deletes a saved log', () => {
        const log = new SimpleLog();
        log.exercises = [new Exercise()];
        const saved = service.saveLog(log, '2026-06-06');

        service.deleteLog(saved.id);

        expect(service.getLogs()).toEqual([]);
    });

    it('migrates legacy browser logs into the signed-in user account', async () => {
        const cloud = jasmine.createSpyObj<SupabaseDataService>(
            'SupabaseDataService',
            ['getSimpleLogs', 'saveSimpleLogs', 'deleteSimpleLog']
        );
        cloud.getSimpleLogs.and.resolveTo([]);
        cloud.saveSimpleLogs.and.resolveTo();
        const migratingService = createSyncingService(cloud);
        const log = new SimpleLog();
        log.exercises = [new Exercise()];
        migratingService.saveLog(log, '2026-06-06');

        migratingService.setUserContext('user-1');
        await migratingService.syncWithCloud();

        expect(cloud.saveSimpleLogs).toHaveBeenCalledWith(
            'user-1',
            jasmine.arrayContaining([jasmine.objectContaining({ workoutDate: '2026-06-06' })])
        );
        expect(localStorage.getItem('logYourWo.simpleLogs')).toBeNull();
        expect(localStorage.getItem('logYourWo.user-1.simpleLogs')).toBeTruthy();
    });

    it('does not write completed account sync data into guest storage after sign out', async () => {
        const cloud = jasmine.createSpyObj<SupabaseDataService>(
            'SupabaseDataService',
            ['getSimpleLogs', 'saveSimpleLogs', 'deleteSimpleLog']
        );
        const remoteResult = deferred<SavedSimpleLog[]>();
        cloud.getSimpleLogs.and.returnValue(remoteResult.promise);
        cloud.saveSimpleLogs.and.resolveTo();
        const syncingService = createSyncingService(cloud);
        syncingService.setUserContext('user-1');

        const sync = syncingService.syncWithCloud();
        syncingService.clearUserContext();
        remoteResult.resolve([savedLog('remote-log')]);
        await sync;

        expect(localStorage.getItem('logYourWo.simpleLogs')).toBeNull();
        expect(syncingService.getLogs()).toEqual([]);
    });

    it('retries a failed cloud deletion before merging remote logs', async () => {
        spyOn(console, 'error');
        let remoteLogs = [savedLog('deleted-log')];
        let deleteAttempts = 0;
        const cloud = jasmine.createSpyObj<SupabaseDataService>(
            'SupabaseDataService',
            ['getSimpleLogs', 'saveSimpleLogs', 'deleteSimpleLog']
        );
        cloud.getSimpleLogs.and.callFake(async () => remoteLogs);
        cloud.saveSimpleLogs.and.resolveTo();
        cloud.deleteSimpleLog.and.callFake(async () => {
            deleteAttempts++;
            if (deleteAttempts === 1) {
                throw new Error('offline');
            }
            remoteLogs = [];
        });
        const syncingService = createSyncingService(cloud);
        syncingService.setUserContext('user-1');
        localStorage.setItem('logYourWo.user-1.simpleLogs', JSON.stringify(remoteLogs));

        syncingService.deleteLog('deleted-log');
        await Promise.resolve();
        await Promise.resolve();
        await syncingService.syncWithCloud();

        expect(deleteAttempts).toBe(2);
        expect(syncingService.getLogs()).toEqual([]);
        expect(localStorage.getItem('logYourWo.user-1.deletedSimpleLogs')).toBeNull();
    });

    it('does not resurrect a log deleted while initial cloud sync is loading', async () => {
        const remoteResult = deferred<SavedSimpleLog[]>();
        const cloud = jasmine.createSpyObj<SupabaseDataService>(
            'SupabaseDataService',
            ['getSimpleLogs', 'saveSimpleLogs', 'deleteSimpleLog']
        );
        cloud.getSimpleLogs.and.returnValue(remoteResult.promise);
        cloud.saveSimpleLogs.and.resolveTo();
        cloud.deleteSimpleLog.and.resolveTo();
        const syncingService = createSyncingService(cloud);
        syncingService.setUserContext('user-1');
        localStorage.setItem(
            'logYourWo.user-1.simpleLogs',
            JSON.stringify([savedLog('deleted-log')])
        );

        const sync = syncingService.syncWithCloud();
        await Promise.resolve();
        syncingService.deleteLog('deleted-log');
        remoteResult.resolve([savedLog('deleted-log')]);
        await sync;

        expect(syncingService.getLogs()).toEqual([]);
        expect(cloud.saveSimpleLogs).not.toHaveBeenCalledWith(
            'user-1',
            jasmine.arrayContaining([jasmine.objectContaining({ id: 'deleted-log' })])
        );
    });

    it('hydrates ISO duration strings saved by older browser records', () => {
        const log = savedLog('duration-log');
        const exercise = new Exercise();
        exercise.duration = 'PT12M30S' as unknown as Duration;
        log.cardioExercises = [exercise];

        const hydrated = service.hydrateLog(log);

        expect(hydrated.cardioExercises[0].duration.toMillis()).toBe(750000);
    });
});

function createSyncingService(cloud: SupabaseDataService): SimpleLogService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
        providers: [
            { provide: SupabaseDataService, useValue: cloud },
            { provide: CloudSyncStatusService, useValue: null }
        ]
    });
    return TestBed.inject(SimpleLogService);
}

function savedLog(id: string): SavedSimpleLog {
    return {
        id,
        title: 'Remote',
        workoutDate: '2026-06-07',
        createdAt: '2026-06-07T10:00:00.000Z',
        updatedAt: '2026-06-07T10:00:00.000Z',
        exercises: [],
        cardioExercises: []
    };
}

function deferred<T>(): { promise: Promise<T>, resolve: (value: T) => void } {
    let resolve: (value: T) => void;
    const promise = new Promise<T>(resolver => resolve = resolver);
    return { promise, resolve };
}
