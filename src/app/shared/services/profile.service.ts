import { Injectable, OnDestroy, Optional } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';

import { createDefaultProfile, UserProfile } from '../models/profile.model';
import { ThemesService } from '../../core/themes/themes.service';
import { SupabaseDataService } from './supabase-data.service';
import { CloudSyncStatusService } from './cloud-sync-status.service';

@Injectable({
    providedIn: 'root'
})
export class ProfileService implements OnDestroy {
    private readonly guestStorageKey = 'logYourWo.profile';
    private activeUserId: string;
    private applyingProfileTheme = false;
    private cloudWriteQueue: Promise<void> = Promise.resolve();
    private readonly profileSource = new BehaviorSubject<UserProfile>(this.readProfile(this.guestStorageKey));
    private readonly themeSubscription?: Subscription;

    public readonly profile$ = this.profileSource.asObservable();

    constructor(
        private cloudData?: SupabaseDataService,
        @Optional() private syncStatus?: CloudSyncStatusService,
        @Optional() private themes?: ThemesService
    ) {
        this.applyProfileTheme(this.profile);
        this.themeSubscription = this.themes?.darkMode$?.subscribe(enabled => {
            this.persistDarkModePreference(enabled);
        });
    }

    public ngOnDestroy(): void {
        this.themeSubscription?.unsubscribe();
    }

    public get profile(): UserProfile {
        return this.profileSource.value;
    }

    public setUserContext(userId: string): void {
        this.activeUserId = userId;
        this.publishProfile(this.readProfile(this.storageKey()));
    }

    public clearUserContext(): void {
        this.activeUserId = undefined;
        this.publishProfile(this.readProfile(this.guestStorageKey));
    }

    public async syncWithCloud(): Promise<void> {
        if (!this.activeUserId) {
            return;
        }

        const userId = this.activeUserId;
        const accountStorageKey = this.storageKey(userId);
        const remoteProfile = await this.cloudData.getProfile(userId);
        const accountCache = this.readStoredProfile(accountStorageKey);
        const guestProfile = this.readStoredProfile(this.guestStorageKey);
        const initialProfile = this.selectNewestProfile(remoteProfile, guestProfile, accountCache);

        if (this.activeUserId !== userId) {
            return;
        }

        const latestAccountProfile = this.readStoredProfile(accountStorageKey);
        const profile = this.selectNewestProfile(initialProfile, latestAccountProfile);
        this.writeProfile(profile, accountStorageKey);
        await this.enqueueCloudWrite(
            () => this.cloudData.saveProfile(userId, this.selectNewestProfile(
                profile,
                this.readStoredProfile(accountStorageKey)
            )),
            'Unable to synchronize profile with Supabase.'
        );

        if (guestProfile) {
            localStorage.removeItem(this.guestStorageKey);
        }

        this.publishProfile(this.selectNewestProfile(
            profile,
            this.readStoredProfile(accountStorageKey)
        ));
    }

    public saveProfile(profile: UserProfile): Promise<void> {
        const savedProfile: UserProfile = {
            ...createDefaultProfile(),
            ...profile,
            preferredTraining: profile.preferredTraining || [],
            updatedAt: new Date().toISOString()
        };

        this.writeProfile(savedProfile);
        this.publishProfile(savedProfile);

        if (this.activeUserId) {
            const userId = this.activeUserId;
            return this.enqueueCloudWrite(
                () => this.cloudData.saveProfile(userId, savedProfile),
                'Unable to save profile to Supabase.'
            );
        }

        return Promise.resolve();
    }

    public getDisplayName(email?: string): string {
        const profile = this.profile;

        if (profile.firstName) {
            return profile.firstName;
        }
        if (profile.username) {
            return profile.username;
        }
        if (email) {
            return email.split('@')[0];
        }

        return 'Guest';
    }

    private storageKey(userId = this.activeUserId): string {
        return userId ? `logYourWo.${userId}.profile` : this.guestStorageKey;
    }

    private readProfile(key: string): UserProfile {
        return this.readStoredProfile(key) || this.defaultProfile();
    }

    private readStoredProfile(key: string): UserProfile | undefined {
        const stored = localStorage.getItem(key);

        try {
            return stored
                ? this.normalizeProfile(JSON.parse(stored))
                : undefined;
        } catch {
            return undefined;
        }
    }

    private writeProfile(profile: UserProfile, key = this.storageKey()): void {
        localStorage.setItem(key, JSON.stringify(profile));
    }

    private selectNewestProfile(...profiles: Array<UserProfile | undefined>): UserProfile {
        return profiles.filter(Boolean).map(profile => this.normalizeProfile(profile)).reduce((newest, profile) => {
            return (profile.updatedAt || '').localeCompare(newest.updatedAt || '') >= 0
                ? profile
                : newest;
        }, this.defaultProfile());
    }

    private normalizeProfile(profile: Partial<UserProfile>): UserProfile {
        return {
            ...createDefaultProfile(),
            ...profile,
            preferredTraining: profile.preferredTraining || [],
            darkMode: typeof profile.darkMode === 'boolean'
                ? profile.darkMode
                : this.readStoredDarkMode()
        };
    }

    private defaultProfile(): UserProfile {
        return {
            ...createDefaultProfile(),
            darkMode: this.readStoredDarkMode()
        };
    }

    private readStoredDarkMode(): boolean {
        try {
            return localStorage.getItem('logYourWo.darkMode') === 'true';
        } catch {
            return false;
        }
    }

    private publishProfile(profile: UserProfile): void {
        this.applyProfileTheme(profile);
        this.profileSource.next(profile);
    }

    private applyProfileTheme(profile: UserProfile): void {
        if (!this.themes) {
            return;
        }

        this.applyingProfileTheme = true;
        try {
            this.themes.setDarkMode(profile.darkMode);
        } finally {
            this.applyingProfileTheme = false;
        }
    }

    private persistDarkModePreference(enabled: boolean): void {
        if (this.applyingProfileTheme || !this.activeUserId || this.profile.darkMode === enabled) {
            return;
        }

        void this.saveProfile({
            ...this.profile,
            darkMode: enabled
        }).catch(() => undefined);
    }

    private enqueueCloudWrite(action: () => Promise<void>, errorMessage: string): Promise<void> {
        const operation = this.cloudWriteQueue
            .catch(() => undefined)
            .then(action);
        this.cloudWriteQueue = operation.catch(error => {
            console.error(errorMessage, error);
            this.syncStatus?.report();
        });
        return operation;
    }
}
