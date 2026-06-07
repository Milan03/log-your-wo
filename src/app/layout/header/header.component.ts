import { Component, OnInit, ViewChild, Injector, OnDestroy, Optional, HostListener } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import screenfull from 'screenfull';

import { UserblockService } from '../sidebar/userblock/userblock.service';
import { SettingsService } from '../../core/settings/settings.service';
import { MenuService } from '../../core/menu/menu.service';
import { SharedService } from '../../shared/services/shared.service';
import { filter, Subscription } from 'rxjs';
import { FormValues, LogTypes } from 'src/app/shared/common/common.constants';
import { TranslatorService } from 'src/app/core/translator/translator.service';
import { AuthService } from '../../core/auth/auth.service';
import { UserDataSyncService } from '../../shared/services/user-data-sync.service';
import { ProfileService } from '../../shared/services/profile.service';

@Component({
    selector: 'app-header',
    standalone: false,
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {
    @ViewChild('fsbutton', { static: true }) fsbutton;  // the fullscreen button

    private currentLanguage: string;

    public navCollapsed = true; // for horizontal layout
    public menuItems = []; // for horizontal layout
    public router: Router;
    public currentLogType: string;
    public logStartDatim: Date;
    public isNavSearchVisible: boolean;
    public showLogActions: boolean = false;
    public signedIn = false;
    public accountLabel = 'Guest';
    public syncError = '';

    private logTypeSub: Subscription;
    private logStartDatimSub: Subscription;
    private langSub: Subscription;
    private routerSub: Subscription;
    private sessionSub: Subscription;
    private syncErrorSub: Subscription;
    private profileSub: Subscription;
    private userEmail = '';
    private sidebarViewport = '';
    constructor(
        public menu: MenuService,
        public userblockService: UserblockService,
        public settings: SettingsService,
        public injector: Injector,
        private _router: Router,
        private sharedService: SharedService,
        private translatorService: TranslatorService,
        @Optional() private authService?: AuthService,
        @Optional() private userDataSync?: UserDataSyncService,
        @Optional() private profileService?: ProfileService
    ) {
        this.currentLogType = undefined;
        this.logStartDatim = new Date();
        this.menuItems = menu.getMenu().slice(0, 4); // for horizontal layout
        this.subToLogType();
        this.subToLogStartDatim();
        this.subToLanguageChange();
        this.subToRouteChange();
        if (this.authService) {
            this.sessionSub = this.authService.session$.subscribe(session => {
                this.signedIn = !!session;
                this.userEmail = session && session.user ? session.user.email || '' : '';
                this.updateAccountLabel();
            });
        }
        if (this.profileService) {
            this.profileSub = this.profileService.profile$.subscribe(() => this.updateAccountLabel());
        }
        if (this.userDataSync) {
            this.syncErrorSub = this.userDataSync.error$.subscribe(error => this.syncError = error);
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

    ngOnDestroy() {
        if (this.logTypeSub)
            this.logTypeSub.unsubscribe();
        if (this.logStartDatimSub)
            this.logStartDatimSub.unsubscribe();
        if (this.langSub)
            this.langSub.unsubscribe();
        if (this.routerSub)
            this.routerSub.unsubscribe();
        if (this.sessionSub)
            this.sessionSub.unsubscribe();
        if (this.syncErrorSub)
            this.syncErrorSub.unsubscribe();
        if (this.profileSub)
            this.profileSub.unsubscribe();
    }

    public sendOpenRequest(type: string): void {
        this.sharedService.emitOpenExerciseDialog(type);
    }

    subToLogType(): void {
        this.logTypeSub = this.sharedService.logTypeEmitted$.subscribe(
            data => this.currentLogType = data
        );
    }

    subToLogStartDatim(): void {
        this.logStartDatimSub = this.sharedService.logStartDatimEmitted$.subscribe(
            data => this.logStartDatim = data
        )
    }

    subToLanguageChange(): void {
        this.langSub = this.translatorService.languageChangeEmitted$.subscribe(
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
        this.routerSub = this._router.events.pipe(
            filter(event => event instanceof NavigationEnd)
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
            this.syncError = 'Unable to log out. Check your connection and try again.';
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
                : 'Guest';
    }

    // toggleFullScreen(event) {
    //     if (screenfull.enabled) {
    //         screenfull.toggle();
    //     }
    // }
}
