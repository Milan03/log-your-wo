import { Duration } from 'luxon';

import { ExerciseGroupListComponent } from './exercise-group-list.component';
import { Exercise } from '../../../shared/models/exercise.model';

describe('ExerciseGroupListComponent', () => {
    let component: ExerciseGroupListComponent;

    beforeEach(() => {
        component = new ExerciseGroupListComponent();
    });

    it('appends the weight unit to numeric weights and ranges', () => {
        const single = createExercise();
        single.weight = 100;
        const range = createExercise();
        range.weight = '80-90';

        component.weightMeasure = 'kg';

        expect(component.getWeightDisplay(single)).toBe('100 kg');
        expect(component.getWeightDisplay(range)).toBe('80-90 kg');
    });

    it('does not append a weight unit to percentages or textual prescriptions', () => {
        const percentage = createExercise();
        percentage.weight = '75%';
        const bodyweight = createExercise();
        bodyweight.weight = 'bodyweight';

        expect(component.getWeightDisplay(percentage)).toBe('75%');
        expect(component.getWeightDisplay(bodyweight)).toBe('bodyweight');
    });

    it('treats an "x" placeholder weight as empty', () => {
        const placeholder = createExercise();
        placeholder.weight = 'x';

        expect(component.getWeightDisplay(placeholder)).toBe('');
    });

    it('appends the distance unit only to numeric distances', () => {
        const numeric = createExercise();
        numeric.distance = 5;
        const textual = createExercise();
        textual.distance = 'a few laps';

        component.distanceMeasure = 'mi';

        expect(component.getDistanceDisplay(numeric)).toBe('5 mi');
        expect(component.getDistanceDisplay(textual)).toBe('a few laps');
    });

    it('formats non-zero durations and reports N/A otherwise', () => {
        const timed = createExercise();
        timed.duration = Duration.fromObject({ minutes: 5, seconds: 30 });
        const untimed = createExercise();
        untimed.duration = Duration.fromMillis(0);

        expect(component.getDurationDisplay(timed)).toBe('5m 30s');
        expect(component.getDurationDisplay(untimed)).toBe('N/A');
    });

    it('emits the last entry of a group when adding a row', () => {
        const first = createExercise();
        const last = createExercise();
        const emitted: Exercise[] = [];
        component.addRow.subscribe(exercise => emitted.push(exercise));

        component.onAddRow({ exerciseName: 'Squat', exercises: [first, last] });

        expect(emitted).toEqual([last]);
    });
});

function createExercise(): Exercise {
    const exercise = new Exercise();
    exercise.exerciseType = 'strength';
    return exercise;
}
