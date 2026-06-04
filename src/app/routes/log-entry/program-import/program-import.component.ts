import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import {
    ImportedProgram,
    ImportedProgramDay,
    ImportedProgramExercise,
    ImportedProgramWeek
} from '../../../shared/models/imported-program.model';
import { ProgramImportService } from '../../../shared/services/program-import.service';
import { SharedService } from '../../../shared/services/shared.service';

const swal = require('sweetalert');

@Component({
    selector: 'app-program-import',
    standalone: false,
    templateUrl: './program-import.component.html',
    styleUrls: ['./program-import.component.scss']
})
export class ProgramImportComponent implements OnInit, OnDestroy {
    public program: ImportedProgram;
    public programs: ImportedProgram[] = [];
    public programCards: ProgramImportCard[] = [];
    public weekCards: ProgramWeekCard[] = [];
    public dayCards: ProgramDayCard[] = [];
    public selectedWeek: ImportedProgramWeek;
    public isImporting = false;
    public importError = '';
    public completionColor = '#2fb379';
    public completionStyles: { [key: string]: string } = {};
    public completionColorOptions = [
        '#2fb379',
        '#2f80ed',
        '#9b51e0',
        '#f2994a',
        '#eb5757',
        '#111827'
    ];

    private programSub: Subscription;
    private programsSub: Subscription;
    private routeSub: Subscription;
    private selectedWeekId: string;
    private selectedProgramId: string;

    constructor(
        private _programImportService: ProgramImportService,
        private _sharedService: SharedService,
        private _router: Router,
        private _activatedRoute: ActivatedRoute
    ) { }

    ngOnInit(): void {
        this._sharedService.emitLogType(undefined);
        this.completionColor = this._programImportService.getCompletionColor();
        this.refreshCompletionStyles();
        this.routeSub = this._activatedRoute.queryParamMap.subscribe(params => {
            this.selectedProgramId = params.get('programId');
            this.selectedWeekId = params.get('weekId');
            if (this.selectedProgramId) {
                this._programImportService.setActiveProgram(this.selectedProgramId);
            }
            this.selectWeekFromProgram();
        });
        this.programSub = this._programImportService.program$.subscribe(program => {
            this.program = program;
            this.selectWeekFromProgram();
            this.refreshProgramView();
            this.refreshProgramCards();
        });
        this.programsSub = this._programImportService.programs$.subscribe(programs => {
            this.programs = programs;
            this.refreshProgramCards();
        });
    }

    ngOnDestroy(): void {
        if (this.programSub) {
            this.programSub.unsubscribe();
        }
        if (this.routeSub) {
            this.routeSub.unsubscribe();
        }
        if (this.programsSub) {
            this.programsSub.unsubscribe();
        }
    }

    public async onFileSelected(event: Event): Promise<void> {
        const input = event.target as HTMLInputElement;
        const file = input.files && input.files.length ? input.files[0] : undefined;

        if (!file) {
            return;
        }

        this.isImporting = true;
        this.importError = '';

        try {
            await this._programImportService.importWorkbook(file);
        } catch (error) {
            this.importError = 'That workbook could not be imported. Try another .xlsx file.';
        } finally {
            this.isImporting = false;
            input.value = '';
        }
    }

    public selectWeek(week: ImportedProgramWeek): void {
        this.selectedWeek = week;
        this.refreshDayCards();
    }

    public openWorkout(weekId: string, dayId: string): void {
        this._router.navigate(['/log-entry/simple-log'], {
            queryParams: {
                programId: this.program.id,
                weekId,
                dayId
            }
        });
    }

    public async clearProgram(): Promise<void> {
        if (!this.program) {
            return;
        }

        await this.confirmAndDeleteProgram(this.program);
    }

    public selectProgram(program: ImportedProgram): void {
        const selectedProgram = this._programImportService.setActiveProgram(program.id);

        if (selectedProgram) {
            this.program = selectedProgram;
            this.selectedWeekId = undefined;
            this.selectWeekFromProgram();
            this.refreshProgramView();
            this.refreshProgramCards();
        }

        this._router.navigate(['/log-entry/import-program'], {
            queryParams: {
                programId: program.id
            }
        });
    }

    public async deleteProgram(event: Event, program: ImportedProgram): Promise<void> {
        event.stopPropagation();
        await this.confirmAndDeleteProgram(program);
    }

    public markDayComplete(event: Event, weekId: string, dayId: string): void {
        event.stopPropagation();

        if (!this.isDayComplete(weekId, dayId)) {
            this._programImportService.markDayComplete(weekId, dayId);
            this.refreshProgramView();
            this.refreshProgramCards();
        }
    }

    public getCompletionLabel(weekId: string, dayId: string): string {
        const completion = this._programImportService.getDayCompletion(weekId, dayId);
        return `${completion.completed}/${completion.total}`;
    }

    public getCompletionPercent(weekId: string, dayId: string): number {
        const completion = this._programImportService.getDayCompletion(weekId, dayId);
        return completion.total ? (completion.completed / completion.total) * 100 : 0;
    }

    public isDayComplete(weekId: string, dayId: string): boolean {
        const completion = this._programImportService.getDayCompletion(weekId, dayId);
        return completion.total > 0 && completion.completed === completion.total;
    }

