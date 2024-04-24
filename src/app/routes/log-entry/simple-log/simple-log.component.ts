import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, UntypedFormControl, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatTable } from '@angular/material/table';
import { DataSource } from '@angular/cdk/collections';
import { Observable, ReplaySubject, Subscription } from 'rxjs';

import { DurationDialogComponent } from '../duration-dialog/duration-dialog.component';
import { EmailDialogComponent } from '../email-dialog/email-dialog.component';
import { Exercise } from '../../../shared/models/exercise.model';
import { CardioExercise } from '../../../shared/models/cardio-exercise.model';
import { SimpleLog } from '../../../shared/models/simple-log.model';
import { EmailRequest } from '../../../shared/models/email-request.model';
import { SharedService } from '../../../shared/services/shared.service';
import { TranslatorService } from '../../../core/translator/translator.service';
import { EmailService } from '../../../shared/services/email.service';
import { GoogleAnalyticsService } from '../../../shared/services/google-analytics.service';

import { LogTypes, FormValues } from '../../../shared/common/common.constants';

import * as moment from 'moment';
import * as jsPDF from 'jspdf'
import { ExerciseDialogComponent } from '../exercise-dialog/exercise-dialog.component';

const swal = require('sweetalert');

@Component({
    selector: 'app-simple-log',
    templateUrl: './simple-log.component.html',
    styleUrls: ['./simple-log.component.scss']
})
export class SimpleLogComponent implements OnInit, OnDestroy {
    @ViewChild('exerciseTable', { static: false }) exerciseTable: ElementRef;

    public simpleLogForm: UntypedFormGroup;
    private currentLanguage: string;
    public currentLog: SimpleLog;
    private currentExercise: Exercise;
    private currentCardioExercise: CardioExercise;
    private exerciseRowCount: number;
    private cardioExerciseRowCount: number;
    public activeRows: Array<Exercise | CardioExercise>;
    private currentPDF: any;

    public selectedIntensity: string;

    public readonly exerciseNameCharLimit: number = 50;
    public readonly exerciseNumericCharLimit: number = 5;
    public readonly exerciseAlphaNumericCharLimit: number = 15;
    public readonly titleCharLimit: number = 75;
    public readonly exerciseType: string = FormValues.ExerciseNameFormControl;
    public readonly cardioExerciseType: string = FormValues.CardioExerciseNameFormControl;
    public intensities = FormValues.ExerciseIntensities;
    public displayedColumns: string[] = ['exerciseName', 'weight', 'reps', 'sets'];
    public ceDisplayedColumns: string[] = ['Exercise Name', 'Distance', 'Exercise Duration', 'Intensity'];
    public dataSource;
    public ceDataSource;

    private langSub: Subscription;

    @ViewChild(MatTable) table: MatTable<Exercise>;

