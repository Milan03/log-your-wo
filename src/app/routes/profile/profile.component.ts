import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
    AbstractControl,
    FormArray,
    FormBuilder,
    FormControl,
    FormGroup,
    ValidationErrors,
    Validators
} from '@angular/forms';
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

interface TrainingMaxForm {
    id: FormControl<string>;
    exerciseName: FormControl<string>;
    value: FormControl<number | undefined>;
    updatedAt: FormControl<string | undefined>;
}

interface ProfileForm {
    firstName: FormControl<string>;
    lastName: FormControl<string>;
    username: FormControl<string>;
    bio: FormControl<string>;
    birthDate: FormControl<string>;
    gender: FormControl<string>;
    height: FormControl<number | undefined>;
    bodyWeight: FormControl<number | undefined>;
    unitSystem: FormControl<UnitSystem>;
    preferredLanguage: FormControl<PreferredLanguage>;
    fitnessGoal: FormControl<string>;
    experienceLevel: FormControl<UserProfile['experienceLevel']>;
    workoutsPerWeek: FormControl<number>;
    trainingMaxes: FormArray<FormGroup<TrainingMaxForm>>;
    emailUpdates: FormControl<boolean>;
}

@Component({
    selector: 'app-profile',
    standalone: false,
    templateUrl: './profile.component.html',
    styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
    public form: FormGroup<ProfileForm>;
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

    private readonly formBuilder = inject(FormBuilder);
    private auth = inject(AuthService);
    private profileService = inject(ProfileService);
    private sharedService = inject(SharedService);
    private router = inject(Router);
    private themes = inject(ThemesService);
    private translator = inject(TranslatorService, { optional: true });

    constructor() {
        this.form = this.formBuilder.group<ProfileForm>({
            firstName: this.formBuilder.nonNullable.control('', Validators.maxLength(50)),
            lastName: this.formBuilder.nonNullable.control('', Validators.maxLength(50)),
            username: this.formBuilder.nonNullable.control('', [
                Validators.maxLength(30),
                Validators.pattern(/^[a-zA-Z0-9_.-]*$/)
            ]),
            bio: this.formBuilder.nonNullable.control('', Validators.maxLength(300)),
            birthDate: this.formBuilder.nonNullable.control('', this.notFutureDate),
            gender: this.formBuilder.nonNullable.control(''),
            height: this.formBuilder.control<number | undefined>(undefined, [Validators.min(1), Validators.max(300)]),
            bodyWeight: this.formBuilder.control<number | undefined>(
                undefined,
                [Validators.min(1), Validators.max(1000)]
            ),
            unitSystem: this.formBuilder.nonNullable.control<UnitSystem>('imperial', Validators.required),
            preferredLanguage: this.formBuilder.nonNullable.control<PreferredLanguage>('en-ca', Validators.required),
            fitnessGoal: this.formBuilder.nonNullable.control(''),
            experienceLevel: this.formBuilder.nonNullable.control<UserProfile['experienceLevel']>(''),
            workoutsPerWeek: this.formBuilder.nonNullable.control(3, [Validators.min(1), Validators.max(14)]),
            trainingMaxes: this.formBuilder.array<FormGroup<TrainingMaxForm>>([]),
            emailUpdates: this.formBuilder.nonNullable.control(false)
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
            const formValue = this.form.getRawValue();
            await this.profileService.saveProfile({
                ...createDefaultProfile(),
                ...formValue,
                trainingMaxes: this.trainingMaxes.controls
                    .map(control => this.toTrainingMax(control.getRawValue()))
                    .filter((trainingMax): trainingMax is TrainingMax => !!trainingMax),
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

    public get trainingMaxes(): FormArray<FormGroup<TrainingMaxForm>> {
        return this.form.controls.trainingMaxes;
    }

    public addTrainingMax(trainingMax?: Partial<TrainingMax>): void {
        this.trainingMaxes.push(this.createTrainingMaxForm(trainingMax));
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
        this.form.controls.preferredLanguage.setValue(language);
        if (this.translator) {
            void this.translator.useLanguage(language);
        }
    }

    public setLanguageFromEvent(event: Event): void {
        this.setLanguage((event.target as HTMLSelectElement).value as PreferredLanguage);
    }

    public get languages(): ReadonlyArray<{ code: string, text: string }> {
        return this.translator ? this.translator.getAvailableLanguages() : [];
    }

    public getTrainingOptionKey(option: string): string {
        return this.trainingOptionKeys[option] || option;
    }

    private loadProfile(profile: UserProfile): void {
        const loadedProfile = profile || createDefaultProfile();

        if (this.loadedProfile && this.isPreferenceOnlyUpdate(this.loadedProfile, loadedProfile)) {
            this.loadedProfile = loadedProfile;
            this.form.controls.preferredLanguage.setValue(loadedProfile.preferredLanguage, { emitEvent: false });
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
            this.trainingMaxes.push(this.createTrainingMaxForm(trainingMax), { emitEvent: false });
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

    private createTrainingMaxForm(trainingMax?: Partial<TrainingMax>): FormGroup<TrainingMaxForm> {
        return this.formBuilder.group<TrainingMaxForm>({
            id: this.formBuilder.nonNullable.control(trainingMax?.id || this.createTrainingMaxId()),
            exerciseName: this.formBuilder.nonNullable.control(
                trainingMax?.exerciseName || '',
                Validators.maxLength(80)
            ),
            value: this.formBuilder.control<number | undefined>(
                trainingMax?.value,
                [Validators.min(0.5), Validators.max(5000)]
            ),
            updatedAt: this.formBuilder.control<string | undefined>(trainingMax?.updatedAt)
        });
    }

    private toTrainingMax(value: {
        id: string;
        exerciseName: string;
        value: number | undefined;
        updatedAt: string | undefined;
    }): TrainingMax | undefined {
        if (!value.exerciseName.trim() || !value.value || value.value <= 0) {
            return undefined;
        }

        return {
            id: value.id,
            exerciseName: value.exerciseName,
            value: value.value,
            ...(value.updatedAt ? { updatedAt: value.updatedAt } : {})
        };
    }
}
