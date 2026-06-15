import { ChangeDetectorRef, signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { Session } from '@supabase/supabase-js';
import { BehaviorSubject, Subject } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { FormValues, LogTypes } from '../../shared/common/common.constants';
import { createDefaultProfile, UserProfile } from '../../shared/models/profile.model';
import { ProfileService } from '../../shared/services/profile.service';
import { SharedService } from '../../shared/services/shared.service';
import { UserDataSyncService } from '../../shared/services/user-data-sync.service';
import { SettingsService } from '../../core/settings/settings.service';
import { ThemesService } from '../../core/themes/themes.service';
import { TranslatorService } from '../../core/translator/translator.service';
import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
    let authSession: BehaviorSubject<Session | null>;
    let changeDetector: jasmine.SpyObj<ChangeDetectorRef>;
    let profile: BehaviorSubject<UserProfile>;
    let router: jasmine.SpyObj<Router>;
    let routerEvents: Subject<NavigationEnd>;
    let syncError: WritableSignal<string>;
    let language: BehaviorSubject<string>;

    beforeEach(() => {
        authSession = new BehaviorSubject<Session | null>(null);
        profile = new BehaviorSubject<UserProfile>(createDefaultProfile());
        routerEvents = new Subject<NavigationEnd>();
        syncError = signal('');
        language = new BehaviorSubject(FormValues.ENCode);
        changeDetector = jasmine.createSpyObj<ChangeDetectorRef>('ChangeDetectorRef', ['markForCheck']);
        router = jasmine.createSpyObj<Router>('Router', ['navigate'], {
            events: routerEvents.asObservable(),
            url: '/home'
        });
        router.navigate.and.resolveTo(true);

        TestBed.configureTestingModule({
            providers: [
                SettingsService,
                SharedService,
                ThemesService,
                { provide: ChangeDetectorRef, useValue: changeDetector },
                { provide: Router, useValue: router },
                { provide: AuthService, useValue: { session$: authSession.asObservable(), signOut: () => Promise.resolve() } },
                {
                    provide: ProfileService,
                    useValue: {
                        profile$: profile.asObservable(),
                        getDisplayName: (email?: string) => email ? email.split('@')[0] : 'Guest'
                    }
                },
                { provide: UserDataSyncService, useValue: { error: syncError.asReadonly() } },
                {
                    provide: TranslatorService,
                    useValue: {
                        languageChangeEmitted$: language.asObservable(),
                        translate: { instant: (key: string) => key }
                    }
                }
            ]
        });
    });

    it('creates the header', () => {
        const component = createComponent();

        expect(component).toBeTruthy();
    });

    it('expands on desktop, uses compact labels on tablet, and uses a full mobile drawer', () => {
        const settings = TestBed.inject(SettingsService);
        const component = createComponent();

        const widthSpy = spyOnProperty(window, 'innerWidth').and.returnValue(1200);
        component.syncSidebarForViewport();
        expect(settings.getLayoutSetting('isCollapsed')).toBeFalse();

        widthSpy.and.returnValue(800);
        component.syncSidebarForViewport();
        expect(settings.getLayoutSetting('isCollapsed')).toBeFalse();
        expect(settings.getLayoutSetting('isCollapsedText')).toBeTrue();

        widthSpy.and.returnValue(500);
        component.syncSidebarForViewport();
        expect(settings.getLayoutSetting('isCollapsed')).toBeFalse();
        expect(settings.getLayoutSetting('isCollapsedText')).toBeFalse();
    });

    it('updates log state and localizes the simple log title', () => {
        const shared = TestBed.inject(SharedService);
        const component = createComponent();
        const startDate = new Date(2026, 5, 14, 18, 30);

        shared.emitLogType(LogTypes.SimpleLog);
        shared.emitLogStartDatim(startDate);
        language.next(FormValues.FRCode);

        expect(component.currentLogType).toBe(LogTypes.SimpleLogFR);
        expect(component.logStartDatim).toBe(startDate);
        expect(changeDetector.markForCheck).toHaveBeenCalled();
    });

    it('updates route actions and sync warnings from observable state', () => {
        const component = createComponent();

        routerEvents.next(new NavigationEnd(1, '/home', '/log-entry/simple-log'));
        syncError.set('Offline');

        expect(component.showLogActions).toBeTrue();
        expect(component.syncError()).toBe('Offline');
    });

    it('toggles dark mode without closing the account menu', () => {
        const themes = TestBed.inject(ThemesService);
        const component = createComponent();
        spyOn(themes, 'toggleDarkMode');
        const event = jasmine.createSpyObj<MouseEvent>('MouseEvent', ['stopPropagation']);

        component.toggleDarkMode(event);

        expect(event.stopPropagation).toHaveBeenCalledTimes(1);
        expect(themes.toggleDarkMode).toHaveBeenCalledTimes(1);
    });

    function createComponent(): HeaderComponent {
        return TestBed.runInInjectionContext(() => new HeaderComponent());
    }
});
