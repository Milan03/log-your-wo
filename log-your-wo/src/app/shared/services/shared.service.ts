import { Injectable } from '@angular/core';
import { Subject } from 'rxjs/Subject';

@Injectable({
    providedIn: 'root'
})
export class SharedService {
    // Observable string sources
    private emitLogTypeSource = new Subject<string>();
    private emitLogStartDatimSource = new Subject<Date>();
    // Observable string streams
    logTypeEmitted$ = this.emitLogTypeSource.asObservable();
    logStartDatimEmitted$ = this.emitLogStartDatimSource.asObservable();
    // Emit change functions
    emitLogType(logType: string) {
        this.emitLogTypeSource.next(logType);
    }
    emitLogStartDatim(datim: Date) {
        this.emitLogStartDatimSource.next(datim);
    }
}