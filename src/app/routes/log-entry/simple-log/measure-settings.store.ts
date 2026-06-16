import { inject, Injectable, signal } from '@angular/core';

import {
    DistanceMeasure,
    SimpleLog,
    WeightMeasure
} from '../../../shared/models/simple-log.model';
import { UserProfile } from '../../../shared/models/profile.model';
import { MeasureConversionService } from '../../../shared/services/measure-conversion.service';

/**
 * Component-scoped weight/distance unit state for the simple log. Owns the
 * active measures and the conversions that run when the user toggles units or
 * loads a log saved in different units. The host component still owns
 * `currentLog`; the store converts the exercises it is handed in place. State
 * is exposed as signals so OnPush views update without manual change detection.
 * Provided per component instance, not in root.
 */
@Injectable()
export class MeasureSettingsStore {
    private _measureConversionService = inject(MeasureConversionService);

    public readonly weightMeasure = signal<WeightMeasure>('lbs');
    public readonly distanceMeasure = signal<DistanceMeasure>('km');

    /** Apply unit defaults from a saved profile (ignores an unsaved profile). */
    public initFromProfile(profile?: UserProfile): void {
        if (profile && profile.updatedAt) {
            this.weightMeasure.set(profile.unitSystem === 'metric' ? 'kg' : 'lbs');
            this.distanceMeasure.set(profile.unitSystem === 'metric' ? 'km' : 'mi');
        }
    }

    /** The measure shown for an exercise of the given type. */
    public measureFor(exerciseType: string): WeightMeasure | DistanceMeasure {
        return exerciseType === 'strength' ? this.weightMeasure() : this.distanceMeasure();
    }

    /**
     * Handle a measure toggle. When it changes the active weight or distance
     * unit, convert the matching exercises in `log` in place and return true so
     * the caller can persist; otherwise return false.
     */
    public applyMeasureChange(data: string, log: SimpleLog): boolean {
        if (data === 'lbs' || data === 'kg') {
            const source = this.weightMeasure();
            if (data !== source) {
                this.weightMeasure.set(data);
                log.exercises = this._measureConversionService.convertWeights(log.exercises, source, data);
                return true;
            }
        } else if (data === 'km' || data === 'mi') {
            const source = this.distanceMeasure();
            if (data !== source) {
                this.distanceMeasure.set(data);
                log.cardioExercises = this._measureConversionService.convertDistances(log.cardioExercises, source, data);
                return true;
            }
        }
        return false;
    }

    /**
     * Convert a freshly loaded log from its stored units to the active units, in
     * place. Returns true when the units differed (so the caller can re-save the
     * converted values).
     */
    public convertToActive(log: SimpleLog, sourceWeight: WeightMeasure, sourceDistance: DistanceMeasure): boolean {
        const weightMeasure = this.weightMeasure();
        const distanceMeasure = this.distanceMeasure();
        log.exercises = this._measureConversionService.convertWeights(log.exercises, sourceWeight, weightMeasure);
        log.cardioExercises = this._measureConversionService.convertDistances(log.cardioExercises, sourceDistance, distanceMeasure);
        return sourceWeight !== weightMeasure || sourceDistance !== distanceMeasure;
    }
}
