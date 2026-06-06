import { TestBed } from '@angular/core/testing';
import * as XLSX from 'xlsx';

import { ProgramImportService } from './program-import.service';
import { ImportedProgram } from '../models/imported-program.model';
import { Exercise } from '../models/exercise.model';
import * as moment from 'moment';
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
        cardio.duration = moment.duration({ minutes: 12, seconds: 30 });
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
});

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
