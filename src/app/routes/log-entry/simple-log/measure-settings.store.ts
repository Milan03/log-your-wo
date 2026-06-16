import { inject, Injectable } from '@angular/core';

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
 * `currentLog`; the store converts the exercises it is handed in place.
 * Provided per component instance, not in root.
 */
@Injectable()
export class MeasureSettingsStore {
    private _measureConversionService = inject(MeasureConversionService);

    public weightMeasure: WeightMeasure = 'lbs';
    public distanceMeasure: DistanceMeasure = 'km';

    /** Apply unit defaults from a saved profile (ignores an unsaved profile). */
    public initFromProfile(profile?: UserProfile): void {
        if (profile && profile.updatedAt) {
            this.weightMeasure = profile.unitSystem === 'metric' ? 'kg' : 'lbs';
            this.distanceMeasure = profile.unitSystem === 'metric' ? 'km' : 'mi';
        }
    }

    /** The measure shown for an exercise of the given type. */
    public measureFor(exerciseType: string): WeightMeasure | DistanceMeasure {
        return exerciseType === 'strength' ? this.weightMeasure : this.distanceMeasure;
    }

    /**
     * Handle a measure toggle. When it changes the active weight or distance
     * unit, convert the matching exercises in `log` in place and return true so
     * the caller can persist; otherwise return false.
     */
    public applyMeasureChange(data: string, log: SimpleLog): boolean {
        if (data === 'lbs' || data === 'kg') {
            if (data !== this.weightMeasure) {
                const source = this.weightMeasure;
                this.weightMeasure = data;
                log.exercises = this._measureConversionService.convertWeights(log.exercises, source, data);
                return true;
            }
        } else if (data === 'km' || data === 'mi') {
            if (data !== this.distanceMeasure) {
                const source = this.distanceMeasure;
                this.distanceMeasure = data;
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
        log.exercises = this._measureConversionService.convertWeights(log.exercises, sourceWeight, this.weightMeasure);
        log.cardioExercises = this._measureConversionService.convertDistances(log.cardioExercises, sourceDistance, this.distanceMeasure);
        return sourceWeight !== this.weightMeasure || sourceDistance !== this.distanceMeasure;
    }
}
