import { ExerciseListStore } from './exercise-list.store';
import { Exercise } from '../../../shared/models/exercise.model';

describe('ExerciseListStore', () => {
    let store: ExerciseListStore;

    beforeEach(() => {
        store = new ExerciseListStore();
    });

    it('groups only sequential rows with the same name', () => {
        const groups = store.strengthGroupsFor([
            exercise('Clean'),
            exercise('Clean'),
            exercise('Squat'),
            exercise('Clean')
        ]);

        expect(groups.map(group => group.exerciseName)).toEqual(['Clean', 'Squat', 'Clean']);
        expect(groups[0].exercises.length).toBe(2);
    });

    it('reuses grouped arrays until the source reference changes', () => {
        const exercises = [exercise('Clean'), exercise('Clean')];

        const first = store.strengthGroupsFor(exercises);
        expect(store.strengthGroupsFor(exercises)).toBe(first);
        expect(store.strengthGroupsFor([...exercises])).not.toBe(first);
    });

    it('keeps strength and cardio grouping caches independent', () => {
        const strength = [exercise('Clean')];
        const cardio = [exercise('Run')];

        const strengthGroups = store.strengthGroupsFor(strength);
        const cardioGroups = store.cardioGroupsFor(cardio);

        expect(store.strengthGroupsFor(strength)).toBe(strengthGroups);
        expect(store.cardioGroupsFor(cardio)).toBe(cardioGroups);
        expect(cardioGroups).not.toBe(strengthGroups);
    });

    it('inserts at the end by default and after a given row when provided', () => {
        const first = exercise('Clean');
        const second = exercise('Squat');
        const added = exercise('Press');

        expect(store.insert([first, second], added)).toEqual([first, second, added]);
        expect(store.insert([first, second], added, first)).toEqual([first, added, second]);
    });

    it('appends when the insertion anchor is not found', () => {
        const first = exercise('Clean');
        const added = exercise('Press');

        expect(store.insert([first], added, exercise('Missing'))).toEqual([first, added]);
    });

    it('carries identity and completion fields onto a replacement', () => {
        const original = exercise('Clean');
        original.completed = true;
        original.prescription = '3 x 3';
        const updated = exercise('Clean Variation');

        const result = store.replace([original], original, updated);

        expect(result[0]).toBe(updated);
        expect(updated.exerciseId).toBe(original.exerciseId);
        expect(updated.completed).toBeTrue();
        expect(updated.prescription).toBe('3 x 3');
    });

    it('keeps an edited prescription over the original', () => {
        const original = exercise('Clean');
        original.prescription = '3 x 3';
        const updated = exercise('Clean');
        updated.prescription = '5 x 5';

        store.replace([original], original, updated);

        expect(updated.prescription).toBe('5 x 5');
    });

    it('removes the row matching an id', () => {
        const first = exercise('Clean');
        const second = exercise('Squat');

        expect(store.removeById([first, second], first.exerciseId)).toEqual([second]);
    });

    it('sets completion on all rows or a single row by id', () => {
        const first = exercise('Clean');
        const second = exercise('Squat');

        expect(store.setAllCompleted([first, second], true).every(row => row.completed)).toBeTrue();

        const partial = store.setCompletedById([first, second], second.exerciseId, true);
        expect(partial[0].completed).toBeFalsy();
        expect(partial[1].completed).toBeTrue();
    });

    it('finds the last completed row across strength then cardio', () => {
        const strengthDone = exercise('Clean');
        strengthDone.completed = true;
        const cardioDone = exercise('Run');
        cardioDone.completed = true;

        expect(store.findLastCompleted([strengthDone], [cardioDone, exercise('Bike')])).toBe(cardioDone);
        expect(store.findLastCompleted([exercise('Clean')], [exercise('Run')])).toBeUndefined();
    });

    it('counts strength and cardio rows, tolerating missing arrays', () => {
        expect(store.count([exercise('Clean')], [exercise('Run'), exercise('Bike')])).toBe(3);
        expect(store.count(undefined, undefined)).toBe(0);
    });
});

function exercise(name: string): Exercise {
    const created = new Exercise();
    created.exerciseType = 'strength';
    created.exerciseName = name;
    return created;
}
