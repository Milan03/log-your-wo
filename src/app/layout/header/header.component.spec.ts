/* tslint:disable:no-unused-variable */

import { Injector } from '@angular/core';
import { TranslateService, TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { HttpClientModule } from '@angular/common/http';
import { UntypedFormBuilder } from '@angular/forms';
import { provideRouter, Router } from '@angular/router';
import { TRANSLATE_HTTP_LOADER_CONFIG, TranslateHttpLoader } from '@ngx-translate/http-loader';
import { TestBed, inject, waitForAsync } from '@angular/core/testing';
import { HeaderComponent } from './header.component';

import { SettingsService } from '../../core/settings/settings.service';
import { MenuService } from '../../core/menu/menu.service';
import { TranslatorService } from '../../core/translator/translator.service';
import { SharedService } from '../../shared/services/shared.service';
import { UserblockService } from '../sidebar/userblock/userblock.service';

describe('Component: Header', () => {
    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                TranslateModule.forRoot({
                    loader: {
                        provide: TranslateLoader,
                        useClass: TranslateHttpLoader
                    }
                }),
                HttpClientModule
            ],
            providers: [
                UntypedFormBuilder,
                MenuService,
                UserblockService,
                SettingsService,
                SharedService,
                TranslatorService,
                Injector,
                provideRouter([]),
                {
                    provide: TRANSLATE_HTTP_LOADER_CONFIG,
                    useValue: {}
                }
            ]
        }).compileComponents();
    });

    it('should create an instance', waitForAsync(
        inject(
            [UntypedFormBuilder, MenuService, UserblockService, SettingsService, Injector, Router, SharedService, TranslatorService],
            (formBuilder, menuService, userblockService, settingsService, injector, router, sharedService, translator) => {
                let component = new HeaderComponent(
                    formBuilder,
                    menuService,
                    userblockService,
                    settingsService,
                    injector,
                    router,
                    sharedService,
                    translator
                );
                expect(component).toBeTruthy();
            }
        )
    ));
});
