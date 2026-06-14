import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { AppInstallDevice, AppInstallService } from '../core/app-install/app-install.service';
import { AuthService } from '../core/auth/auth.service';

@Component({
    selector: 'app-layout',
    standalone: false,
    templateUrl: './layout.component.html',
    styleUrls: ['./layout.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LayoutComponent implements OnInit {
    public showGuestNotice = false;
    public showInstallNotice = false;
    public installDevice: AppInstallDevice | null = null;
    private readonly appInstall = inject(AppInstallService);
    private readonly auth = inject(AuthService);
    private readonly changeDetector = inject(ChangeDetectorRef);
    private readonly destroyRef = inject(DestroyRef);
    private readonly router = inject(Router);

    public ngOnInit(): void {
        this.auth.session$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(session => {
            this.showGuestNotice = !session && localStorage.getItem('logYourWo.guestNoticeDismissed') !== 'true';
            this.changeDetector.markForCheck();
        });
        this.appInstall.notice$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(notice => {
            this.showInstallNotice = notice.visible;
            this.installDevice = notice.device;
            this.changeDetector.markForCheck();
        });
    }

    public dismissGuestNotice(): void {
        localStorage.setItem('logYourWo.guestNoticeDismissed', 'true');
        this.showGuestNotice = false;
    }

    public dismissInstallNotice(): void {
        this.appInstall.dismiss();
    }

    public async installApp(): Promise<void> {
        await this.appInstall.install();
    }

    public openAccount(): void {
        void this.router.navigate(['/auth'], {
            queryParams: { returnUrl: this.router.url }
        });
    }
}
