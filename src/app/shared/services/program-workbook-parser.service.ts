import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';

import {
    ImportedProgram,
    ImportedProgramDay,
    ImportedProgramExercise,
    ImportedProgramWeek,
    ProgramImportPreview,
    WorkbookExerciseCalculation,
    WorkbookFormulaSegment,
    WorkbookImportInput,
    WorkbookImportSetup
} from '../models/imported-program.model';
import { parseHatchSquatWorkbook } from './program-workbook-parsers/hatch-squat-workbook.parser';
import { parsePendlayWorkbook } from './program-workbook-parsers/pendlay-workbook.parser';
import {
    NormalizedWorkbookCell as NormalizedCell,
    NormalizedWorkbookSheet as NormalizedSheet,
    WorkbookParserResult as ParserResult
} from './program-workbook-parsers/program-workbook-parser.types';
import {
    WorkbookComplexityError,
    WorkbookNormalizationLimits,
    normalizeWorkbookSheet
} from './program-workbook-parsers/program-workbook-normalizer';
import {
    createEmptyProgramPreview,
    createLowConfidenceProgramPreview,
    createUnknownFormulaWarnings
} from './program-workbook-parsers/program-workbook-preview.factory';
import {
    buildWorkbookPrescription,
    cleanWorkbookExerciseName,
    clearWorkbookCalculatedFields,
    countWorkbookExercises,
    createWorkbookProgramDay,
    createWorkbookProgramExercise,
    createWorkbookProgramWeek,
    finalizeWorkbookProgramWeeks,
    isWorkbookWeekday,
    maximumWorkbookColumn,
    normalizeWorkbookText,
    numberFromWorkbookLabel,
    parseWorkbookPrescription,
    workbookExerciseCalculations,
    workbookSheetWeekName
} from './program-workbook-parsers/program-workbook-program.mapper';

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

type CalculationOutput = WorkbookExerciseCalculation['output'];

interface FormulaSource {
    cell: NormalizedCell;
    output: CalculationOutput;
}

@Injectable({
    providedIn: 'root'
})
export class ProgramWorkbookParserService {
    private readonly lowConfidenceThreshold = 0.55;
    private readonly maximumSheets = 25;
    private readonly normalizationLimits: WorkbookNormalizationLimits = {
        maximumRowsPerSheet: 5000,
        maximumColumnsPerSheet: 256,
        maximumCellsPerSheet: 250000,
        maximumMergedCellsPerSheet: 50000
    };
    private inputByReference = new Map<string, WorkbookImportInput>();
    private unknownFormulaAddresses = new Set<string>();
    private sheetNames = new Map<string, string>();

