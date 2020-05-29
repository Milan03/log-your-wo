import { Component, OnDestroy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Subscription } from 'rxjs';

import { CardioExercise } from '../../../shared/models/cardio-exercise.model';
import { SharedService } from '../../../shared/services/shared.service';

import * as moment from 'moment';

@Component({
    selector: 'duration-dialog',
    template: `
        <h1 mat-dialog-title>{{ 'log-entry.ExerciseDuration' | translate }}</h1>
        <div mat-dialog-content>Enter the duration of your exercise:</div>
        <div mat-dialog-actions>
            <timepicker [ngModel]="durationEntered" aria-invalid="false" [showMeridian]="false" [showSpinners]="false" [showSeconds]="true" [hoursPlaceholder]="'hh'" [minutesPlaceholder]="'mm'" [secondsPlaceholder]="'ss'" (ngModelChange)="onDurationChange($event)"></timepicker>
        </div>
    `,
})
export class DurationDialog implements OnDestroy {
    public durationEntered: Date;
    private currentCardioExercise: CardioExercise;

    private cvExerciseSub: Subscription;

    constructor(
        public dialogRef: MatDialogRef<DurationDialog>,
        private sharedService: SharedService
    ) {
        this.subToCurrentCardioExercise();
    }

    ngOnDestroy(): void {
        if (this.cvExerciseSub)
            this.cvExerciseSub.unsubscribe();
    }

    /**
     * Track exercise being editted.
     */
    private subToCurrentCardioExercise(): void {
        this.cvExerciseSub = this.sharedService.cvExerciseEmitted$.subscribe(
            data => this.currentCardioExercise = data
        );
    }

    /**
     * Track exercise duration set for the particular cardio exercise row.
     * @param date - track hours, minutes, seconds
     * @param exercise - exercise to be updated
     */
    public onDurationChange(dateTime: Date): void {
        if (dateTime) {
            let duration = moment.duration({ hours: dateTime.getHours(), minutes: dateTime.getMinutes(), seconds: dateTime.getSeconds() });
            this.currentCardioExercise.exerciseDuration = duration;
            console.log(this.currentCardioExercise);
        }
    }
}
