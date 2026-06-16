import { TestBed } from '@angular/core/testing';
import { UserProfile } from '../models/profile.model';
import { Subject } from 'rxjs';
import { ThemesService } from '../../core/themes/themes.service';
import { TranslatorService } from '../../core/translator/translator.service';
import { ProfileService } from './profile.service';
import { SupabaseDataService } from './supabase-data.service';
import { CloudSyncStatusService } from './cloud-sync-status.service';

describe('ProfileService', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => localStorage.clear());

    it('stores a guest profile in local storage without cloud access', () => {
        const service = createProfileService();

        service.saveProfile(profileWith({ firstName: 'Milan', username: 'milanlifts' }));

        expect(service.getDisplayName()).toBe('Milan');
        expect(JSON.parse(localStorage.getItem('logYourWo.profile')).username).toBe('milanlifts');
    });

    it('stores and finds reusable training maxes by common exercise aliases', async () => {
        const service = createProfileService();

        await service.saveTrainingMaxes([{
            id: 'clean-jerk',
            exerciseName: 'Clean & Jerk',
            value: 120
        }]);

        expect(service.findTrainingMax('C&J')).toEqual(jasmine.objectContaining({
            exerciseName: 'Clean & Jerk',
            value: 120
        }));
        expect(JSON.parse(localStorage.getItem('logYourWo.profile')).trainingMaxes.length).toBe(1);
    });

    it('updates an existing training max instead of duplicating its alias', async () => {
        const service = createProfileService();
        await service.saveTrainingMaxes([{
            id: 'clean-jerk',
            exerciseName: 'Clean & Jerk',
            value: 120
        }]);

        await service.saveTrainingMaxes([{
            id: 'new-id',
            exerciseName: 'Clean Jerk',
            value: 125
        }]);

        expect(service.profile.trainingMaxes.length).toBe(1);
        expect(service.profile.trainingMaxes[0].value).toBe(125);
        expect(service.profile.trainingMaxes[0].id).toBe('clean-jerk');
    });

    it('normalizes older profiles without training maxes', () => {
        localStorage.setItem('logYourWo.profile', JSON.stringify({
            ...profileWith({ firstName: 'Older' }),
            trainingMaxes: undefined
        }));

        const service = createProfileService();

        expect(service.profile.trainingMaxes).toEqual([]);
    });

    it('migrates a guest profile when an account has no profile yet', async () => {
        const cloud = jasmine.createSpyObj<SupabaseDataService>(
            'SupabaseDataService',
            ['getProfile', 'saveProfile']
        );
        cloud.getProfile.and.resolveTo(undefined);
        cloud.saveProfile.and.resolveTo();
        const service = createProfileService({ cloud });
        service.saveProfile(profileWith({
            firstName: 'Milan',
            fitnessGoal: 'strength',
            preferredTraining: ['Olympic lifting'],
            unitSystem: 'metric',
            workoutsPerWeek: 5,
            emailUpdates: true
        }));

        service.setUserContext('user-1');
        await service.syncWithCloud();

        expect(cloud.saveProfile).toHaveBeenCalledWith(
            'user-1',
            jasmine.objectContaining({
                firstName: 'Milan',
                fitnessGoal: 'strength',
                unitSystem: 'metric',
                workoutsPerWeek: 5,
                emailUpdates: true
            })
        );
        expect(localStorage.getItem('logYourWo.profile')).toBeNull();
        expect(localStorage.getItem('logYourWo.user-1.profile')).toBeTruthy();
    });

    it('keeps the newest signed-in profile instead of applying older guest data', async () => {
        const cloud = jasmine.createSpyObj<SupabaseDataService>(
            'SupabaseDataService',
            ['getProfile', 'saveProfile']
        );
        cloud.getProfile.and.resolveTo(profileWith({
            firstName: 'Cloud',
            unitSystem: 'metric',
            updatedAt: '2026-06-07T12:00:00.000Z'
        }));
        cloud.saveProfile.and.resolveTo();
        localStorage.setItem('logYourWo.profile', JSON.stringify(profileWith({
            firstName: 'Guest',
            updatedAt: '2026-06-06T12:00:00.000Z'
        })));
        const service = createProfileService({ cloud });

        service.setUserContext('user-1');
        await service.syncWithCloud();

        expect(service.profile.firstName).toBe('Cloud');
        expect(service.profile.unitSystem).toBe('metric');
    });

    it('loads the account profile and discards a newer guest profile on sign-in', async () => {
        const cloud = jasmine.createSpyObj<SupabaseDataService>(
            'SupabaseDataService',
            ['getProfile', 'saveProfile']
        );
        cloud.getProfile.and.resolveTo(profileWith({
            firstName: 'Account',
            unitSystem: 'imperial',
            updatedAt: '2026-06-01T12:00:00.000Z'
        }));
        cloud.saveProfile.and.resolveTo();
        localStorage.setItem('logYourWo.profile', JSON.stringify(profileWith({
            firstName: 'Guest',
            unitSystem: 'metric',
            updatedAt: '2026-06-09T12:00:00.000Z'
        })));
        const service = createProfileService({ cloud });

        service.setUserContext('user-1');
        await service.syncWithCloud();

        expect(service.profile.firstName).toBe('Account');
        expect(service.profile.unitSystem).toBe('imperial');
        expect(localStorage.getItem('logYourWo.profile')).toBeNull();
    });

    it('keeps a profile edit made while initial cloud sync is loading', async () => {
        const remoteResult = deferred<UserProfile>();
        const cloud = jasmine.createSpyObj<SupabaseDataService>(
            'SupabaseDataService',
            ['getProfile', 'saveProfile']
        );
        cloud.getProfile.and.returnValue(remoteResult.promise);
        cloud.saveProfile.and.resolveTo();
        const service = createProfileService({ cloud });
        service.setUserContext('user-1');

        const sync = service.syncWithCloud();
        const save = service.saveProfile(profileWith({
            firstName: 'Local',
            updatedAt: '2026-06-07T13:00:00.000Z'
        }));
        remoteResult.resolve(profileWith({
            firstName: 'Cloud',
            updatedAt: '2025-06-07T12:00:00.000Z'
        }));
        await Promise.all([sync, save]);

        expect(service.profile.firstName).toBe('Local');
        expect(cloud.saveProfile.calls.mostRecent().args[1].firstName).toBe('Local');
    });

    it('applies dark mode restored from the signed-in profile', async () => {
        const cloud = jasmine.createSpyObj<SupabaseDataService>(
            'SupabaseDataService',
            ['getProfile', 'saveProfile']
        );
        const themes = jasmine.createSpyObj<ThemesService>('ThemesService', ['setDarkMode']);
        cloud.getProfile.and.resolveTo(profileWith({
            darkMode: true,
            updatedAt: '2026-06-07T12:00:00.000Z'
        }));
        cloud.saveProfile.and.resolveTo();
        const service = createProfileService({ cloud, themes });

        service.setUserContext('user-1');
        await service.syncWithCloud();

        expect(service.profile.darkMode).toBeTrue();
        expect(themes.setDarkMode).toHaveBeenCalledWith(true);
    });

    it('migrates an older profile using the saved browser theme', async () => {
        localStorage.setItem('logYourWo.darkMode', 'true');
        localStorage.setItem('logYourWo.user-1.profile', JSON.stringify({
            ...profileWith({ updatedAt: '2026-06-07T12:00:00.000Z' }),
            darkMode: undefined
        }));
        const service = createProfileService();

        service.setUserContext('user-1');

        expect(service.profile.darkMode).toBeTrue();
    });

    it('persists theme changes to the signed-in profile', async () => {
        const cloud = jasmine.createSpyObj<SupabaseDataService>(
            'SupabaseDataService',
            ['getProfile', 'saveProfile']
        );
        const themeChanges = new Subject<boolean>();
        const themes = jasmine.createSpyObj<ThemesService>(
            'ThemesService',
            ['setDarkMode'],
            { darkMode$: themeChanges.asObservable() }
        );
        cloud.saveProfile.and.resolveTo();
        const service = createProfileService({ cloud, themes });
        service.setUserContext('user-1');

        themeChanges.next(true);
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(service.profile.darkMode).toBeTrue();
        expect(JSON.parse(localStorage.getItem('logYourWo.user-1.profile')).darkMode).toBeTrue();
        expect(cloud.saveProfile).toHaveBeenCalledWith(
            'user-1',
            jasmine.objectContaining({ darkMode: true })
        );
    });

    it('does not persist profile-applied theme changes as user edits', async () => {
        const cloud = jasmine.createSpyObj<SupabaseDataService>(
            'SupabaseDataService',
            ['getProfile', 'saveProfile']
        );
        const themeChanges = new Subject<boolean>();
        const themes = jasmine.createSpyObj<ThemesService>(
            'ThemesService',
            ['setDarkMode'],
            { darkMode$: themeChanges.asObservable() }
        );
        themes.setDarkMode.and.callFake(enabled => themeChanges.next(enabled));
        localStorage.setItem('logYourWo.user-1.profile', JSON.stringify(profileWith({
            darkMode: true,
            updatedAt: '2026-06-07T12:00:00.000Z'
        })));
        const service = createProfileService({ cloud, themes });
        service.setUserContext('user-1');
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(service.profile.darkMode).toBeTrue();
        expect(localStorage.getItem('logYourWo.user-1.profile')).toContain(
            '"updatedAt":"2026-06-07T12:00:00.000Z"'
        );
        expect(cloud.saveProfile).not.toHaveBeenCalled();
    });

    it('persists language changes to the signed-in profile', async () => {
        const cloud = jasmine.createSpyObj<SupabaseDataService>(
            'SupabaseDataService',
            ['getProfile', 'saveProfile']
        );
        const languageChanges = new Subject<string>();
        const translator = jasmine.createSpyObj<TranslatorService>(
            'TranslatorService',
            ['useLanguage'],
            {
                language: 'en-ca',
                languageChangeEmitted$: languageChanges.asObservable()
            }
        );
        cloud.saveProfile.and.resolveTo();
        const service = createProfileService({ cloud, translator });
        service.setUserContext('user-1');

        languageChanges.next('fr-ca');
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(service.profile.preferredLanguage).toBe('fr-ca');
        expect(JSON.parse(localStorage.getItem('logYourWo.user-1.profile')).preferredLanguage).toBe('fr-ca');
        expect(cloud.saveProfile).toHaveBeenCalledWith(
            'user-1',
            jasmine.objectContaining({ preferredLanguage: 'fr-ca' })
        );
    });

    it('applies the language restored from the signed-in profile', async () => {
        const cloud = jasmine.createSpyObj<SupabaseDataService>(
            'SupabaseDataService',
            ['getProfile', 'saveProfile']
        );
        const translator = jasmine.createSpyObj<TranslatorService>(
            'TranslatorService',
            ['useLanguage'],
            {
                language: 'en-ca',
                languageChangeEmitted$: new Subject<string>().asObservable()
            }
        );
        cloud.getProfile.and.resolveTo(profileWith({
            preferredLanguage: 'fr-ca',
            updatedAt: '2026-06-07T12:00:00.000Z'
        }));
        cloud.saveProfile.and.resolveTo();
        const service = createProfileService({ cloud, translator });

        service.setUserContext('user-1');
        await service.syncWithCloud();

        expect(translator.useLanguage).toHaveBeenCalledWith('fr-ca');
    });
});

