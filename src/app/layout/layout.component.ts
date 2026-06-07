import { Component, OnDestroy, OnInit, Optional } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

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
    private sessionSub: Subscription;

    constructor(
        @Optional() private auth?: AuthService,
        @Optional() private router?: Router
    ) { }

    ngOnInit() {
        if (!this.auth) {
            return;
        }
        this.sessionSub = this.auth.session$.subscribe(session => {
            this.signedIn = !!session;
            this.showGuestNotice = !session && localStorage.getItem('logYourWo.guestNoticeDismissed') !== 'true';
        });
    }

    ngOnDestroy(): void {
        if (this.sessionSub) {
            this.sessionSub.unsubscribe();
        }
    }

    public dismissGuestNotice(): void {
        localStorage.setItem('logYourWo.guestNoticeDismissed', 'true');
        this.showGuestNotice = false;
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
