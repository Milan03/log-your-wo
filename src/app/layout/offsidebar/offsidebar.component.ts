import { Component, OnInit, OnDestroy, ElementRef, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { SettingsService } from '../../core/settings/settings.service';
import { ThemesService } from '../../core/themes/themes.service';
import { TranslatorService } from '../../core/translator/translator.service';

@Component({
    selector: 'app-offsidebar',
    standalone: false,
    templateUrl: './offsidebar.component.html',
    styleUrls: ['./offsidebar.component.scss']
})
export class OffsidebarComponent implements OnInit, OnDestroy {

    selectedLanguage: string;
    private readonly destroyRef = inject(DestroyRef);

    public get darkMode(): boolean {
        return this.themes.isDarkMode();
    }

    constructor(
        public _settings: SettingsService,
        public themes: ThemesService,
        public translator: TranslatorService,
        public elem: ElementRef
    ) {
        this.selectedLanguage = this.translator.language;
    }

    ngOnInit() {
        this.anyClickClose();
        this.translator.languageChangeEmitted$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(language => {
            this.selectedLanguage = language;
        });
    }

    getLangs() {
        return this.translator.getAvailableLanguages();
    }

    setLang(value: string) {
        void this.translator.useLanguage(value);
    }

    public setDarkMode(enabled: boolean): void {
        this.themes.setDarkMode(enabled);
    }

    anyClickClose() {
        document.addEventListener('click', this.checkCloseOffsidebar, false);
    }

    checkCloseOffsidebar = e => {
        const contains = (this.elem.nativeElement !== e.target && this.elem.nativeElement.contains(e.target));
        if (!contains) {
            this._settings.setLayoutSetting('offsidebarOpen', false);
        }
    }

    ngOnDestroy() {
        document.removeEventListener('click', this.checkCloseOffsidebar);
    }
}
