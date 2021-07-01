import { Guid } from 'guid-typescript';
import * as moment from 'moment';

export class CardioExercise {
    constructor(
        public exerciseId?: Guid,
        public logId?: Guid,
        public exerciseName?: string,
        public formControlNames?: Map<string, string>,
        public distance?: string,
        public exerciseDuration?: moment.Duration,
        public intensity?: Intensity
    ) { 
        this.exerciseId = Guid.create();
        this.formControlNames = new Map<string, string>();
    }
}

enum Intensity {
    Easy = 1, 
    Moderate,
    Hard,
    Maximal
}