import { Component, OnDestroy, OnInit, Optional } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { TranslatorService } from '../../core/translator/translator.service';

@Component({
    selector: 'app-auth',
    standalone: false,
    templateUrl: './auth.component.html',
    styleUrls: ['./auth.component.scss']
})
export class AuthComponent implements OnInit, OnDestroy {
    public form: FormGroup;
    public mode: 'login' | 'register' = 'login';
    public busy = false;
    public callbackPending = false;
    public errorMessage = '';
    public successMessage = '';

    private sessionSub: Subscription;
    private returnUrl = '/home';

    constructor(
        formBuilder: FormBuilder,
        private auth: AuthService,
        private route: ActivatedRoute,
        private router: Router,
        @Optional() private translator?: TranslatorService
    ) {
        this.form = formBuilder.group({
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
        this.sessionSub = this.auth.session$.subscribe(session => {
            if (session) {
                sessionStorage.removeItem('logYourWo.authReturnUrl');
                void this.router.navigateByUrl(this.returnUrl);
            }
        });
        void this.redirectAuthenticatedUser();
    }

    public ngOnDestroy(): void {
        if (this.sessionSub) {
            this.sessionSub.unsubscribe();
        }
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
        const { email, password } = this.form.value;

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
