import { TestBed } from '@angular/core/testing';
import { HttpClientModule } from '@angular/common/http';

import { EmailService } from './email.service';

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientModule],
      providers: [EmailService]
    });
    service = TestBed.inject(EmailService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
