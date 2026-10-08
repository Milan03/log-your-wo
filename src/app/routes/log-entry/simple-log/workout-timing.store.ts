import { inject, Injectable, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';

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
    /** Last user interaction with the workout (set toggles, edits, start/resume). */
    lastActivityAt?: string;
    /** True when the clock was paused automatically because the workout went idle. */
    idlePaused?: boolean;
}

/** Hydration input: a persisted timing state, optionally carrying its record's `updatedAt`. */
export interface WorkoutTimingLoadState extends WorkoutTimingState {
    updatedAt?: string;
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
    private _idlePausedSource = new Subject<void>();

    /** Emits when the per-second tick auto-pauses an idle workout, so the host can persist. */
    public readonly idlePaused$: Observable<void> = this._idlePausedSource.asObservable();

    public readonly startedAt = signal<string | undefined>(undefined);
    public readonly completedAt = signal<string | undefined>(undefined);
    public readonly pausedAt = signal<string | undefined>(undefined);
    public readonly totalPausedMs = signal<number>(0);
    public readonly elapsedMs = signal<number>(0);
    public readonly lastActivityAt = signal<string | undefined>(undefined);
    public readonly idlePaused = signal<boolean>(false);

    public get isStarted(): boolean {
        return Boolean(this.startedAt());
    }

    /** Begin timing if not already started. Returns true only when it just started. */
    public ensureStarted(): boolean {
        if (this.startedAt()) {
            return false;
        }

        const now = new Date().toISOString();
        this.startedAt.set(now);
        this.lastActivityAt.set(now);
        this.syncTimer();
        return true;
    }

    /** Record a user interaction so idle detection measures from now. */
    public recordActivity(): void {
        if (this.startedAt() && !this.completedAt()) {
            this.lastActivityAt.set(new Date().toISOString());
        }
    }

    /**
     * If the clock is running but nothing has happened for longer than the
     * idle threshold (see `WorkoutTimerService.idleSince`), pause it retroactively at the last activity
     * so the idle gap doesn't count. Returns true when it auto-paused (so the
     * caller can persist).
     */
    public pauseIfIdle(nowIso?: string): boolean {
        const idleSince = this._timer.idleSince(this.snapshot(), this.lastActivityAt(), nowIso);
        if (!idleSince) {
            return false;
        }

        this.pausedAt.set(idleSince);
        this.idlePaused.set(true);
        this.refreshElapsed(nowIso);
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

        const now = new Date().toISOString();
        this.totalPausedMs.set(this._timer.accumulatePauseMs(
            this.totalPausedMs(),
            this.pausedAt(),
            now
        ));
        this.pausedAt.set(undefined);
        this.idlePaused.set(false);
        this.lastActivityAt.set(now);
        this.refreshElapsed();
        this.syncTimer();
    }

    /**
     * Mark the workout complete, folding any open paused window into the total.
     * Pass `atIso` to complete at an earlier instant (e.g. the last activity of
     * an idle-paused workout); it must not precede an open pause.
     */
    public complete(atIso?: string): void {
        const completedAt = atIso || new Date().toISOString();
        if (this.pausedAt()) {
            this.totalPausedMs.set(this._timer.accumulatePauseMs(
                this.totalPausedMs(),
                this.pausedAt(),
                completedAt
            ));
        }
        this.completedAt.set(completedAt);
        this.pausedAt.set(undefined);
        this.idlePaused.set(false);
        this.refreshElapsed(completedAt);
        this.syncTimer();
    }

    /**
     * Correct a completed workout's elapsed time after the fact. The start and
     * paused total are kept and the completion moves to fit; if that would land
     * in the future, completion is capped at now and the start moves earlier
     * instead. Returns false when the workout isn't completed.
     */
    public setCompletedElapsed(elapsedMs: number, nowIso?: string): boolean {
        if (!this.startedAt() || !this.completedAt() || elapsedMs < 0) {
            return false;
        }

        const startMs = new Date(this.startedAt()).getTime();
        const nowMs = nowIso ? new Date(nowIso).getTime() : Date.now();
        let completedMs = startMs + this.totalPausedMs() + elapsedMs;
        if (completedMs > nowMs) {
            this.startedAt.set(new Date(startMs - (completedMs - nowMs)).toISOString());
            completedMs = nowMs;
        }

        const completedAt = new Date(completedMs).toISOString();
        this.completedAt.set(completedAt);
        this.refreshElapsed(completedAt);
        return true;
    }

    /**
     * Clear completion and any pause so the workout returns to in-progress.
     * The window since completion is folded into the paused total so elapsed
     * time resumes from where it froze rather than counting the gap.
     */
    public reopen(): void {
        this.pausedAt.set(undefined);
        this.idlePaused.set(false);
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
            this.lastActivityAt.set(now);
            this.refreshElapsed(now);
        }
        this.syncTimer();
    }

    /**
     * Hydrate timing from a saved/imported workout state. Records saved before
     * activity tracking fall back to their `updatedAt` as the last activity.
     */
    public load(state: WorkoutTimingLoadState | undefined): void {
        this.startedAt.set(state ? state.startedAt : undefined);
        this.completedAt.set(state ? state.completedAt : undefined);
        this.pausedAt.set(state ? state.pausedAt : undefined);
        this.totalPausedMs.set(state && state.totalPausedMs ? state.totalPausedMs : 0);
        this.elapsedMs.set(state && state.elapsedMs ? state.elapsedMs : 0);
        this.lastActivityAt.set(state ? state.lastActivityAt || state.updatedAt || state.startedAt : undefined);
        this.idlePaused.set(Boolean(state && state.idlePaused && state.pausedAt && !state.completedAt));
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
        this.lastActivityAt.set(undefined);
        this.idlePaused.set(false);
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
            elapsedMs: this.elapsedMs(),
            lastActivityAt: this.lastActivityAt(),
            idlePaused: this.idlePaused() || undefined
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

    private onTick(): void {
        if (this.pauseIfIdle()) {
            this._idlePausedSource.next();
            return;
        }
        this.refreshElapsed();
    }

    private syncTimer(): void {
        if (this._timer.isRunning(this.snapshot())) {
            // Only start when not already ticking, so frequent state changes
            // (e.g. toggling exercises) don't reset the 1-second cadence. The
            // per-second tick writes the `elapsedMs` signal, which marks any
            // OnPush view reading it for check — no manual change detection.
            if (!this._timer.isTicking()) {
                this._timer.start(() => this.onTick());
            }
        } else {
            this._timer.stop();
        }
    }
}