    public parse(data: ArrayBuffer, fileName: string): ProgramImportPreview {
        let workbook: XLSX.WorkBook;

        try {
            workbook = this.readWorkbook(data);
        } catch {
            return createEmptyProgramPreview('The workbook could not be read.', 'workbook-unreadable');
        }

        if (workbook.SheetNames.length > this.maximumSheets) {
            return createEmptyProgramPreview(
                'The workbook is too large or complex to import safely.',
                'workbook-too-complex'
            );
        }

        let sheets: NormalizedSheet[];
        try {
            sheets = workbook.SheetNames
                .map(name => normalizeWorkbookSheet(name, workbook.Sheets[name], this.normalizationLimits))
                .filter(sheet => sheet.rows.length > 0);
        } catch (error) {
            if (error instanceof WorkbookComplexityError) {
                return createEmptyProgramPreview(error.message, 'workbook-too-complex');
            }
            return createEmptyProgramPreview('The workbook could not be read.', 'workbook-unreadable');
        }
        if (!sheets.length) {
            return createEmptyProgramPreview(
                'The workbook does not contain any non-empty sheets.',
                'workbook-empty'
            );
        }

        this.sheetNames = new Map(sheets.map(sheet => [sheet.name.toLowerCase(), sheet.name]));
        const setup = this.detectSetup(sheets);
        this.inputByReference = new Map(setup.inputs.map(input => [input.id, input]));
        this.unknownFormulaAddresses.clear();
        const results = [
            parseHatchSquatWorkbook(sheets),
            parsePendlayWorkbook(
                sheets,
                (cell, sheetName) => this.calculationFromCell(cell, sheetName, 'weight')
            ),
            this.parseLegacy(sheets),
            this.parseVerticalSections(sheets),
            this.parseHorizontalDays(sheets),
            this.parseGenericTables(sheets)
        ].filter(result => countWorkbookExercises(result.weeks) > 0)
            .sort((first, second) =>
                second.confidence - first.confidence
                || countWorkbookExercises(second.weeks) - countWorkbookExercises(first.weeks)
                || first.strategy.localeCompare(second.strategy)
            );
        const best = results[0];

        if (!best) {
            return createEmptyProgramPreview(
                'No workout rows were detected. Check that the sheet includes exercise names and prescriptions.',
                'no-workout-rows'
            );
        }

        const confidence = Math.max(0, Math.min(1, best.confidence));
        const program: ImportedProgram = {
            id: this.createId(),
            name: this.cleanFileName(fileName),
            importedAt: new Date().toISOString(),
            weeks: finalizeWorkbookProgramWeeks(best.weeks)
        };
        const lowConfidence = confidence < this.lowConfidenceThreshold;
        if (lowConfidence) {
            return createLowConfidenceProgramPreview(confidence);
        }
        if (best.formulasFullyHandled) {
            this.unknownFormulaAddresses.clear();
        }
        setup.unknownFormulaCount = this.unknownFormulaAddresses.size;
        const { warnings, warningDetails } = createUnknownFormulaWarnings(setup.unknownFormulaCount);

        return {
            program,
            confidence,
            strategy: best.strategy,
            lowConfidence: false,
            warnings,
            warningDetails,
            setup: setup.inputs.length || setup.instructions.length ? setup : undefined
        };
    }

    private readWorkbook(data: ArrayBuffer): XLSX.WorkBook {
        return XLSX.read(data, {
            type: 'array',
            cellDates: false,
            sheetRows: this.normalizationLimits.maximumRowsPerSheet + 1
        });
    }

    public applyInputs(
        preview: ProgramImportPreview,
        values: { [inputId: string]: number }
    ): ProgramImportPreview {
        if (!preview?.program || !preview.setup) {
            return preview;
        }

        preview.setup.inputs.forEach(input => {
            const value = Number(values[input.id]);
            if (Number.isFinite(value) && value > 0) {
                input.value = value;
            }
        });
        const inputValues = new Map(preview.setup.inputs.map(input => [input.id, input.value]));
        preview.program.weeks.forEach(week => week.days.forEach(day => day.exercises.forEach(exercise => {
            const calculations = workbookExerciseCalculations(exercise);
            if (!calculations.length) {
                return;
            }
            calculations.forEach(calculation => {
                const calculated = this.evaluateCalculation(calculation, inputValues);
                if (calculated === undefined) {
                    return;
                }
                if (calculation.output !== 'prescription') {
                    exercise[calculation.output] = calculated;
                    if (calculation.output === 'weight') {
                        exercise.percentage1Rm = undefined;
                    }
                    return;
                }
                const detected = parseWorkbookPrescription(calculated, true);
                exercise.prescription = calculated;
                clearWorkbookCalculatedFields(exercise);
                Object.assign(exercise, detected);
            });
            if (!calculations.some(calculation => calculation.output === 'prescription')) {
                exercise.prescription = buildWorkbookPrescription(exercise);
            }
        })));
        return preview;
    }

