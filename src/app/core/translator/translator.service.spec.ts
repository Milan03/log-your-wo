/* tslint:disable:no-unused-variable */

import { TestBed, inject, waitForAsync } from '@angular/core/testing';
import { TranslateService, TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { HttpClientModule } from '@angular/common/http';
import { TRANSLATE_HTTP_LOADER_CONFIG, TranslateHttpLoader } from '@ngx-translate/http-loader';

import { TranslatorService } from './translator.service';

describe('Service: Translator', () => {
    beforeEach(() => {
        localStorage.removeItem('logYourWo.language');
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

    it('replays the current language to late subscribers', inject([TranslatorService], async (service: TranslatorService) => {
        await service.useLanguage('fr-ca');
        let currentLanguage = '';

        service.languageChangeEmitted$.subscribe(language => currentLanguage = language);

        expect(currentLanguage).toBe('fr-ca');
    }));

    it('persists the selected language in the browser', inject([TranslatorService], async (service: TranslatorService) => {
        await service.useLanguage('fr-ca');

        expect(localStorage.getItem('logYourWo.language')).toBe('fr-ca');
    }));

    it('publishes loading state around a language switch', inject([TranslatorService], async (service: TranslatorService) => {
        const loadingStates: boolean[] = [];
        const subscription = service.languageLoading$.subscribe(loading => loadingStates.push(loading));

        await service.useLanguage('fr-ca');

        expect(loadingStates).toContain(true);
        expect(loadingStates[loadingStates.length - 1]).toBeFalse();
        subscription.unsubscribe();
    }));
});
