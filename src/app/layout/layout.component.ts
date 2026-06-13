import { Component, DestroyRef, inject, OnInit, Optional } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { AppInstallDevice, AppInstallService } from '../core/app-install/app-install.service';
import { AuthService } from '../core/auth/auth.service';

@Component({
    selector: 'app-layout',
    standalone: false,
    templateUrl: './layout.component.html',
    styleUrls: ['./layout.component.scss']
})
export class LayoutComponent implements OnInit {
    public signedIn = false;
    public showGuestNotice = false;
    public showInstallNotice = false;
    public installDevice: AppInstallDevice | null = null;
    private readonly destroyRef = inject(DestroyRef);

    constructor(
        @Optional() private auth?: AuthService,
        @Optional() private router?: Router,
        @Optional() private appInstall?: AppInstallService
    ) { }

    ngOnInit() {
        if (this.auth) {
            this.auth.session$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(session => {
                this.signedIn = !!session;
                this.showGuestNotice = !session && localStorage.getItem('logYourWo.guestNoticeDismissed') !== 'true';
            });
        }

        if (this.appInstall) {
            this.appInstall.notice$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(notice => {
                this.showInstallNotice = notice.visible;
                this.installDevice = notice.device;
            });
        }
    }

    public dismissGuestNotice(): void {
        localStorage.setItem('logYourWo.guestNoticeDismissed', 'true');
        this.showGuestNotice = false;
    }

    public dismissInstallNotice(): void {
        this.appInstall?.dismiss();
    }

    public async installApp(): Promise<void> {
        await this.appInstall?.install();
    }

    public openAccount(): void {
        if (!this.router) {
            return;
        }
        void this.router.navigate(['/auth'], {
            queryParams: { returnUrl: this.router.url }
        });
    }
}
