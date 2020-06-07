import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { FormGroup, FormBuilder, FormControl, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Subscription } from 'rxjs';

import { DurationDialog } from './duration-dialog.component';
import { Exercise } from 'src/app/shared/models/exercise.model';
import { CardioExercise } from 'src/app/shared/models/cardio-exercise.model';
import { SimpleLog } from '../../../shared/models/simple-log.model';
import { SharedService } from '../../../shared/services/shared.service';
import { TranslatorService } from '../../../core/translator/translator.service';
import { EmailService } from 'src/app/shared/services/email.service';

import { LogTypes, FormValues } from '../../../shared/common/common.constants';

import * as moment from 'moment';
import * as jsPDF from 'jspdf'

const swal = require('sweetalert');

@Component({
    selector: 'app-simple-log',
    templateUrl: './simple-log.component.html',
    styleUrls: ['./simple-log.component.scss']
})
export class SimpleLogComponent implements OnInit, OnDestroy {
    @ViewChild('exerciseTable', {static: false}) exerciseTable: ElementRef;
    
    private simpleLogForm: FormGroup;
    private currentLanguage: string;
    private currentLog: SimpleLog;
    private currentExercise: Exercise;
    private currentCardioExercise: CardioExercise;
    private exerciseRowCount: number;
    private cardioExerciseRowCount: number;
    private activeRows: Array<Exercise | CardioExercise>;
    private currentPDF: any;

    public selectedIntensity: string;

    public readonly exerciseNameCharLimit: number = 50;
    public readonly exerciseNumericCharLimit: number = 5;
    public readonly exerciseAlphaNumericCharLimit: number = 15;
    public readonly titleCharLimit: number = 75;
    public readonly exerciseType: string = FormValues.ExerciseNameFormControl;
    public readonly cardioExerciseType: string = FormValues.CardioExerciseNameFormControl;
    public intensities = FormValues.ExerciseIntensities;

    private langSub: Subscription;

    constructor(
        private _formBuilder: FormBuilder,
        private _sharedService: SharedService,
        private _translatorService: TranslatorService,
        private _dialog: MatDialog,
        private _emailService: EmailService
    ) {
        this.simpleLogForm = this._formBuilder.group({
            'title': ['', Validators.compose([Validators.maxLength(75)])]
        });
    }

    ngOnInit(): void {
        this.currentLanguage = FormValues.ENCode;
        this.currentLog = new SimpleLog();
        this._sharedService.emitLogType(LogTypes.SimpleLog);
        this._sharedService.emitLogStartDatim(this.currentLog.startDatim);
        this.exerciseRowCount = 0;
        this.cardioExerciseRowCount = 0;
        this.activeRows = new Array<Exercise | CardioExercise>();
        this.subToLanguageChange();
    }

    ngOnDestroy(): void {
        if (this.langSub)
            this.langSub.unsubscribe();
    }

    /**
     * Determine which submit was triggered and initiate the appropriate flow.
     * @param submitType - 'save' or 'email'
     */
    public submit(submitType: string): void {
        if (submitType == 'save') 
            this.savePDFSubmit();
        else
            this.emailPDFSubmit();
    }

    private savePDFSubmit(): void {
        for (let c in this.simpleLogForm.controls) {
            this.simpleLogForm.controls[c].markAsTouched();
        }
        if (this.simpleLogForm.valid) {
            this.downloadAsPDF();
        }
    }

    private emailPDFSubmit(): void {
        for (let c in this.simpleLogForm.controls) {
            this.simpleLogForm.controls[c].markAsTouched();
        }
        if (this.simpleLogForm.valid) {
            this.emailAsPDF();
        }
    }

    private downloadAsPDF(): void {  
        let orientation = {
            orientation: 'p',
            unit: 'mm',
            format: 'a3',
            compress: true,
            fontSize: 8,
            lineHeight: 0.5,
            autoSize: false,
            printHeaders: true
        };
        const doc = new jsPDF(orientation);
        doc.setProperties({
            title: 'Log Your Workout'
        });
        const exerciseTable = this.exerciseTable.nativeElement;

        doc.setFontSize(12);
        doc.fromHTML(exerciseTable.innerHTML, 10, 10);

        doc.save('tableToPdf.pdf');
    }

    public emailAsPDF(): void {
        let orientation = {
            orientation: 'p',
            unit: 'mm',
            format: 'a3',
            compress: true,
            fontSize: 8,
            lineHeight: 0.5,
            autoSize: false,
            printHeaders: true
        };
        const doc = new jsPDF(orientation);
        doc.setProperties({
            title: 'Log Your Workout'
        });
        const exerciseTable = this.exerciseTable.nativeElement;

        doc.setFontSize(12);
        doc.fromHTML(exerciseTable.innerHTML, 10, 10);
        this.currentPDF = btoa(doc.output());
        let request = {
            from: "milansobat03@gmail.com",
            to: "milan.sobat@sykes.com",
            subject: "Test Subject",
            attachments: [this.currentPDF],
            body: "<h1>This is a test</h1>",
            date: this.currentLog.startDatim.toDateString()
        }
        this._emailService.sendMail(request).subscribe(
            data => console.log(data),
            err => console.error(err)
        );
    }

