import * as XLSX from 'xlsx';

import { ProgramWorkbookParserService } from './program-workbook-parser.service';

describe('ProgramWorkbookParserService', () => {
    let parser: ProgramWorkbookParserService;

    beforeEach(() => {
        parser = new ProgramWorkbookParserService();
    });

    it('keeps the existing fixed-layout format working', () => {
        const preview = parseRows(parser, [
            ['', 'Week 1'],
            ['', 'Monday', '', '', 'Wednesday'],
            ['', 'Clean', '115 x 3 x 2', '', 'Squat', '185 x 5 x 3']
        ]);

        expect(preview.strategy).toBe('legacy-fixed-layout');
        expect(preview.program.weeks[0].days.length).toBe(2);
        expect(preview.program.weeks[0].days[0].exercises[0]).toEqual(jasmine.objectContaining({
            exerciseName: 'Clean',
            weight: '115',
            reps: '3',
            sets: '2'
        }));
    });

    it('keeps split parenthetical exercise notes attached to the preceding legacy exercise', () => {
        const preview = parseRows(parser, [
            ['', 'Week 1'],
            ['', 'Monday'],
            ['', 'Muscle Snatch', 'X x 6 x 2'],
            ['', '(into full squat,', 'X x 5 x 2'],
            ['', 'without the second pull)', 'X x 4 x 2']
        ]);
        const exercises = preview.program.weeks[0].days[0].exercises;

        expect(exercises.map(exercise => exercise.exerciseName)).toEqual([
            'Muscle Snatch',
            'Muscle Snatch',
            'Muscle Snatch'
        ]);
        expect(exercises.map(exercise => exercise.reps)).toEqual(['6', '5', '4']);
        expect(exercises.map(exercise => exercise.sets)).toEqual(['2', '2', '2']);
    });

    it('parses vertical week and day sections', () => {
        const preview = parseRows(parser, [
            ['Phase 1'],
            ['Session A'],
            ['Back Squat', '4 x 6', 'Rest 2 min'],
            ['Bench Press', '3 x 8', 'RPE 8'],
            ['Session B'],
            ['Deadlift', '3 x 5']
        ]);

        expect(preview.strategy).toBe('vertical-week-day-sections');
        expect(preview.program.weeks[0].name).toBe('Phase 1');
        expect(preview.program.weeks[0].days.map(day => day.name)).toEqual(['Session A', 'Session B']);
        expect(preview.program.weeks[0].days[0].exercises.map(exercise => exercise.exerciseName))
            .toEqual(['Back Squat', 'Bench Press']);
    });

    it('parses horizontal day columns without fixed column assumptions', () => {
        const preview = parseRows(parser, [
            ['Week 2'],
            ['Monday', '', '', 'Wednesday'],
            ['Front Squat', '4 x 5', '', 'Press', '3 x 8'],
            ['Romanian Deadlift', '3 x 10', '', 'Pull-up', '4 x 6']
        ]);

        expect(preview.strategy).toBe('horizontal-day-columns');
        expect(preview.program.weeks[0].days.map(day => day.name)).toEqual(['Monday', 'Wednesday']);
        expect(preview.program.weeks[0].days[1].exercises[1].exerciseName).toBe('Pull-up');
    });

    it('parses side-by-side week blocks with set columns and title-based rep schemes', () => {
        const preview = parseRows(parser, [
            sparseRow({
                0: 'Week 1',
                8: 'Week 2',
                17: 'Week 3',
                25: 'Week 4 (Deload + Heavy)'
            }),
            sparseRow({
                0: 'Monday', 1: 'Set 1', 2: 'Set 2', 3: 'Set 3', 4: 'Set 4', 5: 'Set 5', 6: 'Set 6',
                8: 'Monday', 9: 'Set 1', 10: 'Set 2', 11: 'Set 3', 12: 'Set 4', 13: 'Set 5',
                14: 'Set 6',
                17: 'Monday', 18: 'Set 1', 19: 'Set 2', 20: 'Set 3', 21: 'Set 4', 22: 'Set 5',
                23: 'Set 6',
                25: 'Monday (light)', 26: 'Set 1', 27: 'Set 2', 28: 'Set 3', 29: 'Set 4', 30: 'Set 5'
            }),
            sparseRow({
                0: 'Snatch (3x1; 3x2)', 1: '90', 2: '90', 3: '90', 4: '85', 5: '85', 6: '85',
                8: 'Power Clean (5x2)', 9: '85', 10: '85', 11: '85', 12: '85', 13: '85',
                17: 'Front Squat (3x1 90%+, 3x3)', 18: '90', 19: '90', 20: '90',
                21: '85', 22: '85', 23: '85',
                25: 'Muscle Snatch (5x2-3)', 26: '70', 27: '70', 28: '70', 29: '70', 30: '70'
            }),
            sparseRow({
                0: 'Wednesday',
                8: 'Wednesday',
                17: 'Wednesday',
                25: 'Wednesday (light)'
            }),
            sparseRow({
                0: 'Back Squat (5x3)', 1: '85', 2: '85', 3: '85', 4: '85', 5: '85',
                8: 'Clean Pull (5x3)', 9: '85', 10: '85', 11: '85', 12: '85', 13: '85',
                17: 'Clean (3x2, 3x3)', 18: '85', 19: '85', 20: '85', 21: '80', 22: '80', 23: '80',
                25: 'Power Snatch (3x2-3)', 26: '70', 27: '70', 28: '70'
            })
        ]);

        expect(preview.strategy).toBe('horizontal-day-columns');
        expect(preview.confidence).toBe(0.98);
        expect(preview.program.weeks.map(week => week.name)).toEqual([
            'Week 1',
            'Week 2',
            'Week 3',
            'Week 4 (Deload + Heavy)'
        ]);
        expect(preview.program.weeks.every(week => week.days.length === 2)).toBeTrue();
        expect(preview.program.weeks[0].days[0].exercises).toEqual([
            jasmine.objectContaining({
                exerciseName: 'Snatch',
                sets: '3',
                reps: '1',
                weight: '90%',
                prescription: '3 x 1 @ 90%'
            }),
            jasmine.objectContaining({
                exerciseName: 'Snatch',
                sets: '3',
                reps: '2',
                weight: '85%',
                prescription: '3 x 2 @ 85%'
            })
        ]);
        expect(preview.program.weeks[2].days[0].exercises[0]).toEqual(jasmine.objectContaining({
            exerciseName: 'Front Squat',
            sets: '3',
            reps: '1',
            weight: '90%'
        }));
    });

    it('parses a generic table with named headers', () => {
        const preview = parseRows(parser, [
            ['Week', 'Day', 'Exercise', 'Sets', 'Reps', 'Weight'],
            ['1', 'Day 1', 'Squat', '5', '5', '100 kg'],
            ['1', 'Day 2', 'Bench Press', '4', '8', '70 kg']
        ]);

        expect(preview.strategy).toBe('generic-header-table');
        expect(preview.program.weeks[0].days.length).toBe(2);
        expect(preview.program.weeks[0].days[0].exercises[0].prescription).toBe('100 kg x 5 x 5');
    });

    it('returns a safe low-confidence fallback for empty or invalid workbooks', () => {
        const preview = parseRows(parser, [['Notes'], ['Nothing to import']]);

        expect(preview.program).toBeUndefined();
        expect(preview.lowConfidence).toBeTrue();
        expect(preview.warnings.length).toBeGreaterThan(0);
    });

    it('shows salvageable rows for manual cleanup when confidence is low', () => {
        const preview = parseRows(parser, [
            ['Back Squat', '5 x 5'],
            ['Bench Press', '4 x 8']
        ]);

        expect(preview.program.weeks[0].days[0].exercises.length).toBe(2);
        expect(preview.lowConfidence).toBeTrue();
        expect(preview.confidence).toBe(0.35);
    });

    it('detects notes, RPE, rest, tempo, and percentage of 1RM', () => {
        const preview = parseRows(parser, [
            ['Week', 'Day', 'Exercise', 'Sets', 'Reps', '%1RM', 'Rest', 'Tempo', 'RPE', 'Notes'],
            ['1', 'Monday', 'Back Squat', '4', '5', '80%', '3 min', '3-1-1-0', '8', 'Keep chest tall']
        ]);
        const exercise = preview.program.weeks[0].days[0].exercises[0];

        expect(exercise).toEqual(jasmine.objectContaining({
            sets: '4',
            reps: '5',
            percentage1Rm: '80%',
            rest: '3 min',
            tempo: '3-1-1-0',
            rpe: '8',
            notes: 'Keep chest tall'
        }));
        expect(exercise.prescription).toContain('80%');
        expect(exercise.prescription).toContain('Rest: 3 min');
    });
});

function parseRows(parser: ProgramWorkbookParserService, rows: unknown[][]) {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), 'Program');
    const data = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
    return parser.parse(data, 'test-program.xlsx');
}

function sparseRow(values: { [column: number]: string }): string[] {
    const row: string[] = [];
    Object.keys(values).forEach(column => {
        row[Number(column)] = values[Number(column)];
    });
    return row;
}
