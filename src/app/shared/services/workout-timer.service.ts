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
 * How long a running workout may go without user activity before it is treated
 * as forgotten and paused back at the last activity.
 */
export const WORKOUT_IDLE_THRESHOLD_MS = 45 * 60 * 1000;

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

    /**
     * The instant a running workout went idle (its last activity, falling back
     * to `startedAt`) when that was at least `WORKOUT_IDLE_THRESHOLD_MS` ago;
     * undefined while the workout is active, paused or done.
     */
    public idleSince(timing: WorkoutTimingSnapshot, lastActivityAt: string | undefined, nowIso?: string): string | undefined {
        if (!this.isRunning(timing)) {
            return undefined;
        }

        const since = lastActivityAt || timing.startedAt;
        const sinceMs = new Date(since).getTime();
        const now = nowIso ? new Date(nowIso).getTime() : Date.now();
        return Number.isFinite(sinceMs) && now - sinceMs >= WORKOUT_IDLE_THRESHOLD_MS ? since : undefined;
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
