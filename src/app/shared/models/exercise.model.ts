import { Guid } from 'guid-typescript';
import * as moment from 'moment';

export class Exercise {
    constructor(
        public exerciseId?: Guid,
        public logId?: Guid,
        public exerciseName?: string,
        public exerciseType?: string,
        public sets?: number,
        public reps?: number,
        public weight?: number,
        public duration?: moment.Duration,
        public distance?: number, // in kilometers
        public intensity?: Intensity
    ) {
        this.exerciseId = Guid.create();
        this.duration = moment.duration();
    }
}

export enum Intensity {
    Easy = 1,
    Moderate,
    Hard,
    Maximal
}