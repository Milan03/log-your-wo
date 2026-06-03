/* tslint:disable:no-unused-variable */

import { ElementRef } from '@angular/core';
import { TestBed, inject, waitForAsync } from '@angular/core/testing';
import { OffsidebarComponent } from './offsidebar.component';
import { TranslateService, TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { HttpClientModule } from '@angular/common/http';
import { TRANSLATE_HTTP_LOADER_CONFIG, TranslateHttpLoader } from '@ngx-translate/http-loader';

import { SettingsService } from '../../core/settings/settings.service';
import { ThemesService } from '../../core/themes/themes.service';
import { TranslatorService } from '../../core/translator/translator.service';
import { SharedModule } from '../../shared/shared.module';

export class MockElementRef extends ElementRef {
    constructor() { super(null); }
}

describe('Component: Offsidebar', () => {

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                TranslateModule.forRoot({
                    loader: {
                        provide: TranslateLoader,
                        useClass: TranslateHttpLoader
                    }
                }),
                HttpClientModule,
                SharedModule
            ],
            providers: [
                SettingsService,
                ThemesService,
                TranslatorService,
                MockElementRef,
                {
                    provide: TRANSLATE_HTTP_LOADER_CONFIG,
                    useValue: {}
                }
            ]
        }).compileComponents();
    });

    it('should create an instance', waitForAsync(inject([SettingsService, ThemesService, TranslatorService, MockElementRef],
        (settingsService, themesService, translatorService, mockElementRef) => {
            let component = new OffsidebarComponent(settingsService, themesService, translatorService, mockElementRef);
            expect(component).toBeTruthy();
        })));
});