    /**
     * Adds an exercise row to the page. Inserts a new form control into form control group
     * and current log exercise array.
     */
    public addExerciseFormControl(): void {
        if (this.simpleLogForm.valid) {
            let formControlName1 = `${FormValues.ExerciseNameFormControl}${this.exerciseRowCount}`;
            let formControlName2 = `${FormValues.ExerciseSetsFormControl}${this.exerciseRowCount}`;
            let formControlName3 = `${FormValues.ExerciseRepsFormControl}${this.exerciseRowCount}`;
            let formControlName4 = `${FormValues.ExerciseWeightFormControl}${this.exerciseRowCount}`;
            this.simpleLogForm.addControl(formControlName1, new FormControl('', Validators.compose([Validators.required, Validators.maxLength(50)])));
            this.simpleLogForm.addControl(formControlName2, new FormControl('', Validators.compose([Validators.pattern("^[0-9]*$"), Validators.maxLength(5)])));
            this.simpleLogForm.addControl(formControlName3, new FormControl('', Validators.compose([Validators.pattern("^[0-9]*$"), Validators.maxLength(5)])));
            this.simpleLogForm.addControl(formControlName4, new FormControl('', Validators.compose([Validators.maxLength(15)])));
            ++this.exerciseRowCount;
            //console.log(this.simpleLogForm.get(formControlName1));
            // add exercise to log
            let newExercise = new Exercise();
            newExercise.logId = this.currentLog.logId;
            newExercise.formControlNames.set('name', formControlName1);
            newExercise.formControlNames.set('sets', formControlName2);
            newExercise.formControlNames.set('reps', formControlName3);
            newExercise.formControlNames.set('weight', formControlName4);
            this.currentLog.exercises.push(newExercise);
            this.currentExercise = newExercise;
            // add to current active rows
            this.activeRows.push(newExercise);
        } else
            this.swalCompleteRowError();
    }

    public addCardioExerciseFormControl(): void {
        if (this.simpleLogForm.valid) {
            let formControlName1 = `${FormValues.CardioExerciseNameFormControl}${this.cardioExerciseRowCount}`;
            let formControlName2 = `${FormValues.CardioExerciseDistanceFormControl}${this.cardioExerciseRowCount}`;
            let formControlName3 = `${FormValues.CardioExerciseTimeFormControl}${this.cardioExerciseRowCount}`;
            let formControlName4 = `${FormValues.CardioExerciseIntensityFormControl}${this.cardioExerciseRowCount}`;
            this.simpleLogForm.addControl(formControlName1, new FormControl('', Validators.compose([Validators.required, Validators.maxLength(50)])));
            this.simpleLogForm.addControl(formControlName2, new FormControl('', Validators.compose([Validators.maxLength(15)])));
            this.simpleLogForm.addControl(formControlName3, new FormControl());
            this.simpleLogForm.addControl(formControlName4, new FormControl());
            ++this.cardioExerciseRowCount;
            // add cardio exercise to log
            let newCardioExercise = new CardioExercise();
            newCardioExercise.logId = this.currentLog.logId;
            newCardioExercise.formControlNames.set('name', formControlName1);
            newCardioExercise.formControlNames.set('distance', formControlName2);
            newCardioExercise.formControlNames.set('time', formControlName3);
            newCardioExercise.formControlNames.set('intensity', formControlName4);
            this.currentLog.cardioExercises.push(newCardioExercise);
            this.currentCardioExercise = newCardioExercise;
            // add to current active rows
            this.activeRows.push(newCardioExercise);
        } else
            this.swalCompleteRowError();
    }

