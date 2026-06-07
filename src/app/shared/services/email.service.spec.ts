import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { EmailService } from './email.service';
import { EmailRequest } from '../models/email-request.model';
import { environment } from 'src/environments/environment';

describe('EmailService', () => {
  let service: EmailService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [EmailService]
    });
    service = TestBed.inject(EmailService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('posts a PDF email request to the configured mail endpoint', () => {
    const request = new EmailRequest(
      'noreply@logyourworkout.app',
      'athlete@example.com',
      'Sunday workout',
      ['JVBERi0xLjQ='],
      '<p>Attached workout.</p>',
      'Sun Jun 07 2026',
      'sunday-workout-2026-06-07.pdf'
    );

    service.sendMail(request).subscribe(response => {
      expect(response).toBe('sent');
    });

    const httpRequest = httpTestingController.expectOne(`${environment.apiBaseAddress}/sendmail`);
    expect(httpRequest.request.method).toBe('POST');
    expect(httpRequest.request.body).toEqual(request);
    expect(httpRequest.request.responseType).toBe('text');
    httpRequest.flush('sent');
  });
});
