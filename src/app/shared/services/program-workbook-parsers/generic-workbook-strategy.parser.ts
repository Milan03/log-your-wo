import {
    ImportedProgramDay,
    ImportedProgramExercise,
    ImportedProgramWeek,
    WorkbookExerciseCalculation
} from '../../models/imported-program.model';
import {
    ProgramWorkbookFormulaHelper,
    WorkbookCalculationOutput as CalculationOutput,
    WorkbookFormulaSource as FormulaSource
} from './program-workbook-formula.helper';
import {
    NormalizedWorkbookCell as NormalizedCell,
    NormalizedWorkbookSheet as NormalizedSheet,
    WorkbookParserResult as ParserResult
} from './program-workbook-parser.types';
import {
    buildWorkbookPrescription,
    cleanWorkbookExerciseName,
    createWorkbookProgramDay,
    createWorkbookProgramExercise,
    createWorkbookProgramWeek,
    isWorkbookWeekday,
    maximumWorkbookColumn,
    normalizeWorkbookText,
    numberFromWorkbookLabel,
    workbookSheetWeekName
} from './program-workbook-program.mapper';

interface HeaderMap {
    exercise: number;
    week?: number;
    day?: number;
    sets?: number;
    reps?: number;
    weight?: number;
    rest?: number;
    tempo?: number;
    rpe?: number;
    percentage1Rm?: number;
    notes?: number;
}

export function parseGenericWorkbookStrategies(
    sheets: NormalizedSheet[],
    formulaHelper: ProgramWorkbookFormulaHelper
): ParserResult[] {
    const parser = new GenericWorkbookStrategyParser(formulaHelper);
    return [
        parser.parseLegacy(sheets),
        parser.parseVerticalSections(sheets),
        parser.parseHorizontalDays(sheets),
        parser.parseGenericTables(sheets)
    ];
}

class GenericWorkbookStrategyParser {
    constructor(private readonly formulaHelper: ProgramWorkbookFormulaHelper) { }

    public parseLegacy(sheets: NormalizedSheet[]): ParserResult {
        const weeks: ImportedProgramWeek[] = [];

        sheets.forEach(sheet => {
            const weekStarts = sheet.rows
                .map((row, index) => ({ row, index }))
                .filter(entry => entry.row.some(cell => /^week\s+\d+/i.test(cell)));

            weekStarts.forEach((entry, weekIndex) => {
                const weekLabel = entry.row.find(cell => /^week\s+\d+/i.test(cell));
                const weekNumber = numberFromWorkbookLabel(weekLabel, weekIndex + 1);
                const endIndex = weekStarts[weekIndex + 1]?.index ?? sheet.rows.length;
                const pairs = [
                    { name: 1, prescription: 2 },
                    { name: 4, prescription: 5 },
                    { name: 7, prescription: 8 }
                ];
                const sections: Array<{
                    label: string;
                    start: number;
                    nameColumn: number;
                    prescriptionColumn: number;
                    pairIndex: number;
                }> = [];

                for (let rowIndex = entry.index; rowIndex < endIndex; rowIndex++) {
                    pairs.forEach((pair, pairIndex) => {
                        const label = sheet.rows[rowIndex][pair.name] || '';
                        if (isWorkbookWeekday(label)) {
                            sections.push({
                                label,
                                start: rowIndex,
                                nameColumn: pair.name,
                                prescriptionColumn: pair.prescription,
                                pairIndex
                            });
                        }
                    });
                }

                const days = sections
                    .sort((first, second) => first.pairIndex - second.pairIndex || first.start - second.start)
                    .map((section, dayIndex) => {
                        const next = sections.find(candidate =>
                            candidate.pairIndex === section.pairIndex && candidate.start > section.start
                        );
                        const exercises: ImportedProgramExercise[] = [];
                        let currentName = '';

                        for (let rowIndex = section.start + 1; rowIndex < (next?.start ?? endIndex); rowIndex++) {
                            const rawName = sheet.rows[rowIndex][section.nameColumn] || '';
                            const name = this.isExerciseNameAnnotation(rawName)
                                ? ''
                                : cleanWorkbookExerciseName(rawName);
                            const prescription = sheet.rows[rowIndex][section.prescriptionColumn] || '';
                            const exerciseName = name || (prescription ? currentName : '');
                            if (!this.isExerciseRow(exerciseName, prescription)) {
                                continue;
                            }
                            currentName = name || currentName;
                            exercises.push(this.createExercise(
                                exerciseName,
                                prescription,
                                {},
                                `week-${weekNumber}-day-${dayIndex + 1}-exercise-${rowIndex}`,
                                true,
                                this.formulaHelper.formulaSources(
                                    sheet.cells[rowIndex]?.[section.prescriptionColumn],
                                    'prescription'
                                ),
                                sheet.name
                            ));
                        }

                        return createWorkbookProgramDay(
                            weekNumber,
                            dayIndex,
                            `Day ${String(dayIndex + 1).padStart(2, '0')}`,
                            exercises
                        );
                    })
                    .filter(day => day.exercises.length > 0);

                if (days.length) {
                    weeks.push(createWorkbookProgramWeek(weekNumber, `Week ${weekNumber}`, days));
                }
            });
        });

        return {
            strategy: 'legacy-fixed-layout',
            confidence: weeks.length ? 0.96 : 0,
            weeks
        };
    }

