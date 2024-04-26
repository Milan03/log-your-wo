import { Component, OnDestroy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Subscription } from 'rxjs';

import { Exercise } from '../../../shared/models/exercise.model';
import { SharedService } from '../../../shared/services/shared.service';

import * as moment from 'moment';

@Component({
  selector: 'app-duration-dialog',
  templateUrl: './duration-dialog.component.html',
  styleUrls: ['./duration-dialog.component.scss']
})
export class DurationDialogComponent implements OnDestroy {
    public durationValue: Date;
    public currentExercise: Exercise;

    private exerciseSub: Subscription;

    constructor(
        public _dialogRef: MatDialogRef<DurationDialogComponent>,
        private _sharedService: SharedService
    ) {
        this.subToCurrentCardioExercise();
    }

    ngOnDestroy(): void {
        if (this.exerciseSub)
            this.exerciseSub.unsubscribe();
    }

    /**
     * Track exercise being editted. If the exercise has a duration defined, set it in the control.
     */
    private subToCurrentCardioExercise(): void {
        this.exerciseSub = this._sharedService.exerciseEmitted$.subscribe(
            data => { 
                this.currentExercise = data;
                if (this.currentExercise.duration) {
                    this.durationValue = new Date();
                    this.durationValue.setHours(this.currentExercise.duration.get('hours'));
                    this.durationValue.setMinutes(this.currentExercise.duration.get('minutes'));
                    this.durationValue.setSeconds(this.currentExercise.duration.get('seconds'));
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
            this.currentExercise.duration = duration;
            //console.log(this.currentCardioExercise);
        }
    }
}