    constructor(
        private _formBuilder: UntypedFormBuilder,
        private _sharedService: SharedService,
        private _translatorService: TranslatorService,
        private _dialog: MatDialog,
        private _emailService: EmailService,
        private _googleAnalyticsService: GoogleAnalyticsService
    ) {
        this.simpleLogForm = this._formBuilder.group({
            'title': ['', Validators.compose([Validators.maxLength(75)])]
        });
        /*this.currentLog = new SimpleLog();
        this.currentLog.exercises = new Array<Exercise>();
        this.dataToDisplay = [...this.currentLog.exercises];
        this.dataSource = new ExampleDataSource(this.dataToDisplay);*/
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
        this.displayedColumns = ['exerciseName', 'weight', 'reps', 'sets']
        //this.ceDisplayedColumns = ['Exercise Name', 'Distance', 'Exercise Duration', 'Intensity'];
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
            let createdPDF = this.createPDF('save');
            createdPDF.save('tableToPdf.pdf');
            this._googleAnalyticsService.eventEmitter(`pdf_saved_success`, 'general', 'engagement');
        }
    }

    private emailPDFSubmit(): void {
        for (let c in this.simpleLogForm.controls) {
            this.simpleLogForm.controls[c].markAsTouched();
        }
        if (this.simpleLogForm.valid) {
            this.openEmailDialog();
        }
    }

    /**
     * Using the email address retrieved from email dialog, create an email request and 
     * initiate call the email service.
     * @param recipientEmailAddress 
     */
    public emailAsPDF(recipientEmailAddress: string): void {
        let createdPDF = this.createPDF('email');
        this.currentPDF = btoa(createdPDF);
        let request = this.createEmailRequest(recipientEmailAddress);
        this._emailService.sendMail(request).subscribe(
            data => {
                this.swalEmailSent();
                this._googleAnalyticsService.eventEmitter(`email_sent_success`, 'general', 'engagement');
            },
            err => this.swalEmailError()
        );
    }

    /**
     * Create the PDF using jsPDF and the exercise HTML table.
     */
    private createPDF(type: string): any {
        let orientation = {
            orientation: 'p',
            unit: 'mm',
            format: 'a3',
            compress: true,
            fontSize: 8,
            lineHeight: 0.75,
            autoSize: false,
            printHeaders: true
        };
        const doc = new jsPDF(orientation);
        doc.setProperties({
            title: 'Log Your Workout'
        });
        const exerciseTable = this.exerciseTable.nativeElement;
        // doc.setFontSize(12);
        doc.fromHTML(exerciseTable.innerHTML, 40, 20, { 'width': 522 });
        if (type == 'save')
            return doc;
        else
            return doc.output()
    }

    /**
     * Create the email request to be sent to the server depending on if log title is present and
     * the current language.
     * @param recipientEmailAddress - email to send to
     */
    private createEmailRequest(recipientEmailAddress: string): EmailRequest {
        const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        if (this.currentLanguage == FormValues.ENCode) {
            if (this.currentLog.title) {
                return new EmailRequest(
                    FormValues.NoReplyEmailAddress,
                    recipientEmailAddress,
                    `${this.currentLog.title} - ${this.currentLog.startDatim.toLocaleDateString(FormValues.ENCode, options)}`,
                    [this.currentPDF],
                    FormValues.EmailBody,
                    this.currentLog.startDatim.toDateString()
                );
            } else {
                return new EmailRequest(
                    FormValues.NoReplyEmailAddress,
                    recipientEmailAddress,
                    `${FormValues.LogYourWorkout} - ${this.currentLog.startDatim.toLocaleDateString(FormValues.ENCode, options)}`,
                    [this.currentPDF],
                    FormValues.EmailBody,
                    this.currentLog.startDatim.toDateString()
                );
            }
        } else {
            if (this.currentLog.title) {
                return new EmailRequest(
                    FormValues.NoReplyEmailAddress,
                    recipientEmailAddress,
                    `${this.currentLog.title} - ${this.currentLog.startDatim.toLocaleDateString(FormValues.FRCode, options)}`,
                    [this.currentPDF],
                    FormValues.EmailBodyFR,
                    this.currentLog.startDatim.toDateString()
                );
            } else {
                return new EmailRequest(
                    FormValues.NoReplyEmailAddress,
                    recipientEmailAddress,
                    `${FormValues.LogYourWorkout} - ${this.currentLog.startDatim.toLocaleDateString(FormValues.FRCode, options)}`,
                    [this.currentPDF],
                    FormValues.EmailBodyFR,
                    this.currentLog.startDatim.toDateString()
                );
            }
        }
    }

    /**
     * Adds an exercise row to the page. Inserts a new form control into form control group
     * and current log exercise array.
     */
    /*public addExerciseFormControl(): void {
        if (this.simpleLogForm.valid) {
            let formControlName1 = `${FormValues.ExerciseNameFormControl}${this.exerciseRowCount}`;
            let formControlName2 = `${FormValues.ExerciseSetsFormControl}${this.exerciseRowCount}`;
            let formControlName3 = `${FormValues.ExerciseRepsFormControl}${this.exerciseRowCount}`;
            let formControlName4 = `${FormValues.ExerciseWeightFormControl}${this.exerciseRowCount}`;
            this.simpleLogForm.addControl(formControlName1, new UntypedFormControl('', Validators.compose([Validators.required, Validators.maxLength(50)])));
            this.simpleLogForm.addControl(formControlName2, new UntypedFormControl('', Validators.compose([Validators.pattern("^[0-9]*$"), Validators.maxLength(5)])));
            this.simpleLogForm.addControl(formControlName3, new UntypedFormControl('', Validators.compose([Validators.pattern("^[0-9]*$"), Validators.maxLength(5)])));
            this.simpleLogForm.addControl(formControlName4, new UntypedFormControl('', Validators.compose([Validators.maxLength(15)])));
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
            // Add or update the currentExercise in dataToDisplay
            if (!this.dataToDisplay) {
                this.dataToDisplay = [...this.currentLog.exercises];
                this.dataSource = new ExampleDataSource(this.dataToDisplay);
            } else {
                this.dataToDisplay = [...this.dataToDisplay, this.currentExercise];
                this.dataSource.setData(this.dataToDisplay);
            }
        } else
            this.swalCompleteRowError();
    }*/

    public addCardioExerciseFormControl(): void {
        if (this.simpleLogForm.valid) {
            let formControlName1 = `${FormValues.CardioExerciseNameFormControl}${this.cardioExerciseRowCount}`;
            let formControlName2 = `${FormValues.CardioExerciseDistanceFormControl}${this.cardioExerciseRowCount}`;
            let formControlName3 = `${FormValues.CardioExerciseTimeFormControl}${this.cardioExerciseRowCount}`;
            let formControlName4 = `${FormValues.CardioExerciseIntensityFormControl}${this.cardioExerciseRowCount}`;
            this.simpleLogForm.addControl(formControlName1, new UntypedFormControl('', Validators.compose([Validators.required, Validators.maxLength(50)])));
            this.simpleLogForm.addControl(formControlName2, new UntypedFormControl('', Validators.compose([Validators.maxLength(15)])));
            this.simpleLogForm.addControl(formControlName3, new UntypedFormControl());
            this.simpleLogForm.addControl(formControlName4, new UntypedFormControl());
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
            // Add or update the currentCardioExercise in dataToDisplay
          /*  if (!this.dataToDisplay) {
                this.dataToDisplay = [...this.currentLog.cardioExercises];
                this.ceDataSource = new ExampleDataSource(this.dataToDisplay);
            } else {
                this.dataToDisplay = [...this.dataToDisplay, this.currentCardioExercise];
                this.ceDataSource.setData(this.dataToDisplay);
            }*/
        } else
            this.swalCompleteRowError();
    }

    /**
     * On blur of form control check the value - if present and valid add to the @var currentExercise | @var currentCardioExercise model.
     * Find correct @var currentExercise | @var currentCardioExercise first to determine which one to update based on @param formCtrlType.
     * @param formCtrlType - form control type to search for
     */
    public checkForExerciseValue(exercise: Exercise | CardioExercise, formCtrlType: string): void {
        //if (!this.dataToDisplay) {
        //    this.dataToDisplay = [...this.currentLog.exercises];
        //    this.dataSource = new ExampleDataSource(this.dataToDisplay);
        // }
        if (exercise.formControlNames.get('name').includes(this.exerciseType)) {
            this.currentExercise = this.currentLog.exercises.find(x => x.exerciseId == exercise.exerciseId);
            let exerciseValue = this.simpleLogForm.get(this.currentExercise.formControlNames.get(formCtrlType)).value;
            switch (formCtrlType) {
                case 'name':
                    exerciseValue.length > 0 ? this.currentExercise.exerciseName = exerciseValue : this.currentExercise.exerciseName = null
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
            switch (formCtrlType) {
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

        //this.dataToDisplay = [...this.currentLog.exercises];
        this.dataSource = new ExampleDataSource(this.currentLog.exercises);
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

        //this.dataToDisplay = [...this.currentLog.cardioExercises];
        this.ceDataSource = new ExampleDataSource(this.currentLog.cardioExercises);
    }

    /**
     * Mat dialog click events to open respective dialogs.
     */
    public openDialog(exercise: CardioExercise): void {
        let dialogRef = this._dialog.open(DurationDialogComponent);
        this.currentCardioExercise = this.currentLog.cardioExercises.find(x => x.exerciseId == exercise.exerciseId);
        this._sharedService.emitCvExercise(this.currentCardioExercise);
        dialogRef.afterClosed().subscribe(result => {
            this.currentCardioExercise = result;
            //console.log(this.currentLog.cardioExercises.find(x => x.exerciseId == exercise.exerciseId));
        });
    }

    public openEmailDialog(): void {
        let dialogRef = this._dialog.open(EmailDialogComponent);
        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.swalEmailSending();
                this.emailAsPDF(result);
            }
        });
    }

    public openExerciseDialog(): void {
        let dialogRef = this._dialog.open(ExerciseDialogComponent);
        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                console.log(`exercise dialog: ${result}`);
                let newExercise: Exercise = result;
                if (!this.currentLog.exercises) {
                    this.currentLog.exercises = new Array<Exercise>();
                }
                this.currentLog.exercises.push(newExercise);
                this.currentExercise = newExercise;
                // Add or update the currentExercise in dataToDisplay
                if (this.currentLog.exercises) {
                   // this.dataToDisplay = [...this.currentLog.exercises];
                    this.dataSource = new ExampleDataSource(this.currentLog.exercises);
                } else {
                    //this.dataToDisplay = [...this.dataToDisplay, this.currentExercise];
                    this.dataSource.setData(this.currentLog.exercises);
                }
            }
        });
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
                    this.intensities = FormValues.ExerciseIntensitiesFR;
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

    private swalEmailSending(): void {
        if (this.currentLanguage == FormValues.ENCode) {
            swal({
                title: 'Sending email...',
                text: 'Please wait',
                icon: 'info',
                buttons: false,
                closeOnClickOutside: false
            });
        } else {
            swal({
                title: 'Envoi d\'un e-mail ...',
                text: 'S\'il vous pla\u00EEt, attendez',
                icon: 'info',
                buttons: false,
                closeOnClickOutside: false
            });
        }
    }

    private swalEmailSent(): void {
        if (this.currentLanguage == FormValues.ENCode) {
            swal({
                title: 'Email Sent',
                text: 'Email has been sent to the provided email address.',
                icon: 'success',
                buttons: false,
                timer: 1500
            });
        } else {
            swal({
                title: 'Email envoy\u00E9',
                text: 'Un e-mail a \u00E9t\u00E9 envoy\u00E9 \u00E0 l\'adresse e-mail fournie.',
                icon: 'success',
                buttons: false,
                timer: 1500
            });
        }
    }

    private swalEmailError(): void {
        if (this.currentLanguage == FormValues.ENCode) {
            swal({
                title: 'Problem Sending Email',
                text: 'There was a problem trying to send to the provided email address. Please try again.',
                icon: 'error',
                showConfirmButton: true
            });
        } else {
            swal({
                title: 'Probl\u00E9me d\'envoi d\'e-mail',
                text: `Un probl\u00E8me est survenu lors de l'envoi à l'adresse e-mail fournie. Veuillez r\u00E9essayer.`,
                icon: 'error',
                showConfirmButton: true
            });
        }
    }
}

class ExampleDataSource extends DataSource<Exercise> {
    private _dataStream = new ReplaySubject<Exercise[]>();

    constructor(initialData: Exercise[]) {
        super();
        this.setData(initialData);
    }

    connect(): Observable<Exercise[]> {
        return this._dataStream;
    }

    disconnect() { }

    setData(data: Exercise[]) {
        this._dataStream.next(data);
    }
}