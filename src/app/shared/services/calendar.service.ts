import { Injectable } from '@angular/core';

/** A single cell in the month calendar grid. */
export interface CalendarDay {
    date: Date;
    dateValue: string;
    dayNumber: number;
    inCurrentMonth: boolean;
    isToday: boolean;
    hasWorkout: boolean;
    hasCompletedWorkout: boolean;
}

/**
 * Builds the workout-history month grid and converts between Date objects and
 * the `yyyy-MM-dd` / `yyyy-MM-ddTHH:mm` strings used by date inputs and saved
 * logs. All methods are pure and operate in local time.
 */
@Injectable({ providedIn: 'root' })
export class CalendarService {
    private static readonly VISIBLE_DAYS = 42;

    /**
     * Build the six-week (42-cell) grid for `month`, marking today and any day
     * whose `yyyy-MM-dd` value is present in `workoutDates` or
     * `completedWorkoutDates`.
     */
    public buildMonth(
        month: Date,
        today: Date,
        workoutDates: ReadonlySet<string>,
        completedWorkoutDates: ReadonlySet<string> = new Set()
    ): CalendarDay[] {
        const year = month.getFullYear();
        const monthIndex = month.getMonth();
        const firstVisibleDate = new Date(year, monthIndex, 1 - new Date(year, monthIndex, 1).getDay());
        const todayValue = this.toDateValue(today);

        return Array.from({ length: CalendarService.VISIBLE_DAYS }, (_, index) => {
            const date = new Date(
                firstVisibleDate.getFullYear(),
                firstVisibleDate.getMonth(),
                firstVisibleDate.getDate() + index
            );
            const dateValue = this.toDateValue(date);

            return {
                date,
                dateValue,
                dayNumber: date.getDate(),
                inCurrentMonth: date.getMonth() === monthIndex,
                isToday: dateValue === todayValue,
                hasWorkout: workoutDates.has(dateValue),
                hasCompletedWorkout: completedWorkoutDates.has(dateValue)
            };
        });
    }

    /** Localized short weekday labels, Sunday first. */
    public weekdays(locale: string): string[] {
        const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
        const sunday = new Date(2026, 0, 4);
        return Array.from({ length: 7 }, (_, index) =>
            formatter.format(new Date(2026, 0, sunday.getDate() + index))
        );
    }

    /** Date -> `yyyy-MM-dd`. */
    public toDateValue(date: Date): string {
        const pad = (value: number) => String(value).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    }

    /** `yyyy-MM-dd` -> Date at local noon (avoids DST/midnight edge cases). */
    public fromDateValue(value: string): Date {
        const [year, month, day] = value.split('-').map(part => Number(part));
        return new Date(year, month - 1, day, 12);
    }

    /** Date -> `yyyy-MM-ddTHH:mm`. */
    public toDateTimeValue(date: Date): string {
        const pad = (value: number) => String(value).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
            `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }

    /** `yyyy-MM-ddTHH:mm` -> Date in local time. */
    public fromDateTimeValue(value: string): Date {
        const [datePart, timePart] = value.split('T');
        const [year, month, day] = datePart.split('-').map(part => Number(part));
        const [hours, minutes] = timePart.split(':').map(part => Number(part));
        return new Date(year, month - 1, day, hours, minutes);
    }
}
