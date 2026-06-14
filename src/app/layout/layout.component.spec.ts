import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Session } from '@supabase/supabase-js';
import { BehaviorSubject } from 'rxjs';

import {
    AppInstallNotice,
    AppInstallService
} from '../core/app-install/app-install.service';
import { AuthService } from '../core/auth/auth.service';
import { LayoutComponent } from './layout.component';

describe('LayoutComponent', () => {
    let authSession: BehaviorSubject<Session | null>;
    let installNotice: BehaviorSubject<AppInstallNotice>;
    let appInstall: jasmine.SpyObj<AppInstallService>;
    let changeDetector: jasmine.SpyObj<ChangeDetectorRef>;
    let router: jasmine.SpyObj<Router>;

    beforeEach(() => {
        authSession = new BehaviorSubject<Session | null>(null);
        installNotice = new BehaviorSubject<AppInstallNotice>({ visible: false, device: null });
        appInstall = jasmine.createSpyObj<AppInstallService>('AppInstallService', ['dismiss', 'install'], {
            notice$: installNotice.asObservable()
        });
        appInstall.install.and.resolveTo();
        changeDetector = jasmine.createSpyObj<ChangeDetectorRef>('ChangeDetectorRef', ['markForCheck']);
        router = jasmine.createSpyObj<Router>('Router', ['navigate'], { url: '/home' });
        router.navigate.and.resolveTo(true);

        TestBed.configureTestingModule({
            providers: [
                { provide: AuthService, useValue: { session$: authSession.asObservable() } },
                { provide: AppInstallService, useValue: appInstall },
                { provide: ChangeDetectorRef, useValue: changeDetector },
                { provide: Router, useValue: router }
            ]
        });
        localStorage.removeItem('logYourWo.guestNoticeDismissed');
    });

    afterEach(() => {
        localStorage.removeItem('logYourWo.guestNoticeDismissed');
    });

    it('creates the layout', () => {
        const component = createComponent();

        expect(component).toBeTruthy();
    });

    it('shows the guest notice and responds to install availability', () => {
        const component = createComponent();
        component.ngOnInit();

        expect(component.showGuestNotice).toBeTrue();

        installNotice.next({ visible: true, device: 'android' });

        expect(component.showInstallNotice).toBeTrue();
        expect(component.installDevice).toBe('android');
        expect(changeDetector.markForCheck).toHaveBeenCalled();
    });

    it('dismisses install notices through the install service', () => {
        const component = createComponent();

        component.dismissInstallNotice();

        expect(appInstall.dismiss).toHaveBeenCalledTimes(1);
    });

    function createComponent(): LayoutComponent {
        return TestBed.runInInjectionContext(() => new LayoutComponent());
    }
});
