import { Component, OnInit } from '@angular/core';
import { SettingsService } from '../../core/settings/settings.service';
import { TranslatorService } from '../../core/translator/translator.service';

@Component({
    selector: '[app-footer]',
    templateUrl: './footer.component.html',
    styleUrls: ['./footer.component.scss']
})
export class FooterComponent implements OnInit {
    public selectedLanguage: string;

    constructor(
        public _settings: SettingsService,
        public _translatorService: TranslatorService
    ) { 
        this.selectedLanguage = this.getLangs()[0].code;
    }

    ngOnInit() {

    }

    getLangs() {
        return this._translatorService.getAvailableLanguages();
    }

    setLang(lang) {
        this._translatorService.useLanguage(lang.value);
    }
}
