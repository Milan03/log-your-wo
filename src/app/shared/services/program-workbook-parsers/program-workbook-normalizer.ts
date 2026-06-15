import * as XLSX from 'xlsx';

import {
    NormalizedWorkbookCell,
    NormalizedWorkbookSheet
} from './program-workbook-parser.types';

export interface WorkbookNormalizationLimits {
    maximumRowsPerSheet: number;
    maximumColumnsPerSheet: number;
    maximumCellsPerSheet: number;
    maximumMergedCellsPerSheet: number;
}

export class WorkbookComplexityError extends Error { }

export function normalizeWorkbookSheet(
    name: string,
    worksheet: XLSX.WorkSheet,
    limits: WorkbookNormalizationLimits
): NormalizedWorkbookSheet {
    if (!worksheet || !worksheet['!ref']) {
        return { name, rows: [], cells: [] };
    }

    const range = XLSX.utils.decode_range(worksheet['!ref']);
    const rowCount = range.e.r - range.s.r + 1;
    const columnCount = range.e.c - range.s.c + 1;
    const cellCount = rowCount * columnCount;
    if (
        rowCount > limits.maximumRowsPerSheet
        || columnCount > limits.maximumColumnsPerSheet
        || cellCount > limits.maximumCellsPerSheet
    ) {
        throw new WorkbookComplexityError(
            `The "${name}" sheet is too large or has an invalid used range.`
        );
    }

    const mergedCells = new Map<string, XLSX.CellObject>();
    let mergedCellCount = 0;
    (worksheet['!merges'] || []).forEach(merge => {
        mergedCellCount += (merge.e.r - merge.s.r + 1) * (merge.e.c - merge.s.c + 1);
        if (mergedCellCount > limits.maximumMergedCellsPerSheet) {
            throw new WorkbookComplexityError(
                `The "${name}" sheet contains too many merged cells to import safely.`
            );
        }
        const value = worksheet[XLSX.utils.encode_cell(merge.s)];
        for (let row = merge.s.r; row <= merge.e.r; row++) {
            for (let column = merge.s.c; column <= merge.e.c; column++) {
                mergedCells.set(`${row}:${column}`, value);
            }
        }
    });

    const rows: string[][] = [];
    const cells: NormalizedWorkbookCell[][] = [];
    for (let row = range.s.r; row <= range.e.r; row++) {
        const normalizedCells: NormalizedWorkbookCell[] = [];
        for (let column = range.s.c; column <= range.e.c; column++) {
            const address = XLSX.utils.encode_cell({ r: row, c: column });
            const cell = mergedCells.get(`${row}:${column}`) || worksheet[address];
            normalizedCells.push({
                address,
                formula: cell?.f ? normalizeText(cell.f) : undefined,
                value: cell?.v,
                text: cellText(cell)
            });
        }
        if (normalizedCells.some(cell => cell.text)) {
            while (normalizedCells.length && !normalizedCells[normalizedCells.length - 1].text) {
                normalizedCells.pop();
            }
            cells.push(normalizedCells);
            rows.push(normalizedCells.map(cell => cell.text));
        }
    }

    return { name: normalizeText(name), rows, cells };
}

function cellText(cell: XLSX.CellObject | undefined): string {
    if (!cell) {
        return '';
    }
    if (cell.w !== undefined) {
        return normalizeText(cell.w);
    }
    return normalizeText(cell.v);
}

function normalizeText(value: unknown): string {
    if (value === undefined || value === null) {
        return '';
    }
    return String(value).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}
