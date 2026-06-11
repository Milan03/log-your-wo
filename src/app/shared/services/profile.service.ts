import { Injectable, OnDestroy, Optional } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';

import { createDefaultProfile, PreferredLanguage, TrainingMax, UserProfile } from '../models/profile.model';
import { ThemesService } from '../../core/themes/themes.service';
import { TranslatorService } from '../../core/translator/translator.service';
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
    private readonly languageSubscription?: Subscription;

    public readonly profile$ = this.profileSource.asObservable();

    constructor(
        private cloudData?: SupabaseDataService,
        @Optional() private syncStatus?: CloudSyncStatusService,
        @Optional() private themes?: ThemesService,
        @Optional() private translator?: TranslatorService
    ) {
        this.applyProfilePreferences(this.profile);
        this.themeSubscription = this.themes?.darkMode$?.subscribe(enabled => {
            this.persistDarkModePreference(enabled);
        });
        this.languageSubscription = this.translator?.languageChangeEmitted$?.subscribe(language => {
            this.persistLanguagePreference(language as PreferredLanguage);
        });
    }

    public ngOnDestroy(): void {
        this.themeSubscription?.unsubscribe();
        this.languageSubscription?.unsubscribe();
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
            trainingMaxes: this.normalizeTrainingMaxes(profile.trainingMaxes),
            preferredLanguage: this.normalizeLanguage(profile.preferredLanguage),
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

    public findTrainingMax(exerciseName: string): TrainingMax | undefined {
        const requestedName = this.normalizeExerciseKey(exerciseName);
        return this.profile.trainingMaxes.find(trainingMax =>
            this.normalizeExerciseKey(trainingMax.exerciseName) === requestedName
        );
    }

    public saveTrainingMaxes(trainingMaxes: TrainingMax[]): Promise<void> {
        return this.saveProfile({
            ...this.profile,
            trainingMaxes: this.mergeTrainingMaxes(this.profile.trainingMaxes, trainingMaxes)
        });
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
            trainingMaxes: this.normalizeTrainingMaxes(profile.trainingMaxes),
            darkMode: typeof profile.darkMode === 'boolean'
                ? profile.darkMode
                : this.readStoredDarkMode(),
            preferredLanguage: this.normalizeLanguage(profile.preferredLanguage)
        };
    }

    private defaultProfile(): UserProfile {
        return {
            ...createDefaultProfile(),
            darkMode: this.readStoredDarkMode(),
            preferredLanguage: this.readStoredLanguage()
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
        this.applyProfilePreferences(profile);
        this.profileSource.next(profile);
    }

    private applyProfilePreferences(profile: UserProfile): void {
        if (this.themes) {
            this.applyingProfileTheme = true;
            try {
                this.themes.setDarkMode(profile.darkMode);
            } finally {
                this.applyingProfileTheme = false;
            }
        }
        if (this.translator && this.translator.language !== profile.preferredLanguage) {
            void this.translator.useLanguage(profile.preferredLanguage);
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

    private persistLanguagePreference(language: PreferredLanguage): void {
        if (!this.activeUserId || this.profile.preferredLanguage === language) {
            return;
        }

        void this.saveProfile({
            ...this.profile,
            preferredLanguage: language
        }).catch(() => undefined);
    }

    private normalizeLanguage(language: string): PreferredLanguage {
        return language === 'fr-ca' || language === 'en-ca'
            ? language
            : this.readStoredLanguage();
    }

    private normalizeTrainingMaxes(trainingMaxes: TrainingMax[]): TrainingMax[] {
        const byExercise = new Map<string, TrainingMax>();
        (trainingMaxes || []).forEach(trainingMax => {
            const exerciseName = String(trainingMax?.exerciseName || '').replace(/\s+/g, ' ').trim();
            const value = Number(trainingMax?.value);
            if (!exerciseName || !Number.isFinite(value) || value <= 0) {
                return;
            }
            byExercise.set(this.normalizeExerciseKey(exerciseName), {
                id: trainingMax.id || this.createTrainingMaxId(exerciseName),
                exerciseName,
                value,
                updatedAt: trainingMax.updatedAt || undefined
            });
        });
        return Array.from(byExercise.values());
    }

    private mergeTrainingMaxes(current: TrainingMax[], updates: TrainingMax[]): TrainingMax[] {
        const byExercise = new Map(this.normalizeTrainingMaxes(current).map(trainingMax => [
            this.normalizeExerciseKey(trainingMax.exerciseName),
            trainingMax
        ]));
        this.normalizeTrainingMaxes(updates).forEach(trainingMax => {
            const key = this.normalizeExerciseKey(trainingMax.exerciseName);
            const existing = byExercise.get(key);
            byExercise.set(key, {
                ...existing,
                ...trainingMax,
                id: existing?.id || trainingMax.id,
                updatedAt: new Date().toISOString()
            });
        });
        return Array.from(byExercise.values());
    }

    private normalizeExerciseKey(exerciseName: string): string {
        const normalized = String(exerciseName || '')
            .toLowerCase()
            .replace(/&/g, ' and ')
            .replace(/[^a-z0-9]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        const aliases: Record<string, string> = {
            'c and j': 'clean and jerk',
            'clean jerk': 'clean and jerk',
            'back squat': 'squat',
            'squat back': 'squat'
        };
        return aliases[normalized] || normalized;
    }

    private createTrainingMaxId(exerciseName: string): string {
        return `max-${this.normalizeExerciseKey(exerciseName).replace(/\s+/g, '-')}`;
    }

    private readStoredLanguage(): PreferredLanguage {
        try {
            return localStorage.getItem('logYourWo.language') === 'fr-ca'
                ? 'fr-ca'
                : 'en-ca';
        } catch {
            return 'en-ca';
        }
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
