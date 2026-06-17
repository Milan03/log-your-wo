import { NgClass, NgStyle, PercentPipe } from '@angular/common';
import {
    Component,
    DestroyRef,
    effect,
    ElementRef,
    inject,
    OnDestroy,
    OnInit,
    viewChildren
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TranslateModule } from '@ngx-translate/core';

import {
    ImportedProgram,
    ImportedProgramDay,
    ImportedProgramExercise,
    ImportedProgramWeek,
    ProgramImportPreview,
    WorkbookImportInput
} from '../../../shared/models/imported-program.model';
import { ProgramImportService } from '../../../shared/services/program-import.service';
import { WorkoutHeaderService } from '../../../shared/services/workout-header.service';
import { TranslatorService } from '../../../core/translator/translator.service';
import {
    ProgramDayCard,
    ProgramImportCard,
    ProgramImportCardFactory,
    ProgramWeekCard
} from './program-import-card.factory';
import { ProgramImportWizardStore } from './program-import-wizard.store';

const swal = require('sweetalert');

@Component({
    selector: 'app-program-import',
    standalone: true,
    imports: [
        NgClass,
        NgStyle,
        PercentPipe,
        FormsModule,
        TranslateModule,
        MatProgressBarModule
    ],
    templateUrl: './program-import.component.html',
    styleUrls: ['./program-import.component.scss'],
    providers: [ProgramImportWizardStore]
})
export class ProgramImportComponent implements OnInit, OnDestroy {
    private readonly weekTabElements = viewChildren<ElementRef<HTMLElement>>('weekTab');
    private readonly dayCardElements = viewChildren<ElementRef<HTMLElement>>('dayCard');

    // Re-run focus handling whenever the rendered week tabs or day cards change.
    // Reading the signal queries registers this effect as a dependency, replacing
    // the former QueryList.changes subscriptions and the initial ngAfterViewInit call.
    private readonly focusOnQueryChange = effect(() => {
        this.weekTabElements();
        this.dayCardElements();
        this.queueRequestedFocus();
    });

    public program: ImportedProgram;
    public programs: ImportedProgram[] = [];
    public programCards: ProgramImportCard[] = [];
    public weekCards: ProgramWeekCard[] = [];
    public dayCards: ProgramDayCard[] = [];
    public selectedWeek: ImportedProgramWeek;
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

    private readonly destroyRef = inject(DestroyRef);
    private focusTimerId: ReturnType<typeof setTimeout>;
    private scrollFrameId: number;
    private selectedWeekId: string;
    private pendingFocusWeekId: string;
    private pendingFocusDayId: string;
    private selectedProgramId: string;

    private _programImportService = inject(ProgramImportService);
    private _workoutHeader = inject(WorkoutHeaderService);
    private _router = inject(Router);
    private _activatedRoute = inject(ActivatedRoute);
    private _translatorService = inject(TranslatorService, { optional: true });
    private _cardFactory = inject(ProgramImportCardFactory);
    private _wizard = inject(ProgramImportWizardStore);

    // Workbook import/review state and logic live in ProgramImportWizardStore;
    // these accessors keep the template and existing call sites pointed at it.
    public get isImporting(): boolean { return this._wizard.isImporting(); }
    public get importError(): string { return this._wizard.importError(); }
    public get importPreview(): ProgramImportPreview { return this._wizard.importPreview(); }
    public set importPreview(value: ProgramImportPreview) { this._wizard.importPreview.set(value); }
    public get importReviewStep(): 'setup' | 'review' { return this._wizard.importReviewStep(); }
    public get setupError(): string { return this._wizard.setupError(); }
    public set setupError(value: string) { this._wizard.setupError.set(value); }
    public get selectedReviewWeekIndex(): number { return this._wizard.selectedReviewWeekIndex(); }
    public get workbookSetupValid(): boolean { return this._wizard.workbookSetupValid; }
    public get workbookWeightUnit(): string { return this._wizard.workbookWeightUnit; }
    public get selectedReviewWeek(): ImportedProgramWeek { return this._wizard.selectedReviewWeek; }
    public get reviewExerciseCount(): number { return this._wizard.reviewExerciseCount; }
    public get importWarnings(): string[] { return this._wizard.importWarnings; }

