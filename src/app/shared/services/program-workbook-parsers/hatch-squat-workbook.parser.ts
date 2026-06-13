import {
    ImportedProgramDay,
    ImportedProgramExercise,
    ImportedProgramWeek,
    WorkbookExerciseCalculation
} from '../../models/imported-program.model';
import {
    NormalizedWorkbookCell,
    NormalizedWorkbookSheet,
    WorkbookParserResult
} from './program-workbook-parser.types';

interface LiftColumns {
    exerciseName: string;
    scheme: number;
    percentage: number;
    weight: number;
    inputId: string;
}

export function parseHatchSquatWorkbook(
    sheets: NormalizedWorkbookSheet[]
): WorkbookParserResult {
    const sheet = sheets.find(candidate =>
        candidate.rows.slice(0, 8).some(row =>
            row.some(cell => /hatch\s+squat\s+program/i.test(cell))
        )
    );
    if (!sheet) {
        return emptyResult();
    }

    const liftHeaderIndex = sheet.rows.findIndex(row =>
        row.some(cell => /back\s*squat|back\s*sqt/i.test(cell))
        && row.some(cell => /front\s*squat|front\s*sqt/i.test(cell))
    );
    const maxRowIndex = sheet.rows.findIndex((row, index) =>
        index > liftHeaderIndex && row.some(cell => /^1\s*rm$/i.test(cell))
    );
    if (liftHeaderIndex < 0 || maxRowIndex < 0) {
        return emptyResult();
    }

    const header = sheet.rows[liftHeaderIndex];
    const maxCells = sheet.cells[maxRowIndex];
    const workoutHeaderIndex = sheet.rows.findIndex((row, index) =>
        index > maxRowIndex
        && row.some(cell => /back\s*squat|back\s*sqt/i.test(cell))
        && row.some(cell => /front\s*squat|front\s*sqt/i.test(cell))
    );
    const workoutHeader = sheet.rows[workoutHeaderIndex] || [];
    const lifts: LiftColumns[] = [
        createLiftColumns(
            'Back Squat',
            header.findIndex(cell => /back\s*squat|back\s*sqt/i.test(cell)),
            workoutHeader.findIndex(cell => /back\s*squat|back\s*sqt/i.test(cell)),
            maxCells,
            sheet.name
        ),
        createLiftColumns(
            'Front Squat',
            header.findIndex(cell => /front\s*squat|front\s*sqt/i.test(cell)),
            workoutHeader.findIndex(cell => /front\s*squat|front\s*sqt/i.test(cell)),
            maxCells,
            sheet.name
        )
    ].filter(Boolean);
    if (lifts.length !== 2) {
        return emptyResult();
    }

    const weekStarts = sheet.rows
        .map((row, index) => ({ index, label: row.find(cell => /^week\s+\d+\b/i.test(cell)) }))
        .filter(entry => entry.label);
    const weeks = weekStarts.map((weekStart, weekIndex) => {
        const weekNumber = Number(weekStart.label.match(/\d+/)?.[0]) || weekIndex + 1;
        const weekEnd = weekStarts[weekIndex + 1]?.index ?? sheet.rows.length;
        const dayStarts = sheet.rows
            .slice(weekStart.index + 1, weekEnd)
            .map((row, offset) => ({
                index: weekStart.index + 1 + offset,
                label: row.find(cell => /^day\s+\d+\b/i.test(cell))
            }))
            .filter(entry => entry.label);
        const days = dayStarts.map((dayStart, dayIndex) => {
            const dayEnd = dayStarts[dayIndex + 1]?.index ?? weekEnd;
            const exercises: ImportedProgramExercise[] = [];

            lifts.forEach(lift => {
                for (let rowIndex = dayStart.index; rowIndex < dayEnd; rowIndex++) {
                    const scheme = parseScheme(sheet.rows[rowIndex][lift.scheme]);
                    if (!scheme) {
                        continue;
                    }
                    const percentage = sheet.rows[rowIndex][lift.percentage] || '';
                    const weightCell = sheet.cells[rowIndex]?.[lift.weight];
                    const weight = weightCell?.text || '';
                    const calculation = createCalculation(
                        weightCell,
                        lift.inputId,
                        percentage,
                        sheet.cells[rowIndex]?.[lift.percentage]?.value
                    );
                    const fields = {
                        sets: scheme.sets,
                        reps: scheme.reps,
                        weight: weight || undefined,
                        percentage1Rm: percentage || undefined
                    };
                    exercises.push({
                        id: `week-${weekNumber}-day-${dayIndex + 1}-${lift.exerciseName}-${rowIndex}`,
                        exerciseName: lift.exerciseName,
                        prescription: buildPrescription(fields),
                        ...fields,
                        workbookCalculations: calculation ? [calculation] : undefined
                    });
                }
            });

            return createDay(weekNumber, dayIndex, dayStart.label, exercises);
        }).filter(day => day.exercises.length);

        return createWeek(weekNumber, weekStart.label, days);
    }).filter(week => week.days.length);

    return {
        strategy: 'hatch-squat-cycle',
        confidence: weeks.length >= 10 ? 0.99 : weeks.length ? 0.9 : 0,
        formulasFullyHandled: true,
        weeks
    };
}

