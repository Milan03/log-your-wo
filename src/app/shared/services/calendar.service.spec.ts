import { CalendarService } from './calendar.service';

describe('CalendarService', () => {
    let service: CalendarService;

    beforeEach(() => {
        service = new CalendarService();
    });

    describe('buildMonth', () => {
        // June 2026: 1st is a Monday, so the grid starts on Sun May 31.
        const month = new Date(2026, 5, 1);
        const today = new Date(2026, 5, 14);

        it('returns a full six-week grid', () => {
            const days = service.buildMonth(month, today, new Set());

            expect(days.length).toBe(42);
        });

        it('starts on the Sunday on or before the first of the month', () => {
            const days = service.buildMonth(month, today, new Set());

            expect(days[0].date.getDay()).toBe(0);
            expect(days[0].dateValue).toBe('2026-05-31');
            expect(days[0].inCurrentMonth).toBeFalse();
            expect(days[1].dateValue).toBe('2026-06-01');
            expect(days[1].inCurrentMonth).toBeTrue();
        });

        it('flags today and worked days', () => {
            const days = service.buildMonth(month, today, new Set(['2026-06-10']));

            const todayCell = days.find(day => day.dateValue === '2026-06-14');
            const workedCell = days.find(day => day.dateValue === '2026-06-10');
            const plainCell = days.find(day => day.dateValue === '2026-06-11');

            expect(todayCell?.isToday).toBeTrue();
            expect(workedCell?.hasWorkout).toBeTrue();
            expect(plainCell?.hasWorkout).toBeFalse();
            expect(plainCell?.isToday).toBeFalse();
        });

        it('flags completed workout days separately from saved workout days', () => {
            const days = service.buildMonth(
                month,
                today,
                new Set(['2026-06-10', '2026-06-11']),
                new Set(['2026-06-11'])
            );

            const inProgressCell = days.find(day => day.dateValue === '2026-06-10');
            const completedCell = days.find(day => day.dateValue === '2026-06-11');

            expect(inProgressCell?.hasWorkout).toBeTrue();
            expect(inProgressCell?.hasCompletedWorkout).toBeFalse();
            expect(completedCell?.hasWorkout).toBeTrue();
            expect(completedCell?.hasCompletedWorkout).toBeTrue();
        });
    });

    describe('weekdays', () => {
        it('returns seven Sunday-first labels for the locale', () => {
            const labels = service.weekdays('en-CA');

            expect(labels.length).toBe(7);
            expect(labels[0]).toBe('Sun');
            expect(labels[6]).toBe('Sat');
        });
    });

    describe('date conversions', () => {
        it('round-trips a date value', () => {
            const value = service.toDateValue(new Date(2026, 5, 7));

            expect(value).toBe('2026-06-07');
            expect(service.fromDateValue(value).getDate()).toBe(7);
            // Parsed at local noon to dodge DST/midnight rollover.
            expect(service.fromDateValue(value).getHours()).toBe(12);
        });

        it('round-trips a date-time value', () => {
            const value = service.toDateTimeValue(new Date(2026, 5, 7, 9, 5));

            expect(value).toBe('2026-06-07T09:05');

            const parsed = service.fromDateTimeValue(value);
            expect(parsed.getFullYear()).toBe(2026);
            expect(parsed.getMonth()).toBe(5);
            expect(parsed.getDate()).toBe(7);
            expect(parsed.getHours()).toBe(9);
            expect(parsed.getMinutes()).toBe(5);
        });
    });
});
