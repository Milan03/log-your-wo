import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { Exercise } from '../models/exercise.model';

@Injectable({
    providedIn: 'root'
})
export class SharedService {
    // Observable string sources
    private emitLogTypeSource = new Subject<string>();
    private emitLogStartDatimSource = new Subject<Date>();
    private emitExerciseSource = new Subject<Exercise>();
    private emitSidebarToggleSource = new Subject<boolean>();
    private emitMeasureToggleSource = new Subject<string>();
    // Observable string streams
    logTypeEmitted$ = this.emitLogTypeSource.asObservable();
    logStartDatimEmitted$ = this.emitLogStartDatimSource.asObservable();
    exerciseEmitted$ = this.emitExerciseSource.asObservable();
    sidebarToggleEmitted$ = this.emitSidebarToggleSource.asObservable();
    measureToggleSource$ = this.emitMeasureToggleSource.asObservable();
    // Emit change functions
    emitLogType(logType: string) {
        this.emitLogTypeSource.next(logType);
    }
    emitLogStartDatim(datim: Date) {
        this.emitLogStartDatimSource.next(datim);
    }
    emitCvExercise(exercise: Exercise) {
        this.emitExerciseSource.next(exercise);
    }
    emitSidebarToggle(state: boolean) {
        this.emitSidebarToggleSource.next(state);
    }
    emitMeasureToggle(toggle: string) {
        this.emitMeasureToggleSource.next(toggle);
    }
}