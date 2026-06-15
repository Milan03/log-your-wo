import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

/**
 * Broadcasts layout changes that components outside the shell need to react to.
 * The header toggles the sidebar; feature views adjust their own spacing.
 */
@Injectable({
    providedIn: 'root'
})
export class LayoutService {
    private readonly sidebarCollapsedSource = new Subject<boolean>();

    public readonly sidebarCollapsed$: Observable<boolean> = this.sidebarCollapsedSource.asObservable();

    public setSidebarCollapsed(collapsed: boolean): void {
        this.sidebarCollapsedSource.next(collapsed);
    }
}
