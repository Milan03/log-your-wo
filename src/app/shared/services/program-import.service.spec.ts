import { TestBed } from '@angular/core/testing';
import * as XLSX from 'xlsx';

import { ProgramImportService } from './program-import.service';
import { ImportedProgram, ImportedWorkoutState } from '../models/imported-program.model';
import { Exercise } from '../models/exercise.model';
import { Duration } from 'luxon';
import { SupabaseDataService } from './supabase-data.service';

describe('ProgramImportService', () => {
    let service: ProgramImportService;

    beforeEach(() => {
        localStorage.clear();

        TestBed.configureTestingModule({
            providers: [ProgramImportService]
        });

        service = TestBed.inject(ProgramImportService);
    });

    afterEach(() => {
        localStorage.clear();
    });

    it('imports workbook days in visual order and keeps repeated prescription rows in the workout', async () => {
        const file = createWorkbookFile([
            ['', 'Week 1'],
            ['', 'Monday', '', '', 'Wednesday', '', '', 'Friday'],
            ['', 'Muscle Snatch (into full squat)', 'X x 3 x 2', '', 'Clean', '115 x 3 x 2', '', 'Jerk', '80 x 2'],
            ['', '', '115 x 3 x 2', '', '', '138 x 3 x 3', '', '', ''],
            ['', 'Tuesday', '', '', 'Thursday', '', '', 'Saturday'],
            ['', 'Squat', '100 x 5 x 3', '', 'Pull [omit this]', 'X x 5', '', 'Press', '50 x 5 x 3']
        ]);

        const program = await service.importWorkbook(file);
        const week = program.weeks[0];

        expect(week.days.map(day => day.name)).toEqual([
            'Day 01',
            'Day 02',
            'Day 03',
            'Day 04',
            'Day 05',
            'Day 06'
        ]);
        expect(week.days[0].exercises.map(exercise => exercise.exerciseName)).toEqual([
            'Muscle Snatch',
            'Muscle Snatch'
        ]);
        expect(week.days[2].exercises.map(exercise => exercise.weight)).toEqual(['115', '138']);
        expect(week.days[3].exercises[0].exerciseName).toBe('Pull');
        expect(program.name).toBe('example program');
    });

    it('dedupes repeated week sheets when importing a workbook', async () => {
        const workbook = XLSX.utils.book_new();
        const rows = [
            ['', 'Week 1'],
            ['', 'Monday'],
            ['', 'Clean', '115 x 3 x 2']
        ];
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), 'Block 1');
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), 'Block 2');

        const file = workbookToFile(workbook, 'duplicate weeks.xlsx');
        const program = await service.importWorkbook(file);

        expect(program.weeks.length).toBe(1);
        expect(program.weeks[0].name).toBe('Week 1');
    });

    it('rejects workbooks without recognizable workout weeks', async () => {
        const file = createWorkbookFile([
            ['Notes'],
            ['No workout structure here']
        ]);

        await expectAsync(service.importWorkbook(file))
            .toBeRejectedWithError('No recognizable workout weeks were found in this workbook.');
    });

    it('returns the support contact when a workbook is rejected with low confidence', async () => {
        const file = createWorkbookFile([
            ['Back Squat', '5 x 5'],
            ['Bench Press', '4 x 8']
        ]);

        await expectAsync(service.importWorkbook(file))
            .toBeRejectedWithError(
                'This workbook layout could not be recognized reliably. '
                + 'Please email the workbook to milansobat03@gmail.com so support can be added.'
            );
    });

    it('does not bypass required workbook setup through the direct import API', async () => {
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet([
            ['Training max', 100],
            [],
            ['Week', 'Day', 'Exercise', 'Weight', 'Sets', 'Reps'],
            ['1', 'Day 1', 'Squat', 80, '5', '3']
        ]);
        setFormula(worksheet, 'D4', 80, 'B1*0.8');
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Program');

        await expectAsync(service.importWorkbook(workbookToFile(workbook, 'setup.xlsx')))
            .toBeRejectedWithError('This workbook requires training maxes to be confirmed before it can be saved.');
    });

    it('rejects oversized workbook files before parsing them', async () => {
        const file = new File([], 'large.xlsx');
        Object.defineProperty(file, 'size', { value: 10 * 1024 * 1024 + 1 });

        await expectAsync(service.importWorkbook(file))
            .toBeRejectedWithError('Workbook files must be 10 MB or smaller.');
    });

    it('groups plus-delimited lifting complexes under one exercise name', async () => {
        const file = createWorkbookFile([
            ['', 'Week 13'],
            ['', 'Monday', '', '', 'Wednesday'],
            ['', 'Clean +', '138 x 2+2+2 x 2', '', 'Snatch Push +', '95 x 2+2 x 2'],
            ['', 'Front Squat +', '150 x 2+2+2 x 2', '', 'Overhead Squat', '105 x 2+2 x 2'],
            ['', 'Jerk', '161 x 2+2+2 x 2']
        ]);

        const program = await service.importWorkbook(file);

        expect(program.weeks[0].days[0].exercises.map(exercise => exercise.exerciseName)).toEqual([
            'Clean + Front Squat + Jerk',
            'Clean + Front Squat + Jerk',
            'Clean + Front Squat + Jerk'
        ]);
        expect(program.weeks[0].days[1].exercises.map(exercise => exercise.exerciseName)).toEqual([
            'Snatch Push + Overhead Squat',
            'Snatch Push + Overhead Squat'
        ]);
        expect(program.weeks[0].days[0].exercises.map(exercise => exercise.weight)).toEqual([
            '138',
            '150',
            '161'
        ]);
    });

    it('keeps unnamed prescription rows with the compound exercise from the workbook', async () => {
        const file = createWorkbookFile([
            ['', 'Week 13'],
            ['', 'Monday', '', '', 'Wednesday'],
            ['', 'Power Snatch', '123 x 3 x 2', '', 'Snatch Push Press+', '123 x 2+2 x 1'],
            ['', '', '133 x 3 x 1', '', 'Overhead Squat', '133 x 2+2 x 2'],
            ['', '', '144 x 2 x 3', '', '', '144 x 2+2 x 1'],
            ['', 'Clean', '138 x 2 x 2', '', '', '154 x 2+1 x 2'],
            ['', '', '150 x 2 x 2', '', '', '164 x 1+1 x 1'],
            ['', '', '161 x 2 x 2', '', '', '174 x 1 x 1'],
            ['', '', '', '', 'Rack Jerk', '138 x 3 x 2']
        ]);

        const program = await service.importWorkbook(file);
        const dayThreeExercises = program.weeks[0].days[1].exercises;

        expect(dayThreeExercises.slice(0, 6).map(exercise => exercise.exerciseName)).toEqual([
            'Snatch Push Press + Overhead Squat',
            'Snatch Push Press + Overhead Squat',
            'Snatch Push Press + Overhead Squat',
            'Snatch Push Press + Overhead Squat',
            'Snatch Push Press + Overhead Squat',
            'Snatch Push Press + Overhead Squat'
        ]);
        expect(dayThreeExercises[6].exerciseName).toBe('Rack Jerk');
    });

    it('normalizes compound names in programs that were imported before the parser fix', () => {
        const program = createProgram();
        program.weeks[0].days[0].exercises = [
            { id: '1', exerciseName: 'Clean +', prescription: '138 x 2+2+2 x 2' },
            { id: '2', exerciseName: 'Front Squat +', prescription: '150 x 2+2+2 x 2' },
            { id: '3', exerciseName: 'Jerk', prescription: '161 x 2+2+2 x 2' }
        ];
        localStorage.setItem('logYourWo.importedProgram', JSON.stringify(program));
        localStorage.removeItem('logYourWo.importedPrograms');

        const storedProgram = new ProgramImportService().getProgram();

        expect(storedProgram.weeks[0].days[0].exercises.map(exercise => exercise.exerciseName)).toEqual([
            'Clean + Front Squat + Jerk',
            'Clean + Front Squat + Jerk',
            'Clean + Front Squat + Jerk'
        ]);
    });

    it('saves workout completion state and calculates week completion', () => {
        const program = createProgram();
        service.saveProgram(program);

        service.saveWorkoutState({
            programId: program.id,
            weekId: 'week-1',
            dayId: 'week-1-day-1',
            exercises: [
                createExercise('Clean', true),
                createExercise('Clean', false)
            ]
        });

        expect(service.getDayCompletion('week-1', 'week-1-day-1')).toEqual({ completed: 1, total: 2 });
        expect(service.isWeekComplete('week-1')).toBeFalse();

        service.markDayComplete('week-1', 'week-1-day-1');

        expect(service.getDayCompletion('week-1', 'week-1-day-1')).toEqual({ completed: 2, total: 2 });
        expect(service.isWeekComplete('week-1')).toBeTrue();
    });

    it('keeps imported programs in a selectable list', () => {
        const firstProgram = createProgram('program-1', 'First Program');
        const secondProgram = createProgram('program-2', 'Second Program');

        service.saveProgram(firstProgram);
        service.saveProgram(secondProgram);

        expect(service.getPrograms().map(program => program.name)).toEqual(['Second Program', 'First Program']);
        expect(service.getProgram().id).toBe('program-2');

        service.setActiveProgram('program-1');

        expect(service.getProgram().id).toBe('program-1');
    });

    it('removes a deleted import and its workout state from the import list', () => {
        const firstProgram = createProgram('program-1', 'First Program');
        const secondProgram = createProgram('program-2', 'Second Program');
        service.saveProgram(firstProgram);
        service.saveProgram(secondProgram);
        service.saveWorkoutState({
            programId: secondProgram.id,
            weekId: 'week-1',
            dayId: 'week-1-day-1',
            exercises: [createExercise('Clean', true)]
        });

        service.clearProgram(secondProgram.id);

        expect(service.getPrograms().map(program => program.id)).toEqual(['program-1']);
        expect(service.getWorkoutState('week-1', 'week-1-day-1', secondProgram.id)).toBeUndefined();
    });

    it('marks an import as in progress once a workout has filled-in state', () => {
        const program = createProgram();
        service.saveProgram(program);

        expect(service.getProgramStatus(program)).toBe('not-started');

        service.saveWorkoutState({
            programId: program.id,
            weekId: 'week-1',
            dayId: 'week-1-day-1',
            exercises: [
                createExercise('Clean', true),
                createExercise('Clean', false)
            ]
        });

        expect(service.getProgramStatus(program)).toBe('in-progress');
    });

    it('returns an in-progress workout before an earlier unstarted workout', () => {
        const program = createProgram();
        program.weeks.push({
            id: 'week-2',
            name: 'Week 2',
            weekNumber: 2,
            days: [{
                id: 'week-2-day-1',
                name: 'Day 01',
                exercises: [{
                    id: 'week-2-day-1-exercise-1',
                    exerciseName: 'Clean',
                    prescription: '3 x 3'
                }]
            }]
        });
        service.saveProgram(program);
        service.saveWorkoutState({
            programId: program.id,
            weekId: 'week-2',
            dayId: 'week-2-day-1',
            startedAt: '2026-06-07T10:00:00.000Z',
            exercises: [createExercise('Clean', false)]
        });

        const currentWorkout = service.getCurrentWorkout(program);

        expect(currentWorkout.week.id).toBe('week-2');
        expect(currentWorkout.day.id).toBe('week-2-day-1');
    });

    it('returns the most recently updated workout when multiple workouts are in progress', () => {
        const program = createProgram();
        program.weeks.push({
            id: 'week-2',
            name: 'Week 2',
            weekNumber: 2,
            days: [{
                id: 'week-2-day-1',
                name: 'Day 01',
                exercises: [{
                    id: 'week-2-day-1-exercise-1',
                    exerciseName: 'Clean',
                    prescription: '3 x 3'
                }]
            }]
        });
        service.saveProgram(program);
        localStorage.setItem('logYourWo.importedWorkoutStates', JSON.stringify([
            {
                ...workoutState(false, '2026-06-07T10:00:00.000Z'),
                startedAt: '2026-06-07T09:00:00.000Z'
            },
            {
                ...workoutState(false, '2026-06-07T12:00:00.000Z'),
                weekId: 'week-2',
                dayId: 'week-2-day-1',
                startedAt: '2026-06-07T11:00:00.000Z'
            }
        ]));

        expect(service.getCurrentWorkout(program).week.id).toBe('week-2');
    });

    it('preserves measurement units when completing a workout from the program overview', () => {
        const program = createProgram();
        service.saveProgram(program);
        service.saveWorkoutState({
            programId: program.id,
            weekId: 'week-1',
            dayId: 'week-1-day-1',
            weightMeasure: 'kg',
            distanceMeasure: 'mi',
            exercises: [createExercise('Clean', false)]
        });

        service.markDayComplete('week-1', 'week-1-day-1');

        const state = service.getWorkoutState('week-1', 'week-1-day-1');
        expect(state.weightMeasure).toBe('kg');
        expect(state.distanceMeasure).toBe('mi');
    });

    it('formats elapsed milliseconds consistently', () => {
        expect(service.formatElapsedMs(0)).toBe('00:00:00');
        expect(service.formatElapsedMs(3723000)).toBe('01:02:03');
    });

    it('persists cardio exercises in imported workout state', () => {
        const program = createProgram();
        const cardio = createExercise('Run', false);
        cardio.exerciseType = 'cardio';
        cardio.distance = 5;
        service.saveProgram(program);

        service.saveWorkoutState({
            programId: program.id,
            weekId: 'week-1',
            dayId: 'week-1-day-1',
            exercises: [createExercise('Clean', false)],
            cardioExercises: [cardio]
        });

        const state = service.getWorkoutState('week-1', 'week-1-day-1');
        expect(state.cardioExercises.length).toBe(1);
        expect(state.cardioExercises[0].exerciseName).toBe('Run');
        expect(state.cardioExercises[0].distance).toBe(5);
    });

    it('can save cardio state again after it has been read from storage', () => {
        const program = createProgram();
        const cardio = createExercise('Run', false);
        cardio.exerciseType = 'cardio';
        cardio.duration = Duration.fromObject({ minutes: 12, seconds: 30 });
        service.saveProgram(program);

        service.saveWorkoutState({
            programId: program.id,
            weekId: 'week-1',
            dayId: 'week-1-day-1',
            exercises: [createExercise('Clean', false)],
            cardioExercises: [cardio]
        });

        const storedState = service.getWorkoutState('week-1', 'week-1-day-1');

        expect(() => service.saveWorkoutState(storedState)).not.toThrow();
        expect((service.getWorkoutState('week-1', 'week-1-day-1').cardioExercises[0].duration as any))
            .toBe(750000);
    });

    it('uploads a legacy program before its workout state during account migration', async () => {
        const cloud = jasmine.createSpyObj<SupabaseDataService>(
            'SupabaseDataService',
            [
                'getPrograms',
                'getWorkoutStates',
                'getPreferences',
                'savePrograms',
                'saveWorkoutStates',
                'savePreferences'
            ]
        );
        cloud.getPrograms.and.resolveTo([]);
        cloud.getWorkoutStates.and.resolveTo([]);
        cloud.getPreferences.and.resolveTo({});
        const writeOrder: string[] = [];
        cloud.savePrograms.and.callFake(async () => {
            writeOrder.push('programs');
        });
        cloud.saveWorkoutStates.and.callFake(async () => {
            writeOrder.push('states');
        });
        cloud.savePreferences.and.resolveTo();
        const migratingService = new ProgramImportService(cloud);
        const program = createProgram();
        migratingService.saveProgram(program);
        migratingService.saveWorkoutState({
            programId: program.id,
            weekId: 'week-1',
            dayId: 'week-1-day-1',
            exercises: [createExercise('Clean', true)]
        });

        migratingService.setUserContext('user-1');
        await migratingService.syncWithCloud();

        expect(cloud.savePrograms).toHaveBeenCalledWith('user-1', [program]);
        expect(cloud.saveWorkoutStates).toHaveBeenCalled();
        expect(writeOrder).toEqual(['programs', 'states']);
        expect(localStorage.getItem('logYourWo.importedPrograms')).toBeNull();
        expect(localStorage.getItem('logYourWo.user-1.importedPrograms')).toBeTruthy();
    });

    it('keeps newer local workout progress when cloud state is stale', async () => {
        const cloud = jasmine.createSpyObj<SupabaseDataService>(
            'SupabaseDataService',
            [
                'getPrograms',
                'getWorkoutStates',
                'getPreferences',
                'savePrograms',
                'saveWorkoutStates',
                'savePreferences'
            ]
        );
        const program = createProgram();
        const remoteState = workoutState(false, '2026-06-06T10:00:00.000Z');
        const localState = workoutState(true, '2026-06-07T10:00:00.000Z');
        cloud.getPrograms.and.resolveTo([program]);
        cloud.getWorkoutStates.and.resolveTo([remoteState]);
        cloud.getPreferences.and.resolveTo({ activeProgramId: program.id });
        cloud.savePrograms.and.resolveTo();
        cloud.saveWorkoutStates.and.resolveTo();
        cloud.savePreferences.and.resolveTo();
        const syncingService = new ProgramImportService(cloud);
        syncingService.setUserContext('user-1');
        localStorage.setItem('logYourWo.user-1.importedWorkoutStates', JSON.stringify([localState]));

        await syncingService.syncWithCloud();

        expect(syncingService.getWorkoutState('week-1', 'week-1-day-1').exercises[0].completed).toBeTrue();
        expect(cloud.saveWorkoutStates).toHaveBeenCalledWith(
            'user-1',
            jasmine.arrayContaining([jasmine.objectContaining({ updatedAt: localState.updatedAt })])
        );
    });

    it('does not let an untimestamped legacy state overwrite newer cloud progress', async () => {
        const cloud = jasmine.createSpyObj<SupabaseDataService>(
            'SupabaseDataService',
            [
                'getPrograms',
                'getWorkoutStates',
                'getPreferences',
                'savePrograms',
                'saveWorkoutStates',
                'savePreferences'
            ]
        );
        const program = createProgram();
        const remoteState = workoutState(true, '2026-06-07T12:00:00.000Z');
        const legacyState = workoutState(false, undefined);
        cloud.getPrograms.and.resolveTo([program]);
        cloud.getWorkoutStates.and.resolveTo([remoteState]);
        cloud.getPreferences.and.resolveTo({ activeProgramId: program.id });
        cloud.savePrograms.and.resolveTo();
        cloud.saveWorkoutStates.and.resolveTo();
        cloud.savePreferences.and.resolveTo();
        const syncingService = new ProgramImportService(cloud);
        localStorage.setItem(
            'logYourWo.importedWorkoutStates',
            JSON.stringify([legacyState])
        );

        syncingService.setUserContext('user-1');
        await syncingService.syncWithCloud();

        expect(syncingService.getWorkoutState(
            'week-1',
            'week-1-day-1'
        ).exercises[0].completed).toBeTrue();
    });

    it('retries a failed program deletion before merging cloud programs', async () => {
        spyOn(console, 'error');
        const program = createProgram();
        let remotePrograms = [program];
        let deleteAttempts = 0;
        const cloud = jasmine.createSpyObj<SupabaseDataService>(
            'SupabaseDataService',
            [
                'getPrograms',
                'getWorkoutStates',
                'getPreferences',
                'savePrograms',
                'saveWorkoutStates',
                'savePreferences',
                'deleteProgram'
            ]
        );
        cloud.getPrograms.and.callFake(async () => remotePrograms);
        cloud.getWorkoutStates.and.resolveTo([]);
        cloud.getPreferences.and.resolveTo({});
        cloud.savePrograms.and.resolveTo();
        cloud.saveWorkoutStates.and.resolveTo();
        cloud.savePreferences.and.resolveTo();
        cloud.deleteProgram.and.callFake(async () => {
            deleteAttempts++;
            if (deleteAttempts === 1) {
                throw new Error('offline');
            }
            remotePrograms = [];
        });
        const syncingService = new ProgramImportService(cloud);
        syncingService.setUserContext('user-1');
        localStorage.setItem('logYourWo.user-1.importedPrograms', JSON.stringify([program]));
        localStorage.setItem('logYourWo.user-1.importedProgram', JSON.stringify(program));

        syncingService.clearProgram(program.id);
        await Promise.resolve();
        await Promise.resolve();
        await syncingService.syncWithCloud();

        expect(deleteAttempts).toBe(2);
        expect(syncingService.getPrograms()).toEqual([]);
        expect(localStorage.getItem('logYourWo.user-1.deletedPrograms')).toBeNull();
    });

    it('does not resurrect a program deleted while initial cloud sync is loading', async () => {
        const program = createProgram();
        const remoteResult = deferred<ImportedProgram[]>();
        const cloud = jasmine.createSpyObj<SupabaseDataService>(
            'SupabaseDataService',
            [
                'getPrograms',
                'getWorkoutStates',
                'getPreferences',
                'savePrograms',
                'saveWorkoutStates',
                'savePreferences',
                'deleteProgram'
            ]
        );
        cloud.getPrograms.and.returnValue(remoteResult.promise);
        cloud.getWorkoutStates.and.resolveTo([]);
        cloud.getPreferences.and.resolveTo({});
        cloud.savePrograms.and.resolveTo();
        cloud.saveWorkoutStates.and.resolveTo();
        cloud.savePreferences.and.resolveTo();
        cloud.deleteProgram.and.resolveTo();
        const syncingService = new ProgramImportService(cloud);
        syncingService.setUserContext('user-1');
        localStorage.setItem(
            'logYourWo.user-1.importedPrograms',
            JSON.stringify([program])
        );
        localStorage.setItem(
            'logYourWo.user-1.importedProgram',
            JSON.stringify(program)
        );

        const sync = syncingService.syncWithCloud();
        await Promise.resolve();
        syncingService.clearProgram(program.id);
        remoteResult.resolve([program]);
        await sync;

        expect(syncingService.getPrograms()).toEqual([]);
        expect(cloud.savePrograms).not.toHaveBeenCalledWith(
            'user-1',
            jasmine.arrayContaining([jasmine.objectContaining({ id: program.id })])
        );
    });
});