function createProfileService(deps: {
    cloud?: SupabaseDataService;
    themes?: ThemesService;
    translator?: TranslatorService;
} = {}): ProfileService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
        providers: [
            { provide: SupabaseDataService, useValue: deps.cloud ?? null },
            { provide: CloudSyncStatusService, useValue: null },
            { provide: ThemesService, useValue: deps.themes ?? null },
            { provide: TranslatorService, useValue: deps.translator ?? null }
        ]
    });
    return TestBed.inject(ProfileService);
}

function profileWith(values: Partial<UserProfile>): UserProfile {
    return {
        firstName: '',
        lastName: '',
        username: '',
        bio: '',
        birthDate: '',
        gender: '',
        height: undefined,
        bodyWeight: undefined,
        unitSystem: 'imperial',
        fitnessGoal: '',
        experienceLevel: '',
        workoutsPerWeek: 3,
        preferredTraining: [],
        trainingMaxes: [],
        emailUpdates: false,
        darkMode: false,
        preferredLanguage: 'en-ca',
        updatedAt: '',
        ...values
    };
}

function deferred<T>(): { promise: Promise<T>, resolve: (value: T) => void } {
    let resolve: (value: T) => void;
    const promise = new Promise<T>(resolver => resolve = resolver);
    return { promise, resolve };
}
