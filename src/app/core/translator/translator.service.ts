import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';

import { FormValues } from '../../shared/common/common.constants';

@Injectable()
export class TranslatorService {
    private currentLanguage = new Subject<string>();
    private defaultLanguage: string = FormValues.ENCode;

    public languageChangeEmitted$ = this.currentLanguage.asObservable();

    private availablelangs = [
        { code: FormValues.ENCode, text: FormValues.English },
        { code: FormValues.FRCode, text: FormValues.French }
    ];

    constructor(public translate: TranslateService) {

        if (!translate.getDefaultLang())
            translate.setDefaultLang(this.defaultLanguage);

        this.useLanguage();

    }

    useLanguage(lang: string = null) {
        this.translate.use(lang || this.translate.getDefaultLang());
        this.currentLanguage.next(lang || this.translate.getDefaultLang());
    }

    getAvailableLanguages() {
        return this.availablelangs;
    }

}
