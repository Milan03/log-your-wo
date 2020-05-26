import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, FormControl, Validators } from '@angular/forms';

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
    private currentExercise: Exercise;
    private exerciseRowCount: number;

    public readonly exerciseNameCharLimit: number = 50;
    public readonly exerciseNumericCharLimit: number = 5;

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
        this.simpleLogForm.addControl(formControlName1, new FormControl('', Validators.compose([Validators.required, Validators.maxLength(50)])));
        this.simpleLogForm.addControl(formControlName2, new FormControl('', Validators.compose([Validators.pattern("^[0-9]*$"), Validators.maxLength(5)])));
        this.simpleLogForm.addControl(formControlName3, new FormControl('', Validators.compose([Validators.pattern("^[0-9]*$"), Validators.maxLength(5)])));
        this.simpleLogForm.addControl(formControlName4, new FormControl('', Validators.compose([Validators.pattern("^[0-9]*$"), Validators.maxLength(5)])));
        ++this.exerciseRowCount;
        //console.log(this.simpleLogForm.get(formControlName1));
        // add exercise to log
        let newExercise = new Exercise();
        newExercise.logId = this.currentLog.logId;
        newExercise.formControlNames.set('name', formControlName1);
        newExercise.formControlNames.set('sets', formControlName2);
        newExercise.formControlNames.set('reps', formControlName3);
        newExercise.formControlNames.set('weight', formControlName4);
        this.currentLog.exercises.push(newExercise);
        this.currentExercise = newExercise;
        //console.log(newExercise.formControlNames.get('name'));
    }

    /**
     * On blur of form control check the value - if present and valid add to the @var currentExercise model.
     * Find correct @var currentExercise first to determine which one to update based on @param formControlName.
     * @param formControlName - form control name to search for @var currentExercise with
     */
    public checkForExerciseNameValue(formControlName: string): void {
        this.currentExercise = this.currentLog.exercises.find(x => x.formControlNames.get('name') == formControlName);
        let exerciseName = this.simpleLogForm.get(this.currentExercise.formControlNames.get('name')).value;
        if (exerciseName)
            this.currentExercise.exerciseName = exerciseName;
        else
            this.currentExercise.exerciseName = null;
        //console.log(`Exercise Name: ${this.currentExercise.exerciseName} for ${formControlName}`);
    }

    public checkForExerciseSetsValue(formControlName: string): void {
        this.currentExercise = this.currentLog.exercises.find(x => x.formControlNames.get('sets') == formControlName);
        let exerciseSets = this.simpleLogForm.get(this.currentExercise.formControlNames.get('sets')).value;
        if (exerciseSets)
            this.currentExercise.sets = exerciseSets;
        else
            this.currentExercise.sets = null;
        //console.log(`Sets: ${this.currentExercise.sets} for ${formControlName}`);
    }

    public checkForExerciseRepsValue(formControlName: string): void {
        this.currentExercise = this.currentLog.exercises.find(x => x.formControlNames.get('reps') == formControlName);
        let exerciseReps = this.simpleLogForm.get(this.currentExercise.formControlNames.get('reps')).value;
        if (exerciseReps)
            this.currentExercise.reps = exerciseReps;
        else
            this.currentExercise.reps = null;
        //console.log(`Reps: ${this.currentExercise.reps} for ${formControlName}`);
    }

    public checkForExerciseWeightValue(formControlName: string): void {
        this.currentExercise = this.currentLog.exercises.find(x => x.formControlNames.get('weight') == formControlName);
        let exerciseWeight = this.simpleLogForm.get(this.currentExercise.formControlNames.get('weight')).value;
        if (exerciseWeight)
            this.currentExercise.weight = exerciseWeight;
        else
            this.currentExercise.weight = null;
        //console.log(`Reps: ${this.currentExercise.reps} for ${formControlName}`);
    }
}
