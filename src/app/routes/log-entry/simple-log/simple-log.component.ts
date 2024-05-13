import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatTable } from '@angular/material/table';
import { Subscription } from 'rxjs';

import { ExerciseDialogComponent } from '../exercise-dialog/exercise-dialog.component';
import { EmailDialogComponent } from '../email-dialog/email-dialog.component';
import { Exercise } from '../../../shared/models/exercise.model';
import { SimpleLog } from '../../../shared/models/simple-log.model';
import { EmailRequest } from '../../../shared/models/email-request.model';
import { ExerciseDialogData } from '../../../shared/interfaces/exercise-dialog-data';
import { SharedService } from '../../../shared/services/shared.service';
import { TranslatorService } from '../../../core/translator/translator.service';
import { EmailService } from '../../../shared/services/email.service';
import { GoogleAnalyticsService } from '../../../shared/services/google-analytics.service';
import { ExerciseDataSource } from '../../../shared/data-sources/exercise-data-source';
import { CardioExerciseDataSource } from '../../../shared/data-sources/cardio-exercises-data-source';

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
    @ViewChild('exerciseTable', { static: false }) exerciseTable: ElementRef;

    public simpleLogForm: UntypedFormGroup;
    private currentLanguage: string;
    public currentLog: SimpleLog;
    private currentPDF: any
    public dataSource: ExerciseDataSource;
    public cDataSource: CardioExerciseDataSource;
    public sbIsCollapsed: boolean;

    public selectedIntensity: string;

    public readonly exerciseNameCharLimit: number = 50;
    public readonly exerciseNumericCharLimit: number = 5;
    public readonly exerciseAlphaNumericCharLimit: number = 15;
    public readonly titleCharLimit: number = 25;
    public readonly exerciseType: string = FormValues.ExerciseNameFormControl;
    public readonly cardioExerciseType: string = FormValues.CardioExerciseNameFormControl;
    public intensities = FormValues.ExerciseIntensities;
    public displayedColumns: string[] = ['exerciseName', 'weight', 'reps', 'sets', 'controls'];
    public cardioColumns: string[] = ['exerciseName', 'distance', 'duration', 'intensity', 'controls'];

    private langSub: Subscription;
    private sbToggleSub: Subscription;

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
            'title': ['', Validators.compose([Validators.maxLength(25)])]
        });
    }

    ngOnInit(): void {
        this.currentLanguage = FormValues.ENCode;
        this.currentLog = new SimpleLog();
        this._sharedService.emitLogType(LogTypes.SimpleLog);
        this._sharedService.emitLogStartDatim(this.currentLog.startDatim);
        this.subToLanguageChange();
        this.subToSidebarToggleChange();
    }

    ngOnDestroy(): void {
        if (this.langSub)
            this.langSub.unsubscribe();
        if (this.sbToggleSub)
            this.sbToggleSub.unsubscribe();
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
        this._emailService.sendMail(request).subscribe({
            next: () => {
                this.swalEmailSent();
                this._googleAnalyticsService.eventEmitter('email_sent_success', 'general', 'engagement');
            },
            error: () => {
                this.swalEmailError();
            }
        });
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

    public checkForTitleValue(): void {
        let title = this.simpleLogForm.get('title').value;
        if (title)
            this.currentLog.title = title;
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

    public openExerciseDialog(type: string, name?: string): void {
        let data: ExerciseDialogData = { exerciseType: type };
        if (name) {
            data = { ...data, exerciseName: name };
        }
        const dialogRef = this._dialog.open(ExerciseDialogComponent, { data });
        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                let newExercise: Exercise = result;
                if (type === 'strength') {
                    this.currentLog.exercises.push(newExercise);
                    if (this.currentLog.exercises) {
                        this.dataSource = new ExerciseDataSource(this.currentLog.exercises);
                    } else {
                        this.dataSource.setData(this.currentLog.exercises);
                    }
                } else {
                    this.currentLog.cardioExercises.push(newExercise);
                    if (this.currentLog.cardioExercises) {
                        this.cDataSource = new CardioExerciseDataSource(this.currentLog.cardioExercises);
                    } else {
                        this.cDataSource.setData(this.currentLog.cardioExercises);
                    }
                }
            }
        });
    }

    public addRow(exercise: Exercise) {
        let newExercise: Exercise = new Exercise();
        newExercise.exerciseName = exercise.exerciseName;
        this.openExerciseDialog(exercise.exerciseType, exercise.exerciseName);
    }

    public removeRow(exercise: Exercise) {
        if (exercise.exerciseType === 'strength') {
            for (let i = 0; i < this.currentLog.exercises.length; ++i) {
                if (this.currentLog.exercises[i].exerciseId === exercise.exerciseId) {
                    this.currentLog.exercises.splice(i, 1);
                }
            }
            this.dataSource.setData(this.currentLog.exercises);
        } else {
            for (let i = 0; i < this.currentLog.cardioExercises.length; ++i) {
                if (this.currentLog.cardioExercises[i].exerciseId === exercise.exerciseId) {
                    this.currentLog.cardioExercises.splice(i, 1);
                }
            }
            this.cDataSource.setData(this.currentLog.cardioExercises);
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

    private subToSidebarToggleChange(): void {
        this.sbToggleSub = this._sharedService.sidebarToggleEmitted$.subscribe(
            data => {
                this.sbIsCollapsed = data;
            }
        );
    }

    /**
     * Sweet alert prompts.
     */
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