import { Guid } from 'guid-typescript';
import { Duration } from 'luxon';

export class Exercise {
    constructor(
        public exerciseId?: Guid,
        public logId?: Guid,
        public exerciseName?: string,
        public exerciseType?: string,
        public sets?: number | string,
        public reps?: number | string,
        public weight?: number | string,
        public duration?: Duration,
        public distance?: number | string, // in kilometers
        public intensity?: Intensity,
        public completed?: boolean,
        public sourceId?: string,
        public prescription?: string,
        // Cross-type insertion sequence, shared across strength and cardio so the
        // simple log can render both in the order the user added them. Legacy
        // rows have no `order`; they fall back to strength-then-cardio and are
        // normalized on the next edit.
        public order?: number
    ) {
        this.exerciseId = Guid.create();
        this.duration = Duration.fromMillis(0);
        this.completed = false;
    }
}

export enum Intensity {
    Easy = 1,
    Moderate,
    Hard,
    Maximal
}
