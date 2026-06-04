import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import {
    ImportedProgram,
    ImportedProgramExercise,
    ImportedProgramWeek
} from '../../../shared/models/imported-program.model';
import { ProgramImportService } from '../../../shared/services/program-import.service';
import { SharedService } from '../../../shared/services/shared.service';

@Component({
    selector: 'app-program-import',
    standalone: false,
    templateUrl: './program-import.component.html',
    styleUrls: ['./program-import.component.scss']
})
export class ProgramImportComponent implements OnInit, OnDestroy {
    public program: ImportedProgram;
    public selectedWeek: ImportedProgramWeek;
    public isImporting = false;
    public importError = '';
    public completionColor = '#2fb379';
    public completionColorOptions = [
        '#2fb379',
        '#2f80ed',
        '#9b51e0',
        '#f2994a',
        '#eb5757',
        '#111827'
    ];

    private programSub: Subscription;
    private routeSub: Subscription;
    private selectedWeekId: string;

    constructor(
        private _programImportService: ProgramImportService,
        private _sharedService: SharedService,
        private _router: Router,
        private _activatedRoute: ActivatedRoute
    ) { }

    ngOnInit(): void {
        this._sharedService.emitLogType(undefined);
        this.completionColor = this._programImportService.getCompletionColor();
        this.routeSub = this._activatedRoute.queryParamMap.subscribe(params => {
            this.selectedWeekId = params.get('weekId');
            this.selectWeekFromProgram();
        });
        this.programSub = this._programImportService.program$.subscribe(program => {
            this.program = program;
            this.selectWeekFromProgram();
        });
    }

    ngOnDestroy(): void {
        if (this.programSub) {
            this.programSub.unsubscribe();
        }
        if (this.routeSub) {
            this.routeSub.unsubscribe();
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
    }

    public openWorkout(weekId: string, dayId: string): void {
        this._router.navigate(['/log-entry/simple-log'], {
            queryParams: {
                weekId,
                dayId
            }
        });
    }

    public clearProgram(): void {
        this._programImportService.clearProgram();
    }

    public markDayComplete(event: Event, weekId: string, dayId: string): void {
        event.stopPropagation();

        if (!this.isDayComplete(weekId, dayId)) {
            this._programImportService.markDayComplete(weekId, dayId);
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
        return this._programImportService.isWeekComplete(weekId);
    }

    public onCompletionColorChange(color: string): void {
        this.completionColor = color;
        this._programImportService.saveCompletionColor(color);
    }

    public getCompletionStyles(): { [key: string]: string } {
        return {
            '--completion-color': this.completionColor,
            '--completion-color-soft': this.hexToRgba(this.completionColor, 0.12),
            '--completion-color-softer': this.hexToRgba(this.completionColor, 0.06)
        };
    }

    public getDayElapsedLabel(weekId: string, dayId: string): string {
        const elapsedMs = this._programImportService.getDayElapsedMs(weekId, dayId);

        return elapsedMs ? this._programImportService.formatElapsedMs(elapsedMs) : '';
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
            return;
        }

        this.selectedWeek = this.program.weeks.find(week => week.id === this.selectedWeekId) || this.program.weeks[0];
    }

    private hexToRgba(hex: string, alpha: number): string {
        const normalized = hex.replace('#', '');
        const red = parseInt(normalized.substring(0, 2), 16);
        const green = parseInt(normalized.substring(2, 4), 16);
        const blue = parseInt(normalized.substring(4, 6), 16);

        return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
    }
}
