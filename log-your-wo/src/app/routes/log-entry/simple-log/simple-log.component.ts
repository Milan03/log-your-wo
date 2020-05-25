import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, FormControl } from '@angular/forms';

import { Exercise } from 'src/app/shared/models/exercise.model';
import { SimpleLog } from '../../../shared/models/simple-log.model';
import { SharedService } from '../../../shared/services/shared.service';

import { LogTypes, FormValues } from '../../../shared/common/common.constants';

@Component({
    selector: 'app-simple-log',
    templateUrl: './simple-log.component.html',
    styleUrls: ['./simple-log.component.scss']
})
export class SimpleLogComponent implements OnInit {
    private simpleLogForm: FormGroup;
    private currentLog: SimpleLog;
    private exerciseRowCount: number;

    constructor(
        private _formBuilder: FormBuilder,
        private _sharedService: SharedService
    ) {
        this.simpleLogForm = this._formBuilder.group({});
    }

    ngOnInit(): void {
        this.currentLog = new SimpleLog();
        this._sharedService.emitLogType(LogTypes.SimpleLog);
        this._sharedService.emitLogStartDatim(this.currentLog.startDatim);
        this.exerciseRowCount = 0;
    }

    public submitForm($ev, value: any): void {
        $ev.preventDefault();
        for (let c in this.simpleLogForm.controls) {
            this.simpleLogForm.controls[c].markAsTouched();
        }
        if (this.simpleLogForm.valid) {
            
        }
    }

    /**
     * Adds an exercise row to the page. Inserts a new form control into form control group
     * and current log exercise array.
     */
    public addExerciseFormControl(): void {
        let formControlName1 = `${FormValues.ExerciseNameFormControl}${this.exerciseRowCount}`;
        let formControlName2 = `${FormValues.ExerciseSetsFormControl}${this.exerciseRowCount}`;
        let formControlName3 = `${FormValues.ExerciseRepsFormControl}${this.exerciseRowCount}`;
        let formControlName4 = `${FormValues.ExerciseWeightFormControl}${this.exerciseRowCount}`;
        this.simpleLogForm.addControl(formControlName1, new FormControl());
        this.simpleLogForm.addControl(formControlName2, new FormControl());
        this.simpleLogForm.addControl(formControlName3, new FormControl());
        this.simpleLogForm.addControl(formControlName4, new FormControl());
        ++this.exerciseRowCount;
        console.log(this.simpleLogForm.get(formControlName1));
        // add exercise to log
        let newExercise = new Exercise();
        newExercise.logId = this.currentLog.logId;
        newExercise.formControlNames.set('name', formControlName1);
        newExercise.formControlNames.set('sets', formControlName2);
        newExercise.formControlNames.set('reps', formControlName3);
        newExercise.formControlNames.set('weight', formControlName4);
        this.currentLog.exercises.push(newExercise);
        console.log(newExercise.formControlNames.get('name'));
    }
}