    public isWeekComplete(weekId: string): boolean {
        const weekCard = this.weekCards.find(week => week.id === weekId);
        return weekCard ? weekCard.complete : false;
    }

    public onCompletionColorChange(color: string): void {
        this.completionColor = color;
        this._programImportService.saveCompletionColor(color);
        this.refreshCompletionStyles();
    }

    public getCompletionStyles(): { [key: string]: string } {
        return this.completionStyles;
    }

    private refreshCompletionStyles(): void {
        this.completionStyles = {
            '--completion-color': this.completionColor,
            '--completion-color-soft': this.hexToRgba(this.completionColor, 0.12),
            '--completion-color-softer': this.hexToRgba(this.completionColor, 0.06)
        };
    }

    public getDayElapsedLabel(weekId: string, dayId: string): string {
        const dayCard = this.dayCards.find(day => day.id === dayId && this.selectedWeek && this.selectedWeek.id === weekId);
        return dayCard ? dayCard.elapsedLabel : '';
    }

    public getExercisePreview(exercises: ImportedProgramExercise[]): string[] {
        return exercises.reduce((exerciseNames, exercise) => {
            if (exercise.exerciseName && exerciseNames.indexOf(exercise.exerciseName) === -1) {
                exerciseNames.push(exercise.exerciseName);
            }

            return exerciseNames;
        }, [] as string[]);
    }

    private selectWeekFromProgram(): void {
        if (!this.program || !this.program.weeks.length) {
            this.selectedWeek = undefined;
            this.weekCards = [];
            this.dayCards = [];
            return;
        }

        this.selectedWeek = this.program.weeks.find(week => week.id === this.selectedWeekId) || this.program.weeks[0];
        this.refreshDayCards();
    }

    private refreshProgramCards(): void {
        this.programCards = this.programs.map(program => {
            const progress = this._programImportService.getProgramProgress(program);
            const status = this.getStatusFromProgress(progress);

            return {
                program,
                status,
                statusLabel: this.formatProgramStatus(status),
                statusClass: `program-import__library-status--${status}`,
                progressLabel: `${progress.completed}/${progress.total} days`,
                progressPercent: progress.total ? (progress.completed / progress.total) * 100 : 0
            };
        });
    }

    private refreshProgramView(): void {
        this.refreshWeekCards();
        this.refreshDayCards();
    }

    private refreshWeekCards(): void {
        this.weekCards = this.program ? this.program.weeks.map(week => ({
            ...week,
            complete: this._programImportService.isWeekComplete(week.id)
        })) : [];
    }

    private refreshDayCards(): void {
        this.dayCards = this.selectedWeek ? this.selectedWeek.days.map(day => this.createDayCard(day)) : [];
    }

    private createDayCard(day: ImportedProgramDay): ProgramDayCard {
        const completion = this._programImportService.getDayCompletion(this.selectedWeek.id, day.id);
        const elapsedMs = this._programImportService.getDayElapsedMs(this.selectedWeek.id, day.id);

        return {
            ...day,
            completionLabel: `${completion.completed}/${completion.total}`,
            completionPercent: completion.total ? (completion.completed / completion.total) * 100 : 0,
            complete: completion.total > 0 && completion.completed === completion.total,
            elapsedLabel: elapsedMs ? this._programImportService.formatElapsedMs(elapsedMs) : '',
            exercisePreview: this.getExercisePreview(day.exercises)
        };
    }

    private formatProgramStatus(status: ProgramImportStatus): string {
        if (status === 'complete') {
            return 'Complete';
        }

        return status === 'in-progress' ? 'In progress' : 'Not started';
    }

    private getStatusFromProgress(progress: { completed: number, total: number, started: number }): ProgramImportStatus {
        if (progress.total > 0 && progress.completed === progress.total) {
            return 'complete';
        }

        return progress.started > 0 ? 'in-progress' : 'not-started';
    }

    private async confirmAndDeleteProgram(program: ImportedProgram): Promise<void> {
        const confirmed = await swal({
            title: 'Delete imported program?',
            text: `"${program.name}" and its saved workout progress will be removed.`,
            icon: 'warning',
            buttons: ['Cancel', 'Delete'],
            dangerMode: true
        });

        if (!confirmed) {
            return;
        }

        this._programImportService.clearProgram(program.id);
        this.refreshProgramCards();
    }

    private hexToRgba(hex: string, alpha: number): string {
        const normalized = hex.replace('#', '');
        const red = parseInt(normalized.substring(0, 2), 16);
        const green = parseInt(normalized.substring(2, 4), 16);
        const blue = parseInt(normalized.substring(4, 6), 16);

        return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
    }
}

type ProgramImportStatus = 'complete' | 'in-progress' | 'not-started';

interface ProgramImportCard {
    program: ImportedProgram;
    status: ProgramImportStatus;
    statusLabel: string;
    statusClass: string;
    progressLabel: string;
    progressPercent: number;
}

interface ProgramWeekCard extends ImportedProgramWeek {
    complete: boolean;
}

interface ProgramDayCard extends ImportedProgramDay {
    completionLabel: string;
    completionPercent: number;
    complete: boolean;
    elapsedLabel: string;
    exercisePreview: string[];
}
