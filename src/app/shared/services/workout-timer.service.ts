import { Injectable } from '@angular/core';

/**
 * Minimal timing state a workout clock needs to compute elapsed time. ISO
 * strings are used so the snapshot round-trips through persistence unchanged.
 */
export interface WorkoutTimingSnapshot {
    startedAt?: string;
    completedAt?: string;
    pausedAt?: string;
    totalPausedMs: number;
}

/**
 * Owns the workout elapsed-time math and the per-second tick interval. State is
 * held by the caller (so it can be persisted/bound); this service only computes
 * over a snapshot and drives the interval.
 */
@Injectable({ providedIn: 'root' })
export class WorkoutTimerService {
    private intervalId?: ReturnType<typeof setInterval>;

    /** True while the clock should be advancing (started, not paused, not done). */
    public isRunning(timing: WorkoutTimingSnapshot): boolean {
        return Boolean(timing.startedAt) && !timing.pausedAt && !timing.completedAt;
    }

    /**
     * Elapsed milliseconds, excluding accumulated and in-progress paused windows,
     * clamped at 0. Pass `nowIso` to compute against a fixed instant.
     */
    public elapsedMs(timing: WorkoutTimingSnapshot, nowIso?: string): number {
        if (!timing.startedAt) {
            return 0;
        }

        const now = nowIso ? new Date(nowIso).getTime() : Date.now();
        const endTime = timing.completedAt ? new Date(timing.completedAt).getTime() : now;
        const pausedWindowMs = timing.pausedAt && !timing.completedAt
            ? now - new Date(timing.pausedAt).getTime()
            : 0;
        return Math.max(endTime - new Date(timing.startedAt).getTime() - timing.totalPausedMs - pausedWindowMs, 0);
    }

    /** Add the just-finished paused window (pausedAt -> endIso) to the running total. */
    public accumulatePauseMs(totalPausedMs: number, pausedAtIso: string, endIso: string): number {
        return totalPausedMs + (new Date(endIso).getTime() - new Date(pausedAtIso).getTime());
    }

    /** Whether the per-second interval is currently running. */
    public isTicking(): boolean {
        return this.intervalId !== undefined;
    }

    /** Start ticking every second, replacing any existing interval. */
    public start(onTick: () => void): void {
        this.stop();
        this.intervalId = setInterval(onTick, 1000);
    }

    public stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
        }
    }
}