    public parseVerticalSections(sheets: NormalizedSheet[]): ParserResult {
        const weeks: ImportedProgramWeek[] = [];
        let sectionCount = 0;

        sheets.forEach(sheet => {
            let currentWeek: ImportedProgramWeek;
            let currentDay: ImportedProgramDay;

            sheet.rows.forEach((row, rowIndex) => {
                const cells = row.filter(Boolean);
                const section = cells.map(cell => this.sectionLabel(cell)).find(Boolean);
                if (section?.type === 'week') {
                    currentWeek = createWorkbookProgramWeek(section.number || weeks.length + 1, section.label, []);
                    weeks.push(currentWeek);
                    currentDay = undefined;
                    sectionCount++;
                    return;
                }
                if (section?.type === 'day') {
                    if (!currentWeek) {
                        currentWeek = createWorkbookProgramWeek(
                            weeks.length + 1,
                            workbookSheetWeekName(sheet.name, weeks.length + 1),
                            []
                        );
                        weeks.push(currentWeek);
                    }
                    currentDay = createWorkbookProgramDay(
                        currentWeek.weekNumber,
                        currentWeek.days.length,
                        section.label,
                        []
                    );
                    currentWeek.days.push(currentDay);
                    sectionCount++;
                    return;
                }
                if (!currentDay || this.headerMap(row)) {
                    return;
                }

                const firstColumn = row.findIndex(Boolean);
                const exerciseName = cleanWorkbookExerciseName(row[firstColumn] || '');
                const details = row.slice(firstColumn + 1).filter(Boolean).join(' | ');
                if (!this.isExerciseRow(exerciseName, details)) {
                    return;
                }
                currentDay.exercises.push(this.createExercise(
                    exerciseName,
                    details,
                    {},
                    `${currentDay.id}-exercise-${rowIndex}`,
                    false,
                    this.formulaHelper.firstFormulaSources(
                        sheet.cells[rowIndex]?.slice(firstColumn + 1),
                        'prescription'
                    ),
                    sheet.name
                ));
            });
        });

        const validWeeks = weeks
            .map(week => ({ ...week, days: week.days.filter(day => day.exercises.length > 0) }))
            .filter(week => week.days.length > 0);
        return {
            strategy: 'vertical-week-day-sections',
            confidence: validWeeks.length ? Math.min(0.9, 0.58 + sectionCount * 0.035) : 0,
            weeks: validWeeks
        };
    }

