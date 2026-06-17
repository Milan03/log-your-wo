import { TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
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

    afterEach(() => {
        localStorage.removeItem('logYourWo.language');
    });

    it('should initialize', async () => {
        const service = TestBed.inject(TranslatorService);
        await service.initialized;

        expect(service).toBeTruthy();
    });

    it('does not show the loading overlay during the initial language load', async () => {
        const service = TestBed.inject(TranslatorService);
        const loadingStates: boolean[] = [];
        const subscription = service.languageLoading$.subscribe(loading => loadingStates.push(loading));

        await service.initialized;

        expect(loadingStates.every(loading => loading === false)).toBeTrue();
        subscription.unsubscribe();
    });

    it('replays the current language to late subscribers', async () => {
        const service = TestBed.inject(TranslatorService);
        await service.initialized;

        await service.useLanguage('fr-ca');
        let currentLanguage = '';

        service.languageChangeEmitted$.subscribe(language => currentLanguage = language);

        expect(currentLanguage).toBe('fr-ca');
    });

    it('persists the selected language in the browser', async () => {
        const service = TestBed.inject(TranslatorService);
        await service.initialized;

        await service.useLanguage('fr-ca');

        expect(localStorage.getItem('logYourWo.language')).toBe('fr-ca');
    });

    it('publishes loading state around a language switch', async () => {
        const service = TestBed.inject(TranslatorService);
        await service.initialized;

        const loadingStates: boolean[] = [];
        const subscription = service.languageLoading$.subscribe(loading => loadingStates.push(loading));

        await service.useLanguage('fr-ca');

        expect(loadingStates).toContain(true);
        expect(loadingStates[loadingStates.length - 1]).toBeFalse();
        subscription.unsubscribe();
    });
});
