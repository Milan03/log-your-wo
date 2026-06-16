import { Injectable } from '@angular/core';

import { ImportedProgram, ProgramImportPreview } from '../models/imported-program.model';
import type { ProgramWorkbookParserService } from './program-workbook-parser.service';

/**
 * Orchestrates turning an uploaded Excel workbook into an `ImportedProgram`:
 * size validation, lazily loading the (heavy) workbook parser, producing a
 * preview, applying training-max inputs, and validating that a preview is
 * actually importable. Persistence stays with `ProgramImportService`.
 */
@Injectable({ providedIn: 'root' })
export class WorkbookImportService {
    private readonly maximumWorkbookBytes = 10 * 1024 * 1024;
    private workbookParserPromise: Promise<ProgramWorkbookParserService>;

    /** Parse a workbook into a preview (program + any required setup inputs). */
    public async previewWorkbook(file: File): Promise<ProgramImportPreview> {
        if (file.size > this.maximumWorkbookBytes) {
            throw new Error('Workbook files must be 10 MB or smaller.');
        }

        const data = await file.arrayBuffer();
        const parser = await this.getWorkbookParser();
        return parser.parse(data, file.name);
    }

    /** Re-run the parse applying confirmed training-max inputs. */
    public async applyWorkbookInputs(
        preview: ProgramImportPreview,
        values: { [inputId: string]: number }
    ): Promise<ProgramImportPreview> {
        const parser = await this.getWorkbookParser();
        return parser.applyInputs(preview, values);
    }

    /**
     * Preview a workbook and validate it can be saved, returning the program.
     * Throws a user-facing message when nothing recognizable was found or when
     * training-max inputs still need to be confirmed.
     */
    public async resolveImportableProgram(file: File): Promise<ImportedProgram> {
        const preview = await this.previewWorkbook(file);

        if (!preview.program || !preview.program.weeks.length) {
            if (
                preview.warningDetails?.some(warning => warning.code === 'low-confidence')
                && preview.warnings[0]
            ) {
                throw new Error(preview.warnings[0]);
            }
            throw new Error('No recognizable workout weeks were found in this workbook.');
        }
        if (preview.setup?.inputs.length) {
            throw new Error('This workbook requires training maxes to be confirmed before it can be saved.');
        }

        return preview.program;
    }

    private getWorkbookParser(): Promise<ProgramWorkbookParserService> {
        if (!this.workbookParserPromise) {
            this.workbookParserPromise = import('./program-workbook-parser.service')
                .then(module => new module.ProgramWorkbookParserService());
        }

        return this.workbookParserPromise;
    }
}
