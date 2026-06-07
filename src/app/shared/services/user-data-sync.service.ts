import { Injectable, OnDestroy } from '@angular/core';
import { fromEvent, Observable, Subscription } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { ProgramImportService } from './program-import.service';
import { ProfileService } from './profile.service';
import { SimpleLogService } from './simple-log.service';
import { CloudSyncStatusService } from './cloud-sync-status.service';

@Injectable({
    providedIn: 'root'
})
export class UserDataSyncService implements OnDestroy {
    private initializedUserId: string;
    private initializingUserId: string;
    private initializationPromise: Promise<void>;
    private readonly sessionSubscription: Subscription;
    private readonly onlineSubscription: Subscription;
    private currentUserId: string;

    public get error$(): Observable<string> {
        return this.syncStatus.error$;
    }

    constructor(
        auth: AuthService,
        private simpleLogs: SimpleLogService,
        private programs: ProgramImportService,
        private profile: ProfileService,
        private syncStatus: CloudSyncStatusService
    ) {
        this.sessionSubscription = auth.session$.subscribe(session => {
            if (session) {
                this.currentUserId = session.user.id;
                void this.initialize(session.user.id);
                return;
            }

            this.currentUserId = undefined;
            this.useGuestMode();
        });
        this.onlineSubscription = fromEvent(window, 'online').subscribe(() => {
            if (this.currentUserId) {
                this.initializedUserId = undefined;
                void this.initialize(this.currentUserId);
            }
        });
    }

    public ngOnDestroy(): void {
        this.sessionSubscription.unsubscribe();
        this.onlineSubscription.unsubscribe();
    }

    public async initialize(userId?: string): Promise<void> {
        if (!userId) {
            this.useGuestMode();
            return;
        }

        if (this.initializedUserId === userId) {
            return;
        }
        if (this.initializingUserId === userId) {
            return this.initializationPromise;
        }

        this.initializingUserId = userId;
        this.syncStatus.clear();
        this.simpleLogs.setUserContext(userId);
        this.programs.setUserContext(userId);
        this.profile.setUserContext(userId);

        this.initializationPromise = Promise.all([
                this.simpleLogs.syncWithCloud(),
                this.programs.syncWithCloud(),
                this.profile.syncWithCloud()
            ]).then(() => {
                if (this.initializingUserId === userId) {
                    this.initializedUserId = userId;
                    this.initializingUserId = undefined;
                    this.syncStatus.clear();
                }
            }).catch(error => {
                console.error('Supabase data sync failed.', error);
                if (this.initializingUserId === userId) {
                    this.initializingUserId = undefined;
                    this.syncStatus.report(
                        'Cloud sync is temporarily unavailable. Changes remain on this device and will retry when the app reconnects.'
                    );
                }
            });

        return this.initializationPromise;
    }

    public useGuestMode(): void {
        this.initializedUserId = undefined;
        this.initializingUserId = undefined;
        this.syncStatus.clear();
        this.simpleLogs.clearUserContext();
        this.programs.clearUserContext();
        this.profile.clearUserContext();
    }
}
