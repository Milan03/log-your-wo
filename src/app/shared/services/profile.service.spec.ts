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
            preferredTraining: ['Olympic lifting']
        }));

        service.setUserContext('user-1');
        await service.syncWithCloud();

        expect(cloud.saveProfile).toHaveBeenCalledWith(
            'user-1',
            jasmine.objectContaining({
                firstName: 'Milan',
                fitnessGoal: 'strength'
            })
        );
        expect(localStorage.getItem('logYourWo.profile')).toBeNull();
        expect(localStorage.getItem('logYourWo.user-1.profile')).toBeTruthy();
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
