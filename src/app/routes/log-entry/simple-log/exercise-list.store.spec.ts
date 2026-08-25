import { ExerciseListStore } from './exercise-list.store';
import { Exercise } from '../../../shared/models/exercise.model';

describe('ExerciseListStore', () => {
    let store: ExerciseListStore;

    beforeEach(() => {
        store = new ExerciseListStore();
    });

    it('groups only sequential rows with the same name', () => {
        const groups = store.sequentialGroupsFor([
            exercise('Clean'),
            exercise('Clean'),
            exercise('Squat'),
            exercise('Clean')
        ], []);

        expect(groups.map(group => group.exerciseName)).toEqual(['Clean', 'Squat', 'Clean']);
        expect(groups[0].exercises.length).toBe(2);
    });

    it('reuses grouped arrays until the source reference changes', () => {
        const exercises = [exercise('Clean'), exercise('Clean')];

        const cardio: Exercise[] = [];
        const first = store.sequentialGroupsFor(exercises, cardio);
        expect(store.sequentialGroupsFor(exercises, cardio)).toBe(first);
        expect(store.sequentialGroupsFor([...exercises], cardio)).not.toBe(first);
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

    it('finds the last completed row in combined display order', () => {
        const strengthDone = exercise('Clean');
        strengthDone.completed = true;
        strengthDone.order = 2;
        const cardioDone = exercise('Run');
        cardioDone.exerciseType = 'cardio';
        cardioDone.completed = true;
        cardioDone.order = 1;

        expect(store.findLastCompleted([strengthDone], [cardioDone, cardioExercise('Bike')])).toBe(strengthDone);
        expect(store.findLastCompleted([exercise('Clean')], [exercise('Run')])).toBeUndefined();
    });

    it('counts strength and cardio rows, tolerating missing arrays', () => {
        expect(store.count([exercise('Clean')], [exercise('Run'), exercise('Bike')])).toBe(3);
        expect(store.count(undefined, undefined)).toBe(0);
    });

    it('sequences cardio and strength inserts in the order they are added', () => {
        let strength: Exercise[] = [];
        let cardio: Exercise[] = [];

        ({ strength, cardio } = store.insertSequential(strength, cardio, cardioExercise('Run')));
        ({ strength, cardio } = store.insertSequential(strength, cardio, exercise('Squat')));
        ({ strength, cardio } = store.insertSequential(strength, cardio, cardioExercise('Bike')));

        const groups = store.sequentialGroupsFor(strength, cardio);

        expect(groups.map(group => group.exerciseName)).toEqual(['Run', 'Squat', 'Bike']);
        expect(groups.map(group => group.exerciseType)).toEqual(['cardio', 'strength', 'cardio']);
    });

    it('inserts after an anchor row across both typed arrays', () => {
        let strength: Exercise[] = [];
        let cardio: Exercise[] = [];

        ({ strength, cardio } = store.insertSequential(strength, cardio, exercise('Squat')));
        ({ strength, cardio } = store.insertSequential(strength, cardio, cardioExercise('Run')));
        const anchor = strength[0];
        ({ strength, cardio } = store.insertSequential(strength, cardio, cardioExercise('Bike'), anchor));

        const groups = store.sequentialGroupsFor(strength, cardio);

        expect(groups.map(group => group.exerciseName)).toEqual(['Squat', 'Bike', 'Run']);
    });

    it('keeps same-name same-type rows grouped but splits when the type changes', () => {
        const run = cardioExercise('Mixed');
        run.order = 0;
        const liftA = exercise('Mixed');
        liftA.order = 1;
        const liftB = exercise('Mixed');
        liftB.order = 2;

        const groups = store.sequentialGroupsFor([liftA, liftB], [run]);

        expect(groups.length).toBe(2);
        expect(groups[0].exerciseType).toBe('cardio');
        expect(groups[1].exercises).toEqual([liftA, liftB]);
    });

    it('groups legacy strength rows without type or order metadata', () => {
        const first = new Exercise();
        first.exerciseName = 'Squat';
        const second = new Exercise();
        second.exerciseName = 'Squat';

        const groups = store.sequentialGroupsFor([first, second], []);

        expect(groups.length).toBe(1);
        expect(groups[0].exerciseType).toBe('strength');
        expect(groups[0].exercises).toEqual([first, second]);
    });

    it('normalizes legacy rows when inserting and keeps untyped rows as strength', () => {
        const legacyStrength = new Exercise();
        legacyStrength.exerciseName = 'Squat';

        const result = store.insertSequential([legacyStrength], [], cardioExercise('Run'));

        expect(result.strength).toEqual([legacyStrength]);
        expect(result.cardio.map(row => row.exerciseName)).toEqual(['Run']);
        expect(legacyStrength.order).toBe(0);
        expect(result.cardio[0].order).toBe(1);
    });
});

function exercise(name: string): Exercise {
    const created = new Exercise();
    created.exerciseType = 'strength';
    created.exerciseName = name;
    return created;
}

function cardioExercise(name: string): Exercise {
    const created = new Exercise();
    created.exerciseType = 'cardio';
    created.exerciseName = name;
    return created;
}
