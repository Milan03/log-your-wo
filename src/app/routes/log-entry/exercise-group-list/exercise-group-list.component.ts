import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Duration } from 'luxon';

import { Exercise } from '../../../shared/models/exercise.model';
import { DistanceMeasure, WeightMeasure } from '../../../shared/models/simple-log.model';
import { SharedModule } from '../../../shared/shared.module';

export interface ExerciseGroup {
    exerciseName: string;
    exercises: Exercise[];
}

@Component({
    selector: 'app-exercise-group-list',
    standalone: true,
    imports: [
        SharedModule,
        MatCheckboxModule
    ],
    templateUrl: './exercise-group-list.component.html',
    styleUrl: './exercise-group-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExerciseGroupListComponent {
    @Input() groups: ExerciseGroup[] = [];
    @Input() exerciseType: 'strength' | 'cardio' = 'strength';
    @Input() weightMeasure: WeightMeasure = 'lbs';
    @Input() distanceMeasure: DistanceMeasure = 'km';

    @Output() addRow = new EventEmitter<Exercise>();
    @Output() rowClick = new EventEmitter<Exercise>();
    @Output() toggleComplete = new EventEmitter<Exercise>();
    @Output() editRow = new EventEmitter<Exercise>();
    @Output() removeRow = new EventEmitter<Exercise>();

    public onAddRow(group: ExerciseGroup): void {
        this.addRow.emit(group.exercises[group.exercises.length - 1]);
    }

    public getWeightDisplay(exercise: Exercise): string {
        const weight = exercise.weight === undefined || exercise.weight === null ? '' : String(exercise.weight).trim();

        if (!weight || weight.toLowerCase() === 'x') {
            return '';
        }

        return this.isConvertibleMeasurement(weight)
            ? `${weight} ${this.weightMeasure}`
            : weight;
    }

    public getDistanceDisplay(exercise: Exercise): string {
        const distance = exercise.distance === undefined || exercise.distance === null ? '' : String(exercise.distance).trim();
        return distance && this.isConvertibleMeasurement(distance)
            ? `${distance} ${this.distanceMeasure}`
            : distance;
    }

    public getDurationDisplay(exercise: Exercise): string {
        return exercise.duration && exercise.duration.toMillis() > 0
            ? this.formatDuration(exercise.duration)
            : 'N/A';
    }

    private formatDuration(duration: Duration): string {
        const durationParts = duration.shiftTo('hours', 'minutes', 'seconds');
        const hours = Math.floor(durationParts.hours);
        const minutes = Math.floor(durationParts.minutes);
        const seconds = Math.floor(durationParts.seconds);
        const parts = [];

        if (hours) {
            parts.push(`${hours}h`);
        }
        if (minutes) {
            parts.push(`${minutes}m`);
        }
        if (seconds || !parts.length) {
            parts.push(`${seconds}s`);
        }

        return parts.join(' ');
    }

    private isConvertibleMeasurement(value: string): boolean {
        return /^-?\d+(?:\.\d+)?$/.test(value)
            || /^-?\d+(?:\.\d+)?\s*[-–]\s*-?\d+(?:\.\d+)?$/.test(value);
    }
}