    public parseHorizontalDays(sheets: NormalizedSheet[]): ParserResult {
        const weeks: ImportedProgramWeek[] = [];
        let detectedDayColumns = 0;
        let detectedWeekBlocks = 0;

        sheets.forEach(sheet => {
            const blockWeeks = this.parseHorizontalWeekBlocks(sheet);
            if (blockWeeks.length) {
                weeks.push(...blockWeeks);
                detectedWeekBlocks += blockWeeks.length;
                detectedDayColumns += blockWeeks.reduce((total, week) => total + week.days.length, 0);
                return;
            }

            let weekNumber = numberFromWorkbookLabel(sheet.name, weeks.length + 1);
            sheet.rows.forEach((row, rowIndex) => {
                const weekCell = row.find(cell => this.sectionLabel(cell)?.type === 'week');
                if (weekCell) {
                    weekNumber = numberFromWorkbookLabel(weekCell, weekNumber);
                }

                const dayColumns = row
                    .map((cell, column) => ({ cell, column, section: this.sectionLabel(cell) }))
                    .filter(entry => entry.section?.type === 'day');
                if (dayColumns.length < 2) {
                    return;
                }

                detectedDayColumns += dayColumns.length;
                const days = dayColumns.map((entry, dayIndex) => {
                    const endColumn = dayColumns[dayIndex + 1]?.column ?? maximumWorkbookColumn(sheet.rows);
                    const exercises: ImportedProgramExercise[] = [];
                    let currentName = '';

                    for (let exerciseRow = rowIndex + 1; exerciseRow < sheet.rows.length; exerciseRow++) {
                        const candidateRow = sheet.rows[exerciseRow];
                        if (candidateRow.some(cell => this.sectionLabel(cell)?.type === 'week')) {
                            break;
                        }
                        const name = cleanWorkbookExerciseName(candidateRow[entry.column] || '');
                        const details = candidateRow
                            .slice(entry.column + 1, endColumn)
                            .filter(Boolean)
                            .join(' | ');
                        const exerciseName = name || (details ? currentName : '');
                        if (!this.isExerciseRow(exerciseName, details)) {
                            continue;
                        }
                        currentName = name || currentName;
                        exercises.push(this.createExercise(
                            exerciseName,
                            details,
                            {},
                            `week-${weekNumber}-day-${dayIndex + 1}-exercise-${exerciseRow}`,
                            false,
                            this.formulaHelper.firstFormulaSources(
                                sheet.cells[exerciseRow]?.slice(entry.column + 1, endColumn),
                                'prescription'
                            ),
                            sheet.name
                        ));
                    }

                    return createWorkbookProgramDay(weekNumber, dayIndex, entry.section.label, exercises);
                }).filter(day => day.exercises.length > 0);

                if (days.length) {
                    weeks.push(createWorkbookProgramWeek(weekNumber, `Week ${weekNumber}`, days));
                }
            });
        });

        return {
            strategy: 'horizontal-day-columns',
            confidence: weeks.length
                ? Math.min(detectedWeekBlocks ? 0.98 : 0.9, 0.75 + detectedDayColumns * 0.03)
                : 0,
            weeks
        };
    }

