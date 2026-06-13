import {
    ImportedProgramDay,
    ImportedProgramExercise,
    ImportedProgramWeek,
    WorkbookExerciseCalculation
} from '../../models/imported-program.model';
import {
    NormalizedWorkbookCell,
    NormalizedWorkbookSheet,
    WorkbookCalculationFactory,
    WorkbookParserResult
} from './program-workbook-parser.types';

interface RepScheme {
    sets: string;
    reps: string;
}

interface WeightRun {
    cells: NormalizedWorkbookCell[];
    weight: string;
    calculation?: WorkbookExerciseCalculation;
}

export function parsePendlayWorkbook(
    sheets: NormalizedWorkbookSheet[],
    calculationFactory: WorkbookCalculationFactory
): WorkbookParserResult {
    const intro = sheets.find(sheet =>
        /^intro$/i.test(sheet.name)
        && sheet.rows.slice(0, 8).some(row => row.some(cell => /enter\s+lifts\s+here/i.test(cell)))
    );
    const weekSheets = sheets
        .filter(sheet => /^week\s+\d+\b/i.test(sheet.name))
        .sort((first, second) => weekNumber(first.name) - weekNumber(second.name));
    if (!intro || weekSheets.length < 4) {
        return emptyResult();
    }

    const weeks = weekSheets.map(sheet => {
        const number = weekNumber(sheet.name);
        const dayStarts = sheet.rows
            .map((row, index) => ({ index, label: row[0] || '' }))
            .filter(entry => isDatedDay(entry.label));
        const days = dayStarts.map((dayStart, dayIndex) => {
            const dayEnd = dayStarts[dayIndex + 1]?.index ?? sheet.rows.length;
            const exercises: ImportedProgramExercise[] = [];
            const defaultScheme = parseSchemeValue(
                sheet.rows[dayStart.index].slice(1).find(value =>
                    /(\d+)\s*[x×]\s*(\d+)/i.test(value)
                )
            );

            for (let rowIndex = dayStart.index + 1; rowIndex < dayEnd; rowIndex++) {
                const title = sheet.rows[rowIndex][0] || '';
                if (!title || isDatedDay(title)) {
                    continue;
                }
                const weightCells = (sheet.cells[rowIndex] || [])
                    .slice(1)
                    .filter(cell => cell.text && !/^set\s+\d+$/i.test(cell.text));
                exercises.push(...createExercises(
                    title,
                    weightCells,
                    sheet.name,
                    calculationFactory,
                    `week-${number}-day-${dayIndex + 1}-exercise-${rowIndex}`,
                    defaultScheme
                ));
            }

            return createDay(
                number,
                dayIndex,
                `Day ${String(dayIndex + 1).padStart(2, '0')}`,
                exercises
            );
        }).filter(day => day.exercises.length);

        return createWeek(number, sheet.name, days);
    }).filter(week => week.days.length);

    return {
        strategy: 'pendlay-week-sheets',
        confidence: weeks.length === weekSheets.length && weeks.length >= 8 ? 0.99 : weeks.length ? 0.92 : 0,
        weeks
    };
}

function createExercises(
    title: string,
    weightCells: NormalizedWorkbookCell[],
    sheetName: string,
    calculationFactory: WorkbookCalculationFactory,
    idPrefix: string,
    defaultScheme?: RepScheme
): ImportedProgramExercise[] {
    const exerciseName = cleanExerciseName(title);
    const schemes = parseSchemes(title, weightCells.length, defaultScheme);
    const groups = groupCellsByScheme(weightCells, schemes);

    if (!groups.length) {
        const notes = parentheticalNotes(title);
        return [{
            id: idPrefix,
            exerciseName,
            prescription: schemes[0]
                ? `${schemes[0].sets} x ${schemes[0].reps}`
                : notes || title,
            sets: schemes[0]?.sets,
            reps: schemes[0]?.reps,
            notes: notes || undefined
        }];
    }

    return groups.flatMap((group, groupIndex) => {
        const scheme = schemes[groupIndex] || schemes[0] || {
            sets: String(group.length),
            reps: '1'
        };
        const runs = createWeightRuns(group, sheetName, calculationFactory);
        return runs.map((run, runIndex) => {
            const sets = schemes.length === 1
                ? String(run.cells.length)
                : scheme.sets;
            const fields = {
                sets,
                reps: scheme.reps,
                weight: run.weight || undefined
            };
            return {
                id: `${idPrefix}-${groupIndex + 1}-${runIndex + 1}`,
                exerciseName,
                prescription: buildPrescription(fields),
                ...fields,
                notes: parentheticalNotes(title) || undefined,
                workbookCalculations: run.calculation ? [run.calculation] : undefined
            };
        });
    });
}

