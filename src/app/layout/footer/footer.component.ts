import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SettingsService } from '../../core/settings/settings.service';
import { TranslatorService } from '../../core/translator/translator.service';

@Component({
    selector: '[app-footer]',
    standalone: false,
    templateUrl: './footer.component.html',
    styleUrls: ['./footer.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class FooterComponent {
    public selectedLanguage: string;
    public readonly languages = this._translatorService.getAvailableLanguages();

    constructor(
        public _settings: SettingsService,
        public _translatorService: TranslatorService
    ) {
        this.selectedLanguage = this._translatorService.language;
    }

    public setLang(language: string): void {
        void this._translatorService.useLanguage(language);
    }
}
