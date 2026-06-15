/* tslint:disable:no-unused-variable */

import { provideHttpClient } from '@angular/common/http';
import { TestBed, waitForAsync } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import { AppComponent } from './app.component';
import { SettingsService } from './core/settings/settings.service';
import { ThemesService } from './core/themes/themes.service';
import { TranslatorService } from './core/translator/translator.service';

describe('App: log-your-wo', () => {
    beforeEach(() => {

        jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;

        TestBed.configureTestingModule({
            imports: [
                AppComponent
            ],
            providers: [
                provideHttpClient(),
                provideRouter([]),
                provideTranslateService(),
                SettingsService,
                ThemesService,
                TranslatorService
            ]
        });
    });

    it('should create the app', waitForAsync(() => {
        const fixture = TestBed.createComponent(AppComponent);
        const app = fixture.debugElement.componentInstance;
        expect(app).toBeTruthy();
    }));

});
