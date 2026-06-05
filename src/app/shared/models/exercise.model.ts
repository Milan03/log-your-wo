import { Guid } from 'guid-typescript';
import * as moment from 'moment';

export class Exercise {
    constructor(
        public exerciseId?: Guid,
        public logId?: Guid,
        public exerciseName?: string,
        public exerciseType?: string,
        public sets?: number | string,
        public reps?: number | string,
        public weight?: number | string,
        public duration?: moment.Duration,
        public distance?: number | string, // in kilometers
        public intensity?: Intensity,
        public completed?: boolean,
        public sourceId?: string,
        public prescription?: string
    ) {
        this.exerciseId = Guid.create();
        this.duration = moment.duration();
        this.completed = false;
    }
}

export enum Intensity {
    Easy = 1,
    Moderate,
    Hard,
    Maximal
}
