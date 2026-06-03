/* tslint:disable:no-unused-variable */

import { TestBed, inject, waitForAsync } from '@angular/core/testing';
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
                        getAvailableLanguages: () => [{ code: 'en-ca' }],
                        useLanguage: () => {}
                    }
                }
            ]
        }).compileComponents();
    });

    it('should create an instance', waitForAsync(inject([SettingsService, TranslatorService], (settingsService, translatorService) => {
        let component = new FooterComponent(settingsService, translatorService);
        expect(component).toBeTruthy();
    })));
});
