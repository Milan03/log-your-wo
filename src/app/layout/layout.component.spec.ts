import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Session } from '@supabase/supabase-js';
import { BehaviorSubject } from 'rxjs';

import { AppInstallNotice, AppInstallService } from '../core/app-install/app-install.service';
import { AuthService } from '../core/auth/auth.service';
import { LayoutComponent } from './layout.component';

describe('LayoutComponent', () => {
    let authSession: BehaviorSubject<Session | null>;
    let installNotice: WritableSignal<AppInstallNotice>;
    let appInstall: jasmine.SpyObj<AppInstallService>;
    let router: jasmine.SpyObj<Router>;

    beforeEach(() => {
        authSession = new BehaviorSubject<Session | null>(null);
        installNotice = signal<AppInstallNotice>({ visible: false, device: null });
        appInstall = jasmine.createSpyObj<AppInstallService>('AppInstallService', ['dismiss', 'install'], {
            notice: installNotice.asReadonly()
        });
        appInstall.install.and.resolveTo();
        router = jasmine.createSpyObj<Router>('Router', ['navigate'], { url: '/home' });
        router.navigate.and.resolveTo(true);

        TestBed.configureTestingModule({
            providers: [
                { provide: AuthService, useValue: { session$: authSession.asObservable() } },
                { provide: AppInstallService, useValue: appInstall },
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

        expect(component.showGuestNotice()).toBeTrue();

        installNotice.set({ visible: true, device: 'android' });

        expect(component.installNotice()).toEqual({ visible: true, device: 'android' });
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
