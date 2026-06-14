import { inject, Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';

import { EmailService } from './email.service';
import { GoogleAnalyticsService } from './google-analytics.service';
import {
    WorkoutPdfData,
    WorkoutPdfLabels,
    WorkoutPdfService
} from './workout-pdf.service';
import { TranslatorService } from '../../core/translator/translator.service';
import { EmailRequest } from '../models/email-request.model';
import { DistanceMeasure, SimpleLog, WeightMeasure } from '../models/simple-log.model';
import { FormValues } from '../common/common.constants';

const swal = require('sweetalert');

/**
 * Snapshot of the workout state needed to render and deliver a workout PDF.
 */
export interface WorkoutExportContext {
    log: SimpleLog;
    weightMeasure: WeightMeasure;
    distanceMeasure: DistanceMeasure;
    elapsedTimeLabel: string;
    language: string;
    startedAt?: string;
    completedAt?: string;
    pausedAt?: string;
    importedWorkout?: { weekName: string; dayName: string };
}

/**
 * Orchestrates workout PDF generation, file download, and email delivery,
 * including the user-facing progress/error feedback and analytics events.
 */
@Injectable({ providedIn: 'root' })
export class WorkoutExportService {
    private _workoutPdfService = inject(WorkoutPdfService);
    private _emailService = inject(EmailService);
    private _translatorService = inject(TranslatorService);
    private _googleAnalyticsService = inject(GoogleAnalyticsService);

    /**
     * Generate the workout PDF and trigger a browser download.
     */
    public async savePdf(context: WorkoutExportContext): Promise<void> {
        let createdPDF: jsPDF;
        try {
            createdPDF = await this._workoutPdfService.create(this.buildPdfData(context));
        } catch {
            this.swalPdfError();
            return;
        }
        createdPDF.save(this._workoutPdfService.getFileName(context.log));
        this._googleAnalyticsService.eventEmitter('pdf_saved_success', 'general', 'engagement');
    }

    /**
     * Generate the workout PDF and email it to the given recipient.
     */
    public async emailPdf(recipientEmailAddress: string, context: WorkoutExportContext): Promise<void> {
        this.swalEmailSending();
        let pdfBase64: string;
        try {
            const createdPDF = await this._workoutPdfService.create(this.buildPdfData(context));
            pdfBase64 = createdPDF.output('datauristring').split(',')[1];
        } catch {
            this.swalPdfError();
            return;
        }
        const request = this.buildEmailRequest(recipientEmailAddress, context, pdfBase64);
        this._emailService.sendMail(request).subscribe({
            next: () => {
                this.swalEmailSent();
                this._googleAnalyticsService.eventEmitter('email_sent_success', 'general', 'engagement');
            },
            error: () => this.swalEmailError()
        });
    }

    private buildPdfData(context: WorkoutExportContext): WorkoutPdfData {
        const locale = this._translatorService.translate.currentLang
            || this._translatorService.translate.getDefaultLang()
            || context.language;
        return {
            log: context.log,
            weightMeasure: context.weightMeasure,
            distanceMeasure: context.distanceMeasure,
            elapsedTimeLabel: context.elapsedTimeLabel,
            locale,
            labels: this.buildPdfLabels(),
            startedAt: context.startedAt,
            completedAt: context.completedAt,
            pausedAt: context.pausedAt,
            importedWorkout: context.importedWorkout
        };
    }

    private buildPdfLabels(): WorkoutPdfLabels {
        const translate = (key: string) => this._translatorService.translate.instant(key);
        return {
            workoutLog: translate('pdf.WorkoutLog'),
            simpleWorkoutLog: translate('pdf.SimpleWorkoutLog'),
            importedWorkout: translate('pdf.ImportedWorkout'),
            strength: translate('pdf.Strength'),
            cardio: translate('pdf.Cardio'),
            exercise: translate('pdf.Exercise'),
            prescription: translate('pdf.Prescription'),
            weight: translate('pdf.Weight'),
            reps: translate('pdf.Reps'),
            sets: translate('pdf.Sets'),
            distance: translate('pdf.Distance'),
            duration: translate('pdf.Duration'),
            intensity: translate('pdf.Intensity'),
            status: translate('pdf.Status'),
            workoutDate: translate('pdf.WorkoutDate'),
            elapsedTime: translate('pdf.ElapsedTime'),
            units: translate('pdf.Units'),
            programWeek: translate('pdf.ProgramWeek'),
            programDay: translate('pdf.ProgramDay'),
            complete: translate('pdf.Complete'),
            incomplete: translate('pdf.Incomplete'),
            completed: translate('pdf.Completed'),
            paused: translate('pdf.Paused'),
            inProgress: translate('pdf.InProgress'),
            notStarted: translate('pdf.NotStarted'),
            notAvailable: translate('pdf.NotAvailable'),
            generatedBy: translate('pdf.GeneratedBy'),
            page: translate('pdf.Page'),
            of: translate('pdf.Of'),
            intensityNames: {
                1: translate('pdf.Easy'),
                2: translate('pdf.Moderate'),
                3: translate('pdf.Hard'),
                4: translate('pdf.Maximal')
            }
        };
    }

    /**
     * Build the email request, picking subject prefix from the log title and
     * body/locale from the active language.
     */
    private buildEmailRequest(
        recipientEmailAddress: string,
        context: WorkoutExportContext,
        pdfBase64: string
    ): EmailRequest {
        const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const isEnglish = context.language == FormValues.ENCode;
        const localeCode = isEnglish ? FormValues.ENCode : FormValues.FRCode;
        const body = isEnglish ? FormValues.EmailBody : FormValues.EmailBodyFR;
        const namePrefix = context.log.title || FormValues.LogYourWorkout;
        const subject = `${namePrefix} - ${context.log.startDatim.toLocaleDateString(localeCode, options)}`;
        return new EmailRequest(
            FormValues.NoReplyEmailAddress,
            recipientEmailAddress,
            subject,
            [pdfBase64],
            body,
            context.log.startDatim.toDateString(),
            this._workoutPdfService.getFileName(context.log)
        );
    }

    private swalEmailSending(): void {
        swal({
            title: this.t('log-entry.SendingEmail'),
            text: this.t('log-entry.PleaseWait'),
            icon: 'info',
            buttons: false,
            closeOnClickOutside: false
        });
    }

    private swalEmailSent(): void {
        swal({
            title: this.t('log-entry.EmailSent'),
            text: this.t('log-entry.EmailSentDescription'),
            icon: 'success',
            buttons: false,
            timer: 1500
        });
    }

    private swalEmailError(): void {
        swal({
            title: this.t('log-entry.EmailError'),
            text: this.t('log-entry.EmailErrorDescription'),
            icon: 'error',
            button: true
        });
    }

    private swalPdfError(): void {
        swal({
            title: this.t('log-entry.PdfError'),
            text: this.t('log-entry.PdfErrorDescription'),
            icon: 'error',
            button: true
        });
    }

    private t(key: string, params?: object): string {
        return this._translatorService.translate.instant(key, params);
    }
}
