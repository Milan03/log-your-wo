import { Injectable } from '@angular/core';
import { Guid } from 'guid-typescript';

import { Exercise } from '../../../shared/models/exercise.model';
import { ExerciseGroup } from '../exercise-group-list/exercise-group-list.component';

/**
 * Component-scoped exercise-list operations for the simple log: immutable
 * cross-type insert and ordering operations, array edits, and sequential
 * same-name grouping. The host component owns `currentLog`; it hands the arrays
 * here and assigns the returned arrays back. Grouping is memoized by array
 * reference so OnPush views reuse the same group objects until the source rows
 * change. Provided per component instance.
 */
@Injectable()
export class ExerciseListStore {
    private sequentialStrengthSource: Exercise[];
    private sequentialCardioSource: Exercise[];
    private sequentialGroupsValue: ExerciseGroup[] = [];

    /**
     * Sequential groups across both strength and cardio rows, ordered by their
     * shared `order` sequence so each group lands where the user added it.
     * Memoized by the two source array references.
     */
    public sequentialGroupsFor(strength: Exercise[], cardio: Exercise[]): ExerciseGroup[] {
        if (this.sequentialStrengthSource !== strength || this.sequentialCardioSource !== cardio) {
            this.sequentialStrengthSource = strength;
            this.sequentialCardioSource = cardio;
            this.sequentialGroupsValue = this.toSequentialGroups(this.mergedByOrder(strength, cardio));
        }

        return this.sequentialGroupsValue;
    }

    /**
     * Insert `newExercise` into the combined strength/cardio sequence — after
     * `insertAfter` when given, else at the end — then renumber every row's
     * `order` and split the rows back into their typed arrays. Renumbering also
     * normalizes legacy rows that had no `order` yet.
     */
    public insertSequential(
        strength: Exercise[],
        cardio: Exercise[],
        newExercise: Exercise,
        insertAfter?: Exercise
    ): { strength: Exercise[]; cardio: Exercise[] } {
        const merged = this.mergedByOrder(strength, cardio);
        let insertIndex = merged.length;

        if (insertAfter) {
            const anchorIndex = merged.findIndex(exercise => exercise.exerciseId === insertAfter.exerciseId);
            if (anchorIndex >= 0) {
                insertIndex = anchorIndex + 1;
            }
        }

        merged.splice(insertIndex, 0, newExercise);
        merged.forEach((exercise, index) => exercise.order = index);

        return {
            strength: merged.filter(exercise => exercise.exerciseType !== 'cardio'),
            cardio: merged.filter(exercise => exercise.exerciseType === 'cardio')
        };
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
        updated.order = original.order;
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

    /** The last completed row in the combined display order. */
    public findLastCompleted(strength: Exercise[], cardio: Exercise[]): Exercise | undefined {
        const exercises = this.mergedByOrder(strength, cardio);

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
            const exerciseType = this.exerciseTypeFor(exercise);

            if (previousGroup
                && previousGroup.exerciseName === exercise.exerciseName
                && previousGroup.exerciseType === exerciseType) {
                previousGroup.exercises.push(exercise);
            } else {
                groups.push({
                    exerciseName: exercise.exerciseName,
                    exerciseType,
                    exercises: [exercise]
                });
            }

            return groups;
        }, []);
    }

    /**
     * Both typed arrays merged into one list ordered by the shared `order`
     * sequence. Legacy rows without `order` sort last in a stable way, which
     * preserves the historical strength-then-cardio display until normalized.
     */
    private mergedByOrder(strength: Exercise[], cardio: Exercise[]): Exercise[] {
        return [...(strength || []), ...(cardio || [])]
            .sort((first, second) => this.orderValue(first) - this.orderValue(second));
    }

    private orderValue(exercise: Exercise): number {
        return typeof exercise.order === 'number' ? exercise.order : Number.MAX_SAFE_INTEGER;
    }

    private exerciseTypeFor(exercise: Exercise): 'strength' | 'cardio' {
        return exercise.exerciseType === 'cardio' ? 'cardio' : 'strength';
    }
}
