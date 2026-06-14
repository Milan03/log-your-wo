import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Event as RouterEvent, Router } from '@angular/router';
import { Subject } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { MenuService } from '../../core/menu/menu.service';
import { SettingsService } from '../../core/settings/settings.service';
import { SidebarComponent } from './sidebar.component';

describe('SidebarComponent', () => {
    let component: SidebarComponent;
    let document: Document;
    let router: jasmine.SpyObj<Router>;
    let routerEvents: Subject<RouterEvent>;
    let settings: SettingsService;

    beforeEach(() => {
        routerEvents = new Subject<RouterEvent>();
        router = jasmine.createSpyObj<Router>('Router', ['navigate'], {
            events: routerEvents.asObservable(),
            url: '/home'
        });
        router.navigate.and.resolveTo(true);

        TestBed.configureTestingModule({
            providers: [
                MenuService,
                SettingsService,
                { provide: AuthService, useValue: null },
                { provide: Router, useValue: router }
            ]
        });

        document = TestBed.inject(DOCUMENT);
        settings = TestBed.inject(SettingsService);
        component = TestBed.runInInjectionContext(() => new SidebarComponent());
    });

    afterEach(() => {
        document.querySelectorAll('.aside-container, .nav-floating').forEach(element => element.remove());
    });

    it('creates the sidebar', () => {
        expect(component).toBeTruthy();
    });

    it('closes the mobile sidebar after an outside click', () => {
        settings.setLayoutSetting('asideToggled', true);
        const outside = document.createElement('button');

        component.onDocumentClick({ target: outside } as unknown as MouseEvent);

        expect(settings.getLayoutSetting('asideToggled')).toBeFalse();
    });

    it('keeps the mobile sidebar open after an inside click', () => {
        const aside = document.createElement('app-sidebar');
        aside.classList.add('aside-container');
        const inside = document.createElement('button');
        aside.appendChild(inside);
        document.body.appendChild(aside);
        settings.setLayoutSetting('asideToggled', true);

        component.onDocumentClick({ target: inside } as unknown as MouseEvent);

        expect(settings.getLayoutSetting('asideToggled')).toBeTrue();
    });

    it('opens and closes an inline submenu', () => {
        const { anchor, submenu } = createSubmenu(document);
        Object.defineProperty(submenu, 'scrollHeight', { configurable: true, value: 120 });
        const event = { currentTarget: anchor, preventDefault: jasmine.createSpy() } as unknown as MouseEvent;

        component.toggleSubmenuClick(event);

        expect(submenu.classList.contains('opening')).toBeTrue();
        expect(submenu.style.height).toBe('120px');

        component.toggleSubmenuClick(event);

        expect(submenu.classList.contains('opening')).toBeFalse();
        expect(submenu.style.height).toBe('0px');
    });

    it('creates a floating submenu and delegates cloned route navigation', () => {
        settings.setLayoutSetting('isCollapsed', true);
        const aside = document.createElement('app-sidebar');
        aside.classList.add('aside-container');
        const asideInner = document.createElement('div');
        asideInner.classList.add('aside-inner');
        const sidebar = document.createElement('nav');
        sidebar.classList.add('sidebar');
        const { item, anchor, submenu } = createSubmenu(document);
        const routeLink = document.createElement('a');
        routeLink.setAttribute('route', '/profile');
        submenu.appendChild(routeLink);
        sidebar.appendChild(item);
        asideInner.appendChild(sidebar);
        aside.appendChild(asideInner);
        document.body.appendChild(aside);

        component.toggleSubmenuHover({
            currentTarget: anchor,
            preventDefault: jasmine.createSpy()
        } as unknown as MouseEvent);

        const floatingRoute = aside.querySelector<HTMLAnchorElement>('.nav-floating a[route]');
        expect(floatingRoute).not.toBeNull();
        if (!floatingRoute) {
            return;
        }

        component.onDocumentClick({
            target: floatingRoute,
            preventDefault: jasmine.createSpy()
        } as unknown as MouseEvent);

        expect(router.navigate).toHaveBeenCalledOnceWith(['/profile']);
    });
});

function createSubmenu(document: Document): {
    item: HTMLLIElement;
    anchor: HTMLAnchorElement;
    submenu: HTMLUListElement;
} {
    const item = document.createElement('li');
    const anchor = document.createElement('a');
    const submenu = document.createElement('ul');
    submenu.classList.add('sidebar-subnav');
    item.append(anchor, submenu);
    return { item, anchor, submenu };
}
