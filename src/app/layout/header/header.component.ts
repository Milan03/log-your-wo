import { Component, OnInit, ViewChild, Injector, HostListener, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import screenfull from 'screenfull';

import { UserblockService } from '../sidebar/userblock/userblock.service';
import { SettingsService } from '../../core/settings/settings.service';
import { MenuItem, MenuService } from '../../core/menu/menu.service';
import { SharedService } from '../../shared/services/shared.service';
import { filter } from 'rxjs';
import { FormValues, LogTypes } from 'src/app/shared/common/common.constants';
import { TranslatorService } from 'src/app/core/translator/translator.service';
import { AuthService } from '../../core/auth/auth.service';
import { UserDataSyncService } from '../../shared/services/user-data-sync.service';
import { ProfileService } from '../../shared/services/profile.service';
import { ThemesService } from '../../core/themes/themes.service';

@Component({
    selector: 'app-header',
    standalone: false,
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
    @ViewChild('fsbutton', { static: true }) fsbutton;  // the fullscreen button

    private currentLanguage: string;

    public navCollapsed = true; // for horizontal layout
    public menuItems: MenuItem[] = []; // for horizontal layout
    public router: Router;
    public currentLogType: string;
    public logStartDatim: Date;
    public isNavSearchVisible: boolean;
    public showLogActions: boolean = false;
    public signedIn = false;
    public accountLabel = 'Guest';
    public syncError = '';

    private readonly destroyRef = inject(DestroyRef);
    private userEmail = '';
    private sidebarViewport = '';

    public menu = inject(MenuService);
    public userblockService = inject(UserblockService);
    public settings = inject(SettingsService);
    public injector = inject(Injector);
    private _router = inject(Router);
    private sharedService = inject(SharedService);
    private translatorService = inject(TranslatorService);
    private themesService = inject(ThemesService);
    private authService = inject(AuthService, { optional: true });
    private userDataSync = inject(UserDataSyncService, { optional: true });
    private profileService = inject(ProfileService, { optional: true });

    constructor() {
        this.currentLogType = undefined;
        this.logStartDatim = new Date();
        this.menuItems = this.menu.getMenu().slice(0, 4); // for horizontal layout
        this.subToLogType();
        this.subToLogStartDatim();
        this.subToLanguageChange();
        this.subToRouteChange();
        if (this.authService) {
            this.authService.session$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(session => {
                this.signedIn = !!session;
                this.userEmail = session && session.user ? session.user.email || '' : '';
                this.updateAccountLabel();
            });
        }
        if (this.profileService) {
            this.profileService.profile$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.updateAccountLabel());
        }
        if (this.userDataSync) {
            this.userDataSync.error$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(error => this.syncError = error);
        }
    }

    ngOnInit() {
        this.syncSidebarForViewport();
        // this.isNavSearchVisible = false;

        // var ua = window.navigator.userAgent;
        // if (ua.indexOf("MSIE ") > 0 || !!ua.match(/Trident.*rv\:11\./)) { // Not supported under IE
        //     this.fsbutton.nativeElement.style.display = 'none';
        // }

        // // Switch fullscreen icon indicator
        // const el = this.fsbutton.nativeElement.firstElementChild;
        // screenfull.on('change', () => {
        //     if (el)
        //         el.className = screenfull.isFullscreen ? 'fa fa-compress' : 'fa fa-expand';
        // });

        // this.router = this.injector.get(Router);

        // // Autoclose navbar on mobile when route change
        // this.router.events.subscribe((val) => {
        //     // scroll view to top
        //     window.scrollTo(0, 0);
        //     // close collapse menu
        //     this.navCollapsed = true;
        // });

    }

    public sendOpenRequest(type: string): void {
        this.sharedService.emitOpenExerciseDialog(type);
    }

    subToLogType(): void {
        this.sharedService.logTypeEmitted$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(
            data => this.currentLogType = data
        );
    }

    subToLogStartDatim(): void {
        this.sharedService.logStartDatimEmitted$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(
            data => this.logStartDatim = data
        )
    }

    subToLanguageChange(): void {
        this.translatorService.languageChangeEmitted$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(
            data => {
                this.currentLanguage = data;
                if (this.currentLanguage == FormValues.ENCode) {
                    switch (this.currentLogType) {
                        case LogTypes.SimpleLogFR:
                            this.currentLogType = LogTypes.SimpleLog;
                            break;
                    }
                } else {
                    switch (this.currentLogType) {
                        case LogTypes.SimpleLog:
                            this.currentLogType = LogTypes.SimpleLogFR;
                            break;
                    }
                }
            }
        );
    }

    private subToRouteChange(): void {
        this.updateLogActionVisibility(this._router.url);
        this._router.events.pipe(
            filter(event => event instanceof NavigationEnd),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe((event: NavigationEnd) => {
            this.updateLogActionVisibility(event.urlAfterRedirects);
        });
    }

    private updateLogActionVisibility(url: string): void {
        this.showLogActions = url.startsWith('/log-entry/simple-log') || url.startsWith('/log-entry/import-program/workout');
    }

    // toggleUserBlock(event) {
    //     event.preventDefault();
    //     this.userblockService.toggleVisibility();
    // }

    // openNavSearch(event) {
    //     event.preventDefault();
    //     event.stopPropagation();
    //     this.setNavSearchVisible(true);
    // }

    // setNavSearchVisible(stat: boolean) {
    //     // console.log(stat);
    //     this.isNavSearchVisible = stat;
    // }

    // getNavSearchVisible() {
    //     return this.isNavSearchVisible;
    // }

     toggleOffsidebar() {
         this.settings.toggleLayoutSetting('offsidebarOpen');
     }

    toggleCollapsedSideabar() {
        if (window.innerWidth >= 768 && window.innerWidth < 992) {
            this.settings.toggleLayoutSetting('isCollapsedText');
            this.settings.setLayoutSetting('isCollapsed', false);
            this.sharedService.emitSidebarToggle(this.settings.getLayoutSetting('isCollapsedText'));
            return;
        }

        this.settings.toggleLayoutSetting('isCollapsed');
        this.settings.setLayoutSetting('isCollapsedText', false);
        this.sharedService.emitSidebarToggle(this.settings.getLayoutSetting('isCollapsed'));
    }

    isCollapsedText() {
        return this.settings.getLayoutSetting('isCollapsedText');
    }

    public async signOut(): Promise<void> {
        if (!this.authService) {
            return;
        }

        try {
            await this.authService.signOut();
            await this._router.navigate(['/home']);
        } catch {
            this.syncError = this.translatorService.translate.instant('layout.LogoutError');
        }
    }

    public openProfile(): void {
        void this._router.navigate(['/profile']);
    }

    public openSignIn(): void {
        void this._router.navigate(['/auth'], {
            queryParams: { returnUrl: this._router.url }
        });
    }

    public get darkMode(): boolean {
        return this.themesService.isDarkMode();
    }

    public toggleDarkMode(): void {
        this.themesService.toggleDarkMode();
    }

    @HostListener('window:resize')
    public syncSidebarForViewport(): void {
        const viewport = window.innerWidth >= 992
            ? 'desktop'
            : window.innerWidth >= 768
                ? 'tablet'
                : 'mobile';
        if (this.sidebarViewport === viewport) {
            return;
        }

        this.sidebarViewport = viewport;
        this.settings.setLayoutSetting('isCollapsed', false);
        this.settings.setLayoutSetting('isCollapsedText', viewport === 'tablet');
        this.settings.setLayoutSetting('asideToggled', false);
        this.sharedService.emitSidebarToggle(viewport === 'tablet');
    }

    private updateAccountLabel(): void {
        this.accountLabel = this.profileService
            ? this.profileService.getDisplayName(this.signedIn ? this.userEmail : undefined)
            : this.signedIn && this.userEmail
                ? this.userEmail.split('@')[0]
                : this.translatorService.translate.instant('global.Guest');
    }

    // toggleFullScreen(event) {
    //     if (screenfull.enabled) {
    //         screenfull.toggle();
    //     }
    // }
}
