import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { createDefaultProfile, UserProfile } from '../models/profile.model';
import { SupabaseDataService } from './supabase-data.service';

@Injectable({
    providedIn: 'root'
})
export class ProfileService {
    private readonly guestStorageKey = 'logYourWo.profile';
    private activeUserId: string;
    private cloudWriteQueue: Promise<void> = Promise.resolve();
    private readonly profileSource = new BehaviorSubject<UserProfile>(this.readProfile(this.guestStorageKey));

    public readonly profile$ = this.profileSource.asObservable();

    constructor(private cloudData?: SupabaseDataService) { }

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
        const remoteProfile = await this.cloudData.getProfile(userId);
        const accountCache = this.readProfile(this.storageKey());
        const guestProfile = this.readProfile(this.guestStorageKey);
        const profile = this.mergeProfiles(guestProfile, accountCache, remoteProfile);

        this.writeProfile(profile);
        await this.cloudData.saveProfile(userId, profile);

        if (this.hasProfileData(guestProfile)) {
            localStorage.removeItem(this.guestStorageKey);
        }

        this.profileSource.next(profile);
    }

    public saveProfile(profile: UserProfile): void {
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
            this.cloudWriteQueue = this.cloudWriteQueue
                .catch(() => undefined)
                .then(() => this.cloudData.saveProfile(userId, savedProfile))
                .catch(error => console.error('Unable to save profile to Supabase.', error));
        }
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

    private storageKey(): string {
        return this.activeUserId ? `logYourWo.${this.activeUserId}.profile` : this.guestStorageKey;
    }

    private readProfile(key: string): UserProfile {
        const stored = localStorage.getItem(key);

        try {
            return stored
                ? { ...createDefaultProfile(), ...JSON.parse(stored) }
                : createDefaultProfile();
        } catch {
            return createDefaultProfile();
        }
    }

    private writeProfile(profile: UserProfile): void {
        localStorage.setItem(this.storageKey(), JSON.stringify(profile));
    }

    private mergeProfiles(...profiles: UserProfile[]): UserProfile {
        return profiles.filter(Boolean).reduce((merged, profile) => {
            const values = Object.entries(profile).reduce((result, [key, value]) => {
                if (value !== '' && value !== undefined && value !== null) {
                    result[key] = value;
                }
                return result;
            }, {} as any);
            return { ...merged, ...values };
        }, createDefaultProfile());
    }

    private hasProfileData(profile: UserProfile): boolean {
        return !!(
            profile.firstName ||
            profile.lastName ||
            profile.username ||
            profile.bio ||
            profile.birthDate ||
            profile.gender ||
            profile.height ||
            profile.bodyWeight ||
            profile.fitnessGoal ||
            profile.experienceLevel ||
            profile.preferredTraining.length ||
            profile.updatedAt
        );
    }
}
