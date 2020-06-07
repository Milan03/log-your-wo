import { Guid } from 'guid-typescript';
import { Exercise } from './exercise.model';
import { CardioExercise } from './cardio-exercise.model';

export class SimpleLog {
    constructor(
        public logId?: Guid,
        public startDatim?: Date,
        public endDatim?: Date,
        public title?: string,
        public exercises?: Array<Exercise>,
        public cardioExercises?: Array<CardioExercise>,
        public notes?: string
    ) { 
        this.logId = Guid.create();
        this.startDatim = new Date();
        this.exercises = new Array<Exercise>();
        this.cardioExercises = new Array<CardioExercise>();
    }
}