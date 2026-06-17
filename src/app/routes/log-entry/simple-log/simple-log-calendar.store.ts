import { inject, Injectable, signal } from '@angular/core';

import { CalendarDay, CalendarService } from '../../../shared/services/calendar.service';
import { SavedSimpleLog } from '../../../shared/models/simple-log.model';

/**
 * Component-scoped view state for the simple-log calendar/history panel.
 *
 * Owns the month grid, weekday labels, the saved-log collection and the
 * selected-day filter, keeping the calendar concern out of
 * `SimpleLogComponent`. The component still owns the active `workoutDate`
 * (shared with timing/save logic) and passes it in when the calendar needs to
 * recompute. State is exposed as signals so OnPush views update without manual
 * change detection. Provided per component instance, not in root.
 */
@Injectable()
export class SimpleLogCalendarStore {
    private _calendarService = inject(CalendarService);

    public readonly savedLogs = signal<SavedSimpleLog[]>([]);
    public readonly selectedDateLogs = signal<SavedSimpleLog[]>([]);
    public readonly calendarMonth = signal<Date>(new Date());
    public readonly calendarDays = signal<CalendarDay[]>([]);
    public readonly calendarWeekdays = signal<string[]>([]);
    public readonly isHistoryExpanded = signal<boolean>(true);

    /** Snap the visible month to the first of the month containing `date`. */
    public setMonthFromDate(date: Date): void {
        this.calendarMonth.set(new Date(date.getFullYear(), date.getMonth(), 1));
    }

    /** Step the visible month by `offset` and rebuild the grid. */
    public changeMonth(offset: number, workoutDate: string): void {
        const month = this.calendarMonth();
        this.calendarMonth.set(new Date(month.getFullYear(), month.getMonth() + offset, 1));
        this.refresh(workoutDate);
    }

    /** Replace the saved-log collection and rebuild the grid + selected day. */
    public setSavedLogs(logs: SavedSimpleLog[], workoutDate: string): void {
        this.savedLogs.set(logs);
        this.refresh(workoutDate);
    }

    /** Rebuild the month grid and the selected-day workout list. */
    public refresh(workoutDate: string): void {
        const workoutDates = new Set(this.savedLogs().map(log => log.workoutDate));
        const completedWorkoutDates = new Set(
            this.savedLogs()
                .filter(log => Boolean(log.completedAt))
                .map(log => log.workoutDate)
        );
        this.calendarDays.set(this._calendarService.buildMonth(
            this.calendarMonth(),
            new Date(),
            workoutDates,
            completedWorkoutDates
        ));
        this.refreshSelectedDateLogs(workoutDate);
    }

    /** Recompute only the workouts shown for the selected day. */
    public refreshSelectedDateLogs(workoutDate: string): void {
        this.selectedDateLogs.set(this.savedLogs().filter(log => log.workoutDate === workoutDate));
    }

    /** Refresh localized weekday labels for the active language. */
    public updateWeekdays(language: string): void {
        this.calendarWeekdays.set(this._calendarService.weekdays(language));
    }

    public toggleHistory(): void {
        this.isHistoryExpanded.update(expanded => !expanded);
    }

    /** Whether any saved log falls on the given `yyyy-MM-dd` value. */
    public hasLogForDate(dateValue: string): boolean {
        return this.savedLogs().some(log => log.workoutDate === dateValue);
    }
}
