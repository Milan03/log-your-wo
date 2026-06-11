import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';

import {
    ImportedProgram,
    ImportedProgramDay,
    ImportedProgramExercise,
    ImportedProgramWeek,
    ProgramImportPreview
} from '../models/imported-program.model';

interface NormalizedSheet {
    name: string;
    rows: string[][];
}

interface ParserResult {
    strategy: string;
    confidence: number;
    weeks: ImportedProgramWeek[];
}

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

@Injectable({
    providedIn: 'root'
})
export class ProgramWorkbookParserService {
    private readonly lowConfidenceThreshold = 0.55;

    public parse(data: ArrayBuffer, fileName: string): ProgramImportPreview {
        let workbook: XLSX.WorkBook;

        try {
            workbook = XLSX.read(data, { type: 'array', cellDates: false });
        } catch {
            return this.emptyPreview('The workbook could not be read.');
        }

        const sheets = workbook.SheetNames
            .map(name => this.normalizeSheet(name, workbook.Sheets[name]))
            .filter(sheet => sheet.rows.length > 0);
        if (!sheets.length) {
            return this.emptyPreview('The workbook does not contain any non-empty sheets.');
        }

        const results = [
            this.parseLegacy(sheets),
            this.parseVerticalSections(sheets),
            this.parseHorizontalDays(sheets),
            this.parseGenericTables(sheets)
        ].filter(result => this.exerciseCount(result.weeks) > 0)
            .sort((first, second) =>
                second.confidence - first.confidence
                || this.exerciseCount(second.weeks) - this.exerciseCount(first.weeks)
                || first.strategy.localeCompare(second.strategy)
            );
        const best = results[0];

        if (!best) {
            return this.emptyPreview('No workout rows were detected. Check that the sheet includes exercise names and prescriptions.');
        }

        const confidence = Math.max(0, Math.min(1, best.confidence));
        const program: ImportedProgram = {
            id: this.createId(),
            name: this.cleanFileName(fileName),
            importedAt: new Date().toISOString(),
            weeks: this.finalizeWeeks(best.weeks)
        };
        const lowConfidence = confidence < this.lowConfidenceThreshold;

        return {
            program,
            confidence,
            strategy: best.strategy,
            lowConfidence,
            warnings: lowConfidence
                ? ['This workbook layout was only partially recognized. Review and clean up the detected rows before saving.']
                : []
        };
    }

    private normalizeSheet(name: string, worksheet: XLSX.WorkSheet): NormalizedSheet {
        if (!worksheet || !worksheet['!ref']) {
            return { name, rows: [] };
        }

        const range = XLSX.utils.decode_range(worksheet['!ref']);
        const mergedValues = new Map<string, string>();
        (worksheet['!merges'] || []).forEach(merge => {
            const value = this.cellText(worksheet[XLSX.utils.encode_cell(merge.s)]);
            for (let row = merge.s.r; row <= merge.e.r; row++) {
                for (let column = merge.s.c; column <= merge.e.c; column++) {
                    mergedValues.set(`${row}:${column}`, value);
                }
            }
        });

        const rows: string[][] = [];
        for (let row = range.s.r; row <= range.e.r; row++) {
            const values: string[] = [];
            for (let column = range.s.c; column <= range.e.c; column++) {
                const address = XLSX.utils.encode_cell({ r: row, c: column });
                values.push(this.normalizeText(
                    mergedValues.get(`${row}:${column}`) || this.cellText(worksheet[address])
                ));
            }
            if (values.some(Boolean)) {
                while (values.length && !values[values.length - 1]) {
                    values.pop();
                }
                rows.push(values);
            }
        }

        return { name: this.normalizeText(name), rows };
    }

