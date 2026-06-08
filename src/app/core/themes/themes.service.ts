import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable()
export class ThemesService {

    private readonly darkModeStorageKey = 'logYourWo.darkMode';
    private readonly darkModeClass = 'app-dark-mode';
    private readonly darkModeSource = new Subject<boolean>();
    private darkModeEnabled: boolean;

    public readonly darkMode$ = this.darkModeSource.asObservable();

    constructor() {
        this.darkModeEnabled = this.readDarkMode();
        this.applyDarkMode(this.darkModeEnabled);
    }

    public isDarkMode(): boolean {
        return this.darkModeEnabled;
    }

    public setDarkMode(enabled: boolean): void {
        if (this.darkModeEnabled === enabled) {
            return;
        }

        this.darkModeEnabled = enabled;
        this.applyDarkMode(enabled);

        try {
            localStorage.setItem(this.darkModeStorageKey, String(enabled));
        } catch {
            // The selected mode still applies when storage is unavailable.
        }

        this.darkModeSource.next(enabled);
    }

    public toggleDarkMode(): void {
        this.setDarkMode(!this.isDarkMode());
    }

    private readDarkMode(): boolean {
        try {
            return localStorage.getItem(this.darkModeStorageKey) === 'true';
        } catch {
            return false;
        }
    }

    private applyDarkMode(enabled: boolean): void {
        if (typeof document === 'undefined') {
            return;
        }

        document.documentElement.classList.toggle(this.darkModeClass, enabled);
        document.documentElement.style.colorScheme = enabled ? 'dark' : 'light';

        const themeColor = document.querySelector('meta[name="theme-color"]');
        if (themeColor) {
            themeColor.setAttribute('content', enabled ? '#111827' : '#3F51B5');
        }
    }

}
