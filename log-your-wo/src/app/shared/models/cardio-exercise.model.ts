import { Guid } from 'guid-typescript';

export class CardioExercise {
    constructor(
        public exerciseId?: Guid,
        public logId?: Guid,
        public exerciseName?: string,
        public formControlNames?: Map<string, string>,
        public distance?: string,
        public hours?: number,
        public minutes?: number,
        public seconds?: number,
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