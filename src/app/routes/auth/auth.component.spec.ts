import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { AuthComponent } from './auth.component';

describe('AuthComponent', () => {
    it('applies the minimum password length only when registering', () => {
        TestBed.configureTestingModule({
            providers: [
                FormBuilder,
                { provide: AuthService, useValue: jasmine.createSpyObj('AuthService', ['getSession']) },
                {
                    provide: ActivatedRoute,
                    useValue: { snapshot: { data: {}, queryParamMap: { get: () => null } } }
                },
                { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigateByUrl']) }
            ]
        });
        const component = TestBed.runInInjectionContext(() => new AuthComponent());
        component.form.patchValue({
            email: 'user@example.com',
            password: 'short'
        });

        expect(component.form.valid).toBeTrue();

        component.setMode('register');

        expect(component.form.get('password').hasError('minlength')).toBeTrue();
    });
});
