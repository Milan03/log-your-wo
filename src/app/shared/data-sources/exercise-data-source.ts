import { DataSource } from '@angular/cdk/collections';
import { Observable, ReplaySubject } from 'rxjs';
import { Exercise } from '../models/exercise.model';

export class ExerciseDataSource extends DataSource<Exercise> {
    private _dataStream = new ReplaySubject<Exercise[]>();

    constructor(initialData: Exercise[]) {
        super();
        this.setData(initialData);
    }

    connect(): Observable<Exercise[]> {
        return this._dataStream.asObservable();
    }

    disconnect(): void {
        this._dataStream.complete();
    }

    setData(data: Exercise[]): void {
        this._dataStream.next(data);
    }
}