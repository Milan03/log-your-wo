export type UnitSystem = 'imperial' | 'metric';
export type ExperienceLevel = '' | 'beginner' | 'intermediate' | 'advanced' | 'competitive';
export type PreferredLanguage = 'en-ca' | 'fr-ca';

export interface TrainingMax {
    id: string;
    exerciseName: string;
    value: number;
    updatedAt?: string;
}

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
    trainingMaxes: TrainingMax[];
    emailUpdates: boolean;
    darkMode: boolean;
    preferredLanguage: PreferredLanguage;
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
        trainingMaxes: [],
        emailUpdates: false,
        darkMode: false,
        preferredLanguage: 'en-ca',
        updatedAt: ''
    };
}
