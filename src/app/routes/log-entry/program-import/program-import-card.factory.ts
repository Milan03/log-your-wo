import { inject, Injectable } from '@angular/core';

import {
    ImportedProgram,
    ImportedProgramDay,
    ImportedProgramExercise,
    ImportedProgramWeek
} from '../../../shared/models/imported-program.model';
import { ProgramImportService } from '../../../shared/services/program-import.service';
import { TranslatorService } from '../../../core/translator/translator.service';

export type ProgramImportStatus = 'complete' | 'in-progress' | 'not-started';

export interface ProgramImportCard {
    program: ImportedProgram;
    status: ProgramImportStatus;
    statusLabel: string;
    statusClass: string;
    progressLabel: string;
    progressPercent: number;
}

export interface ProgramWeekCard extends ImportedProgramWeek {
    complete: boolean;
}

export interface ProgramDayCard extends ImportedProgramDay {
    completionLabel: string;
    completionPercent: number;
    complete: boolean;
    elapsedLabel: string;
    exercisePreview: string[];
}

/**
 * Builds the view-model cards rendered by the program-import library/browse
 * view (program library, week tabs, day cards), pulling completion/progress
 * facts from `ProgramImportService` and localized labels from the translator.
 * Stateless: every method returns fresh arrays from the data passed in.
 */
@Injectable({ providedIn: 'root' })
export class ProgramImportCardFactory {
    private _programImportService = inject(ProgramImportService);
    private _translatorService = inject(TranslatorService, { optional: true });

    public programCards(programs: ImportedProgram[]): ProgramImportCard[] {
        const progressByProgram = this._programImportService.getProgramProgresses(programs);

        return programs.map(program => {
            const progress = progressByProgram.get(program.id) || {
                completed: 0,
                total: 0,
                started: 0
            };
            const status = this.getStatusFromProgress(progress);

            return {
                program,
                status,
                statusLabel: this.formatProgramStatus(status),
                statusClass: `program-import__library-status--${status}`,
                progressLabel: `${progress.completed}/${progress.total} ${this.t('global.Days', undefined, 'days')}`,
                progressPercent: progress.total ? (progress.completed / progress.total) * 100 : 0
            };
        });
    }

    public weekCards(program: ImportedProgram | undefined): ProgramWeekCard[] {
        return program ? program.weeks.map(week => ({
            ...week,
            complete: this._programImportService.isWeekComplete(week.id)
        })) : [];
    }

    public dayCards(week: ImportedProgramWeek | undefined): ProgramDayCard[] {
        return week ? week.days.map(day => this.createDayCard(week, day)) : [];
    }

    private createDayCard(week: ImportedProgramWeek, day: ImportedProgramDay): ProgramDayCard {
        const completion = this._programImportService.getDayCompletion(week.id, day.id);
        const elapsedMs = this._programImportService.getDayElapsedMs(week.id, day.id);

        return {
            ...day,
            completionLabel: `${completion.completed}/${completion.total}`,
            completionPercent: completion.total ? (completion.completed / completion.total) * 100 : 0,
            complete: completion.total > 0 && completion.completed === completion.total,
            elapsedLabel: elapsedMs ? this._programImportService.formatElapsedMs(elapsedMs) : '',
            exercisePreview: this.getExercisePreview(day.exercises)
        };
    }

    private getExercisePreview(exercises: ImportedProgramExercise[]): string[] {
        return exercises.reduce((exerciseNames, exercise) => {
            if (exercise.exerciseName && exerciseNames.indexOf(exercise.exerciseName) === -1) {
                exerciseNames.push(exercise.exerciseName);
            }

            return exerciseNames;
        }, [] as string[]);
    }

    private getStatusFromProgress(progress: { completed: number, total: number, started: number }): ProgramImportStatus {
        if (progress.total > 0 && progress.completed === progress.total) {
            return 'complete';
        }

        return progress.started > 0 ? 'in-progress' : 'not-started';
    }

    private formatProgramStatus(status: ProgramImportStatus): string {
        if (status === 'complete') {
            return this.t('global.Complete', undefined, 'Complete');
        }

        return status === 'in-progress'
            ? this.t('log-entry.InProgress', undefined, 'In progress')
            : this.t('log-entry.NotStarted', undefined, 'Not started');
    }

    private t(key: string, params?: object, fallback?: string): string {
        return this._translatorService
            ? this._translatorService.translate.instant(key, params)
            : fallback || key;
    }
}
