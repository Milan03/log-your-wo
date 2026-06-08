import { Component, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { createDefaultProfile, UnitSystem, UserProfile } from '../../shared/models/profile.model';
import { ProfileService } from '../../shared/services/profile.service';
import { SharedService } from '../../shared/services/shared.service';
import { ThemesService } from '../../core/themes/themes.service';

@Component({
    selector: 'app-profile',
    standalone: false,
    templateUrl: './profile.component.html',
    styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit, OnDestroy {
    public form: FormGroup;
    public signedIn = false;
    public email = '';
    public saved = false;
    public saveError = '';
    public saving = false;
    public readonly today = this.localDateValue(new Date());
    public preferredTraining: string[] = [];
    public readonly trainingOptions = [
        'Strength',
        'Olympic lifting',
        'Bodybuilding',
        'Powerlifting',
        'Cross training',
        'Running',
        'Cycling',
        'Mobility'
    ];

    private profileSub: Subscription;
    private sessionSub: Subscription;
    private formSub: Subscription;
    private currentUnitSystem: UnitSystem = 'imperial';

    constructor(
        formBuilder: FormBuilder,
        private auth: AuthService,
        private profileService: ProfileService,
        private sharedService: SharedService,
        private router: Router,
        private themes: ThemesService
    ) {
        this.form = formBuilder.group({
            firstName: ['', Validators.maxLength(50)],
            lastName: ['', Validators.maxLength(50)],
            username: ['', [Validators.maxLength(30), Validators.pattern(/^[a-zA-Z0-9_.-]*$/)]],
            bio: ['', Validators.maxLength(300)],
            birthDate: ['', this.notFutureDate],
            gender: [''],
            height: [undefined, [Validators.min(1), Validators.max(300)]],
            bodyWeight: [undefined, [Validators.min(1), Validators.max(1000)]],
            unitSystem: ['imperial', Validators.required],
            fitnessGoal: [''],
            experienceLevel: [''],
            workoutsPerWeek: [3, [Validators.min(1), Validators.max(14)]],
            emailUpdates: [false]
        });
    }

    public ngOnInit(): void {
        this.sharedService.emitLogType(undefined);
        this.profileSub = this.profileService.profile$.subscribe(profile => this.loadProfile(profile));
        this.sessionSub = this.auth.session$.subscribe(session => {
            this.signedIn = !!session;
            this.email = session && session.user ? session.user.email || '' : '';
        });
        this.formSub = this.form.valueChanges.subscribe(() => this.saved = false);
    }

    public ngOnDestroy(): void {
        if (this.profileSub) {
            this.profileSub.unsubscribe();
        }
        if (this.sessionSub) {
            this.sessionSub.unsubscribe();
        }
        if (this.formSub) {
            this.formSub.unsubscribe();
        }
    }

    public toggleTraining(option: string): void {
        this.saved = false;
        this.saveError = '';
        this.preferredTraining = this.preferredTraining.includes(option)
            ? this.preferredTraining.filter(value => value !== option)
            : [...this.preferredTraining, option];
    }

    public isTrainingSelected(option: string): boolean {
        return this.preferredTraining.includes(option);
    }

    public async save(): Promise<void> {
        this.form.markAllAsTouched();

        if (this.form.invalid) {
            return;
        }

        this.saving = true;
        this.saved = false;
        this.saveError = '';

        try {
            await this.profileService.saveProfile({
                ...createDefaultProfile(),
                ...this.form.value,
                preferredTraining: this.preferredTraining,
                darkMode: this.darkMode
            });
            this.saved = true;
        } catch {
            this.saveError = 'Your profile is saved on this device, but cloud sync failed. Please try again.';
        } finally {
            this.saving = false;
        }
    }

    public changeUnitSystem(unitSystem: UnitSystem): void {
        if (unitSystem === this.currentUnitSystem) {
            return;
        }

        const toMetric = unitSystem === 'metric';
        const height = this.form.get('height').value;
        const bodyWeight = this.form.get('bodyWeight').value;
        this.form.patchValue({
            height: this.convertMeasurement(height, toMetric ? 2.54 : 1 / 2.54),
            bodyWeight: this.convertMeasurement(bodyWeight, toMetric ? 1 / 2.2046226218 : 2.2046226218)
        });
        this.currentUnitSystem = unitSystem;
    }

    public changeUnitSystemFromEvent(event: Event): void {
        const unitSystem = (event.target as HTMLSelectElement).value as UnitSystem;
        this.changeUnitSystem(unitSystem);
    }

    public openAccount(): void {
        void this.router.navigate(['/auth'], {
            queryParams: { returnUrl: '/profile' }
        });
    }

    public get darkMode(): boolean {
        return this.themes.isDarkMode();
    }

    public setDarkMode(enabled: boolean): void {
        this.themes.setDarkMode(enabled);
    }

    private loadProfile(profile: UserProfile): void {
        const loadedProfile = profile || createDefaultProfile();
        this.currentUnitSystem = loadedProfile.unitSystem;
        this.form.patchValue(loadedProfile, { emitEvent: false });
        this.preferredTraining = profile && profile.preferredTraining
            ? [...profile.preferredTraining]
            : [];
    }

    private convertMeasurement(value: number | undefined, multiplier: number): number | undefined {
        return value === undefined || value === null || value === 0
            ? value
            : Math.round(value * multiplier * 10) / 10;
    }

    private notFutureDate = (control: AbstractControl): ValidationErrors | null => {
        if (!control.value) {
            return null;
        }

        return control.value > this.today
            ? { futureDate: true }
            : null;
    };

    private localDateValue(date: Date): string {
        const offset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - offset).toISOString().slice(0, 10);
    }
}
