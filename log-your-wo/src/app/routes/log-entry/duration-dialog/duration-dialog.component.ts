import { Component, OnDestroy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Subscription } from 'rxjs';

import { CardioExercise } from '../../../shared/models/cardio-exercise.model';
import { SharedService } from '../../../shared/services/shared.service';

import * as moment from 'moment';

@Component({
  selector: 'app-duration-dialog',
  templateUrl: './duration-dialog.component.html',
  styleUrls: ['./duration-dialog.component.scss']
})
export class DurationDialogComponent implements OnDestroy {
    public durationValue: Date;
    private currentCardioExercise: CardioExercise;

    private cvExerciseSub: Subscription;

    constructor(
        public dialogRef: MatDialogRef<DurationDialogComponent>,
        private sharedService: SharedService
    ) {
        this.subToCurrentCardioExercise();
    }

    ngOnDestroy(): void {
        if (this.cvExerciseSub)
            this.cvExerciseSub.unsubscribe();
    }

    /**
     * Track exercise being editted. If the exercise has a duration defined, set it in the control.
     */
    private subToCurrentCardioExercise(): void {
        this.cvExerciseSub = this.sharedService.cvExerciseEmitted$.subscribe(
            data => { 
                this.currentCardioExercise = data;
                if (this.currentCardioExercise.exerciseDuration) {
                    this.durationValue = new Date();
                    this.durationValue.setHours(this.currentCardioExercise.exerciseDuration.get('hours'));
                    this.durationValue.setMinutes(this.currentCardioExercise.exerciseDuration.get('minutes'));
                    this.durationValue.setSeconds(this.currentCardioExercise.exerciseDuration.get('seconds'));
                }
            }
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
            //console.log(this.currentCardioExercise);
        }
    }
}