    /**
     * On blur of form control check the value - if present and valid add to the @var currentExercise | @var currentCardioExercise model.
     * Find correct @var currentExercise | @var currentCardioExercise first to determine which one to update based on @param formCtrlType.
     * @param formCtrlType - form control type to search for
     */
    public checkForExerciseValue(exercise: Exercise | CardioExercise, formCtrlType: string): void {
        if (exercise.formControlNames.get('name').includes(this.exerciseType)) {
            this.currentExercise = this.currentLog.exercises.find(x => x.exerciseId == exercise.exerciseId);
            let exerciseValue = this.simpleLogForm.get(this.currentExercise.formControlNames.get(formCtrlType)).value;
            switch(formCtrlType) {
                case 'name':
                    exerciseValue.length > 0 ? this.currentExercise.exerciseName = exerciseValue : this.currentExercise.exerciseName =  null
                    break;
                case 'sets':
                    exerciseValue > 0 ? this.currentExercise.sets = +exerciseValue : this.currentExercise.sets = null;
                    break;
                case 'reps':
                    exerciseValue > 0 ? this.currentExercise.reps = +exerciseValue : this.currentExercise.reps = null;
                    break;
                case 'weight':
                    exerciseValue.length > 0 ? this.currentExercise.weight = exerciseValue : this.currentExercise.weight = null;
                    break;
            }
        } else {
            this.currentCardioExercise = this.currentLog.cardioExercises.find(x => x.exerciseId == exercise.exerciseId);
            let exerciseValue = this.simpleLogForm.get(this.currentCardioExercise.formControlNames.get(formCtrlType)).value;
            switch(formCtrlType) {
                case 'name':
                    exerciseValue.length > 0 ? this.currentCardioExercise.exerciseName = exerciseValue : null;
                    break;
                case 'distance':
                    exerciseValue.length > 0 ? this.currentCardioExercise.distance = exerciseValue : null;
                    break;
            }
        }
    }

    public checkForTitleValue(): void {
        let title = this.simpleLogForm.get('title').value;
        if (title)
            this.currentLog.title = title;
    }

    /**
     * Remove the targetted row from the page. Removes from @var currentlog.exercises and
     * @var simpleLogForm form group.
     * @param exerciseToRemove - exercise to be removed
     */
    public removeExerciseRow(exerciseToRemove: Exercise): void {
        // find in current log and remove
        let i = this.currentLog.exercises.findIndex(x => x.exerciseId == exerciseToRemove.exerciseId);
        this.currentLog.exercises.splice(i, 1);
        // find in active rows and remove
        let n = this.activeRows.findIndex(x => x.exerciseId == exerciseToRemove.exerciseId);
        this.activeRows.splice(n, 1);
        // remove from form control group
        this.simpleLogForm.removeControl(exerciseToRemove.formControlNames.get('name'));
        this.simpleLogForm.removeControl(exerciseToRemove.formControlNames.get('sets'));
        this.simpleLogForm.removeControl(exerciseToRemove.formControlNames.get('reps'));
        this.simpleLogForm.removeControl(exerciseToRemove.formControlNames.get('weight'));
    }

    public removeCardioExerciseRow(cardioExerciseToRemove: CardioExercise): void {
        // find in current log and remove
        let i = this.currentLog.cardioExercises.findIndex(x => x.exerciseId == cardioExerciseToRemove.exerciseId);
        this.currentLog.cardioExercises.splice(i, 1);
        // find in active rows and remove
        let n = this.activeRows.findIndex(x => x.exerciseId == cardioExerciseToRemove.exerciseId);
        this.activeRows.splice(n, 1);
        // remove from form control group
        this.simpleLogForm.removeControl(cardioExerciseToRemove.formControlNames.get('name'));
    }

    public openDialog(exercise: CardioExercise): void {
        let dialogRef = this._dialog.open(DurationDialog);
        this.currentCardioExercise = this.currentLog.cardioExercises.find(x => x.exerciseId == exercise.exerciseId);
        this._sharedService.emitCvExercise(this.currentCardioExercise);
        dialogRef.afterClosed().subscribe(result => {
            this.currentCardioExercise = result;
            //console.log(this.currentLog.cardioExercises.find(x => x.exerciseId == exercise.exerciseId));
        }); 
    }

    public onCvEmit(exercise: CardioExercise): void {
        console.log(exercise);
    }

    /**
     * Track exercise intensity set for the particular cardio exercise row.
     * @param intensity - i.e. easy, moderate, hard, maximal
     * @param exercise - exercise to be updated
     */
    public onIntensityChange(intensity: any, exercise: CardioExercise): void {
        if (intensity) {
            this.currentCardioExercise = this.currentLog.cardioExercises.find(x => x.exerciseId == exercise.exerciseId);
            this.currentCardioExercise.intensity = +intensity.value;
        }
    }

    /**
     * Track the language currently chosen by the user.
     */
    private subToLanguageChange(): void {
        this.langSub = this._translatorService.languageChangeEmitted$.subscribe(
            data => {
                this.currentLanguage = data;
                if (this.currentLanguage == FormValues.ENCode) {
                    this.intensities = FormValues.ExerciseIntensities;
                } else {
                    this.intensities = FormValues.FRExerciseIntensities;
                }
            }
        );
    }

    /**
     * Sweet alert prompts.
     */
    private swalCompleteRowError(): void {
        if (this.currentLanguage == FormValues.ENCode) {
            swal('Complete Current Row', 'Please complete the current row before trying to add another.', 'info');
        } else {
            swal('Compl\u00E9ter la ligne actuelle', 'Veuillez compl\u00E9ter la ligne actuelle avant d\'essayer d\'en ajouter une autre.', 'info');
        }
    }
}
