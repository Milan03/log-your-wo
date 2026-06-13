import { Component, DestroyRef, inject, OnInit, Optional } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import {
    createDefaultProfile,
    PreferredLanguage,
    TrainingMax,
    UnitSystem,
    UserProfile
} from '../../shared/models/profile.model';
import { ProfileService } from '../../shared/services/profile.service';
import { SharedService } from '../../shared/services/shared.service';
import { ThemesService } from '../../core/themes/themes.service';
import { TranslatorService } from '../../core/translator/translator.service';

@Component({
    selector: 'app-profile',
    standalone: false,
    templateUrl: './profile.component.html',
    styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
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
    private readonly trainingOptionKeys: Record<string, string> = {
        'Strength': 'profile.InterestStrength',
        'Olympic lifting': 'profile.InterestOlympic',
        'Bodybuilding': 'profile.InterestBodybuilding',
        'Powerlifting': 'profile.InterestPowerlifting',
        'Cross training': 'profile.InterestCrossTraining',
        'Running': 'profile.InterestRunning',
        'Cycling': 'profile.InterestCycling',
        'Mobility': 'profile.InterestMobility'
    };

    private readonly destroyRef = inject(DestroyRef);
    private currentUnitSystem: UnitSystem = 'imperial';
    private loadedProfile: UserProfile;
    private readonly formBuilder: FormBuilder;

    constructor(
        formBuilder: FormBuilder,
        private auth: AuthService,
        private profileService: ProfileService,
        private sharedService: SharedService,
        private router: Router,
        private themes: ThemesService,
        @Optional() private translator?: TranslatorService
    ) {
        this.formBuilder = formBuilder;
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
            preferredLanguage: ['en-ca', Validators.required],
            fitnessGoal: [''],
            experienceLevel: [''],
            workoutsPerWeek: [3, [Validators.min(1), Validators.max(14)]],
            trainingMaxes: formBuilder.array([]),
            emailUpdates: [false]
        });
    }

    public ngOnInit(): void {
        this.sharedService.emitLogType(undefined);
        this.profileService.profile$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(profile => this.loadProfile(profile));
        this.auth.session$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(session => {
            this.signedIn = !!session;
            this.email = session && session.user ? session.user.email || '' : '';
        });
        this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.saved = false);
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
                trainingMaxes: this.trainingMaxes.controls
                    .map(control => {
                        const trainingMax = control.value as TrainingMax;
                        return {
                            id: trainingMax.id,
                            exerciseName: trainingMax.exerciseName,
                            value: trainingMax.value,
                            ...(trainingMax.updatedAt ? { updatedAt: trainingMax.updatedAt } : {})
                        };
                    })
                    .filter(trainingMax => trainingMax.exerciseName?.trim() && Number(trainingMax.value) > 0),
                preferredTraining: this.preferredTraining,
                darkMode: this.darkMode
            });
            this.saved = true;
        } catch {
            this.saveError = this.translator
                ? this.translator.translate.instant('profile.SyncError')
                : 'Your profile is saved on this device, but cloud sync failed. Please try again.';
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
        const trainingMaxes = this.trainingMaxes.controls.map(control => ({
            ...control.value,
            value: this.convertTrainingMax(control.value.value, toMetric ? 1 / 2.2046226218 : 2.2046226218)
        }));
        this.form.patchValue({
            height: this.convertMeasurement(height, toMetric ? 2.54 : 1 / 2.54),
            bodyWeight: this.convertMeasurement(bodyWeight, toMetric ? 1 / 2.2046226218 : 2.2046226218),
            trainingMaxes
        });
        this.currentUnitSystem = unitSystem;
    }

    public get trainingMaxes(): FormArray {
        return this.form.get('trainingMaxes') as FormArray;
    }

    public addTrainingMax(trainingMax?: Partial<TrainingMax>): void {
        this.trainingMaxes.push(this.formBuilder.group({
            id: [trainingMax?.id || this.createTrainingMaxId()],
            exerciseName: [trainingMax?.exerciseName || '', Validators.maxLength(80)],
            value: [trainingMax?.value, [Validators.min(0.5), Validators.max(5000)]],
            updatedAt: [trainingMax?.updatedAt]
        }));
        this.saved = false;
    }

    public removeTrainingMax(index: number): void {
        this.trainingMaxes.removeAt(index);
        this.saved = false;
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

    public setLanguage(language: PreferredLanguage): void {
        this.form.get('preferredLanguage').setValue(language);
        if (this.translator) {
            void this.translator.useLanguage(language);
        }
    }

    public setLanguageFromEvent(event: Event): void {
        this.setLanguage((event.target as HTMLSelectElement).value as PreferredLanguage);
    }

    public get languages(): Array<{ code: string, text: string }> {
        return this.translator ? this.translator.getAvailableLanguages() : [];
    }

    public getTrainingOptionKey(option: string): string {
        return this.trainingOptionKeys[option] || option;
    }

    private loadProfile(profile: UserProfile): void {
        const loadedProfile = profile || createDefaultProfile();

        if (this.loadedProfile && this.isPreferenceOnlyUpdate(this.loadedProfile, loadedProfile)) {
            this.loadedProfile = loadedProfile;
            this.form.get('preferredLanguage').setValue(loadedProfile.preferredLanguage, { emitEvent: false });
            return;
        }

        this.loadedProfile = loadedProfile;
        this.currentUnitSystem = loadedProfile.unitSystem;
        const {
            trainingMaxes,
            ...profileValues
        } = loadedProfile;
        this.form.patchValue({
            ...profileValues
        }, { emitEvent: false });
        this.trainingMaxes.clear({ emitEvent: false });
        (trainingMaxes || []).forEach(trainingMax => {
            this.trainingMaxes.push(this.formBuilder.group({
                id: [trainingMax.id],
                exerciseName: [trainingMax.exerciseName, Validators.maxLength(80)],
                value: [trainingMax.value, [Validators.min(0.5), Validators.max(5000)]],
                updatedAt: [trainingMax.updatedAt]
            }), { emitEvent: false });
        });
        this.preferredTraining = profile && profile.preferredTraining
            ? [...profile.preferredTraining]
            : [];
    }

    private isPreferenceOnlyUpdate(previous: UserProfile, current: UserProfile): boolean {
        const preferencesChanged = previous.darkMode !== current.darkMode
            || previous.preferredLanguage !== current.preferredLanguage;
        return preferencesChanged
            && JSON.stringify({
                ...previous,
                darkMode: undefined,
                preferredLanguage: undefined,
                updatedAt: undefined
            }) === JSON.stringify({
                ...current,
                darkMode: undefined,
                preferredLanguage: undefined,
                updatedAt: undefined
            });
    }

    private convertMeasurement(value: number | undefined, multiplier: number): number | undefined {
        return value === undefined || value === null || value === 0
            ? value
            : Math.round(value * multiplier * 10) / 10;
    }

    private convertTrainingMax(value: number | undefined, multiplier: number): number | undefined {
        return value === undefined || value === null || value === 0
            ? value
            : Math.round(value * multiplier * 2) / 2;
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

    private createTrainingMaxId(): string {
        return `max-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
}
