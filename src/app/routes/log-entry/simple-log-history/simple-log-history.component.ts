import { DatePipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { SavedSimpleLog } from '../../../shared/models/simple-log.model';
import { TranslatorService } from '../../../core/translator/translator.service';
import { CalendarDay } from '../../../shared/services/calendar.service';

@Component({
    selector: 'app-simple-log-history',
    standalone: true,
    imports: [DatePipe, NgClass, TranslateModule],
    templateUrl: './simple-log-history.component.html',
    styleUrls: ['./simple-log-history.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SimpleLogHistoryComponent {
    @Input() selectedDateLogs: SavedSimpleLog[] = [];
    @Input() isHistoryExpanded = true;
    @Input() calendarWeekdays: string[] = [];
    @Input() calendarDays: CalendarDay[] = [];
    @Input() calendarMonth: Date = new Date();
    @Input() workoutDate = '';
    @Input() activeLogId: string | undefined;
    @Input() currentLanguage = '';

    @Output() toggleHistory = new EventEmitter<void>();
    @Output() startNewLog = new EventEmitter<void>();
    @Output() changeMonth = new EventEmitter<number>();
    @Output() selectDay = new EventEmitter<CalendarDay>();
    @Output() selectLog = new EventEmitter<SavedSimpleLog>();
    @Output() deleteLog = new EventEmitter<SavedSimpleLog>();

    private _translatorService = inject(TranslatorService);

    public onDeleteLog(event: Event, log: SavedSimpleLog): void {
        event.stopPropagation();
        this.deleteLog.emit(log);
    }

    public getCalendarMonthLabel(): string {
        return this.calendarMonth.toLocaleDateString(this.currentLanguage, { month: 'long', year: 'numeric' });
    }

    public getSimpleLogExerciseCount(log: SavedSimpleLog): number {
        return (log.exercises || []).length + (log.cardioExercises || []).length;
    }

    public getSimpleLogStatus(log: SavedSimpleLog): 'completed' | 'in-progress' | 'not-started' {
        if (log.completedAt) {
            return 'completed';
        }

        return log.startedAt ? 'in-progress' : 'not-started';
    }

    public getSimpleLogStatusLabel(log: SavedSimpleLog): string {
        const status = this.getSimpleLogStatus(log);

        if (status === 'completed') {
            return this.t('log-entry.Completed');
        }

        return status === 'in-progress'
            ? this.t('log-entry.InProgress')
            : this.t('log-entry.NotStarted');
    }

    public getSimpleLogDateLabel(dateValue: string): string {
        return this.dateFromInputValue(dateValue).toLocaleDateString(this.currentLanguage, {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    private dateFromInputValue(value: string): Date {
        const [year, month, day] = value.split('-').map(part => Number(part));
        return new Date(year, month - 1, day, 12);
    }

    private t(key: string, params?: object): string {
        return this._translatorService.translate.instant(key, params);
    }
}
