import {
    ImportedProgramWeek,
    WorkbookExerciseCalculation
} from '../../models/imported-program.model';

export interface NormalizedWorkbookCell {
    address: string;
    formula?: string;
    value?: unknown;
    text: string;
}

export interface NormalizedWorkbookSheet {
    name: string;
    rows: string[][];
    cells: NormalizedWorkbookCell[][];
}

export interface WorkbookParserResult {
    strategy: string;
    confidence: number;
    weeks: ImportedProgramWeek[];
    formulasFullyHandled?: boolean;
}

export type WorkbookCalculationFactory = (
    cell: NormalizedWorkbookCell,
    sheetName: string
) => WorkbookExerciseCalculation | undefined;
