import {
    ImportedProgramDay,
    ImportedProgramExercise,
    ImportedProgramWeek,
    WorkbookExerciseCalculation
} from '../../models/imported-program.model';

export interface WorkbookExerciseMappingInput {
    exerciseName: string;
    prescription: string;
    fields: Partial<ImportedProgramExercise>;
    id: string;
    legacyLayout?: boolean;
    workbookCalculations?: WorkbookExerciseCalculation[];
}

export function createWorkbookProgramExercise(
    input: WorkbookExerciseMappingInput
): ImportedProgramExercise {
    const detected = parseWorkbookPrescription(input.prescription, Boolean(input.legacyLayout));
    return {
        id: input.id,
        exerciseName: cleanWorkbookExerciseName(input.exerciseName),
        prescription: normalizeWorkbookText(input.prescription) || buildWorkbookPrescription(input.fields),
        ...detected,
        ...withoutEmptyWorkbookFields(input.fields),
        workbookCalculations: input.workbookCalculations
    };
}

export function parseWorkbookPrescription(
    value: string,
    legacyLayout: boolean
): Partial<ImportedProgramExercise> {
    const normalized = normalizeWorkbookText(value);
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
    return withoutEmptyWorkbookFields(result);
}

export function buildWorkbookPrescription(fields: Partial<ImportedProgramExercise>): string {
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

export function finalizeWorkbookProgramWeeks(weeks: ImportedProgramWeek[]): ImportedProgramWeek[] {
    const result: ImportedProgramWeek[] = [];
    const seen = new Set<string>();

    weeks.forEach((week, weekIndex) => {
        const signature = week.days
            .map(day => day.exercises.map(exercise => `${exercise.exerciseName}:${exercise.prescription}`).join(';'))
            .join('|');
        const signatureKey = `${week.weekNumber}:${signature}`;
        if (!signature || seen.has(signatureKey)) {
            return;
        }
        seen.add(signatureKey);
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
                exercises: combineCompoundExerciseNames(day.exercises).map((exercise, exerciseIndex) => ({
                    ...exercise,
                    id: `week-${weekNumber}-day-${dayIndex + 1}-exercise-${exerciseIndex + 1}`
                }))
            }))
        });
    });

    return result.sort((first, second) => first.weekNumber - second.weekNumber);
}

export function createWorkbookProgramWeek(
    weekNumber: number,
    name: string,
    days: ImportedProgramDay[]
): ImportedProgramWeek {
    return {
        id: `week-${weekNumber}`,
        name: normalizeWorkbookText(name) || `Week ${weekNumber}`,
        weekNumber,
        days
    };
}

export function createWorkbookProgramDay(
    weekNumber: number,
    dayIndex: number,
    name: string,
    exercises: ImportedProgramExercise[]
): ImportedProgramDay {
    return {
        id: `week-${weekNumber}-day-${dayIndex + 1}`,
        name: normalizeWorkbookText(name) || `Day ${String(dayIndex + 1).padStart(2, '0')}`,
        exercises
    };
}

export function clearWorkbookCalculatedFields(exercise: ImportedProgramExercise): void {
    exercise.sets = undefined;
    exercise.reps = undefined;
    exercise.weight = undefined;
    exercise.rest = undefined;
    exercise.tempo = undefined;
    exercise.rpe = undefined;
    exercise.percentage1Rm = undefined;
    exercise.notes = undefined;
}

export function workbookExerciseCalculations(
    exercise: ImportedProgramExercise
): WorkbookExerciseCalculation[] {
    const calculations = [
        ...(exercise.workbookCalculations || []),
        ...(exercise.workbookCalculation ? [exercise.workbookCalculation] : [])
    ];
    const seen = new Set<string>();
    return calculations.filter(calculation => {
        const key = `${calculation.address}:${calculation.output}:${calculation.formula}`;
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
}

export function countWorkbookExercises(weeks: ImportedProgramWeek[]): number {
    return weeks.reduce((total, week) =>
        total + week.days.reduce((dayTotal, day) => dayTotal + day.exercises.length, 0), 0);
}

export function maximumWorkbookColumn(rows: string[][]): number {
    return rows.reduce((maximum, row) => Math.max(maximum, row.length), 0);
}

export function numberFromWorkbookLabel(value: string, fallback: number): number {
    const match = normalizeWorkbookText(value).match(/\d+/);
    return match ? Number(match[0]) : fallback;
}

export function workbookSheetWeekName(sheetName: string, weekNumber: number): string {
    return /^(week|phase|block)\b/i.test(sheetName) ? sheetName : `Week ${weekNumber}`;
}

export function isWorkbookWeekday(value: string): boolean {
    return /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s*\([^)]*\))?$/i.test(value);
}

export function cleanWorkbookExerciseName(value: string): string {
    return normalizeWorkbookText(value)
        .replace(/\([^)]*\)/g, '')
        .replace(/\[[^\]]*\]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

export function normalizeWorkbookText(value: unknown): string {
    if (value === undefined || value === null) {
        return '';
    }
    return String(value).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

export function withoutEmptyWorkbookFields<T extends object>(value: T): T {
    return Object.keys(value).reduce((result, key) => {
        if (value[key] !== undefined && value[key] !== '') {
            result[key] = value[key];
        }
        return result;
    }, {} as T);
}

function combineCompoundExerciseNames(
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
