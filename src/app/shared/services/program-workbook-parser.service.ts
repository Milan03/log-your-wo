import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';

import {
    ImportedProgram,
    ProgramImportPreview
} from '../models/imported-program.model';
import { parseGenericWorkbookStrategies } from './program-workbook-parsers/generic-workbook-strategy.parser';
import { parseHatchSquatWorkbook } from './program-workbook-parsers/hatch-squat-workbook.parser';
import { parsePendlayWorkbook } from './program-workbook-parsers/pendlay-workbook.parser';
import { ProgramWorkbookFormulaHelper } from './program-workbook-parsers/program-workbook-formula.helper';
import {
    NormalizedWorkbookSheet as NormalizedSheet
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
    countWorkbookExercises,
    finalizeWorkbookProgramWeeks
} from './program-workbook-parsers/program-workbook-program.mapper';

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
    private readonly formulaHelper = new ProgramWorkbookFormulaHelper();

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

        const setup = this.formulaHelper.prepareForSheets(sheets);
        const results = [
            parseHatchSquatWorkbook(sheets),
            parsePendlayWorkbook(
                sheets,
                (cell, sheetName) => this.formulaHelper.calculationFromCell(cell, sheetName, 'weight')
            ),
            ...parseGenericWorkbookStrategies(sheets, this.formulaHelper)
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
            this.formulaHelper.clearUnknownFormulaAddresses();
        }
        setup.unknownFormulaCount = this.formulaHelper.unknownFormulaCount();
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

    public applyInputs(
        preview: ProgramImportPreview,
        values: { [inputId: string]: number }
    ): ProgramImportPreview {
        return this.formulaHelper.applyInputs(preview, values);
    }

    private readWorkbook(data: ArrayBuffer): XLSX.WorkBook {
        return XLSX.read(data, {
            type: 'array',
            cellDates: false,
            sheetRows: this.normalizationLimits.maximumRowsPerSheet + 1
        });
    }

    private createId(): string {
        return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }

    private cleanFileName(fileName: string): string {
        return fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
    }
}
