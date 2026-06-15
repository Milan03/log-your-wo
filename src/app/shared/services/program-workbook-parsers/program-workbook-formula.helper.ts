import {
    ImportedProgramExercise,
    ProgramImportPreview,
    WorkbookExerciseCalculation,
    WorkbookFormulaSegment,
    WorkbookImportInput,
    WorkbookImportSetup
} from '../../models/imported-program.model';
import {
    buildWorkbookPrescription,
    clearWorkbookCalculatedFields,
    normalizeWorkbookText,
    parseWorkbookPrescription,
    workbookExerciseCalculations
} from './program-workbook-program.mapper';
import {
    NormalizedWorkbookCell,
    NormalizedWorkbookSheet
} from './program-workbook-parser.types';

export type WorkbookCalculationOutput = WorkbookExerciseCalculation['output'];

export interface WorkbookFormulaSource {
    cell: NormalizedWorkbookCell;
    output: WorkbookCalculationOutput;
}

export class ProgramWorkbookFormulaHelper {
    private inputByReference = new Map<string, WorkbookImportInput>();
    private unknownFormulaAddresses = new Set<string>();
    private sheetNames = new Map<string, string>();

    public prepareForSheets(sheets: NormalizedWorkbookSheet[]): WorkbookImportSetup {
        this.sheetNames = new Map(sheets.map(sheet => [sheet.name.toLowerCase(), sheet.name]));
        const setup = this.detectSetup(sheets);
        this.inputByReference = new Map(setup.inputs.map(input => [input.id, input]));
        this.unknownFormulaAddresses.clear();
        return setup;
    }

    public clearUnknownFormulaAddresses(): void {
        this.unknownFormulaAddresses.clear();
    }

    public unknownFormulaCount(): number {
        return this.unknownFormulaAddresses.size;
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

    public formulaSourcesFromColumns(
        sheet: NormalizedWorkbookSheet,
        rowIndex: number,
        columns: Array<{ column: number | undefined, output: WorkbookCalculationOutput }>
    ): WorkbookFormulaSource[] {
        return columns
            .filter(candidate =>
                candidate.column !== undefined
                && sheet.cells[rowIndex]?.[candidate.column]?.formula
            )
            .map(source => this.formulaSource(sheet.cells[rowIndex][source.column], source.output))
            .filter((source): source is WorkbookFormulaSource => Boolean(source));
    }

    public formulaSource(
        cell: NormalizedWorkbookCell,
        output: WorkbookCalculationOutput
    ): WorkbookFormulaSource | undefined {
        return cell?.formula ? { cell, output } : undefined;
    }

    public formulaSources(
        cell: NormalizedWorkbookCell,
        output: WorkbookCalculationOutput
    ): WorkbookFormulaSource[] {
        const source = this.formulaSource(cell, output);
        return source ? [source] : [];
    }

    public firstFormulaSources(
        cells: NormalizedWorkbookCell[],
        output: WorkbookCalculationOutput
    ): WorkbookFormulaSource[] {
        return this.formulaSources(cells?.find(cell => cell?.formula), output);
    }

    public calculationsFromSources(
        sources: WorkbookFormulaSource[],
        sheetName: string
    ): WorkbookExerciseCalculation[] | undefined {
        const calculations = sources
            .map(source => this.calculationFromCell(source.cell, sheetName, source.output))
            .filter((calculation): calculation is WorkbookExerciseCalculation => Boolean(calculation));
        return calculations.length ? calculations : undefined;
    }

    public calculationFromCell(
        cell: NormalizedWorkbookCell,
        sheetName: string,
        output: WorkbookCalculationOutput
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

    private detectSetup(sheets: NormalizedWorkbookSheet[]): WorkbookImportSetup {
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
                row.some(cell => this.isWorkbookWeekSectionLabel(cell))
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

    private isWorkbookWeekSectionLabel(value: string): boolean {
        return /^(week|phase|block)\s*[:#-]?\s*(\d+|[a-z])\b/i.test(normalizeWorkbookText(value));
    }
}