    private parseLegacy(sheets: NormalizedSheet[]): ParserResult {
        const weeks: ImportedProgramWeek[] = [];

        sheets.forEach(sheet => {
            const weekStarts = sheet.rows
                .map((row, index) => ({ row, index }))
                .filter(entry => entry.row.some(cell => /^week\s+\d+/i.test(cell)));

            weekStarts.forEach((entry, weekIndex) => {
                const weekLabel = entry.row.find(cell => /^week\s+\d+/i.test(cell));
                const weekNumber = this.numberFromLabel(weekLabel, weekIndex + 1);
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
                        if (this.isWeekday(label)) {
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
                                : this.cleanExerciseName(rawName);
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
                                true
                            ));
                        }

                        return this.createDay(weekNumber, dayIndex, `Day ${String(dayIndex + 1).padStart(2, '0')}`, exercises);
                    })
                    .filter(day => day.exercises.length > 0);

                if (days.length) {
                    weeks.push(this.createWeek(weekNumber, `Week ${weekNumber}`, days));
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
                    currentWeek = this.createWeek(section.number || weeks.length + 1, section.label, []);
                    weeks.push(currentWeek);
                    currentDay = undefined;
                    sectionCount++;
                    return;
                }
                if (section?.type === 'day') {
                    if (!currentWeek) {
                        currentWeek = this.createWeek(weeks.length + 1, this.sheetWeekName(sheet.name, weeks.length + 1), []);
                        weeks.push(currentWeek);
                    }
                    currentDay = this.createDay(
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
                const exerciseName = this.cleanExerciseName(row[firstColumn] || '');
                const details = row.slice(firstColumn + 1).filter(Boolean).join(' | ');
                if (!this.isExerciseRow(exerciseName, details)) {
                    return;
                }
                currentDay.exercises.push(this.createExercise(
                    exerciseName,
                    details,
                    {},
                    `${currentDay.id}-exercise-${rowIndex}`
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

            let weekNumber = this.numberFromLabel(sheet.name, weeks.length + 1);
            sheet.rows.forEach((row, rowIndex) => {
                const weekCell = row.find(cell => this.sectionLabel(cell)?.type === 'week');
                if (weekCell) {
                    weekNumber = this.numberFromLabel(weekCell, weekNumber);
                }

                const dayColumns = row
                    .map((cell, column) => ({ cell, column, section: this.sectionLabel(cell) }))
                    .filter(entry => entry.section?.type === 'day');
                if (dayColumns.length < 2) {
                    return;
                }

                detectedDayColumns += dayColumns.length;
                const days = dayColumns.map((entry, dayIndex) => {
                    const endColumn = dayColumns[dayIndex + 1]?.column ?? this.maximumColumn(sheet.rows);
                    const exercises: ImportedProgramExercise[] = [];
                    let currentName = '';

                    for (let exerciseRow = rowIndex + 1; exerciseRow < sheet.rows.length; exerciseRow++) {
                        const candidateRow = sheet.rows[exerciseRow];
                        if (candidateRow.some(cell => this.sectionLabel(cell)?.type === 'week')) {
                            break;
                        }
                        const name = this.cleanExerciseName(candidateRow[entry.column] || '');
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
                            `week-${weekNumber}-day-${dayIndex + 1}-exercise-${exerciseRow}`
                        ));
                    }

                    return this.createDay(weekNumber, dayIndex, entry.section.label, exercises);
                }).filter(day => day.exercises.length > 0);

                if (days.length) {
                    weeks.push(this.createWeek(weekNumber, `Week ${weekNumber}`, days));
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

        const sheetWidth = this.maximumColumn(sheet.rows);
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

                    const setValues = row
                        .slice(entry.column + 1, endColumn)
                        .filter(value => /^\d+(?:\.\d+)?%?\+?$/.test(value));
                    exercises.push(...this.createHorizontalSetExercises(
                        rawName,
                        setValues,
                        `week-${weekNumber}-day-${dayIndex + 1}-exercise-${rowIndex}`
                    ));
                }

                return this.createDay(weekNumber, dayIndex, daySection.section.label, exercises);
            }).filter(day => day.exercises.length > 0);

            return this.createWeek(weekNumber, entry.section.label, days);
        }).filter(week => week.days.length > 0);
    }

