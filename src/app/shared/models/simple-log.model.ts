import { Guid } from 'guid-typescript';
import { Exercise } from './exercise.model';

export type WeightMeasure = 'lbs' | 'kg';
export type DistanceMeasure = 'km' | 'mi';
export type PersistedExercise = Omit<Exercise, 'duration'> & {
    duration?: Exercise['duration'] | number | string;
};

export class SimpleLog {
    constructor(
        public logId?: Guid | string,
        public startDatim?: Date,
        public endDatim?: Date,
        public title?: string,
        public exercises?: Array<Exercise>,
        public cardioExercises?: Array<Exercise>,
        public notes?: string
    ) { 
        this.logId = Guid.create();
        this.startDatim = new Date();
        this.exercises = new Array<Exercise>();
        this.cardioExercises = new Array<Exercise>();
    }
}

export interface SavedSimpleLog {
    id: string;
    title: string;
    workoutDate: string;
    workoutDateTime?: string;
    createdAt: string;
    updatedAt: string;
    exercises: PersistedExercise[];
    cardioExercises: PersistedExercise[];
    weightMeasure?: WeightMeasure;
    distanceMeasure?: DistanceMeasure;
    notes?: string;
    startedAt?: string;
    completedAt?: string;
    pausedAt?: string;
    totalPausedMs?: number;
    elapsedMs?: number;
}

export interface SimpleLogTimingState {
    startedAt?: string;
    completedAt?: string;
    pausedAt?: string;
    totalPausedMs?: number;
    elapsedMs?: number;
}

export interface SimpleLogSaveState extends SimpleLogTimingState {
    weightMeasure?: WeightMeasure;
    distanceMeasure?: DistanceMeasure;
}
