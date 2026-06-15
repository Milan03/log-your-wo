import {
    ApplicationConfig,
    inject,
    isDevMode,
    provideAppInitializer,
    provideZoneChangeDetection
} from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

import { MenuService } from './core/menu/menu.service';
import { SettingsService } from './core/settings/settings.service';
import { ThemesService } from './core/themes/themes.service';
import { TranslatorService } from './core/translator/translator.service';
import { menu } from './routes/menu';
import { routes } from './routes/routes';

export const appConfig: ApplicationConfig = {
    providers: [
        provideZoneChangeDetection(),
        provideHttpClient(),
        provideAnimationsAsync(),
        provideRouter(routes),
        provideTranslateService({
            loader: provideTranslateHttpLoader({
                prefix: './assets/i18n/',
                suffix: '.json'
            })
        }),
        provideServiceWorker('ngsw-worker.js', {
            enabled: !isDevMode(),
            registrationStrategy: 'registerWhenStable:30000'
        }),
        SettingsService,
        ThemesService,
        TranslatorService,
        MenuService,
        provideAppInitializer(() => {
            inject(MenuService).addMenu(menu);
        })
    ]
};