    public parseGenericTables(sheets: NormalizedSheet[]): ParserResult {
        const weeksByKey = new Map<string, ImportedProgramWeek>();
        let mappedColumns = 0;

        sheets.forEach(sheet => {
            sheet.rows.forEach((row, headerIndex) => {
                const map = this.headerMap(row);
                if (!map) {
                    return;
                }
                mappedColumns += Object.keys(map).length;
                let fallbackWeek = numberFromWorkbookLabel(sheet.name, weeksByKey.size + 1);

                for (let rowIndex = headerIndex + 1; rowIndex < sheet.rows.length; rowIndex++) {
                    const values = sheet.rows[rowIndex];
                    if (this.headerMap(values)) {
                        break;
                    }
                    const exerciseName = cleanWorkbookExerciseName(values[map.exercise] || '');
                    if (!this.isExerciseRow(exerciseName, '')) {
                        continue;
                    }

                    const weekLabel = map.week !== undefined ? values[map.week] : '';
                    const weekNumber = numberFromWorkbookLabel(weekLabel, fallbackWeek);
                    fallbackWeek = weekNumber;
                    const weekName = weekLabel || `Week ${weekNumber}`;
                    const weekKey = `${sheet.name}:${weekNumber}:${weekName.toLowerCase()}`;
                    let week = weeksByKey.get(weekKey);
                    if (!week) {
                        week = createWorkbookProgramWeek(weekNumber, weekName, []);
                        weeksByKey.set(weekKey, week);
                    }

                    const dayName = map.day !== undefined && values[map.day]
                        ? values[map.day]
                        : 'Day 01';
                    let day = week.days.find(candidate => candidate.name.toLowerCase() === dayName.toLowerCase());
                    if (!day) {
                        day = createWorkbookProgramDay(weekNumber, week.days.length, dayName, []);
                        week.days.push(day);
                    }

                    const fields = this.fieldsFromColumns(values, map);
                    const prescription = buildWorkbookPrescription(fields);
                    day.exercises.push(this.createExercise(
                        exerciseName,
                        prescription,
                        fields,
                        `${day.id}-exercise-${rowIndex}`,
                        false,
                        this.formulaSourcesFromColumns(sheet, rowIndex, map),
                        sheet.name
                    ));
                }
            });
        });

        if (!weeksByKey.size) {
            const fallbackExercises: ImportedProgramExercise[] = [];
            sheets.forEach(sheet => sheet.rows.forEach((row, rowIndex) => {
                const firstColumn = row.findIndex(Boolean);
                const exerciseName = cleanWorkbookExerciseName(row[firstColumn] || '');
                const details = row.slice(firstColumn + 1).filter(Boolean).join(' | ');
                if (details && this.isExerciseRow(exerciseName, details)) {
                    fallbackExercises.push(this.createExercise(
                        exerciseName,
                        details,
                        {},
                        `week-1-day-1-exercise-${rowIndex}`
                    ));
                }
            }));
            if (fallbackExercises.length) {
                weeksByKey.set('fallback', createWorkbookProgramWeek(1, 'Week 1', [
                    createWorkbookProgramDay(1, 0, 'Day 01', fallbackExercises)
                ]));
            }
        }

        const weeks = Array.from(weeksByKey.values()).filter(week => week.days.some(day => day.exercises.length));
        return {
            strategy: 'generic-header-table',
            confidence: weeks.length
                ? (mappedColumns ? Math.min(0.94, 0.62 + mappedColumns * 0.025) : 0.35)
                : 0,
            weeks
        };
    }

    private parseHorizontalWeekBlocks(sheet: NormalizedSheet): ImportedProgramWeek[] {
        const header = sheet.rows
            .map((row, rowIndex) => ({
                rowIndex,
                weeks: row
                    .map((cell, column) => ({ column, section: this.sectionLabel(cell) }))
                    .filter(entry => entry.section?.type === 'week')
            }))
            .find(candidate => candidate.weeks.length >= 2);

        if (!header) {
            return [];
        }

        const sheetWidth = maximumWorkbookColumn(sheet.rows);
        return header.weeks.map((entry, weekIndex) => {
            const weekNumber = entry.section.number || weekIndex + 1;
            const endColumn = header.weeks[weekIndex + 1]?.column ?? sheetWidth;
            const daySections = sheet.rows
                .map((row, rowIndex) => ({
                    rowIndex,
                    column: entry.column,
                    section: this.sectionLabel(row[entry.column] || '')
                }))
                .filter(candidate =>
                    candidate.rowIndex > header.rowIndex
                    && candidate.section?.type === 'day'
                );
            const days = daySections.map((daySection, dayIndex) => {
                const nextDayRow = daySections[dayIndex + 1]?.rowIndex ?? sheet.rows.length;
                const exercises: ImportedProgramExercise[] = [];

                for (let rowIndex = daySection.rowIndex + 1; rowIndex < nextDayRow; rowIndex++) {
                    const row = sheet.rows[rowIndex];
                    const rawName = row[entry.column] || '';
                    if (!rawName || this.sectionLabel(rawName) || /^set\s+\d+/i.test(rawName)) {
                        continue;
                    }

                    const setCells = sheet.cells[rowIndex]
                        .slice(entry.column + 1, endColumn)
                        .filter(cell => /^\d+(?:\.\d+)?%?\+?$/.test(cell.text));
                    exercises.push(...this.createHorizontalSetExercises(
                        rawName,
                        setCells,
                        `week-${weekNumber}-day-${dayIndex + 1}-exercise-${rowIndex}`,
                        sheet.name
                    ));
                }

                return createWorkbookProgramDay(weekNumber, dayIndex, daySection.section.label, exercises);
            }).filter(day => day.exercises.length > 0);

            return createWorkbookProgramWeek(weekNumber, entry.section.label, days);
        }).filter(week => week.days.length > 0);
    }

