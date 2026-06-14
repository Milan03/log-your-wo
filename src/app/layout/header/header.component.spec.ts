import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { HttpClientModule } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { TRANSLATE_HTTP_LOADER_CONFIG, TranslateHttpLoader } from '@ngx-translate/http-loader';
import { TestBed } from '@angular/core/testing';
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
                provideRouter([]),
                {
                    provide: TRANSLATE_HTTP_LOADER_CONFIG,
                    useValue: {}
                }
            ]
        });
    });

    it('should create an instance', () => {
        const component = TestBed.runInInjectionContext(() => new HeaderComponent());

        expect(component).toBeTruthy();
    });

    it('should expand on desktop, use compact labels on tablet, and use a full mobile drawer', () => {
        const settingsService = TestBed.inject(SettingsService);
        const component = TestBed.runInInjectionContext(() => new HeaderComponent());

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
    });

    it('toggles the shared dark mode preference', () => {
        const themes = TestBed.inject(ThemesService);
        const component = TestBed.runInInjectionContext(() => new HeaderComponent());
        spyOn(themes, 'toggleDarkMode');

        component.toggleDarkMode();

        expect(themes.toggleDarkMode).toHaveBeenCalledTimes(1);
    });
});
