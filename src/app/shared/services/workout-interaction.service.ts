import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

/**
 * Carries user interactions toward the active simple-log workspace: requests to
 * open the add-exercise dialog and notifications that the measurement unit changed.
 */
@Injectable({
    providedIn: 'root'
})
export class WorkoutInteractionService {
    private readonly exerciseDialogRequestedSource = new Subject<string>();
    private readonly measureChangedSource = new Subject<string>();

    public readonly exerciseDialogRequested$: Observable<string> = this.exerciseDialogRequestedSource.asObservable();
    public readonly measureChanged$: Observable<string> = this.measureChangedSource.asObservable();

    public requestExerciseDialog(type: string): void {
        this.exerciseDialogRequestedSource.next(type);
    }

    public notifyMeasureChanged(measure: string): void {
        this.measureChangedSource.next(measure);
    }
}
