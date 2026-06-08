import { FormBuilder } from '@angular/forms';

import { ProfileComponent } from './profile.component';

describe('ProfileComponent', () => {
    function createComponent(themes = jasmine.createSpyObj('ThemesService', ['isDarkMode', 'setDarkMode'])): ProfileComponent {
        return new ProfileComponent(
            new FormBuilder(),
            jasmine.createSpyObj('AuthService', [], { session$: { subscribe: () => undefined } }),
            jasmine.createSpyObj('ProfileService', ['saveProfile'], {
                profile$: { subscribe: () => undefined }
            }),
            jasmine.createSpyObj('SharedService', ['emitLogType']),
            jasmine.createSpyObj('Router', ['navigate']),
            themes
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
});
