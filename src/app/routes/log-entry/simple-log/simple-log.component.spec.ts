import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { HttpClientModule } from '@angular/common/http';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TRANSLATE_HTTP_LOADER_CONFIG, TranslateHttpLoader } from '@ngx-translate/http-loader';

import { SimpleLogComponent } from './simple-log.component';
import { SharedModule } from '../../../shared/shared.module';
import { EmailService } from '../../../shared/services/email.service';
import { TranslatorService } from '../../../core/translator/translator.service';

describe('SimpleLogComponent', () => {
  let component: SimpleLogComponent;
  let fixture: ComponentFixture<SimpleLogComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        HttpClientModule,
        NoopAnimationsModule,
        SharedModule,
        TranslateModule.forRoot({
          loader: {
            provide: TranslateLoader,
            useClass: TranslateHttpLoader
          }
        })
      ],
      declarations: [ SimpleLogComponent ],
      providers: [
        EmailService,
        {
          provide: TRANSLATE_HTTP_LOADER_CONFIG,
          useValue: {}
        },
        TranslatorService
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SimpleLogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
