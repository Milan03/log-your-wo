/* tslint:disable:no-unused-variable */

import { Injector } from '@angular/core';
import { TranslateService, TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { HttpClientModule } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { TRANSLATE_HTTP_LOADER_CONFIG, TranslateHttpLoader } from '@ngx-translate/http-loader';
import { TestBed, inject, waitForAsync } from '@angular/core/testing';
import { HeaderComponent } from './header.component';

import { SettingsService } from '../../core/settings/settings.service';
import { MenuService } from '../../core/menu/menu.service';
import { TranslatorService } from '../../core/translator/translator.service';
import { SharedService } from '../../shared/services/shared.service';
import { UserblockService } from '../sidebar/userblock/userblock.service';
import { ThemesService } from '../../core/themes/themes.service';

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
                MenuService,
                UserblockService,
                SettingsService,
                SharedService,
                TranslatorService,
                ThemesService,
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
            [MenuService, UserblockService, SettingsService, Injector, Router, SharedService, TranslatorService, ThemesService],
            (menuService, userblockService, settingsService, injector, router, sharedService, translator, themes) => {
                let component = new HeaderComponent(
                    menuService,
                    userblockService,
                    settingsService,
                    injector,
                    router,
                    sharedService,
                    translator,
                    themes
                );
                expect(component).toBeTruthy();
            }
        )
    ));

    it('should expand on desktop, use compact labels on tablet, and use a full mobile drawer', inject(
        [MenuService, UserblockService, SettingsService, Injector, Router, SharedService, TranslatorService, ThemesService],
        (menuService, userblockService, settingsService, injector, router, sharedService, translator, themes) => {
            const component = new HeaderComponent(
                menuService,
                userblockService,
                settingsService,
                injector,
                router,
                sharedService,
                translator,
                themes
            );

            const widthSpy = spyOnProperty(window, 'innerWidth').and.returnValue(1200);
            component.syncSidebarForViewport();
            expect(settingsService.getLayoutSetting('isCollapsed')).toBeFalse();

            widthSpy.and.returnValue(800);
            component.syncSidebarForViewport();
            expect(settingsService.getLayoutSetting('isCollapsed')).toBeFalse();
            expect(settingsService.getLayoutSetting('isCollapsedText')).toBeTrue();

            widthSpy.and.returnValue(500);
            component.syncSidebarForViewport();
            expect(settingsService.getLayoutSetting('isCollapsed')).toBeFalse();
            expect(settingsService.getLayoutSetting('isCollapsedText')).toBeFalse();
        }
    ));

    it('toggles the shared dark mode preference', inject(
        [MenuService, UserblockService, SettingsService, Injector, Router, SharedService, TranslatorService, ThemesService],
        (menuService, userblockService, settingsService, injector, router, sharedService, translator, themes) => {
            const component = new HeaderComponent(
                menuService,
                userblockService,
                settingsService,
                injector,
                router,
                sharedService,
                translator,
                themes
            );
            spyOn(themes, 'toggleDarkMode');

            component.toggleDarkMode();

            expect(themes.toggleDarkMode).toHaveBeenCalledTimes(1);
            component.ngOnDestroy();
        }
    ));
});
