import { TestBed } from '@angular/core/testing';

import { Exercise } from '../models/exercise.model';
import { SimpleLog } from '../models/simple-log.model';
import { SimpleLogService } from './simple-log.service';
import { SupabaseDataService } from './supabase-data.service';

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
        const migratingService = new SimpleLogService(cloud);
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
});