function createWeightRuns(
    cells: NormalizedWorkbookCell[],
    sheetName: string,
    calculationFactory: WorkbookCalculationFactory
): WeightRun[] {
    return cells.reduce((runs, cell) => {
        const calculation = calculationFactory(cell, sheetName);
        const key = `${cell.text}:${JSON.stringify(calculation?.segments || [])}`;
        const current = runs[runs.length - 1];
        if (current?.key === key) {
            current.cells.push(cell);
        } else {
            runs.push({
                key,
                cells: [cell],
                weight: cell.text,
                calculation
            });
        }
        return runs;
    }, [] as Array<WeightRun & { key: string }>);
}

function groupCellsByScheme(
    cells: NormalizedWorkbookCell[],
    schemes: RepScheme[]
): NormalizedWorkbookCell[][] {
    if (!cells.length) {
        return [];
    }
    if (schemes.length <= 1) {
        return [cells];
    }

    const groups: NormalizedWorkbookCell[][] = [];
    let offset = 0;
    schemes.forEach(scheme => {
        const count = Number(scheme.sets);
        groups.push(cells.slice(offset, offset + count));
        offset += count;
    });
    if (offset < cells.length) {
        groups[groups.length - 1].push(...cells.slice(offset));
    }
    return groups.filter(group => group.length);
}

function parseSchemes(
    title: string,
    weightCount: number,
    defaultScheme?: RepScheme
): RepScheme[] {
    const schemes = Array.from(title.matchAll(/(\d+)\s*[x×]\s*(\d+)(?:\s*reps?)?/gi))
        .map(match => ({ sets: match[1], reps: match[2] }));
    if (schemes.length) {
        return schemes;
    }

    const complex = title.match(/\((\d+(?:\s*\+\s*\d+)+)\)\s*[x×]\s*(\d+)/i)
        || title.match(/\((\d+(?:\s*\+\s*\d+)+)\)/i);
    if (complex) {
        return [{ sets: complex[2] || String(weightCount || 1), reps: compact(complex[1]) }];
    }

    const singles = title.match(/(\d+)\s+(?:heavy\s+)?singles?/i);
    if (singles) {
        return [{ sets: singles[1], reps: '1' }];
    }
    if (/heavy\s+single|\bopener\b/i.test(title)) {
        return [{ sets: String(weightCount || 1), reps: '1' }];
    }
    return defaultScheme ? [defaultScheme] : [];
}

function parseSchemeValue(value: string): RepScheme | undefined {
    const match = String(value || '').match(/(\d+)\s*[x×]\s*(\d+)/i);
    return match ? { sets: match[1], reps: match[2] } : undefined;
}

function buildPrescription(fields: { sets: string, reps: string, weight?: string }): string {
    return `${fields.sets} x ${fields.reps}${fields.weight ? ` @ ${fields.weight}` : ''}`;
}

function cleanExerciseName(value: string): string {
    return compact(value.replace(/\([^)]*\)/g, ''))
        .replace(/\b\d+\s+(?:heavy\s+)?singles?\b/ig, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function parentheticalNotes(value: string): string {
    return Array.from(value.matchAll(/\(([^)]+)\)/g))
        .map(match => compact(match[1]))
        .join('; ');
}

function isDatedDay(value: string): boolean {
    return /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s*,/i.test(value);
}

function weekNumber(value: string): number {
    return Number(value.match(/\d+/)?.[0]) || 0;
}

function compact(value: string): string {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function createWeek(
    week: number,
    name: string,
    days: ImportedProgramDay[]
): ImportedProgramWeek {
    return { id: `week-${week}`, weekNumber: week, name, days };
}

function createDay(
    week: number,
    dayIndex: number,
    name: string,
    exercises: ImportedProgramExercise[]
): ImportedProgramDay {
    return {
        id: `week-${week}-day-${dayIndex + 1}`,
        name,
        exercises
    };
}

function emptyResult(): WorkbookParserResult {
    return { strategy: 'pendlay-week-sheets', confidence: 0, weeks: [] };
}