function workoutState(completed: boolean, updatedAt?: string): ImportedWorkoutState {
    return {
        programId: 'program-1',
        weekId: 'week-1',
        dayId: 'week-1-day-1',
        updatedAt,
        exercises: [createExercise('Clean', completed)]
    };
}

function deferred<T>(): { promise: Promise<T>, resolve: (value: T) => void } {
    let resolve: (value: T) => void;
    const promise = new Promise<T>(resolver => resolve = resolver);
    return { promise, resolve };
}

function createWorkbookFile(rows: any[][]): File {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), 'Program');
    return workbookToFile(workbook, 'example_program.xlsx');
}

function workbookToFile(workbook: XLSX.WorkBook, fileName: string): File {
    const data = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return new File([data], fileName, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
}

function setFormula(
    worksheet: XLSX.WorkSheet,
    address: string,
    value: string | number,
    formula: string
): void {
    worksheet[address] = {
        t: typeof value === 'number' ? 'n' : 's',
        v: value,
        w: String(value),
        f: formula
    };
}

function createProgram(id = 'program-1', name = 'Program'): ImportedProgram {
    return {
        id,
        name,
        importedAt: '2026-06-04T00:00:00.000Z',
        weeks: [{
            id: 'week-1',
            name: 'Week 1',
            weekNumber: 1,
            days: [{
                id: 'week-1-day-1',
                name: 'Day 01',
                exercises: [
                    { id: 'exercise-1', exerciseName: 'Clean', prescription: '115 x 3 x 2', weight: '115', reps: '3', sets: '2' },
                    { id: 'exercise-2', exerciseName: 'Clean', prescription: '138 x 3 x 3', weight: '138', reps: '3', sets: '3' }
                ]
            }]
        }]
    };
}

function createExercise(name: string, completed: boolean): Exercise {
    const exercise = new Exercise();
    exercise.exerciseType = 'strength';
    exercise.exerciseName = name;
    exercise.completed = completed;
    return exercise;
}
