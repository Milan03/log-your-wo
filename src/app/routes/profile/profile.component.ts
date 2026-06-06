import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { createDefaultProfile, UserProfile } from '../../shared/models/profile.model';
import { ProfileService } from '../../shared/services/profile.service';
import { SharedService } from '../../shared/services/shared.service';

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

    constructor(
        formBuilder: FormBuilder,
        private auth: AuthService,
        private profileService: ProfileService,
        private sharedService: SharedService,
        private router: Router
    ) {
        this.form = formBuilder.group({
            firstName: ['', Validators.maxLength(50)],
            lastName: ['', Validators.maxLength(50)],
            username: ['', [Validators.maxLength(30), Validators.pattern(/^[a-zA-Z0-9_.-]*$/)]],
            bio: ['', Validators.maxLength(300)],
            birthDate: [''],
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
        this.preferredTraining = this.preferredTraining.includes(option)
            ? this.preferredTraining.filter(value => value !== option)
            : [...this.preferredTraining, option];
    }

    public isTrainingSelected(option: string): boolean {
        return this.preferredTraining.includes(option);
    }

    public save(): void {
        this.form.markAllAsTouched();

        if (this.form.invalid) {
            return;
        }

        this.profileService.saveProfile({
            ...createDefaultProfile(),
            ...this.form.value,
            preferredTraining: this.preferredTraining
        });
        this.saved = true;
    }

    public openAccount(): void {
        void this.router.navigate(['/auth'], {
            queryParams: { returnUrl: '/profile' }
        });
    }

    private loadProfile(profile: UserProfile): void {
        this.form.patchValue(profile || createDefaultProfile(), { emitEvent: false });
        this.preferredTraining = profile && profile.preferredTraining
            ? [...profile.preferredTraining]
            : [];
    }
}
