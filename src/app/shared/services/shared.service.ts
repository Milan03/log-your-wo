import { Injectable } from '@angular/core';
import { Subject } from 'rxjs/Subject';
import { CardioExercise } from '../models/cardio-exercise.model';

@Injectable({
    providedIn: 'root'
})
export class SharedService {
    // Observable string sources
    private emitLogTypeSource = new Subject<string>();
    private emitLogStartDatimSource = new Subject<Date>();
    private emitCvExerciseSource = new Subject<CardioExercise>();
    // Observable string streams
    logTypeEmitted$ = this.emitLogTypeSource.asObservable();
    logStartDatimEmitted$ = this.emitLogStartDatimSource.asObservable();
    cvExerciseEmitted$ = this.emitCvExerciseSource.asObservable();
    // Emit change functions
    emitLogType(logType: string) {
        this.emitLogTypeSource.next(logType);
    }
    emitLogStartDatim(datim: Date) {
        this.emitLogStartDatimSource.next(datim);
    }
    emitCvExercise(exercise: CardioExercise) {
        this.emitCvExerciseSource.next(exercise);
    }
}