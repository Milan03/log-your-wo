import { UserProfile } from '../models/profile.model';
import { ProfileService } from './profile.service';
import { SupabaseDataService } from './supabase-data.service';

describe('ProfileService', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => localStorage.clear());

    it('stores a guest profile in local storage without cloud access', () => {
        const service = new ProfileService();

        service.saveProfile(profileWith({ firstName: 'Milan', username: 'milanlifts' }));

        expect(service.getDisplayName()).toBe('Milan');
        expect(JSON.parse(localStorage.getItem('logYourWo.profile')).username).toBe('milanlifts');
    });

    it('migrates a guest profile when an account has no profile yet', async () => {
        const cloud = jasmine.createSpyObj<SupabaseDataService>(
            'SupabaseDataService',
            ['getProfile', 'saveProfile']
        );
        cloud.getProfile.and.resolveTo(undefined);
        cloud.saveProfile.and.resolveTo();
        const service = new ProfileService(cloud);
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
        const service = new ProfileService(cloud);

        service.setUserContext('user-1');
        await service.syncWithCloud();

        expect(service.profile.firstName).toBe('Cloud');
        expect(service.profile.unitSystem).toBe('metric');
    });

    it('keeps a profile edit made while initial cloud sync is loading', async () => {
        const remoteResult = deferred<UserProfile>();
        const cloud = jasmine.createSpyObj<SupabaseDataService>(
            'SupabaseDataService',
            ['getProfile', 'saveProfile']
        );
        cloud.getProfile.and.returnValue(remoteResult.promise);
        cloud.saveProfile.and.resolveTo();
        const service = new ProfileService(cloud);
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
});

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
        emailUpdates: false,
        updatedAt: '',
        ...values
    };
}

function deferred<T>(): { promise: Promise<T>, resolve: (value: T) => void } {
    let resolve: (value: T) => void;
    const promise = new Promise<T>(resolver => resolve = resolver);
    return { promise, resolve };
}
