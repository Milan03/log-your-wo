import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { WorkoutExportContext, WorkoutExportService } from './workout-export.service';
import { WorkoutPdfService } from './workout-pdf.service';
import { EmailService } from './email.service';
import { GoogleAnalyticsService } from './google-analytics.service';
import { TranslatorService } from '../../core/translator/translator.service';
import { EmailRequest } from '../models/email-request.model';
import { SimpleLog } from '../models/simple-log.model';
import { FormValues } from '../common/common.constants';

describe('WorkoutExportService', () => {
    let service: WorkoutExportService;
    let pdfService: jasmine.SpyObj<WorkoutPdfService>;
    let emailService: jasmine.SpyObj<EmailService>;
    let analytics: jasmine.SpyObj<GoogleAnalyticsService>;

    beforeEach(() => {
        pdfService = jasmine.createSpyObj<WorkoutPdfService>('WorkoutPdfService', ['create', 'getFileName']);
        emailService = jasmine.createSpyObj<EmailService>('EmailService', ['sendMail']);
        analytics = jasmine.createSpyObj<GoogleAnalyticsService>('GoogleAnalyticsService', ['eventEmitter']);

        TestBed.configureTestingModule({
            providers: [
                WorkoutExportService,
                { provide: WorkoutPdfService, useValue: pdfService },
                { provide: EmailService, useValue: emailService },
                { provide: GoogleAnalyticsService, useValue: analytics },
                {
                    provide: TranslatorService,
                    useValue: {
                        translate: {
                            instant: (key: string) => key,
                            currentLang: FormValues.ENCode,
                            getDefaultLang: () => FormValues.ENCode
                        }
                    }
                }
            ]
        });
        service = TestBed.inject(WorkoutExportService);

        // Suppress the global SweetAlert2 dialogs while asserting on their triggers.
        spyOn<any>(service, 'swalEmailSending');
        spyOn<any>(service, 'swalEmailSent');
        spyOn<any>(service, 'swalEmailError');
        spyOn<any>(service, 'swalPdfError');
    });

    function logWith(title?: string, date = new Date(2026, 5, 7)): SimpleLog {
        const log = new SimpleLog();
        log.title = title;
        log.startDatim = date;
        return log;
    }

    function context(overrides: Partial<WorkoutExportContext> = {}): WorkoutExportContext {
        return {
            log: logWith(),
            weightMeasure: 'lbs',
            distanceMeasure: 'km',
            elapsedTimeLabel: '00:00',
            language: FormValues.ENCode,
            ...overrides
        };
    }

    it('saves the generated PDF and emits success analytics', async () => {
        const save = jasmine.createSpy('save');
        pdfService.create.and.returnValue(Promise.resolve({ save } as any));
        pdfService.getFileName.and.returnValue('workout.pdf');

        await service.savePdf(context());

        expect(save).toHaveBeenCalledWith('workout.pdf');
        expect(analytics.eventEmitter).toHaveBeenCalledWith('pdf_saved_success', 'general', 'engagement');
    });

    it('shows a PDF error and skips success analytics when generation fails on save', async () => {
        pdfService.create.and.returnValue(Promise.reject(new Error('font failed')));

        await service.savePdf(context());

        expect((service as any).swalPdfError).toHaveBeenCalled();
        expect(analytics.eventEmitter).not.toHaveBeenCalled();
    });

    it('does not send mail when PDF generation fails', async () => {
        pdfService.create.and.returnValue(Promise.reject(new Error('font failed')));

        await service.emailPdf('test@example.com', context());

        expect((service as any).swalPdfError).toHaveBeenCalled();
        expect(emailService.sendMail).not.toHaveBeenCalled();
    });

    it('sends the generated PDF with the recipient, attachment, and filename', async () => {
        pdfService.create.and.returnValue(Promise.resolve({
            output: () => 'data:application/pdf;base64,JVBERi0xLjQ='
        } as any));
        pdfService.getFileName.and.returnValue('sunday-training-2026-06-07.pdf');
        emailService.sendMail.and.returnValue(of('sent'));

        await service.emailPdf('athlete@example.com', context({ log: logWith('Sunday Training') }));

        const request = emailService.sendMail.calls.mostRecent().args[0] as EmailRequest;
        expect(request.toEmailAddress).toBe('athlete@example.com');
        expect(request.attachments).toEqual(['JVBERi0xLjQ=']);
        expect(request.attachmentFilename).toBe('sunday-training-2026-06-07.pdf');
        expect(analytics.eventEmitter).toHaveBeenCalledWith('email_sent_success', 'general', 'engagement');
    });
});
