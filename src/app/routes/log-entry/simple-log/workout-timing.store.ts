import { inject, Injectable, signal } from '@angular/core';

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
 * transitions and reads the fields back for binding/saving. State is exposed as
 * signals so OnPush views update without manual change detection. Provided per
 * component instance, not in root.
 */
@Injectable()
export class WorkoutTimingStore {
    private _timer = inject(WorkoutTimerService);

    public readonly startedAt = signal<string | undefined>(undefined);
    public readonly completedAt = signal<string | undefined>(undefined);
    public readonly pausedAt = signal<string | undefined>(undefined);
    public readonly totalPausedMs = signal<number>(0);
    public readonly elapsedMs = signal<number>(0);

    public get isStarted(): boolean {
        return Boolean(this.startedAt());
    }

    /** Begin timing if not already started. Returns true only when it just started. */
    public ensureStarted(): boolean {
        if (this.startedAt()) {
            return false;
        }

        this.startedAt.set(new Date().toISOString());
        this.syncTimer();
        return true;
    }

    /** Pause a running workout. Caller should have ensured it is started. */
    public pause(): void {
        if (this.pausedAt() || this.completedAt()) {
            return;
        }

        this.pausedAt.set(new Date().toISOString());
        this.refreshElapsed();
        this.syncTimer();
    }

    /**
     * Pause an actively-running workout because the view is leaving. Returns
     * true if it changed state (so the caller can persist). Does not restart
     * the tick interval; the caller stops the clock on teardown.
     */
    public pauseForNavigation(): boolean {
        if (!this.startedAt() || this.pausedAt() || this.completedAt()) {
            return false;
        }

        this.pausedAt.set(new Date().toISOString());
        this.refreshElapsed();
        return true;
    }

    public resume(): void {
        if (!this.pausedAt()) {
            return;
        }

        this.totalPausedMs.set(this._timer.accumulatePauseMs(
            this.totalPausedMs(),
            this.pausedAt(),
            new Date().toISOString()
        ));
        this.pausedAt.set(undefined);
        this.refreshElapsed();
        this.syncTimer();
    }

    /** Mark the workout complete, folding any open paused window into the total. */
    public complete(): void {
        const completedAt = new Date().toISOString();
        if (this.pausedAt()) {
            this.totalPausedMs.set(this._timer.accumulatePauseMs(
                this.totalPausedMs(),
                this.pausedAt(),
                completedAt
            ));
        }
        this.completedAt.set(completedAt);
        this.pausedAt.set(undefined);
        this.refreshElapsed(completedAt);
        this.syncTimer();
    }

    /**
     * Clear completion and any pause so the workout returns to in-progress.
     * The window since completion is folded into the paused total so elapsed
     * time resumes from where it froze rather than counting the gap.
     */
    public reopen(): void {
        this.pausedAt.set(undefined);
        this.clearCompletion();
    }

    /**
     * Clear the completion marker, keeping any pause state. The window since
     * completion is folded into the paused total so elapsed time resumes from
     * where it froze rather than counting the gap.
     */
    public clearCompletion(): void {
        const completedAt = this.completedAt();
        if (completedAt) {
            const now = new Date().toISOString();
            this.totalPausedMs.set(this._timer.accumulatePauseMs(
                this.totalPausedMs(),
                completedAt,
                now
            ));
            this.completedAt.set(undefined);
            this.refreshElapsed(now);
        }
        this.syncTimer();
    }

    /** Hydrate timing from a saved/imported workout state. */
    public load(state: WorkoutTimingState | undefined): void {
        this.startedAt.set(state ? state.startedAt : undefined);
        this.completedAt.set(state ? state.completedAt : undefined);
        this.pausedAt.set(state ? state.pausedAt : undefined);
        this.totalPausedMs.set(state && state.totalPausedMs ? state.totalPausedMs : 0);
        this.elapsedMs.set(state && state.elapsedMs ? state.elapsedMs : 0);
        this.refreshElapsed();
        this.syncTimer();
    }

    /** Reset every field and stop the clock. */
    public clear(): void {
        this.startedAt.set(undefined);
        this.completedAt.set(undefined);
        this.pausedAt.set(undefined);
        this.totalPausedMs.set(0);
        this.elapsedMs.set(0);
        this._timer.stop();
    }

    /** Stop the tick interval without clearing state. */
    public stop(): void {
        this._timer.stop();
    }

    /** The full persisted timing payload (snapshot plus elapsed time). */
    public toState(): WorkoutTimingState {
        return {
            startedAt: this.startedAt(),
            completedAt: this.completedAt(),
            pausedAt: this.pausedAt(),
            totalPausedMs: this.totalPausedMs(),
            elapsedMs: this.elapsedMs()
        };
    }

    public snapshot(): WorkoutTimingSnapshot {
        return {
            startedAt: this.startedAt(),
            completedAt: this.completedAt(),
            pausedAt: this.pausedAt(),
            totalPausedMs: this.totalPausedMs()
        };
    }

    public refreshElapsed(nowIso?: string): void {
        this.elapsedMs.set(this._timer.elapsedMs(this.snapshot(), nowIso));
    }

    private syncTimer(): void {
        if (this._timer.isRunning(this.snapshot())) {
            // Only start when not already ticking, so frequent state changes
            // (e.g. toggling exercises) don't reset the 1-second cadence. The
            // per-second tick writes the `elapsedMs` signal, which marks any
            // OnPush view reading it for check — no manual change detection.
            if (!this._timer.isTicking()) {
                this._timer.start(() => this.refreshElapsed());
            }
        } else {
            this._timer.stop();
        }
    }
}
