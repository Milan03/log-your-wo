/* tslint:disable:no-unused-variable */

import { TestBed } from '@angular/core/testing';
import { FooterComponent } from './footer.component';

import { SettingsService } from '../../core/settings/settings.service';
import { TranslatorService } from '../../core/translator/translator.service';

describe('Component: Footer', () => {

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                SettingsService,
                {
                    provide: TranslatorService,
                    useValue: {
                        language: 'en-ca',
                        getAvailableLanguages: () => [{ code: 'en-ca', text: 'English' }],
                        useLanguage: () => {}
                    }
                }
            ]
        }).compileComponents();
    });

    it('should create an instance', () => {
        const component = TestBed.runInInjectionContext(() => new FooterComponent());
        expect(component).toBeTruthy();
    });
});
