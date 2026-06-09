import { FormBuilder } from '@angular/forms';

import { createDefaultProfile } from '../../shared/models/profile.model';
import { ProfileComponent } from './profile.component';
import { TranslatorService } from '../../core/translator/translator.service';

describe('ProfileComponent', () => {
    function createComponent(
        themes = jasmine.createSpyObj('ThemesService', ['isDarkMode', 'setDarkMode']),
        translator?: jasmine.SpyObj<TranslatorService>
    ): ProfileComponent {
        return new ProfileComponent(
            new FormBuilder(),
            jasmine.createSpyObj('AuthService', [], { session$: { subscribe: () => undefined } }),
            jasmine.createSpyObj('ProfileService', ['saveProfile'], {
                profile$: { subscribe: () => undefined }
            }),
            jasmine.createSpyObj('SharedService', ['emitLogType']),
            jasmine.createSpyObj('Router', ['navigate']),
            themes,
            translator
        );
    }

    it('converts existing measurements when the unit system changes', () => {
        const component = createComponent();
        component.form.patchValue({
            height: 70.9,
            bodyWeight: 200,
            unitSystem: 'metric'
        });

        component.changeUnitSystem('metric');

        expect(component.form.get('height').value).toBe(180.1);
        expect(component.form.get('bodyWeight').value).toBe(90.7);
    });

    it('rejects a future birth date', () => {
        const component = createComponent();
        component.form.get('birthDate').setValue('2999-01-01');

        expect(component.form.get('birthDate').hasError('futureDate')).toBeTrue();
    });

    it('updates the shared dark mode preference', () => {
        const themes = jasmine.createSpyObj('ThemesService', ['isDarkMode', 'setDarkMode']);
        themes.isDarkMode.and.returnValue(true);
        const component = createComponent(themes);

        expect(component.darkMode).toBeTrue();
        component.setDarkMode(false);

        expect(themes.setDarkMode).toHaveBeenCalledOnceWith(false);
    });

    it('includes dark mode when saving the profile', async () => {
        const themes = jasmine.createSpyObj('ThemesService', ['isDarkMode', 'setDarkMode']);
        themes.isDarkMode.and.returnValue(true);
        const component = createComponent(themes);
        const profileService = (component as any).profileService;
        profileService.saveProfile.and.resolveTo();

        await component.save();

        expect(profileService.saveProfile).toHaveBeenCalledWith(
            jasmine.objectContaining({ darkMode: true })
        );
    });

    it('keeps unsaved form edits when only dark mode is persisted', () => {
        const component = createComponent();
        const initialProfile = {
            ...createDefaultProfile(),
            firstName: 'Saved',
            updatedAt: '2026-06-07T12:00:00.000Z'
        };
        (component as any).loadProfile(initialProfile);
        component.form.get('firstName').setValue('Unsaved');

        (component as any).loadProfile({
            ...initialProfile,
            darkMode: true,
            updatedAt: '2026-06-07T12:01:00.000Z'
        });

        expect(component.form.get('firstName').value).toBe('Unsaved');
    });

    it('switches language from the profile preference', () => {
        const translator = jasmine.createSpyObj<TranslatorService>(
            'TranslatorService',
            ['useLanguage', 'getAvailableLanguages']
        );
        translator.getAvailableLanguages.and.returnValue([
            { code: 'en-ca', text: 'English' },
            { code: 'fr-ca', text: 'Français' }
        ]);
        const component = createComponent(undefined, translator);

        component.setLanguage('fr-ca');

        expect(component.form.get('preferredLanguage').value).toBe('fr-ca');
        expect(translator.useLanguage).toHaveBeenCalledOnceWith('fr-ca');
    });
});
