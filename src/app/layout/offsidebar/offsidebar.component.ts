import { Component, DestroyRef, ElementRef, HostListener, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { SettingsService } from '../../core/settings/settings.service';
import { ThemesService } from '../../core/themes/themes.service';
import { TranslatorService } from '../../core/translator/translator.service';
import { SharedModule } from '../../shared/shared.module';

@Component({
    selector: 'app-offsidebar',
    standalone: true,
    imports: [SharedModule],
    templateUrl: './offsidebar.component.html',
    styleUrls: ['./offsidebar.component.scss']
})
export class OffsidebarComponent implements OnInit {
    private readonly destroyRef = inject(DestroyRef);
    public readonly _settings = inject(SettingsService);
    public readonly themes = inject(ThemesService);
    public readonly translator = inject(TranslatorService);
    public readonly elem = inject<ElementRef<HTMLElement>>(ElementRef);
    public readonly languages = this.translator.getAvailableLanguages();
    public selectedLanguage: string;

    public get darkMode(): boolean {
        return this.themes.darkMode();
    }

    constructor() {
        this.selectedLanguage = this.translator.language;
    }

    public ngOnInit(): void {
        this.translator.languageChangeEmitted$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(language => {
            this.selectedLanguage = language;
        });
    }

    public setLang(value: string): void {
        void this.translator.useLanguage(value);
    }

    public setDarkMode(enabled: boolean): void {
        this.themes.setDarkMode(enabled);
    }

    @HostListener('document:click', ['$event'])
    public checkCloseOffsidebar(event: MouseEvent): void {
        const target = event.target;
        const contains = target instanceof Node
            && this.elem.nativeElement !== target
            && this.elem.nativeElement.contains(target);
        if (!contains) {
            this._settings.setLayoutSetting('offsidebarOpen', false);
        }
    }
}
