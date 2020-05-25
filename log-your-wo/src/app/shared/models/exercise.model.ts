import { Guid } from 'guid-typescript';

export class Exercise {
    constructor(
        public exerciseId?: Guid,
        public logId?: Guid,
        public formControlNames?: Map<string, string>,
        public exerciseName?: string,
        public sets?: number,
        public reps?: number,
        public weight?: number
    ) {
        this.exerciseId = Guid.create();
        this.formControlNames = new Map<string, string>();
     }
}