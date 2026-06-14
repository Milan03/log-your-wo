import { WorkoutTimerService, WorkoutTimingSnapshot } from './workout-timer.service';

describe('WorkoutTimerService', () => {
    let service: WorkoutTimerService;

    beforeEach(() => {
        service = new WorkoutTimerService();
    });

    function snapshot(overrides: Partial<WorkoutTimingSnapshot> = {}): WorkoutTimingSnapshot {
        return { totalPausedMs: 0, ...overrides };
    }

    describe('isRunning', () => {
        it('is true only when started and neither paused nor completed', () => {
            expect(service.isRunning(snapshot())).toBeFalse();
            expect(service.isRunning(snapshot({ startedAt: '2026-06-14T10:00:00.000Z' }))).toBeTrue();
            expect(service.isRunning(snapshot({
                startedAt: '2026-06-14T10:00:00.000Z',
                pausedAt: '2026-06-14T10:05:00.000Z'
            }))).toBeFalse();
            expect(service.isRunning(snapshot({
                startedAt: '2026-06-14T10:00:00.000Z',
                completedAt: '2026-06-14T11:00:00.000Z'
            }))).toBeFalse();
        });
    });

    describe('elapsedMs', () => {
        it('returns 0 when the workout has not started', () => {
            expect(service.elapsedMs(snapshot())).toBe(0);
        });

        it('measures from start to a fixed now', () => {
            const elapsed = service.elapsedMs(
                snapshot({ startedAt: '2026-06-14T10:00:00.000Z' }),
                '2026-06-14T10:30:00.000Z'
            );

            expect(elapsed).toBe(30 * 60 * 1000);
        });

        it('subtracts the accumulated paused total', () => {
            const elapsed = service.elapsedMs(
                snapshot({ startedAt: '2026-06-14T10:00:00.000Z', totalPausedMs: 5 * 60 * 1000 }),
                '2026-06-14T10:30:00.000Z'
            );

            expect(elapsed).toBe(25 * 60 * 1000);
        });

        it('subtracts the in-progress paused window while paused', () => {
            const elapsed = service.elapsedMs(
                snapshot({
                    startedAt: '2026-06-14T10:00:00.000Z',
                    pausedAt: '2026-06-14T10:20:00.000Z'
                }),
                '2026-06-14T10:30:00.000Z'
            );

            // Ran 10 min, then paused for 10 min -> 20 min counts.
            expect(elapsed).toBe(20 * 60 * 1000);
        });

        it('freezes at completion time and ignores a stale paused window', () => {
            const elapsed = service.elapsedMs(
                snapshot({
                    startedAt: '2026-06-14T10:00:00.000Z',
                    completedAt: '2026-06-14T10:45:00.000Z',
                    pausedAt: '2026-06-14T10:20:00.000Z'
                }),
                '2026-06-14T12:00:00.000Z'
            );

            expect(elapsed).toBe(45 * 60 * 1000);
        });

        it('never returns a negative value', () => {
            const elapsed = service.elapsedMs(
                snapshot({ startedAt: '2026-06-14T10:00:00.000Z', totalPausedMs: 999 * 60 * 1000 }),
                '2026-06-14T10:30:00.000Z'
            );

            expect(elapsed).toBe(0);
        });
    });

    describe('accumulatePauseMs', () => {
        it('adds the finished paused window to the running total', () => {
            const total = service.accumulatePauseMs(
                60 * 1000,
                '2026-06-14T10:00:00.000Z',
                '2026-06-14T10:02:00.000Z'
            );

            expect(total).toBe(3 * 60 * 1000);
        });
    });

    describe('start / stop', () => {
        beforeEach(() => jasmine.clock().install());
        afterEach(() => jasmine.clock().uninstall());

        it('invokes the tick callback every second until stopped', () => {
            const onTick = jasmine.createSpy('onTick');

            service.start(onTick);
            jasmine.clock().tick(3000);
            expect(onTick).toHaveBeenCalledTimes(3);

            service.stop();
            jasmine.clock().tick(3000);
            expect(onTick).toHaveBeenCalledTimes(3);
        });

        it('replaces an existing interval instead of stacking them', () => {
            const first = jasmine.createSpy('first');
            const second = jasmine.createSpy('second');

            service.start(first);
            service.start(second);
            jasmine.clock().tick(1000);

            expect(first).not.toHaveBeenCalled();
            expect(second).toHaveBeenCalledTimes(1);

            service.stop();
        });
    });
});
