import { Injectable, Optional } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { createDefaultProfile, UserProfile } from '../models/profile.model';
import { SupabaseDataService } from './supabase-data.service';
import { CloudSyncStatusService } from './cloud-sync-status.service';

@Injectable({
    providedIn: 'root'
})
export class ProfileService {
    private readonly guestStorageKey = 'logYourWo.profile';
    private activeUserId: string;
    private cloudWriteQueue: Promise<void> = Promise.resolve();
    private readonly profileSource = new BehaviorSubject<UserProfile>(this.readProfile(this.guestStorageKey));

    public readonly profile$ = this.profileSource.asObservable();

    constructor(
        private cloudData?: SupabaseDataService,
        @Optional() private syncStatus?: CloudSyncStatusService
    ) { }

    public get profile(): UserProfile {
        return this.profileSource.value;
    }

    public setUserContext(userId: string): void {
        this.activeUserId = userId;
        this.profileSource.next(this.readProfile(this.storageKey()));
    }

    public clearUserContext(): void {
        this.activeUserId = undefined;
        this.profileSource.next(this.readProfile(this.guestStorageKey));
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

        this.profileSource.next(this.selectNewestProfile(
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
        this.profileSource.next(savedProfile);

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
        return this.readStoredProfile(key) || createDefaultProfile();
    }

    private readStoredProfile(key: string): UserProfile | undefined {
        const stored = localStorage.getItem(key);

        try {
            return stored
                ? { ...createDefaultProfile(), ...JSON.parse(stored) }
                : undefined;
        } catch {
            return undefined;
        }
    }

    private writeProfile(profile: UserProfile, key = this.storageKey()): void {
        localStorage.setItem(key, JSON.stringify(profile));
    }

    private selectNewestProfile(...profiles: Array<UserProfile | undefined>): UserProfile {
        return profiles.filter(Boolean).reduce((newest, profile) => {
            return (profile.updatedAt || '').localeCompare(newest.updatedAt || '') >= 0
                ? profile
                : newest;
        }, createDefaultProfile());
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