    private createHorizontalSetExercises(
        rawName: string,
        setCells: NormalizedCell[],
        idPrefix: string,
        sheetName: string
    ): ImportedProgramExercise[] {
        const schemes = Array.from(rawName.matchAll(/(\d+)\s*[x×]\s*(\d+(?:-\d+)?)/gi))
            .map(match => ({ sets: match[1], reps: match[2] }));
        const percentageRuns = setCells.reduce((runs, cell) => {
            const value = cell.text;
            const calculation = this.formulaHelper.calculationFromCell(cell, sheetName, 'weight');
            const weight = calculation
                ? value
                : `${value.replace(/%?\+?$/, '')}%${value.endsWith('+') ? '+' : ''}`;
            const calculationKey = calculation ? JSON.stringify(calculation.segments) : '';
            const current = runs[runs.length - 1];
            if (current?.weight === weight && current?.calculationKey === calculationKey) {
                current.count++;
            } else {
                runs.push({
                    weight,
                    percentage: calculation ? undefined : weight,
                    count: 1,
                    calculation,
                    calculationKey
                });
            }
            return runs;
        }, [] as Array<{
            weight: string,
            percentage?: string,
            count: number,
            calculation?: WorkbookExerciseCalculation,
            calculationKey: string
        }>);
        const exerciseName = cleanWorkbookExerciseName(rawName);

        if (!schemes.length) {
            const weights = percentageRuns.map(run => run.weight).join(', ');
            const percentages = percentageRuns.map(run => run.percentage).filter(Boolean).join(', ');
            const fields: Partial<ImportedProgramExercise> = {
                sets: setCells.length ? String(setCells.length) : undefined,
                weight: weights || undefined,
                percentage1Rm: percentages || undefined
            };
            return this.isExerciseRow(exerciseName, weights)
                ? [{
                    ...this.createExercise(exerciseName, this.buildSetPrescription(fields), fields, idPrefix),
                    workbookCalculations: percentageRuns[0]?.calculation
                        ? [percentageRuns[0].calculation]
                        : undefined
                }]
                : [];
        }

        return schemes.map((scheme, index) => {
            const run = percentageRuns[index]
                || (percentageRuns.length === 1 ? percentageRuns[0] : undefined);
            const fields: Partial<ImportedProgramExercise> = {
                sets: scheme.sets,
                reps: scheme.reps,
                weight: run?.weight,
                percentage1Rm: run?.percentage
            };
            return {
                ...this.createExercise(
                    exerciseName,
                    this.buildSetPrescription(fields),
                    fields,
                    `${idPrefix}-${index + 1}`
                ),
                workbookCalculations: run?.calculation ? [run.calculation] : undefined
            };
        });
    }

    private buildSetPrescription(fields: Partial<ImportedProgramExercise>): string {
        const scheme = fields.sets && fields.reps ? `${fields.sets} x ${fields.reps}` : '';
        const percentage = fields.percentage1Rm || fields.weight;
        return [scheme, percentage ? `@ ${percentage}` : ''].filter(Boolean).join(' ');
    }

    private headerMap(row: string[]): HeaderMap | undefined {
        const map: Partial<HeaderMap> = {};
        row.forEach((cell, column) => {
            const key = this.headerKey(cell);
            if (key) {
                map[key] = column;
            }
        });
        return map.exercise !== undefined && Object.keys(map).length >= 2 ? map as HeaderMap : undefined;
    }

