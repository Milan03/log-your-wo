import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class CloudSyncStatusService {
    private readonly errorSource = new BehaviorSubject<string>('');

    public readonly error$ = this.errorSource.asObservable();

    public clear(): void {
        this.errorSource.next('');
    }

    public report(message = 'Cloud sync is temporarily unavailable. Changes remain on this device and will retry when the app reconnects.'): void {
        this.errorSource.next(message);
    }
}
