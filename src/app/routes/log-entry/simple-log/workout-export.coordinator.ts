import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

import { EmailDialogComponent } from '../email-dialog/email-dialog.component';
import { SimpleLog } from '../../../shared/models/simple-log.model';
import { ProgramImportService } from '../../../shared/services/program-import.service';
import {
    WorkoutExportContext,
    WorkoutExportService
} from '../../../shared/services/workout-export.service';
import { WorkoutTimingStore } from './workout-timing.store';
import { ImportedWorkoutStore } from './imported-workout.store';
import { MeasureSettingsStore } from './measure-settings.store';

/**
 * Component-scoped coordinator for the simple log's PDF export and email-as-PDF
 * submit flows. Assembles a `WorkoutExportContext` from the shared simple-log
 * stores (timing, measures, imported workout) and dispatches to
 * `WorkoutExportService`. Provided alongside those stores in the component so it
 * resolves the same scoped instances. The host passes the current log and
 * language; the rest is read from the stores.
 */
@Injectable()
export class WorkoutExportCoordinator {
    private _export = inject(WorkoutExportService);
    private _dialog = inject(MatDialog);
    private _programImportService = inject(ProgramImportService);
    private _timing = inject(WorkoutTimingStore);
    private _measures = inject(MeasureSettingsStore);
    private _importedWorkout = inject(ImportedWorkoutStore);

    /** Export the log to PDF. */
    public savePdf(log: SimpleLog, language: string): void {
        this._export.savePdf(this.buildContext(log, language));
    }

    /** Open the email dialog and, when a recipient is returned, email the PDF. */
    public emailPdf(log: SimpleLog, language: string): void {
        const dialogRef = this._dialog.open(EmailDialogComponent, {
            panelClass: 'email-dialog-panel',
            maxWidth: 'calc(100vw - 24px)'
        });
        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this._export.emailPdf(result, this.buildContext(log, language));
            }
        });
    }

    private buildContext(log: SimpleLog, language: string): WorkoutExportContext {
        return {
            log,
            weightMeasure: this._measures.weightMeasure(),
            distanceMeasure: this._measures.distanceMeasure(),
            elapsedTimeLabel: this._programImportService.formatElapsedMs(this._timing.elapsedMs()),
            language,
            startedAt: this._timing.startedAt(),
            completedAt: this._timing.completedAt(),
            pausedAt: this._timing.pausedAt(),
            importedWorkout: this._importedWorkout.isActive()
                ? {
                    weekName: this._importedWorkout.week()?.name || '',
                    dayName: this._importedWorkout.day()?.name || ''
                }
                : undefined
        };
    }
}
