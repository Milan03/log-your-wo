/* tslint:disable:no-unused-variable */

import { TestBed, waitForAsync } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { TranslateModule } from '@ngx-translate/core';
import { TRANSLATE_HTTP_LOADER_CONFIG } from '@ngx-translate/http-loader';

import { CoreModule } from './core/core.module';
import { LayoutModule } from './layout/layout.module';
import { SharedModule } from './shared/shared.module';
import { RoutesModule } from './routes/routes.module';
import { APP_BASE_HREF } from '@angular/common';

describe('App: log-your-wo', () => {
    beforeEach(() => {

        jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;

        TestBed.configureTestingModule({
            declarations: [
                AppComponent
            ],
            imports: [
                TranslateModule.forRoot(),
                CoreModule,
                LayoutModule,
                SharedModule,
                RoutesModule
            ],
            providers: [
                { provide: APP_BASE_HREF, useValue: '/' },
                {
                    provide: TRANSLATE_HTTP_LOADER_CONFIG,
                    useValue: {}
                }
            ]
        });
    });

    it('should create the app', waitForAsync(() => {
        let fixture = TestBed.createComponent(AppComponent);
        let app = fixture.debugElement.componentInstance;
        expect(app).toBeTruthy();
    }));

});
