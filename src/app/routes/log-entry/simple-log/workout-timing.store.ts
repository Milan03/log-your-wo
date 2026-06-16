import { inject, Injectable } from '@angular/core';

import {
    WorkoutTimerService,
    WorkoutTimingSnapshot
} from '../../../shared/services/workout-timer.service';

/** The persisted timing fields a workout state carries. */
export interface WorkoutTimingState {
    startedAt?: string;
    completedAt?: string;
    pausedAt?: string;
    totalPausedMs?: number;
    elapsedMs?: number;
}

/**
 * Component-scoped workout timing state for the simple log.
 *
 * Owns the start/pause/resume/complete clock fields and drives
 * `WorkoutTimerService` (the per-second tick and elapsed-time math). The host
 * component owns exercise data and persistence; it calls in to record timing
 * transitions and reads the fields back for binding/saving. Provided per
 * component instance, not in root.
 */
@Injectable()
export class WorkoutTimingStore {
    private _timer = inject(WorkoutTimerService);

    public startedAt?: string;
    public completedAt?: string;
    public pausedAt?: string;
    public totalPausedMs = 0;
    public elapsedMs = 0;

    private _onTick: () => void = () => {};

    /** Register the callback fired each second so the host can mark for check. */
    public setTickHandler(onTick: () => void): void {
        this._onTick = onTick;
    }

    public get isStarted(): boolean {
        return Boolean(this.startedAt);
    }

    /** Begin timing if not already started. Returns true only when it just started. */
    public ensureStarted(): boolean {
        if (this.startedAt) {
            return false;
        }

        this.startedAt = new Date().toISOString();
        this.syncTimer();
        return true;
    }

    /** Pause a running workout. Caller should have ensured it is started. */
    public pause(): void {
        if (this.pausedAt || this.completedAt) {
            return;
        }

        this.pausedAt = new Date().toISOString();
        this.refreshElapsed();
        this.syncTimer();
    }

    /**
     * Pause an actively-running workout because the view is leaving. Returns
     * true if it changed state (so the caller can persist). Does not restart
     * the tick interval; the caller stops the clock on teardown.
     */
    public pauseForNavigation(): boolean {
        if (!this.startedAt || this.pausedAt || this.completedAt) {
            return false;
        }

        this.pausedAt = new Date().toISOString();
        this.refreshElapsed();
        return true;
    }

    public resume(): void {
        if (!this.pausedAt) {
            return;
        }

        this.totalPausedMs = this._timer.accumulatePauseMs(
            this.totalPausedMs,
            this.pausedAt,
            new Date().toISOString()
        );
        this.pausedAt = undefined;
        this.refreshElapsed();
        this.syncTimer();
    }

    /** Mark the workout complete, folding any open paused window into the total. */
    public complete(): void {
        const completedAt = new Date().toISOString();
        if (this.pausedAt) {
            this.totalPausedMs = this._timer.accumulatePauseMs(
                this.totalPausedMs,
                this.pausedAt,
                completedAt
            );
        }
        this.completedAt = completedAt;
        this.pausedAt = undefined;
        this.refreshElapsed(completedAt);
        this.syncTimer();
    }

    /**
     * Clear completion and any pause so the workout returns to in-progress.
     * The window since completion is folded into the paused total so elapsed
     * time resumes from where it froze rather than counting the gap.
     */
    public reopen(): void {
        this.pausedAt = undefined;
        this.clearCompletion();
    }

    /**
     * Clear the completion marker, keeping any pause state. The window since
     * completion is folded into the paused total so elapsed time resumes from
     * where it froze rather than counting the gap.
     */
    public clearCompletion(): void {
        if (this.completedAt) {
            const now = new Date().toISOString();
            this.totalPausedMs = this._timer.accumulatePauseMs(
                this.totalPausedMs,
                this.completedAt,
                now
            );
            this.completedAt = undefined;
            this.refreshElapsed(now);
        }
        this.syncTimer();
    }

    /** Hydrate timing from a saved/imported workout state. */
    public load(state: WorkoutTimingState | undefined): void {
        this.startedAt = state ? state.startedAt : undefined;
        this.completedAt = state ? state.completedAt : undefined;
        this.pausedAt = state ? state.pausedAt : undefined;
        this.totalPausedMs = state && state.totalPausedMs ? state.totalPausedMs : 0;
        this.elapsedMs = state && state.elapsedMs ? state.elapsedMs : 0;
        this.refreshElapsed();
        this.syncTimer();
    }

    /** Reset every field and stop the clock. */
    public clear(): void {
        this.startedAt = undefined;
        this.completedAt = undefined;
        this.pausedAt = undefined;
        this.totalPausedMs = 0;
        this.elapsedMs = 0;
        this._timer.stop();
    }

    /** Stop the tick interval without clearing state. */
    public stop(): void {
        this._timer.stop();
    }

    /** The full persisted timing payload (snapshot plus elapsed time). */
    public toState(): WorkoutTimingState {
        return {
            startedAt: this.startedAt,
            completedAt: this.completedAt,
            pausedAt: this.pausedAt,
            totalPausedMs: this.totalPausedMs,
            elapsedMs: this.elapsedMs
        };
    }

    public snapshot(): WorkoutTimingSnapshot {
        return {
            startedAt: this.startedAt,
            completedAt: this.completedAt,
            pausedAt: this.pausedAt,
            totalPausedMs: this.totalPausedMs
        };
    }

    public refreshElapsed(nowIso?: string): void {
        this.elapsedMs = this._timer.elapsedMs(this.snapshot(), nowIso);
    }

    private syncTimer(): void {
        if (this._timer.isRunning(this.snapshot())) {
            this._timer.start(() => {
                this.refreshElapsed();
                this._onTick();
            });
        } else {
            this._timer.stop();
        }
    }
}
