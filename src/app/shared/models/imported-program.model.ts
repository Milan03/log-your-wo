import { Exercise } from './exercise.model';

export interface ImportedProgram {
    id: string;
    name: string;
    importedAt: string;
    weeks: ImportedProgramWeek[];
}

export interface ImportedProgramWeek {
    id: string;
    name: string;
    weekNumber: number;
    days: ImportedProgramDay[];
}

export interface ImportedProgramDay {
    id: string;
    name: string;
    exercises: ImportedProgramExercise[];
}

export interface ImportedProgramExercise {
    id: string;
    exerciseName: string;
    prescription: string;
    weight?: string;
    reps?: string;
    sets?: string;
}

export interface ImportedWorkoutState {
    programId: string;
    weekId: string;
    dayId: string;
    exercises: Exercise[];
    cardioExercises?: Exercise[];
    startedAt?: string;
    completedAt?: string;
    pausedAt?: string;
    totalPausedMs?: number;
    elapsedMs?: number;
}
