import { Injectable } from '@angular/core';
import { Subject } from 'rxjs/Subject';

@Injectable()
export class SharedService {
    // Observable string sources
    private emitLogTypeSource = new Subject<string>();
    // Observable string streams
    logTypeEmitted$ = this.emitLogTypeSource.asObservable();
    // Emit change functions
    emitLogType(logType: string) {
        this.emitLogTypeSource.next(logType);
    }
}