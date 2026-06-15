import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';

import { FormValues } from '../../shared/common/common.constants';

export interface AvailableLanguage {
    code: string;
    text: string;
}

@Injectable()
export class TranslatorService {
    public translate = inject(TranslateService);

    private readonly defaultLanguage: string = FormValues.ENCode;
    private readonly languageStorageKey = 'logYourWo.language';
    private readonly availableLanguages: AvailableLanguage[] = [
        { code: FormValues.ENCode, text: 'English' },
        { code: FormValues.FRCode, text: 'Français' }
    ];
    private readonly currentLanguage = new BehaviorSubject<string>(this.readLanguage());
    private readonly languageLoading = new BehaviorSubject<boolean>(false);
    private languageRequestId = 0;

    public languageChangeEmitted$ = this.currentLanguage.asObservable();
    public languageLoading$ = this.languageLoading.asObservable();
    public readonly initialized: Promise<void>;

    constructor() {
        if (!this.translate.getDefaultLang())
            this.translate.setDefaultLang(this.defaultLanguage);

        this.initialized = this.useLanguage(this.currentLanguage.value);
    }

    public get language(): string {
        return this.currentLanguage.value;
    }

    public get loadingLabel(): string {
        const key = 'global.ChangingLanguage';
        const translated = this.translate.instant(key);
        if (translated !== key) {
            return translated;
        }
        return this.language === FormValues.FRCode
            ? 'Changement de langue...'
            : 'Changing language...';
    }

    public async useLanguage(lang: string = null): Promise<void> {
        const language = this.isSupported(lang)
            ? lang
            : this.translate.getDefaultLang() || this.defaultLanguage;

        if (this.translate.currentLang === language && this.currentLanguage.value === language) {
            this.persistLanguage(language);
            return;
        }

        const requestId = ++this.languageRequestId;
        this.languageLoading.next(true);
        await this.afterPaint();

        try {
            await firstValueFrom(this.translate.use(language));
            if (requestId !== this.languageRequestId) {
                return;
            }

            this.persistLanguage(language);
            this.currentLanguage.next(language);
            await this.afterPaint();
        } catch (error) {
            console.error(`Unable to load language "${language}".`, error);
        } finally {
            if (requestId === this.languageRequestId) {
                this.languageLoading.next(false);
            }
        }
    }

    public getAvailableLanguages(): readonly AvailableLanguage[] {
        return this.availableLanguages;
    }

    private isSupported(language: string): boolean {
        return this.availableLanguages.some(option => option.code === language);
    }

    private readLanguage(): string {
        try {
            const storedLanguage = localStorage.getItem(this.languageStorageKey);
            return this.isSupported(storedLanguage) ? storedLanguage : this.defaultLanguage;
        } catch {
            return this.defaultLanguage;
        }
    }

    private persistLanguage(language: string): void {
        try {
            localStorage.setItem(this.languageStorageKey, language);
        } catch {
            // The selected language still applies when storage is unavailable.
        }
    }

    private afterPaint(): Promise<void> {
        return new Promise(resolve => {
            let settled = false;
            const finish = () => {
                if (settled) {
                    return;
                }
                settled = true;
                resolve();
            };
            setTimeout(finish, 50);
            if (typeof requestAnimationFrame === 'function') {
                requestAnimationFrame(finish);
                return;
            }
            setTimeout(finish);
        });
    }
}
