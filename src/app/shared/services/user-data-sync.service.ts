import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { ProgramImportService } from './program-import.service';
import { ProfileService } from './profile.service';
import { SimpleLogService } from './simple-log.service';

@Injectable({
    providedIn: 'root'
})
export class UserDataSyncService {
    private initializedUserId: string;
    private readonly errorSource = new BehaviorSubject<string>('');

    public readonly error$ = this.errorSource.asObservable();

    constructor(
        auth: AuthService,
        private simpleLogs: SimpleLogService,
        private programs: ProgramImportService,
        private profile: ProfileService
    ) {
        auth.session$.subscribe(session => {
            if (session) {
                void this.initialize(session.user.id);
                return;
            }

            this.useGuestMode();
        });
    }

    public async initialize(userId?: string): Promise<void> {
        if (!userId) {
            this.useGuestMode();
            return;
        }

        if (this.initializedUserId === userId) {
            return;
        }

        this.initializedUserId = userId;
        this.errorSource.next('');
        this.simpleLogs.setUserContext(userId);
        this.programs.setUserContext(userId);
        this.profile.setUserContext(userId);

        try {
            await Promise.all([
                this.simpleLogs.syncWithCloud(),
                this.programs.syncWithCloud(),
                this.profile.syncWithCloud()
            ]);
        } catch (error) {
            console.error('Supabase data sync failed.', error);
            this.errorSource.next(
                'Cloud sync is temporarily unavailable. Changes will remain on this device and retry after you sign in again.'
            );
        }
    }

    public useGuestMode(): void {
        this.initializedUserId = undefined;
        this.errorSource.next('');
        this.simpleLogs.clearUserContext();
        this.programs.clearUserContext();
        this.profile.clearUserContext();
    }
}
