import { Exercise } from './exercise.model';
import { CardioExercise } from './cardio-exercise.model';

export class SimpleLog {
    constructor(
        public logId?: number,
        public dateTime?: Date,
        public name?: string,
        public exercises?: Array<Exercise>,
        public cardioExercises?: Array<CardioExercise>,
        public notes?: string
    ) { 
        this.dateTime = new Date();
        this.exercises = new Array<Exercise>();
        this.cardioExercises = new Array<CardioExercise>();
    }
}