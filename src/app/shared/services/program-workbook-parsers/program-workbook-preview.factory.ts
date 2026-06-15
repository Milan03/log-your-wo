import {
    ProgramImportPreview,
    ProgramImportWarning,
    ProgramImportWarningCode
} from '../../models/imported-program.model';

export function createEmptyProgramPreview(
    message: string,
    warningCode: ProgramImportWarningCode
): ProgramImportPreview {
    return {
        confidence: 0,
        strategy: 'none',
        warnings: [message],
        warningDetails: [{ code: warningCode }],
        lowConfidence: true
    };
}

export function createLowConfidenceProgramPreview(confidence: number): ProgramImportPreview {
    return {
        confidence,
        strategy: 'none',
        warnings: [
            'This workbook layout could not be recognized reliably. '
            + 'Please email the workbook to milansobat03@gmail.com so support can be added.'
        ],
        warningDetails: [{ code: 'low-confidence' }],
        lowConfidence: true
    };
}

export function createUnknownFormulaWarnings(
    unknownFormulaCount: number
): { warnings: string[]; warningDetails: ProgramImportWarning[] } {
    if (!unknownFormulaCount) {
        return { warnings: [], warningDetails: [] };
    }

    return {
        warnings: [
            `${unknownFormulaCount} workbook formula`
            + `${unknownFormulaCount === 1 ? '' : 's'} could not be recalculated and will use Excel's saved values.`
        ],
        warningDetails: [{
            code: 'unknown-formulas',
            count: unknownFormulaCount
        }]
    };
}
