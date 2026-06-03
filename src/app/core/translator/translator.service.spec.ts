/* tslint:disable:no-unused-variable */

import { TestBed, inject, waitForAsync } from '@angular/core/testing';
import { TranslateService, TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { HttpClientModule } from '@angular/common/http';
import { TRANSLATE_HTTP_LOADER_CONFIG, TranslateHttpLoader } from '@ngx-translate/http-loader';

import { TranslatorService } from './translator.service';

describe('Service: Translator', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                HttpClientModule,
                TranslateModule.forRoot({
                    loader: {
                        provide: TranslateLoader,
                        useClass: TranslateHttpLoader
                    }
                })
            ],
            providers: [
                TranslatorService,
                {
                    provide: TRANSLATE_HTTP_LOADER_CONFIG,
                    useValue: {}
                }
            ]
        });
    });

    it('should ...', inject([TranslatorService], (service: TranslatorService) => {
        expect(service).toBeTruthy();
    }));
});
