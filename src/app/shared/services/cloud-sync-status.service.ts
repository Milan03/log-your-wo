import { Injectable, signal } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class CloudSyncStatusService {
    private readonly errorState = signal('');

    public readonly error = this.errorState.asReadonly();

    public clear(): void {
        this.errorState.set('');
    }

    public report(message = 'Cloud sync is temporarily unavailable. Changes remain on this device and will retry when the app reconnects.'): void {
        this.errorState.set(message);
    }
}