function createLiftColumns(
    exerciseName: string,
    inputColumn: number,
    schemeColumn: number,
    maxCells: NormalizedWorkbookCell[],
    sheetName: string
): LiftColumns | undefined {
    const inputCell = maxCells?.[inputColumn];
    if (inputColumn < 0 || schemeColumn < 0 || !inputCell?.address) {
        return undefined;
    }
    return {
        exerciseName,
        scheme: schemeColumn,
        percentage: schemeColumn + 1,
        weight: schemeColumn + 2,
        inputId: `${sheetName}!${inputCell.address}`
    };
}

function createCalculation(
    weightCell: NormalizedWorkbookCell,
    inputId: string,
    percentageText: string,
    percentageValue: unknown
): WorkbookExerciseCalculation | undefined {
    if (!weightCell?.formula) {
        return undefined;
    }
    const numericPercentage = Number(percentageValue);
    const multiplier = Number.isFinite(numericPercentage)
        ? numericPercentage
        : Number(percentageText.replace('%', '')) / 100;
    if (!Number.isFinite(multiplier)) {
        return undefined;
    }
    return {
        address: weightCell.address,
        formula: weightCell.formula,
        output: 'weight',
        segments: [{ inputId, multiplier }]
    };
}

function parseScheme(value: string): { sets: string, reps: string } | undefined {
    const match = String(value || '').match(/(\d+)\s*[*x×]\s*(\d+(?:-\d+)?)/i);
    return match ? { sets: match[1], reps: match[2] } : undefined;
}

function buildPrescription(fields: {
    sets: string;
    reps: string;
    weight?: string;
    percentage1Rm?: string;
}): string {
    const load = fields.weight
        ? ` @ ${fields.weight}${fields.percentage1Rm ? ` (${fields.percentage1Rm})` : ''}`
        : fields.percentage1Rm ? ` @ ${fields.percentage1Rm}` : '';
    return `${fields.sets} x ${fields.reps}${load}`;
}

function createWeek(
    weekNumber: number,
    name: string,
    days: ImportedProgramDay[]
): ImportedProgramWeek {
    return { id: `week-${weekNumber}`, weekNumber, name, days };
}

function createDay(
    weekNumber: number,
    dayIndex: number,
    name: string,
    exercises: ImportedProgramExercise[]
): ImportedProgramDay {
    return {
        id: `week-${weekNumber}-day-${dayIndex + 1}`,
        name,
        exercises
    };
}

function emptyResult(): WorkbookParserResult {
    return { strategy: 'hatch-squat-cycle', confidence: 0, weeks: [] };
}