    private headerKey(value: string): keyof HeaderMap | undefined {
        const key = value.toLowerCase().replace(/[^a-z0-9%]/g, '');
        if (/^(exercise|movement|lift|exercisename)$/.test(key)) return 'exercise';
        if (/^(week|phase|block)$/.test(key)) return 'week';
        if (/^(day|session|workout)$/.test(key)) return 'day';
        if (/^(set|sets)$/.test(key)) return 'sets';
        if (/^(rep|reps|repetitions)$/.test(key)) return 'reps';
        if (/^(weight|load|kg|lbs)$/.test(key)) return 'weight';
        if (/^(rest|recovery)$/.test(key)) return 'rest';
        if (/^tempo$/.test(key)) return 'tempo';
        if (/^(rpe|rir)$/.test(key)) return 'rpe';
        if (/^(%1rm|1rm|percent1rm|percentage)$/.test(key)) return 'percentage1Rm';
        if (/^(note|notes|comments|cues)$/.test(key)) return 'notes';
        return undefined;
    }

    private fieldsFromColumns(row: string[], map: HeaderMap): Partial<ImportedProgramExercise> {
        const value = (column: number | undefined) => column === undefined ? undefined : row[column] || undefined;
        return {
            sets: value(map.sets),
            reps: value(map.reps),
            weight: value(map.weight),
            rest: value(map.rest),
            tempo: value(map.tempo),
            rpe: value(map.rpe),
            percentage1Rm: value(map.percentage1Rm),
            notes: value(map.notes)
        };
    }

    private formulaSourcesFromColumns(
        sheet: NormalizedSheet,
        rowIndex: number,
        map: HeaderMap
    ): FormulaSource[] {
        return this.formulaHelper.formulaSourcesFromColumns(sheet, rowIndex, [
            { column: map.weight, output: 'weight' },
            { column: map.percentage1Rm, output: 'percentage1Rm' },
            { column: map.sets, output: 'sets' },
            { column: map.reps, output: 'reps' },
            { column: map.rest, output: 'rest' },
            { column: map.tempo, output: 'tempo' },
            { column: map.rpe, output: 'rpe' },
            { column: map.notes, output: 'notes' }
        ]);
    }

    private createExercise(
        exerciseName: string,
        prescription: string,
        fields: Partial<ImportedProgramExercise>,
        id: string,
        legacyLayout = false,
        formulaSources: FormulaSource[] = [],
        sheetName?: string
    ): ImportedProgramExercise {
        return createWorkbookProgramExercise({
            id,
            exerciseName,
            prescription,
            fields,
            legacyLayout,
            workbookCalculations: sheetName
                ? this.formulaHelper.calculationsFromSources(formulaSources, sheetName)
                : undefined
        });
    }

    private sectionLabel(value: string): { type: 'week' | 'day', label: string, number?: number } | undefined {
        const normalized = normalizeWorkbookText(value);
        const week = normalized.match(/^(week|phase|block)\s*[:#-]?\s*(\d+|[a-z])\b/i);
        if (week) {
            return {
                type: 'week',
                label: normalized,
                number: /^\d+$/.test(week[2]) ? Number(week[2]) : undefined
            };
        }
        if (isWorkbookWeekday(normalized) || /^(day|session|workout)\s*[:#-]?\s*[\w-]+/i.test(normalized)) {
            return { type: 'day', label: normalized };
        }
        return undefined;
    }

    private isExerciseRow(exerciseName: string, prescription: string): boolean {
        if (!exerciseName || this.sectionLabel(exerciseName) || this.headerKey(exerciseName)) {
            return false;
        }
        if (/^!+$/.test(exerciseName) || /^x$/i.test(exerciseName) || /^\W+$/.test(exerciseName)) {
            return false;
        }
        return Boolean(prescription) || /[a-z]/i.test(exerciseName);
    }

    private isExerciseNameAnnotation(value: string): boolean {
        const normalized = normalizeWorkbookText(value);
        return /^[()]/.test(normalized)
            || /^(without|into)\b/i.test(normalized);
    }
}
