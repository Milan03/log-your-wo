import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';

import { AuthComponent } from './auth.component';

describe('AuthComponent', () => {
    it('applies the minimum password length only when registering', () => {
        const component = TestBed.runInInjectionContext(() => new AuthComponent(
            new FormBuilder(),
            jasmine.createSpyObj('AuthService', ['getSession']),
            jasmine.createSpyObj('ActivatedRoute', [], {
                snapshot: {
                    data: {},
                    queryParamMap: { get: () => null }
                }
            }),
            jasmine.createSpyObj('Router', ['navigateByUrl'])
        ));
        component.form.patchValue({
            email: 'user@example.com',
            password: 'short'
        });

        expect(component.form.valid).toBeTrue();

        component.setMode('register');

        expect(component.form.get('password').hasError('minlength')).toBeTrue();
    });
});
