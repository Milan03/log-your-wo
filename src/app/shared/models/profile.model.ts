export type UnitSystem = 'imperial' | 'metric';
export type ExperienceLevel = '' | 'beginner' | 'intermediate' | 'advanced' | 'competitive';

export interface UserProfile {
    firstName: string;
    lastName: string;
    username: string;
    bio: string;
    birthDate: string;
    gender: string;
    height: number | undefined;
    bodyWeight: number | undefined;
    unitSystem: UnitSystem;
    fitnessGoal: string;
    experienceLevel: ExperienceLevel;
    workoutsPerWeek: number;
    preferredTraining: string[];
    emailUpdates: boolean;
    darkMode: boolean;
    updatedAt: string;
}

export function createDefaultProfile(): UserProfile {
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
        darkMode: false,
        updatedAt: ''
    };
}
