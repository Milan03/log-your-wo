export class CardioExercise {
    constructor(
        public exerciseId?: number,
        public name?: string,
        public intensity?: Intensity,
        public distance?: number,
        public hours?: number,
        public minutes?: number,
        public seconds?: number 
    ) { }
}

enum Intensity {
    Easy = 1, 
    Moderate,
    Hard,
    Maximal
}