    private parseLegacy(sheets: NormalizedSheet[]): ParserResult {
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
                                this.formulaSources(
                                    sheet.cells[rowIndex]?.[section.prescriptionColumn],
                                    'prescription'
                                ),
                                sheet.name
                            ));
                        }

                        return createWorkbookProgramDay(weekNumber, dayIndex, `Day ${String(dayIndex + 1).padStart(2, '0')}`, exercises);
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

    private parseVerticalSections(sheets: NormalizedSheet[]): ParserResult {
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
                    this.firstFormulaSources(
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

    private parseHorizontalDays(sheets: NormalizedSheet[]): ParserResult {
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
                            this.firstFormulaSources(
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
            const calculation = this.calculationFromCell(cell, sheetName, 'weight');
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

    private parseGenericTables(sheets: NormalizedSheet[]): ParserResult {
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
        const columns: Array<{ column: number | undefined, output: CalculationOutput }> = [
            { column: map.weight, output: 'weight' },
            { column: map.percentage1Rm, output: 'percentage1Rm' },
            { column: map.sets, output: 'sets' },
            { column: map.reps, output: 'reps' },
            { column: map.rest, output: 'rest' },
            { column: map.tempo, output: 'tempo' },
            { column: map.rpe, output: 'rpe' },
            { column: map.notes, output: 'notes' }
        ];
        return columns
            .filter(candidate =>
                candidate.column !== undefined
                && sheet.cells[rowIndex]?.[candidate.column]?.formula
            )
            .map(source => this.formulaSource(sheet.cells[rowIndex][source.column], source.output))
            .filter((source): source is FormulaSource => Boolean(source));
    }

    private formulaSource(
        cell: NormalizedCell,
        output: CalculationOutput
    ): FormulaSource | undefined {
        return cell?.formula ? { cell, output } : undefined;
    }

    private formulaSources(
        cell: NormalizedCell,
        output: CalculationOutput
    ): FormulaSource[] {
        const source = this.formulaSource(cell, output);
        return source ? [source] : [];
    }

    private firstFormulaSources(
        cells: NormalizedCell[],
        output: CalculationOutput
    ): FormulaSource[] {
        return this.formulaSources(cells?.find(cell => cell?.formula), output);
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
                ? this.calculationsFromSources(formulaSources, sheetName)
                : undefined
        });
    }

    private calculationsFromSources(
        sources: FormulaSource[],
        sheetName: string
    ): WorkbookExerciseCalculation[] | undefined {
        const calculations = sources
            .map(source => this.calculationFromCell(source.cell, sheetName, source.output))
            .filter((calculation): calculation is WorkbookExerciseCalculation => Boolean(calculation));
        return calculations.length ? calculations : undefined;
    }

    private detectSetup(sheets: NormalizedSheet[]): WorkbookImportSetup {
        const referencedCells = new Set<string>();

        sheets.forEach(sheet => sheet.cells.forEach(row => row.forEach(cell => {
            if (!cell.formula) {
                return;
            }
            this.formulaReferenceIds(cell.formula, sheet.name)
                .forEach(id => referencedCells.add(id));
        })));

        const inputs: WorkbookImportInput[] = [];
        sheets.forEach(sheet => sheet.cells.forEach(row => row.forEach((cell, column) => {
            const id = this.inputId(sheet.name, cell.address);
            const numericValue = Number(cell.value);
            if (
                !referencedCells.has(id)
                || cell.formula
                || !Number.isFinite(numericValue)
                || /%$/.test(cell.text)
            ) {
                return;
            }

            const labelCell = row
                .slice(0, column)
                .reverse()
                .find(candidate =>
                    candidate.text
                    && !candidate.formula
                    && !Number.isFinite(Number(candidate.text))
                );
            const sameColumnHeader = sheets.length
                ? sheet.cells
                    .slice(0, sheet.cells.indexOf(row))
                    .reverse()
                    .map(candidateRow => candidateRow[column])
                    .find(candidate =>
                        candidate?.text
                        && !candidate.formula
                        && !/^1\s*rm$/i.test(candidate.text)
                    )
                : undefined;
            const inlineLabel = normalizeWorkbookText(labelCell?.text).replace(/[:：]\s*$/, '');
            const label = (
                /^1\s*rm$/i.test(inlineLabel)
                    ? normalizeWorkbookText(sameColumnHeader?.text)
                    : inlineLabel
            )
                .replace(/[:：]\s*$/, '')
                || cell.address;
            inputs.push({
                id,
                sheetName: sheet.name,
                address: cell.address,
                label,
                exerciseName: this.inputExerciseName(label),
                originalValue: numericValue,
                value: numericValue
            });
        })));

        const inputLabels = new Set(inputs.map(input => input.label.toLowerCase()));
        const instructions = Array.from(new Set(sheets.flatMap(sheet => {
            const firstProgramRow = sheet.rows.findIndex(row =>
                row.some(cell => this.sectionLabel(cell)?.type === 'week')
            );
            const end = firstProgramRow >= 0 ? firstProgramRow : Math.min(sheet.rows.length, 30);
            return sheet.rows.slice(0, end)
                .flat()
                .map(value => normalizeWorkbookText(value))
                .filter(value =>
                    value
                    && !inputLabels.has(value.replace(/[:：]\s*$/, '').toLowerCase())
                    && (
                        value.length >= 30
                        || /^\*/.test(value)
                        || /^notes?\b/i.test(value)
                        || /\bnotation\b/i.test(value)
                    )
                );
        }))).slice(0, 12);

        return {
            instructions,
            inputs,
            unknownFormulaCount: 0
        };
    }

    private calculationFromCell(
        cell: NormalizedCell,
        sheetName: string,
        output: CalculationOutput
    ): WorkbookExerciseCalculation | undefined {
        if (!cell?.formula) {
            return undefined;
        }

        const formula = cell.formula.replace(/^=/, '').trim();
        const direct = this.directFormulaSegment(formula, sheetName);
        if (direct) {
            return {
                address: cell.address,
                formula,
                output,
                segments: [direct]
            };
        }

        const concatenate = formula.match(/^CONCATENATE\((.*)\)$/i);
        if (concatenate) {
            const candidateSegments = this.splitFormulaArguments(concatenate[1])
                .map(argument => this.formulaSegment(argument, sheetName));
            if (
                candidateSegments.length
                && candidateSegments.every(Boolean)
                && candidateSegments.some(segment => segment?.inputId)
            ) {
                return {
                    address: cell.address,
                    formula,
                    output: 'prescription',
                    segments: candidateSegments as WorkbookFormulaSegment[]
                };
            }
        }

        const referencesInput = this.formulaReferenceIds(formula, sheetName)
            .some(id => this.inputByReference.has(id));
        if (referencesInput) {
            this.unknownFormulaAddresses.add(`${sheetName}!${cell.address}`);
        }
        return undefined;
    }

    private directFormulaSegment(formula: string, sheetName: string): WorkbookFormulaSegment | undefined {
        const expression = formula.replace(/[()]/g, '').replace(/\s+/g, '');
        const referencePattern = `(?:(?:'((?:[^']|'')+)'|([A-Za-z0-9_]+))!)?\\$?([A-Z]{1,3})\\$?(\\d+)`;
        const referenceFirst = expression.match(
            new RegExp(`^(${referencePattern})\\*(-?\\d+(?:\\.\\d+)?)$`, 'i')
        );
        const multiplierFirst = expression.match(
            new RegExp(`^(-?\\d+(?:\\.\\d+)?)\\*(${referencePattern})$`, 'i')
        );
        const reference = referenceFirst?.[1] || multiplierFirst?.[2];
        const multiplier = Number(
            referenceFirst?.[referenceFirst.length - 1]
            || multiplierFirst?.[1]
        );
        const inputId = reference ? this.formulaReferenceId(reference, sheetName) : '';

        return inputId && this.inputByReference.has(inputId) && Number.isFinite(multiplier)
            ? { inputId, multiplier }
            : undefined;
    }

    private formulaSegment(argument: string, sheetName: string): WorkbookFormulaSegment | undefined {
        const value = argument.trim();
        if (/^"(?:[^"]|"")*"$/.test(value)) {
            return { literal: value.slice(1, -1).replace(/""/g, '"') };
        }

        const round = value.match(/^ROUND\((.*),\s*(\d+)\)$/i);
        if (!round) {
            return undefined;
        }
        const calculated = this.directFormulaSegment(round[1], sheetName);
        return calculated ? { ...calculated, decimals: Number(round[2]) } : undefined;
    }

    private splitFormulaArguments(value: string): string[] {
        const parts: string[] = [];
        let start = 0;
        let depth = 0;
        let quoted = false;

        for (let index = 0; index < value.length; index++) {
            const character = value[index];
            if (character === '"') {
                if (quoted && value[index + 1] === '"') {
                    index++;
                    continue;
                }
                quoted = !quoted;
            } else if (!quoted && character === '(') {
                depth++;
            } else if (!quoted && character === ')') {
                depth--;
            } else if (!quoted && character === ',' && depth === 0) {
                parts.push(value.slice(start, index));
                start = index + 1;
            }
        }
        parts.push(value.slice(start));
        return parts;
    }

    private evaluateCalculation(
        calculation: WorkbookExerciseCalculation,
        inputValues: Map<string, number>
    ): string | undefined {
        let result = '';

        for (const segment of calculation.segments) {
            if (segment.literal !== undefined) {
                result += segment.literal;
                continue;
            }
            const input = inputValues.get(segment.inputId);
            if (!Number.isFinite(input) || !Number.isFinite(segment.multiplier)) {
                return undefined;
            }
            const rawValue = input * segment.multiplier;
            const calculated = segment.decimals === undefined
                ? Math.round(rawValue * 100) / 100
                : Number(rawValue.toFixed(segment.decimals));
            result += String(calculated);
        }
        return normalizeWorkbookText(result);
    }

    private formulaReferenceIds(formula: string, currentSheetName: string): string[] {
        const expression = this.withoutFormulaStringLiterals(formula);
        const references = expression.matchAll(
            /(?:(?:'((?:[^']|'')+)'|([A-Za-z0-9_]+))!)?\$?([A-Z]{1,3})\$?(\d+)/gi
        );
        return Array.from(references).map(match => {
            const referencedSheet = (match[1] || match[2] || currentSheetName).replace(/''/g, "'");
            const sheetName = this.sheetNames.get(referencedSheet.toLowerCase()) || referencedSheet;
            return this.inputId(sheetName, `${match[3]}${match[4]}`);
        });
    }

    private formulaReferenceId(reference: string, currentSheetName: string): string {
        const match = reference.match(
            /^(?:(?:'((?:[^']|'')+)'|([A-Za-z0-9_]+))!)?\$?([A-Z]{1,3})\$?(\d+)$/i
        );
        if (!match) {
            return '';
        }
        const referencedSheet = (match[1] || match[2] || currentSheetName).replace(/''/g, "'");
        const sheetName = this.sheetNames.get(referencedSheet.toLowerCase()) || referencedSheet;
        return this.inputId(sheetName, `${match[3]}${match[4]}`);
    }

    private withoutFormulaStringLiterals(formula: string): string {
        let result = '';
        let quoted = false;

        for (let index = 0; index < formula.length; index++) {
            const character = formula[index];
            if (character === '"') {
                if (quoted && formula[index + 1] === '"') {
                    index++;
                    continue;
                }
                quoted = !quoted;
                continue;
            }
            if (!quoted) {
                result += character;
            }
        }
        return result;
    }

    private inputExerciseName(label: string): string {
        return normalizeWorkbookText(label)
            .replace(/^best\s+/i, '')
            .replace(/\b1\s*rm\b/ig, '')
            .replace(/[:：]\s*$/, '')
            .replace(/\bc&j\b/ig, 'Clean & Jerk')
            .trim();
    }

    private inputId(sheetName: string, address: string): string {
        return `${sheetName}!${address.replace(/\$/g, '').toUpperCase()}`;
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

    private createId(): string {
        return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }

    private cleanFileName(fileName: string): string {
        return fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
    }
}
