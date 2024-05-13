import { Pipe, PipeTransform } from '@angular/core';
import { Exercise } from '../models/exercise.model';

@Pipe({
  name: 'duplicateName'
})
export class DuplicateNamePipe implements PipeTransform {
  transform(exercises: Exercise[], exercise: Exercise, index: number): string {
    if (index === 0) return exercise.exerciseName;

    const previousExercise = exercises[index - 1];
    if (previousExercise && previousExercise.exerciseName === exercise.exerciseName) {
      return '"';
    }

    return exercise.exerciseName;
  }
}