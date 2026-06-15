import { DOCUMENT, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { MatRippleModule } from '@angular/material/core';
import { TranslateModule } from '@ngx-translate/core';
import { filter } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { MenuItem, MenuService } from '../../core/menu/menu.service';
import { SettingsService } from '../../core/settings/settings.service';

@Component({
    selector: 'app-sidebar',
    standalone: true,
    imports: [
        NgClass,
        RouterModule,
        TranslateModule,
        MatRippleModule
    ],
    templateUrl: './sidebar.component.html',
    styleUrls: ['./sidebar.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent implements OnInit, OnDestroy {
    public readonly menuItems: MenuItem[];
    public readonly signedIn = signal(false);

    private readonly auth = inject(AuthService, { optional: true });
    private readonly destroyRef = inject(DestroyRef);
    private readonly document = inject(DOCUMENT);
    private readonly menu = inject(MenuService);
    private readonly router = inject(Router);
    public readonly settings = inject(SettingsService);

    private floatingNav: HTMLElement | null = null;

    constructor() {
        this.menuItems = this.menu.getMenu();
        this.auth?.session$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(session => this.signedIn.set(!!session));
    }

    public ngOnInit(): void {
        this.router.events.pipe(
            filter((event): event is NavigationEnd => event instanceof NavigationEnd),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(() => {
            this.removeFloatingNav();
            this.document.defaultView?.scrollTo(0, 0);
            this.settings.setLayoutSetting('asideToggled', false);
        });
    }

    public ngOnDestroy(): void {
        this.removeFloatingNav();
    }

    @HostListener('document:click', ['$event'])
    public onDocumentClick(event: MouseEvent): void {
        const target = event.target;
        if (!(target instanceof Element)) {
            return;
        }

        const floatingRoute = target.closest('a[route]') as HTMLAnchorElement | null;
        if (floatingRoute?.closest('.nav-floating')) {
            const route = floatingRoute.getAttribute('route');
            if (route) {
                event.preventDefault();
                void this.router.navigate([route]);
            }
        }

        if (!target.closest('.aside-container')) {
            this.settings.setLayoutSetting('asideToggled', false);
            this.removeFloatingNav();
        }
    }

    public toggleSubmenuClick(event: MouseEvent): void {
        const submenu = this.getSubmenu(event);
        if (!submenu) {
            return;
        }

        event.preventDefault();
        if (this.usesFloatingNavigation()) {
            this.openFloatingNav(event, submenu);
            return;
        }

        this.removeFloatingNav();
        const ancestorSubmenus = new Set(
            this.getAncestors(submenu).filter(element => element.classList.contains('sidebar-subnav'))
        );

        this.document.querySelectorAll<HTMLElement>('.sidebar-subnav:not(.nav-floating)').forEach(candidate => {
            if (candidate !== submenu && !ancestorSubmenus.has(candidate)) {
                this.closeMenu(candidate);
            }
        });
        submenu.querySelectorAll<HTMLElement>('.sidebar-subnav').forEach(child => this.closeMenu(child));

        const isOpen = submenu.classList.contains('opening')
            || this.document.defaultView?.getComputedStyle(submenu).height === 'auto'
            || parseFloat(submenu.style.height) > 0;
        if (isOpen) {
            this.closeMenu(submenu);
            return;
        }

        submenu.style.height = `${submenu.scrollHeight}px`;
        submenu.classList.add('opening');
        submenu.addEventListener('transitionend', () => {
            if (submenu.classList.contains('opening')) {
                submenu.style.height = 'auto';
            }
        }, { once: true });
    }

    public toggleSubmenuHover(event: MouseEvent): void {
        if (!this.usesFloatingNavigation()) {
            return;
        }

        const submenu = this.getSubmenu(event);
        if (!submenu) {
            return;
        }

        event.preventDefault();
        this.openFloatingNav(event, submenu);
    }

    public isSidebarCollapsed(): boolean {
        return this.settings.getLayoutSetting('isCollapsed');
    }

    public isSidebarCollapsedText(): boolean {
        return this.settings.getLayoutSetting('isCollapsedText');
    }

    public isEnabledHover(): boolean {
        return this.settings.getLayoutSetting('asideHover');
    }

    public openSignIn(): void {
        void this.router.navigate(['/auth'], {
            queryParams: { returnUrl: this.router.url }
        });
    }

    public async signOut(): Promise<void> {
        if (!this.auth) {
            return;
        }
        await this.auth.signOut();
        await this.router.navigate(['/home']);
    }

    private openFloatingNav(event: MouseEvent, submenu: HTMLElement): void {
        const anchor = event.currentTarget;
        const aside = this.document.querySelector<HTMLElement>('.aside-container');
        const asideInner = aside?.querySelector<HTMLElement>(':scope > .aside-inner');
        const sidebar = asideInner?.querySelector<HTMLElement>(':scope > .sidebar');
        if (!(anchor instanceof HTMLElement) || !aside || !asideInner || !sidebar) {
            return;
        }

        this.removeFloatingNav();
        const floatingNav = submenu.cloneNode(true) as HTMLElement;
        floatingNav.classList.add('nav-floating');
        floatingNav.classList.remove('opening');
        aside.appendChild(floatingNav);

        const asideStyles = this.document.defaultView?.getComputedStyle(aside);
        const innerStyles = this.document.defaultView?.getComputedStyle(asideInner);
        const paddingTop = this.pixelValue(asideStyles?.paddingTop) + this.pixelValue(innerStyles?.paddingTop);
        const itemTop = (anchor.parentElement?.offsetTop || 0) + paddingTop - sidebar.scrollTop;
        const viewportHeight = this.document.documentElement.clientHeight || this.document.body.clientHeight;
        const navHeight = this.outerHeight(floatingNav) + 2;
        const safeOffset = Math.min(navHeight, 200);
        const displacement = 25;
        const menuTop = viewportHeight - itemTop > safeOffset
            ? itemTop
            : viewportHeight - safeOffset - displacement;

        floatingNav.style.position = this.settings.getLayoutSetting('isFixed') ? 'fixed' : 'absolute';
        floatingNav.style.top = `${menuTop}px`;
        floatingNav.style.bottom = navHeight + menuTop > viewportHeight ? `${displacement}px` : 'auto';
        floatingNav.addEventListener('mouseleave', () => {
            if (this.floatingNav === floatingNav) {
                this.removeFloatingNav();
            }
        });

        this.floatingNav = floatingNav;
    }

    private closeMenu(submenu: HTMLElement): void {
        submenu.style.height = `${submenu.scrollHeight}px`;
        void submenu.offsetHeight;
        submenu.style.height = '0px';
        submenu.classList.remove('opening');
    }

    private removeFloatingNav(): void {
        this.floatingNav?.remove();
        this.floatingNav = null;
        this.document.querySelectorAll('.nav-floating').forEach(element => element.remove());
    }

    private getSubmenu(event: MouseEvent): HTMLElement | null {
        const anchor = event.currentTarget;
        const submenu = anchor instanceof HTMLElement ? anchor.nextElementSibling : null;
        return submenu instanceof HTMLElement && submenu.classList.contains('sidebar-subnav')
            ? submenu
            : null;
    }

    private getAncestors(element: HTMLElement): HTMLElement[] {
        const ancestors: HTMLElement[] = [];
        let current = element.parentElement;
        while (current) {
            ancestors.push(current);
            current = current.parentElement;
        }
        return ancestors;
    }

    private usesFloatingNavigation(): boolean {
        return this.isSidebarCollapsed() || this.isSidebarCollapsedText() || this.isEnabledHover();
    }

    private outerHeight(element: HTMLElement): number {
        const styles = this.document.defaultView?.getComputedStyle(element);
        return element.getBoundingClientRect().height
            + this.pixelValue(styles?.marginTop)
            + this.pixelValue(styles?.marginBottom);
    }

    private pixelValue(value?: string): number {
        const parsed = parseFloat(value || '0');
        return Number.isFinite(parsed) ? parsed : 0;
    }
}