    private createHorizontalSetExercises(
        rawName: string,
        setValues: string[],
        idPrefix: string
    ): ImportedProgramExercise[] {
        const schemes = Array.from(rawName.matchAll(/(\d+)\s*[x×]\s*(\d+(?:-\d+)?)/gi))
            .map(match => ({ sets: match[1], reps: match[2] }));
        const percentageRuns = setValues.reduce((runs, value) => {
            const percentage = `${value.replace(/%?\+?$/, '')}%${value.endsWith('+') ? '+' : ''}`;
            const current = runs[runs.length - 1];
            if (current?.percentage === percentage) {
                current.count++;
            } else {
                runs.push({ percentage, count: 1 });
            }
            return runs;
        }, [] as Array<{ percentage: string, count: number }>);
        const exerciseName = this.cleanExerciseName(rawName);

        if (!schemes.length) {
            const percentages = percentageRuns.map(run => run.percentage).join(', ');
            const fields: Partial<ImportedProgramExercise> = {
                sets: setValues.length ? String(setValues.length) : undefined,
                weight: percentages || undefined,
                percentage1Rm: percentages || undefined
            };
            return this.isExerciseRow(exerciseName, percentages)
                ? [this.createExercise(exerciseName, this.buildSetPrescription(fields), fields, idPrefix)]
                : [];
        }

        return schemes.map((scheme, index) => {
            const run = percentageRuns[index]
                || (percentageRuns.length === 1 ? percentageRuns[0] : undefined);
            const percentage = run?.percentage;
            const fields: Partial<ImportedProgramExercise> = {
                sets: scheme.sets,
                reps: scheme.reps,
                weight: percentage,
                percentage1Rm: percentage
            };
            return this.createExercise(
                exerciseName,
                this.buildSetPrescription(fields),
                fields,
                `${idPrefix}-${index + 1}`
            );
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
                let fallbackWeek = this.numberFromLabel(sheet.name, weeksByKey.size + 1);

                for (let rowIndex = headerIndex + 1; rowIndex < sheet.rows.length; rowIndex++) {
                    const values = sheet.rows[rowIndex];
                    if (this.headerMap(values)) {
                        break;
                    }
                    const exerciseName = this.cleanExerciseName(values[map.exercise] || '');
                    if (!this.isExerciseRow(exerciseName, '')) {
                        continue;
                    }

                    const weekLabel = map.week !== undefined ? values[map.week] : '';
                    const weekNumber = this.numberFromLabel(weekLabel, fallbackWeek);
                    fallbackWeek = weekNumber;
                    const weekName = weekLabel || `Week ${weekNumber}`;
                    const weekKey = `${sheet.name}:${weekNumber}:${weekName.toLowerCase()}`;
                    let week = weeksByKey.get(weekKey);
                    if (!week) {
                        week = this.createWeek(weekNumber, weekName, []);
                        weeksByKey.set(weekKey, week);
                    }

                    const dayName = map.day !== undefined && values[map.day]
                        ? values[map.day]
                        : 'Day 01';
                    let day = week.days.find(candidate => candidate.name.toLowerCase() === dayName.toLowerCase());
                    if (!day) {
                        day = this.createDay(weekNumber, week.days.length, dayName, []);
                        week.days.push(day);
                    }

                    const fields = this.fieldsFromColumns(values, map);
                    const prescription = this.buildPrescription(fields);
                    day.exercises.push(this.createExercise(
                        exerciseName,
                        prescription,
                        fields,
                        `${day.id}-exercise-${rowIndex}`
                    ));
                }
            });
        });

        if (!weeksByKey.size) {
            const fallbackExercises: ImportedProgramExercise[] = [];
            sheets.forEach(sheet => sheet.rows.forEach((row, rowIndex) => {
                const firstColumn = row.findIndex(Boolean);
                const exerciseName = this.cleanExerciseName(row[firstColumn] || '');
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
                weeksByKey.set('fallback', this.createWeek(1, 'Week 1', [
                    this.createDay(1, 0, 'Day 01', fallbackExercises)
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

    private createExercise(
        exerciseName: string,
        prescription: string,
        fields: Partial<ImportedProgramExercise>,
        id: string,
        legacyLayout = false
    ): ImportedProgramExercise {
        const detected = this.parsePrescription(prescription, legacyLayout);
        return {
            id,
            exerciseName: this.cleanExerciseName(exerciseName),
            prescription: this.normalizeText(prescription) || this.buildPrescription(fields),
            ...detected,
            ...this.withoutEmptyFields(fields)
        };
    }

    private parsePrescription(value: string, legacyLayout: boolean): Partial<ImportedProgramExercise> {
        const normalized = this.normalizeText(value);
        const result: Partial<ImportedProgramExercise> = {};
        const legacy = normalized.match(/^(.+?)\s*[x×]\s*([^x×|]+?)(?:\s*[x×]\s*([^|]+))?(?:\s*\||$)/i);
        const setsReps = normalized.match(/\b(\d+)\s*(?:sets?\s*(?:of|x)|[x×])\s*(\d+(?:-\d+)?)/i);
        const weight = normalized.match(/\b(?:weight|load)\s*[:=-]?\s*([^|,;]+)/i)
            || normalized.match(/\b(\d+(?:\.\d+)?\s*(?:kg|kgs|lb|lbs))\b/i);
        const rest = normalized.match(/\brest\s*[:=-]?\s*([^|,;]+)/i);
        const tempo = normalized.match(/\btempo\s*[:=-]?\s*([0-9x-]{3,7})\b/i)
            || normalized.match(/\b([0-9x]-[0-9x]-[0-9x](?:-[0-9x])?)\b/i);
        const rpe = normalized.match(/\b(?:rpe|rir)\s*[:@=-]?\s*(\d+(?:\.\d+)?)/i);
        const percentage = normalized.match(/\b(\d+(?:\.\d+)?\s*%\s*(?:1\s*rm)?)\b/i);
        const notes = normalized.match(/\b(?:notes?|comments?|cues?)\s*[:=-]\s*(.+)$/i);

        if (legacy && (legacyLayout || legacy[3])) {
            result.weight = legacy[1].trim().toLowerCase() === 'x' ? undefined : legacy[1].trim();
            result.reps = legacy[2]?.trim();
            result.sets = legacy[3]?.trim();
        } else if (setsReps) {
            result.sets = setsReps[1];
            result.reps = setsReps[2];
        }
        if (weight) result.weight = weight[1].trim();
        if (rest) result.rest = rest[1].trim();
        if (tempo) result.tempo = tempo[1].trim();
        if (rpe) result.rpe = rpe[1].trim();
        if (percentage) result.percentage1Rm = percentage[1].replace(/\s+/g, '');
        if (notes) result.notes = notes[1].trim();
        return this.withoutEmptyFields(result);
    }

    private buildPrescription(fields: Partial<ImportedProgramExercise>): string {
        const parts: string[] = [];
        if (fields.weight && fields.reps && fields.sets) {
            parts.push(`${fields.weight} x ${fields.reps} x ${fields.sets}`);
        } else if (fields.sets && fields.reps) {
            parts.push(`${fields.sets} x ${fields.reps}`);
        } else {
            if (fields.weight) parts.push(`Weight: ${fields.weight}`);
            if (fields.sets) parts.push(`Sets: ${fields.sets}`);
            if (fields.reps) parts.push(`Reps: ${fields.reps}`);
        }
        if (fields.percentage1Rm) parts.push(fields.percentage1Rm);
        if (fields.rest) parts.push(`Rest: ${fields.rest}`);
        if (fields.tempo) parts.push(`Tempo: ${fields.tempo}`);
        if (fields.rpe) parts.push(`RPE: ${fields.rpe}`);
        if (fields.notes) parts.push(`Notes: ${fields.notes}`);
        return parts.join(' | ');
    }

    private finalizeWeeks(weeks: ImportedProgramWeek[]): ImportedProgramWeek[] {
        const result: ImportedProgramWeek[] = [];
        const seen = new Set<string>();

        weeks.forEach((week, weekIndex) => {
            const signature = week.days
                .map(day => day.exercises.map(exercise => `${exercise.exerciseName}:${exercise.prescription}`).join(';'))
                .join('|');
            if (!signature || seen.has(signature)) {
                return;
            }
            seen.add(signature);
            const weekNumber = Number.isFinite(week.weekNumber) ? week.weekNumber : weekIndex + 1;
            result.push({
                ...week,
                id: `week-${weekNumber}`,
                weekNumber,
                name: week.name || `Week ${weekNumber}`,
                days: week.days.map((day, dayIndex) => ({
                    ...day,
                    id: `week-${weekNumber}-day-${dayIndex + 1}`,
                    name: day.name || `Day ${String(dayIndex + 1).padStart(2, '0')}`,
                    exercises: this.combineCompoundExerciseNames(day.exercises).map((exercise, exerciseIndex) => ({
                        ...exercise,
                        id: `week-${weekNumber}-day-${dayIndex + 1}-exercise-${exerciseIndex + 1}`
                    }))
                }))
            });
        });

        return result.sort((first, second) => first.weekNumber - second.weekNumber);
    }

    private combineCompoundExerciseNames(
        exercises: ImportedProgramExercise[]
    ): ImportedProgramExercise[] {
        const combined = exercises.map(exercise => ({ ...exercise }));

        for (let startIndex = 0; startIndex < combined.length; startIndex++) {
            if (!/\+\s*$/.test(combined[startIndex].exerciseName || '')) {
                continue;
            }

            const names: string[] = [];
            let endIndex = startIndex;
            let foundTerminator = false;

            while (endIndex < combined.length) {
                const name = combined[endIndex].exerciseName || '';
                const normalizedName = name.replace(/\s*\+\s*$/, '').trim();
                if (normalizedName && names[names.length - 1] !== normalizedName) {
                    names.push(normalizedName);
                }
                if (!/\+\s*$/.test(name)) {
                    foundTerminator = true;
                    break;
                }
                endIndex++;
            }

            if (!foundTerminator || names.length < 2) {
                continue;
            }

            const compoundName = names.join(' + ');
            const terminalName = names[names.length - 1];
            while (
                endIndex + 1 < combined.length
                && combined[endIndex + 1].exerciseName.trim() === terminalName
            ) {
                endIndex++;
            }
            for (let exerciseIndex = startIndex; exerciseIndex <= endIndex; exerciseIndex++) {
                combined[exerciseIndex].exerciseName = compoundName;
            }
            startIndex = endIndex;
        }

        return combined;
    }

    private sectionLabel(value: string): { type: 'week' | 'day', label: string, number?: number } | undefined {
        const normalized = this.normalizeText(value);
        const week = normalized.match(/^(week|phase|block)\s*[:#-]?\s*(\d+|[a-z])\b/i);
        if (week) {
            return {
                type: 'week',
                label: normalized,
                number: /^\d+$/.test(week[2]) ? Number(week[2]) : undefined
            };
        }
        if (this.isWeekday(normalized) || /^(day|session|workout)\s*[:#-]?\s*[\w-]+/i.test(normalized)) {
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
        const normalized = this.normalizeText(value);
        return /^[()]/.test(normalized)
            || /^(without|into)\b/i.test(normalized);
    }

    private createWeek(weekNumber: number, name: string, days: ImportedProgramDay[]): ImportedProgramWeek {
        return {
            id: `week-${weekNumber}`,
            name: this.normalizeText(name) || `Week ${weekNumber}`,
            weekNumber,
            days
        };
    }

    private createDay(
        weekNumber: number,
        dayIndex: number,
        name: string,
        exercises: ImportedProgramExercise[]
    ): ImportedProgramDay {
        return {
            id: `week-${weekNumber}-day-${dayIndex + 1}`,
            name: this.normalizeText(name) || `Day ${String(dayIndex + 1).padStart(2, '0')}`,
            exercises
        };
    }

    private emptyPreview(message: string): ProgramImportPreview {
        return {
            confidence: 0,
            strategy: 'none',
            warnings: [message],
            lowConfidence: true
        };
    }

    private exerciseCount(weeks: ImportedProgramWeek[]): number {
        return weeks.reduce((total, week) =>
            total + week.days.reduce((dayTotal, day) => dayTotal + day.exercises.length, 0), 0);
    }

    private maximumColumn(rows: string[][]): number {
        return rows.reduce((maximum, row) => Math.max(maximum, row.length), 0);
    }

    private numberFromLabel(value: string, fallback: number): number {
        const match = this.normalizeText(value).match(/\d+/);
        return match ? Number(match[0]) : fallback;
    }

    private sheetWeekName(sheetName: string, weekNumber: number): string {
        return /^(week|phase|block)\b/i.test(sheetName) ? sheetName : `Week ${weekNumber}`;
    }

    private isWeekday(value: string): boolean {
        return /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s*\([^)]*\))?$/i.test(value);
    }

    private cleanExerciseName(value: string): string {
        return this.normalizeText(value)
            .replace(/\([^)]*\)/g, '')
            .replace(/\[[^\]]*\]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    private normalizeText(value: unknown): string {
        if (value === undefined || value === null) {
            return '';
        }
        return String(value).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
    }

    private cellText(cell: XLSX.CellObject): string {
        if (!cell) {
            return '';
        }
        if (cell.w !== undefined) {
            return this.normalizeText(cell.w);
        }
        return this.normalizeText(cell.v);
    }

    private withoutEmptyFields<T extends object>(value: T): T {
        return Object.keys(value).reduce((result, key) => {
            if (value[key] !== undefined && value[key] !== '') {
                result[key] = value[key];
            }
            return result;
        }, {} as T);
    }

    private createId(): string {
        return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }

    private cleanFileName(fileName: string): string {
        return fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
    }
}
