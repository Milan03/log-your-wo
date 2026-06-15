import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

/**
 * Publishes the active log's identity to the app header. Log features set the
 * current type/title and start time; the header subscribes to display them.
 */
@Injectable({
    providedIn: 'root'
})
export class WorkoutHeaderService {
    private readonly logTypeSource = new Subject<string | undefined>();
    private readonly logStartDateSource = new Subject<Date>();

    public readonly logType$: Observable<string | undefined> = this.logTypeSource.asObservable();
    public readonly logStartDate$: Observable<Date> = this.logStartDateSource.asObservable();

    public setLogType(logType: string | undefined): void {
        this.logTypeSource.next(logType);
    }

    public setLogStartDate(date: Date): void {
        this.logStartDateSource.next(date);
    }
}
