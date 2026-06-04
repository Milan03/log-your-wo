import { Exercise } from '../models/exercise.model';

export interface ExerciseDialogData {
    exerciseType: string;
    exerciseName?: string;
    measure?: string;
    exercise?: Exercise;
    isEdit?: boolean;
}
