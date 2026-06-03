import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { Exercise } from '../../../shared/models/exercise.model';

import * as moment from 'moment';

@Component({
  selector: 'app-duration-dialog',
  standalone: false,
  templateUrl: './duration-dialog.component.html',
  styleUrls: ['./duration-dialog.component.scss']
})
export class DurationDialogComponent {
    public durationValue: Date;
    public currentExercise: Exercise;

    constructor(
        public _dialogRef: MatDialogRef<DurationDialogComponent>,
        @Inject(MAT_DIALOG_DATA) exercise: Exercise
    ) {
        this.currentExercise = exercise;
        this.setDurationValue();
    }

    /**
     * Track exercise being editted. If the exercise has a duration defined, set it in the control.
     */
    private setDurationValue(): void {
        if (this.currentExercise.duration) {
            this.durationValue = new Date();
            this.durationValue.setHours(this.currentExercise.duration.get('hours'));
            this.durationValue.setMinutes(this.currentExercise.duration.get('minutes'));
            this.durationValue.setSeconds(this.currentExercise.duration.get('seconds'));
        }
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
        }
    }

    public submit(): void {
        this._dialogRef.close(this.currentExercise);
    }
}
