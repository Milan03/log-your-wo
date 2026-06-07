import { Component, OnDestroy, OnInit, Optional } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { AppInstallDevice, AppInstallService } from '../core/app-install/app-install.service';
import { AuthService } from '../core/auth/auth.service';

@Component({
    selector: 'app-layout',
    standalone: false,
    templateUrl: './layout.component.html',
    styleUrls: ['./layout.component.scss']
})
export class LayoutComponent implements OnInit, OnDestroy {
    public signedIn = false;
    public showGuestNotice = false;
    public showInstallNotice = false;
    public installDevice: AppInstallDevice | null = null;
    private sessionSub: Subscription;
    private installNoticeSub: Subscription;

    constructor(
        @Optional() private auth?: AuthService,
        @Optional() private router?: Router,
        @Optional() private appInstall?: AppInstallService
    ) { }

    ngOnInit() {
        if (this.auth) {
            this.sessionSub = this.auth.session$.subscribe(session => {
                this.signedIn = !!session;
                this.showGuestNotice = !session && localStorage.getItem('logYourWo.guestNoticeDismissed') !== 'true';
            });
        }

        if (this.appInstall) {
            this.installNoticeSub = this.appInstall.notice$.subscribe(notice => {
                this.showInstallNotice = notice.visible;
                this.installDevice = notice.device;
            });
        }
    }

    ngOnDestroy(): void {
        if (this.sessionSub) {
            this.sessionSub.unsubscribe();
        }
        if (this.installNoticeSub) {
            this.installNoticeSub.unsubscribe();
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
