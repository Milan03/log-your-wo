import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { AppInstallService } from '../core/app-install/app-install.service';
import { AuthService } from '../core/auth/auth.service';
import { SharedModule } from '../shared/shared.module';
import { HeaderComponent } from './header/header.component';
import { OffsidebarComponent } from './offsidebar/offsidebar.component';
import { SidebarComponent } from './sidebar/sidebar.component';

@Component({
    selector: 'app-layout',
    standalone: true,
    imports: [
        SharedModule,
        HeaderComponent,
        SidebarComponent,
        OffsidebarComponent
    ],
    templateUrl: './layout.component.html',
    styleUrls: ['./layout.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LayoutComponent {
    private readonly appInstall = inject(AppInstallService);
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly session = toSignal(this.auth.session$, { initialValue: null });
    private readonly guestNoticeDismissed = signal(
        localStorage.getItem('logYourWo.guestNoticeDismissed') === 'true'
    );

    public readonly showGuestNotice = computed(() =>
        !this.session() && !this.guestNoticeDismissed()
    );
    public readonly installNotice = this.appInstall.notice;

    public dismissGuestNotice(): void {
        localStorage.setItem('logYourWo.guestNoticeDismissed', 'true');
        this.guestNoticeDismissed.set(true);
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
