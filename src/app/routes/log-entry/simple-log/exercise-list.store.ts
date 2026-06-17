import { Injectable } from '@angular/core';
import { Guid } from 'guid-typescript';

import { Exercise } from '../../../shared/models/exercise.model';
import { ExerciseGroup } from '../exercise-group-list/exercise-group-list.component';

/**
 * Component-scoped exercise-list operations for the simple log: immutable
 * insert/replace/remove/completion edits on the strength and cardio arrays, and
 * the sequential same-name grouping used by the views. The host component owns
 * `currentLog`; it hands the arrays here and assigns the returned arrays back.
 * Grouping is memoized by array reference so OnPush views reuse the same group
 * objects until the source rows change. Provided per component instance.
 */
@Injectable()
export class ExerciseListStore {
    private strengthGroupSource: Exercise[];
    private strengthGroups: ExerciseGroup[] = [];
    private cardioGroupSource: Exercise[];
    private cardioGroups: ExerciseGroup[] = [];

    /** Sequential groups for the strength rows, memoized by array reference. */
    public strengthGroupsFor(exercises: Exercise[]): ExerciseGroup[] {
        if (this.strengthGroupSource !== exercises) {
            this.strengthGroupSource = exercises;
            this.strengthGroups = this.toSequentialGroups(exercises);
        }

        return this.strengthGroups;
    }

    /** Sequential groups for the cardio rows, memoized by array reference. */
    public cardioGroupsFor(exercises: Exercise[]): ExerciseGroup[] {
        if (this.cardioGroupSource !== exercises) {
            this.cardioGroupSource = exercises;
            this.cardioGroups = this.toSequentialGroups(exercises);
        }

        return this.cardioGroups;
    }

    /** Insert `newExercise`, after `insertAfter` when given, else at the end. */
    public insert(exercises: Exercise[], newExercise: Exercise, insertAfter?: Exercise): Exercise[] {
        if (!insertAfter) {
            return [...exercises, newExercise];
        }

        const insertIndex = exercises.findIndex(exercise => exercise.exerciseId === insertAfter.exerciseId);

        if (insertIndex < 0) {
            return [...exercises, newExercise];
        }

        return [
            ...exercises.slice(0, insertIndex + 1),
            newExercise,
            ...exercises.slice(insertIndex + 1)
        ];
    }

    /**
     * Swap `original` for `updated`, carrying over the identity and completion
     * fields the dialog does not set (and keeping the original prescription when
     * the edit cleared it).
     */
    public replace(exercises: Exercise[], original: Exercise, updated: Exercise): Exercise[] {
        updated.exerciseId = original.exerciseId;
        updated.sourceId = original.sourceId;
        updated.completed = original.completed;
        updated.prescription = updated.prescription || original.prescription;

        return exercises.map(exercise => exercise.exerciseId === original.exerciseId ? updated : exercise);
    }

    /** Remove the row with the given id. */
    public removeById(exercises: Exercise[], exerciseId: Guid): Exercise[] {
        return exercises.filter(exercise => exercise.exerciseId !== exerciseId);
    }

    /** Set the completed flag on every row. */
    public setAllCompleted(exercises: Exercise[], completed: boolean): Exercise[] {
        return exercises.map(exercise => ({ ...exercise, completed }));
    }

    /** Set the completed flag on the row with the given id, leaving others. */
    public setCompletedById(exercises: Exercise[], exerciseId: Guid, completed: boolean): Exercise[] {
        return exercises.map(exercise => ({
            ...exercise,
            completed: exercise.exerciseId === exerciseId ? completed : exercise.completed
        }));
    }

    /** The last completed row across strength then cardio, scanning from the end. */
    public findLastCompleted(strength: Exercise[], cardio: Exercise[]): Exercise | undefined {
        const exercises = [...strength, ...cardio];

        for (let index = exercises.length - 1; index >= 0; index--) {
            if (exercises[index].completed) {
                return exercises[index];
            }
        }

        return undefined;
    }

    /** Total number of strength and cardio rows. */
    public count(strength: Exercise[], cardio: Exercise[]): number {
        return (strength || []).length + (cardio || []).length;
    }

    private toSequentialGroups(exercises: Exercise[]): ExerciseGroup[] {
        return exercises.reduce((groups: ExerciseGroup[], exercise: Exercise) => {
            const previousGroup = groups[groups.length - 1];

            if (previousGroup && previousGroup.exerciseName === exercise.exerciseName) {
                previousGroup.exercises.push(exercise);
            } else {
                groups.push({
                    exerciseName: exercise.exerciseName,
                    exercises: [exercise]
                });
            }

            return groups;
        }, []);
    }
}
