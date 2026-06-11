import { DistanceMeasure, PersistedExercise, WeightMeasure } from './simple-log.model';

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
    rest?: string;
    tempo?: string;
    rpe?: string;
    notes?: string;
    percentage1Rm?: string;
}

export interface ProgramImportPreview {
    program?: ImportedProgram;
    confidence: number;
    strategy: string;
    warnings: string[];
    lowConfidence: boolean;
}

export interface ImportedWorkoutState {
    programId: string;
    weekId: string;
    dayId: string;
    updatedAt?: string;
    weightMeasure?: WeightMeasure;
    distanceMeasure?: DistanceMeasure;
    exercises: PersistedExercise[];
    cardioExercises?: PersistedExercise[];
    startedAt?: string;
    completedAt?: string;
    pausedAt?: string;
    totalPausedMs?: number;
    elapsedMs?: number;
}
