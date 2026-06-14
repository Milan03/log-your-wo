import { Component, DestroyRef, HostBinding, HostListener, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

import { SettingsService } from './core/settings/settings.service';
import { ThemesService } from './core/themes/themes.service';
import { TranslatorService } from './core/translator/translator.service';
import { SeoData, SeoService } from './core/seo/seo.service';
import { GoogleAnalyticsService } from './shared/services/google-analytics.service';

/** Applied to any route that does not declare its own `data.seo`. */
const DEFAULT_SEO: SeoData = {
    title: 'Free Workout Tracker, Log & Program Importer',
    rawTitle: false,
    description: 'Log Your Workout is a free workout tracker and gym log. Record strength and cardio '
        + 'sessions, import Excel workout programs, track week/day plans, export PDFs, and sync to the '
        + 'cloud — on mobile and desktop.',
    keywords: 'workout tracker, workout log, gym workout tracker, strength training log, workout journal',
    path: '/'
};

@Component({
    selector: 'app-root',
    standalone: false,
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent {
    private readonly destroyRef = inject(DestroyRef);

    @HostBinding('class.layout-fixed') get isFixed() { return this._settings.getLayoutSetting('isFixed'); };
    @HostBinding('class.aside-collapsed') get isCollapsed() { return this._settings.getLayoutSetting('isCollapsed'); };
    @HostBinding('class.layout-boxed') get isBoxed() { return this._settings.getLayoutSetting('isBoxed'); };
    @HostBinding('class.layout-fs') get useFullLayout() { return this._settings.getLayoutSetting('useFullLayout'); };
    @HostBinding('class.hidden-footer') get hiddenFooter() { return this._settings.getLayoutSetting('hiddenFooter'); };
    @HostBinding('class.layout-h') get horizontal() { return this._settings.getLayoutSetting('horizontal'); };
    @HostBinding('class.aside-float') get isFloat() { return this._settings.getLayoutSetting('isFloat'); };
    @HostBinding('class.offsidebar-open') get offsidebarOpen() { return this._settings.getLayoutSetting('offsidebarOpen'); };
    @HostBinding('class.aside-toggled') get asideToggled() { return this._settings.getLayoutSetting('asideToggled'); };
    @HostBinding('class.aside-collapsed-text') get isCollapsedText() { return this._settings.getLayoutSetting('isCollapsedText'); };

    constructor(
        public _settings: SettingsService,
        public _router: Router,
        private _activatedRoute: ActivatedRoute,
        private _seo: SeoService,
        private _googleAnalytics: GoogleAnalyticsService,
        themes: ThemesService,
        public translator: TranslatorService
    ) {
        // Construction applies the saved theme before routed content initializes.
        void themes;
        this._router.events.pipe(
            filter((event): event is NavigationEnd => event instanceof NavigationEnd),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(event => {
            this._googleAnalytics.pageView(event.urlAfterRedirects);
            this.applySeo(event.urlAfterRedirects);
        });
    }

    @HostListener('document:click', ['$event'])
    public preventEmptyLinkNavigation(event: MouseEvent): void {
        const target = event.target;
        if (target instanceof HTMLAnchorElement && ['', '#'].includes(target.getAttribute('href') || '')) {
            event.preventDefault();
        }
    }

    /** Walk to the deepest activated route and apply its `data.seo`, or a default. */
    private applySeo(url: string): void {
        let route = this._activatedRoute;
        while (route.firstChild) {
            route = route.firstChild;
        }
        const seo = route.snapshot.data['seo'] as SeoData | undefined;
        if (seo) {
            // Routes may omit `path`; default it to the resolved URL.
            this._seo.update({ ...seo, path: seo.path || url.split('?')[0].split('#')[0] });
        } else {
            this._seo.update(DEFAULT_SEO);
        }
    }
}
