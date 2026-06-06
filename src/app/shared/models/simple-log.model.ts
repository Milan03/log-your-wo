import { Guid } from 'guid-typescript';
import { Exercise } from './exercise.model';

export class SimpleLog {
    constructor(
        public logId?: Guid,
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
    exercises: Exercise[];
    cardioExercises: Exercise[];
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
