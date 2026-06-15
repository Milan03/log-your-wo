import { Injectable, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';

@Injectable()
export class ThemesService {

    private readonly darkModeStorageKey = 'logYourWo.darkMode';
    private readonly darkModeClass = 'app-dark-mode';
    private readonly darkModeState = signal(this.readDarkMode());

    public readonly darkMode = this.darkModeState.asReadonly();
    public readonly darkMode$ = toObservable(this.darkMode);

    constructor() {
        this.applyDarkMode(this.darkMode());
    }

    public setDarkMode(enabled: boolean): void {
        if (this.darkMode() === enabled) {
            return;
        }

        this.darkModeState.set(enabled);
        this.applyDarkMode(enabled);

        try {
            localStorage.setItem(this.darkModeStorageKey, String(enabled));
        } catch {
            // The selected mode still applies when storage is unavailable.
        }

    }

    public toggleDarkMode(): void {
        this.setDarkMode(!this.darkMode());
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
