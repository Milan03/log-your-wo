import { Injectable, OnDestroy } from '@angular/core';
import { AuthError, Session, User } from '@supabase/supabase-js';
import { BehaviorSubject } from 'rxjs';

import { SupabaseClientService } from '../supabase/supabase-client.service';

export interface RegistrationResult {
    confirmationRequired: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService implements OnDestroy {
    private readonly sessionSource = new BehaviorSubject<Session | null>(null);
    private readonly initialized: Promise<void>;
    private readonly authStateSubscription: { unsubscribe(): void };

    public readonly session$ = this.sessionSource.asObservable();

    constructor(private supabase: SupabaseClientService) {
        this.initialized = this.initialize();
        const { data } = this.supabase.client.auth.onAuthStateChange((_event, session) => {
            this.sessionSource.next(session ?? null);
        });
        this.authStateSubscription = data.subscription;
    }

    public ngOnDestroy(): void {
        this.authStateSubscription.unsubscribe();
    }

    public get currentUser(): User | null {
        return this.sessionSource.value ? this.sessionSource.value.user : null;
    }

    public async getSession(): Promise<Session | null> {
        await this.initialized;
        return this.sessionSource.value;
    }

    public async signIn(email: string, password: string): Promise<void> {
        const { error } = await this.supabase.client.auth.signInWithPassword({
            email: email.trim(),
            password
        });
        this.throwIfError(error);
    }

    public async register(email: string, password: string): Promise<RegistrationResult> {
        const { data, error } = await this.supabase.client.auth.signUp({
            email: email.trim(),
            password,
            options: {
                emailRedirectTo: this.authCallbackUrl()
            }
        });
        this.throwIfError(error);

        return {
            confirmationRequired: !data.session
        };
    }

    public async signInWithGoogle(): Promise<void> {
        const { error } = await this.supabase.client.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: this.authCallbackUrl()
            }
        });
        this.throwIfError(error);
    }

    public async signOut(): Promise<void> {
        const { error } = await this.supabase.client.auth.signOut();
        this.throwIfError(error);
    }

    private async initialize(): Promise<void> {
        const { data, error } = await this.supabase.client.auth.getSession();
        this.throwIfError(error);
        this.sessionSource.next(data.session ?? null);
    }

    private authCallbackUrl(): string {
        return `${window.location.origin}/auth/callback`;
    }

    private throwIfError(error: AuthError): void {
        if (error) {
            throw error;
        }
    }
}
