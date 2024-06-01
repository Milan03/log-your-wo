import { Component, OnInit, ViewChild, Injector, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
const screenfull = require('screenfull');

import { UserblockService } from '../sidebar/userblock/userblock.service';
import { SettingsService } from '../../core/settings/settings.service';
import { MenuService } from '../../core/menu/menu.service';
import { SharedService } from '../../shared/services/shared.service';
import { Subscription } from 'rxjs';
import { FormValues, LogTypes } from 'src/app/shared/common/common.constants';
import { TranslatorService } from 'src/app/core/translator/translator.service';

@Component({
    selector: 'app-header',
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {
    private currentLanguage: string;

    navCollapsed = true; // for horizontal layout
    menuItems = []; // for horizontal layout
    router: Router;
    currentLogType: string;
    logStartDatim: Date;

    isNavSearchVisible: boolean;
    @ViewChild('fsbutton', { static: true }) fsbutton;  // the fullscreen button

    logTypeSub: Subscription;
    logStartDatimSub: Subscription;
    langSub: Subscription;

    constructor(
        public menu: MenuService,
        public userblockService: UserblockService,
        public settings: SettingsService,
        public injector: Injector,
        private sharedService: SharedService,
        private translatorService: TranslatorService
    ) {
        // show only a few items on demo
        this.menuItems = menu.getMenu().slice(0, 4); // for horizontal layout
        this.subToLogType();
        this.subToLogStartDatim();
        this.subToLanguageChange();
    }

    ngOnInit() {
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
                    switch(this.currentLogType) {
                        case LogTypes.SimpleLogFR:
                            this.currentLogType = LogTypes.SimpleLog;
                            break;
                    }
                } else {
                    switch(this.currentLogType) {
                        case LogTypes.SimpleLog:
                            this.currentLogType = LogTypes.SimpleLogFR;
                            break;
                    }
                }
            }
        );
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

    // toggleOffsidebar() {
    //     this.settings.toggleLayoutSetting('offsidebarOpen');
    // }

    toggleCollapsedSideabar() {
        this.settings.toggleLayoutSetting('isCollapsed');
        this.sharedService.emitSidebarToggle(this.settings.getLayoutSetting('isCollapsed'));
    }

    isCollapsedText() {
        return this.settings.getLayoutSetting('isCollapsedText');
    }

    // toggleFullScreen(event) {
    //     if (screenfull.enabled) {
    //         screenfull.toggle();
    //     }
    // }
}
