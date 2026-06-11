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
    workbookCalculation?: WorkbookExerciseCalculation;
}

export interface ProgramImportPreview {
    program?: ImportedProgram;
    confidence: number;
    strategy: string;
    warnings: string[];
    lowConfidence: boolean;
    setup?: WorkbookImportSetup;
}

export interface WorkbookImportSetup {
    instructions: string[];
    inputs: WorkbookImportInput[];
    unknownFormulaCount: number;
}

export interface WorkbookImportInput {
    id: string;
    sheetName: string;
    address: string;
    label: string;
    exerciseName: string;
    originalValue?: number;
    value?: number;
}

export interface WorkbookExerciseCalculation {
    address: string;
    formula: string;
    output: 'weight' | 'prescription';
    segments: WorkbookFormulaSegment[];
}

export interface WorkbookFormulaSegment {
    literal?: string;
    inputId?: string;
    multiplier?: number;
    decimals?: number;
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
