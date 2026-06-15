import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { AuthService } from '../../core/auth/auth.service';
import { TranslatorService } from '../../core/translator/translator.service';

interface AuthForm {
    email: FormControl<string>;
    password: FormControl<string>;
}

@Component({
    selector: 'app-auth',
    standalone: true,
    imports: [ReactiveFormsModule, TranslateModule],
    templateUrl: './auth.component.html',
    styleUrls: ['./auth.component.scss']
})
export class AuthComponent implements OnInit {
    public form: FormGroup<AuthForm>;
    public mode: 'login' | 'register' = 'login';
    public busy = false;
    public callbackPending = false;
    public errorMessage = '';
    public successMessage = '';

    private readonly destroyRef = inject(DestroyRef);
    private returnUrl = '/home';

    private formBuilder = inject(FormBuilder);
    private auth = inject(AuthService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private translator = inject(TranslatorService, { optional: true });

    constructor() {
        this.form = this.formBuilder.nonNullable.group({
            email: ['', [Validators.required, Validators.email]],
            password: ['', Validators.required]
        });
    }

    public ngOnInit(): void {
        this.callbackPending = !!this.route.snapshot.data.callback;
        this.returnUrl = this.safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'));
        if (this.callbackPending) {
            this.returnUrl = this.safeReturnUrl(sessionStorage.getItem('logYourWo.authReturnUrl'));
        }
        this.auth.session$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(session => {
            if (session) {
                sessionStorage.removeItem('logYourWo.authReturnUrl');
                void this.router.navigateByUrl(this.returnUrl);
            }
        });
        void this.redirectAuthenticatedUser();
    }

    public setMode(mode: 'login' | 'register'): void {
        this.mode = mode;
        this.errorMessage = '';
        this.successMessage = '';
        const password = this.form.get('password');
        password.setValidators(mode === 'register'
            ? [Validators.required, Validators.minLength(8)]
            : Validators.required);
        password.updateValueAndValidity();
    }

    public async submit(): Promise<void> {
        this.form.markAllAsTouched();

        if (this.form.invalid || this.busy) {
            return;
        }

        this.busy = true;
        this.errorMessage = '';
        this.successMessage = '';
        const { email, password } = this.form.getRawValue();

        try {
            if (this.mode === 'register') {
                const result = await this.auth.register(email, password);
                if (result.confirmationRequired) {
                    this.successMessage = this.t('auth.ConfirmationRequired');
                    this.form.get('password').reset();
                } else {
                    await this.router.navigateByUrl(this.returnUrl);
                }
            } else {
                await this.auth.signIn(email, password);
                await this.router.navigateByUrl(this.returnUrl);
            }
        } catch (error) {
            this.errorMessage = this.authErrorMessage(error);
        } finally {
            this.busy = false;
        }
    }

    public async continueWithGoogle(): Promise<void> {
        if (this.busy) {
            return;
        }

        this.busy = true;
        this.errorMessage = '';

        try {
            sessionStorage.setItem('logYourWo.authReturnUrl', this.returnUrl);
            await this.auth.signInWithGoogle();
        } catch (error) {
            this.errorMessage = this.authErrorMessage(error);
            this.busy = false;
        }
    }

    public continueAsGuest(): void {
        void this.router.navigateByUrl(this.returnUrl);
    }

    private async redirectAuthenticatedUser(): Promise<void> {
        try {
            const session = await this.auth.getSession();

            if (!session) {
                if (this.callbackPending) {
                    this.callbackPending = false;
                    this.errorMessage = this.t('auth.InvalidLink');
                }
                return;
            }

            sessionStorage.removeItem('logYourWo.authReturnUrl');
            await this.router.navigateByUrl(this.returnUrl);
        } catch (error) {
            this.callbackPending = false;
            this.errorMessage = this.authErrorMessage(error);
        }
    }

    private safeReturnUrl(value: string): string {
        return value && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/auth')
            ? value
            : '/home';
    }

    private authErrorMessage(error: unknown): string {
        const message = error instanceof Error
            ? error.message
            : typeof error === 'object' && error && 'message' in error
                ? String((error as { message?: unknown }).message || '')
                : '';

        if (/invalid login credentials/i.test(message)) {
            return this.t('auth.InvalidCredentials');
        }
        if (/email not confirmed/i.test(message)) {
            return this.t('auth.EmailNotConfirmed');
        }
        if (/user already registered/i.test(message)) {
            return this.t('auth.AlreadyRegistered');
        }
        if (/password/i.test(message)) {
            return this.t('auth.RequestFailed');
        }

        return this.t('auth.RequestFailed');
    }

    private t(key: string): string {
        return this.translator
            ? this.translator.translate.instant(key)
            : key;
    }
}
