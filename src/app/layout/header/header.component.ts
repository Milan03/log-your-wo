import { DatePipe, DOCUMENT, UpperCasePipe } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    HostListener,
    inject,
    OnInit,
    signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { TranslateModule } from '@ngx-translate/core';
import { filter } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { FormValues, LogTypes } from '../../shared/common/common.constants';
import { ProfileService } from '../../shared/services/profile.service';
import { LayoutService } from '../../shared/services/layout.service';
import { WorkoutHeaderService } from '../../shared/services/workout-header.service';
import { WorkoutInteractionService } from '../../shared/services/workout-interaction.service';
import { UserDataSyncService } from '../../shared/services/user-data-sync.service';
import { SettingsService } from '../../core/settings/settings.service';
import { ThemesService } from '../../core/themes/themes.service';
import { TranslatorService } from '../../core/translator/translator.service';

@Component({
    selector: 'app-header',
    standalone: true,
    imports: [
        DatePipe,
        UpperCasePipe,
        TranslateModule,
        MatMenuModule
    ],
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderComponent implements OnInit {
    public readonly currentLogType = signal<string | undefined>(undefined);
    public readonly logStartDatim = signal(new Date());
    public readonly showLogActions = signal(false);
    public readonly signedIn = signal(false);
    public readonly accountLabel = signal('Guest');
    private readonly logoutError = signal('');

    private readonly authService = inject(AuthService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly document = inject(DOCUMENT);
    private readonly profileService = inject(ProfileService);
    private readonly router = inject(Router);
    private readonly layoutService = inject(LayoutService);
    private readonly workoutHeader = inject(WorkoutHeaderService);
    private readonly workoutInteraction = inject(WorkoutInteractionService);
    private readonly themesService = inject(ThemesService);
    private readonly translatorService = inject(TranslatorService);
    private readonly userDataSync = inject(UserDataSyncService);
    public readonly settings = inject(SettingsService);
    public readonly syncError = computed(() => this.logoutError() || this.userDataSync.error());

    private sidebarViewport = '';
    private userEmail = '';

    constructor() {
        this.subscribeToLogState();
        this.subscribeToAccountState();
        this.subscribeToRouteChanges();
    }

    public ngOnInit(): void {
        this.syncSidebarForViewport();
    }

    public sendOpenRequest(type: string): void {
        this.workoutInteraction.requestExerciseDialog(type);
    }

    public toggleOffsidebar(): void {
        this.settings.toggleLayoutSetting('offsidebarOpen');
    }

    public toggleCollapsedSidebar(): void {
        const viewportWidth = this.document.defaultView?.innerWidth || 0;
        if (viewportWidth >= 768 && viewportWidth < 992) {
            this.settings.toggleLayoutSetting('isCollapsedText');
            this.settings.setLayoutSetting('isCollapsed', false);
            this.layoutService.setSidebarCollapsed(this.settings.getLayoutSetting('isCollapsedText'));
            return;
        }

        this.settings.toggleLayoutSetting('isCollapsed');
        this.settings.setLayoutSetting('isCollapsedText', false);
        this.layoutService.setSidebarCollapsed(this.settings.getLayoutSetting('isCollapsed'));
    }

    public async signOut(): Promise<void> {
        try {
            await this.authService.signOut();
            await this.router.navigate(['/home']);
        } catch {
            this.logoutError.set(this.translatorService.translate.instant('layout.LogoutError'));
        }
    }

    public openProfile(): void {
        void this.router.navigate(['/profile']);
    }

    public openSignIn(): void {
        void this.router.navigate(['/auth'], {
            queryParams: { returnUrl: this.router.url }
        });
    }

    public get darkMode(): boolean {
        return this.themesService.darkMode();
    }

    public toggleDarkMode(event?: MouseEvent): void {
        event?.stopPropagation();
        this.themesService.toggleDarkMode();
    }

    @HostListener('window:resize')
    public syncSidebarForViewport(): void {
        const viewportWidth = this.document.defaultView?.innerWidth || 0;
        const viewport = viewportWidth >= 992
            ? 'desktop'
            : viewportWidth >= 768
                ? 'tablet'
                : 'mobile';
        if (this.sidebarViewport === viewport) {
            return;
        }

        this.sidebarViewport = viewport;
        this.settings.setLayoutSetting('isCollapsed', false);
        this.settings.setLayoutSetting('isCollapsedText', viewport === 'tablet');
        this.settings.setLayoutSetting('asideToggled', false);
        this.layoutService.setSidebarCollapsed(viewport === 'tablet');
    }

    private subscribeToLogState(): void {
        this.workoutHeader.logType$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(logType => this.currentLogType.set(logType));
        this.workoutHeader.logStartDate$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(startDate => this.logStartDatim.set(startDate));
        this.translatorService.languageChangeEmitted$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(language => {
                if (language === FormValues.ENCode && this.currentLogType() === LogTypes.SimpleLogFR) {
                    this.currentLogType.set(LogTypes.SimpleLog);
                } else if (language !== FormValues.ENCode && this.currentLogType() === LogTypes.SimpleLog) {
                    this.currentLogType.set(LogTypes.SimpleLogFR);
                }
            });
    }

    private subscribeToAccountState(): void {
        this.authService.session$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(session => {
                this.signedIn.set(!!session);
                this.userEmail = session?.user.email || '';
                this.updateAccountLabel();
            });
        this.profileService.profile$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.updateAccountLabel());
    }

    private subscribeToRouteChanges(): void {
        this.updateLogActionVisibility(this.router.url);
        this.router.events.pipe(
            filter((event): event is NavigationEnd => event instanceof NavigationEnd),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(event => this.updateLogActionVisibility(event.urlAfterRedirects));
    }

    private updateLogActionVisibility(url: string): void {
        this.showLogActions.set(url.startsWith('/log-entry/simple-log')
            || url.startsWith('/log-entry/import-program/workout'));
    }

    private updateAccountLabel(): void {
        this.accountLabel.set(this.profileService.getDisplayName(this.signedIn() ? this.userEmail : undefined));
    }
}