    ngOnInit(): void {
        this._workoutHeader.setLogType(undefined);
        this.completionColor = this._programImportService.getCompletionColor();
        this.refreshCompletionStyles();
        this._activatedRoute.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
            this.selectedProgramId = params.get('programId');
            this.selectedWeekId = params.get('weekId');
            this.pendingFocusWeekId = this.selectedWeekId;
            this.pendingFocusDayId = params.get('dayId');
            if (this.selectedProgramId) {
                this._programImportService.setActiveProgram(this.selectedProgramId);
            }
            this.selectWeekFromProgram();
        });
        this._programImportService.program$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(program => {
            this.program = program;
            this.selectWeekFromProgram();
            this.refreshWeekCards();
        });
        this._programImportService.programs$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(programs => {
            this.programs = programs;
            this.refreshProgramCards();
        });
        this._router.events.pipe(
            filter(event => event instanceof NavigationEnd),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(() => this.queueRequestedFocus());
        if (this._translatorService) {
            this._translatorService.languageChangeEmitted$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
                this.refreshProgramCards();
                this.refreshDayCards();
            });
        }
    }

    ngOnDestroy(): void {
        if (this.focusTimerId !== undefined) {
            clearTimeout(this.focusTimerId);
            this.focusTimerId = undefined;
        }
        if (this.scrollFrameId !== undefined) {
            cancelAnimationFrame(this.scrollFrameId);
            this.scrollFrameId = undefined;
        }
    }

    public async onFileSelected(event: Event): Promise<void> {
        const input = event.target as HTMLInputElement;
        const file = input.files && input.files.length ? input.files[0] : undefined;

        if (!file) {
            return;
        }

        try {
            await this._wizard.previewFromFile(file);
        } finally {
            input.value = '';
        }
    }

    public confirmImport(): Promise<void> {
        return this._wizard.confirmImport();
    }

    public cancelImportReview(): void {
        this._wizard.cancelImportReview();
    }

    public async continueToImportReview(): Promise<void> {
        await this._wizard.continueToImportReview();
    }

    public editWorkbookMaxes(): void {
        this._wizard.editWorkbookMaxes();
    }

    public isWorkbookInputValid(input: WorkbookImportInput): boolean {
        return this._wizard.isWorkbookInputValid(input);
    }

    public normalizeWorkbookInput(input: WorkbookImportInput): void {
        this._wizard.normalizeWorkbookInput(input);
    }

    public deleteReviewExercise(weekIndex: number, dayIndex: number, exerciseIndex: number): void {
        this._wizard.deleteReviewExercise(weekIndex, dayIndex, exerciseIndex);
    }

    public trackExerciseById(index: number, exercise: ImportedProgramExercise): string {
        return this._wizard.trackExerciseById(index, exercise);
    }

    public selectReviewWeek(index: number): void {
        this._wizard.selectReviewWeek(index);
    }

    public previousReviewWeek(): void {
        this._wizard.previousReviewWeek();
    }

    public nextReviewWeek(): void {
        this._wizard.nextReviewWeek();
    }

    public selectWeek(week: ImportedProgramWeek): void {
        this.selectedWeekId = week.id;
        this.pendingFocusWeekId = undefined;
        this.pendingFocusDayId = undefined;
        this.selectedWeek = week;
        this.refreshDayCards();
    }

    public openWorkout(weekId: string, dayId: string): void {
        this._router.navigate(['/log-entry/import-program/workout'], {
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
            const scrollX = window.scrollX;
            const scrollY = window.scrollY;
            this._programImportService.markDayComplete(weekId, dayId);
            if (this.scrollFrameId !== undefined) {
                cancelAnimationFrame(this.scrollFrameId);
            }
            this.scrollFrameId = requestAnimationFrame(() => {
                this.scrollFrameId = undefined;
                window.scrollTo(scrollX, scrollY);
            });
        }
    }

    public trackDayById(index: number, day: ImportedProgramDay): string {
        return day.id;
    }

    public trackWeekById(index: number, week: ImportedProgramWeek): string {
        return week.id;
    }

    public isDayComplete(weekId: string, dayId: string): boolean {
        const completion = this._programImportService.getDayCompletion(weekId, dayId);
        return completion.total > 0 && completion.completed === completion.total;
    }

    public onCompletionColorChange(color: string): void {
        this.completionColor = color;
        this._programImportService.saveCompletionColor(color);
        this.refreshCompletionStyles();
    }

    private refreshCompletionStyles(): void {
        this.completionStyles = {
            '--completion-color': this.completionColor,
            '--completion-color-soft': this.hexToRgba(this.completionColor, 0.12),
            '--completion-color-softer': this.hexToRgba(this.completionColor, 0.06)
        };
    }

    private selectWeekFromProgram(): void {
        if (!this.program || !this.program.weeks.length) {
            this.selectedWeek = undefined;
            this.weekCards = [];
            this.dayCards = [];
            return;
        }

        const hasRequestedWeek = !!this.selectedWeekId;
        const requestedWeek = this.program.weeks.find(week => week.id === this.selectedWeekId);
        const currentWorkout = !hasRequestedWeek
            ? this._programImportService.getCurrentWorkout(this.program)
            : undefined;
        this.selectedWeek = requestedWeek || currentWorkout?.week || this.program.weeks[0];
        this.selectedWeekId = this.selectedWeek.id;

        if (!requestedWeek && currentWorkout) {
            this.pendingFocusWeekId = currentWorkout.week.id;
            this.pendingFocusDayId = currentWorkout.day.id;
            this.queueRequestedFocus();
        }

        if (this.pendingFocusWeekId && hasRequestedWeek && !requestedWeek) {
            this.pendingFocusWeekId = undefined;
        }
        if (this.pendingFocusDayId && !this.selectedWeek.days.some(day => day.id === this.pendingFocusDayId)) {
            this.pendingFocusDayId = undefined;
        }

        this.refreshDayCards();
    }

    private refreshProgramCards(): void {
        this.programCards = this._cardFactory.programCards(this.programs);
    }

    private refreshProgramView(): void {
        this.refreshWeekCards();
        this.refreshDayCards();
    }

    private refreshWeekCards(): void {
        this.weekCards = this._cardFactory.weekCards(this.program);
    }

    private refreshDayCards(): void {
        this.dayCards = this._cardFactory.dayCards(this.selectedWeek);
    }

    private focusRequestedDay(): void {
        if (!this.pendingFocusDayId) {
            return;
        }

        const dayElement = this.dayCardElements().find(element =>
            element.nativeElement.dataset.dayId === this.pendingFocusDayId
        );

        if (!dayElement) {
            return;
        }

        dayElement.nativeElement.scrollIntoView({
            behavior: 'auto',
            block: 'center',
            inline: 'center'
        });
        dayElement.nativeElement.focus({ preventScroll: true });
        this.pendingFocusDayId = undefined;
    }

    private focusRequestedWeek(): void {
        if (!this.pendingFocusWeekId) {
            return;
        }

        const weekElement = this.weekTabElements().find(element =>
            element.nativeElement.dataset.weekId === this.pendingFocusWeekId
        );

        if (!weekElement) {
            return;
        }

        weekElement.nativeElement.scrollIntoView({
            behavior: 'auto',
            block: 'nearest',
            inline: 'center'
        });
        this.pendingFocusWeekId = undefined;
    }

    private queueRequestedFocus(): void {
        if (!this.pendingFocusWeekId && !this.pendingFocusDayId) {
            return;
        }

        if (this.focusTimerId !== undefined) {
            clearTimeout(this.focusTimerId);
        }

        this.focusTimerId = setTimeout(() => {
            this.focusTimerId = undefined;
            this.focusRequestedWeek();
            this.focusRequestedDay();
        });
    }

    private async confirmAndDeleteProgram(program: ImportedProgram): Promise<void> {
        const confirmed = await swal({
            title: this.t('program-import.DeleteTitle', undefined, 'Delete imported program?'),
            text: this.t(
                'program-import.DeleteText',
                { name: program.name },
                `"${program.name}" and its saved workout progress will be removed.`
            ),
            icon: 'warning',
            buttons: [
                this.t('global.CancelLabel', undefined, 'Cancel'),
                this.t('global.DeleteLabel', undefined, 'Delete')
            ],
            dangerMode: true
        });

        if (!confirmed) {
            return;
        }

        this._programImportService.clearProgram(program.id);
    }

    private hexToRgba(hex: string, alpha: number): string {
        const normalized = hex.replace('#', '');
        const red = parseInt(normalized.substring(0, 2), 16);
        const green = parseInt(normalized.substring(2, 4), 16);
        const blue = parseInt(normalized.substring(4, 6), 16);

        return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
    }

    private t(key: string, params?: object, fallback?: string): string {
        return this._translatorService
            ? this._translatorService.translate.instant(key, params)
            : fallback || key;
    }
}
