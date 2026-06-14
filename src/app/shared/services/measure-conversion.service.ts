import { Injectable } from '@angular/core';

import { Exercise } from '../models/exercise.model';
import { DistanceMeasure, WeightMeasure } from '../models/simple-log.model';

/**
 * Converts exercise weight/distance values between unit systems. Values may be
 * plain numbers, numeric strings, or ranges (e.g. "8-10"); non-numeric values
 * are returned untouched.
 */
@Injectable({ providedIn: 'root' })
export class MeasureConversionService {
    private static readonly LBS_PER_KG = 2.205;
    private static readonly KM_PER_MI = 1.609;

    public convertWeights(
        exercises: Exercise[],
        sourceMeasure: WeightMeasure,
        targetMeasure: WeightMeasure
    ): Exercise[] {
        if (sourceMeasure === targetMeasure) {
            return exercises;
        }

        const factor = targetMeasure === 'kg'
            ? 1 / MeasureConversionService.LBS_PER_KG
            : MeasureConversionService.LBS_PER_KG;
        return exercises.map(exercise => ({
            ...exercise,
            weight: this.convertMeasurementValue(exercise.weight, factor)
        }));
    }

    public convertDistances(
        exercises: Exercise[],
        sourceMeasure: DistanceMeasure,
        targetMeasure: DistanceMeasure
    ): Exercise[] {
        if (sourceMeasure === targetMeasure) {
            return exercises;
        }

        const factor = targetMeasure === 'mi'
            ? 1 / MeasureConversionService.KM_PER_MI
            : MeasureConversionService.KM_PER_MI;
        return exercises.map(exercise => ({
            ...exercise,
            distance: this.convertMeasurementValue(exercise.distance, factor)
        }));
    }

    private convertMeasurementValue(
        value: number | string | undefined,
        factor: number
    ): number | string | undefined {
        if (value === undefined || value === null || String(value).trim() === '') {
            return value;
        }

        const normalized = String(value).trim();
        const numericMatch = normalized.match(/^-?\d+(?:\.\d+)?$/);
        if (numericMatch) {
            return this.roundMeasurement(Number(normalized) * factor);
        }

        const rangeMatch = normalized.match(/^(-?\d+(?:\.\d+)?)\s*[-–]\s*(-?\d+(?:\.\d+)?)$/);
        if (!rangeMatch) {
            return value;
        }

        return `${this.roundMeasurement(Number(rangeMatch[1]) * factor)}-${this.roundMeasurement(Number(rangeMatch[2]) * factor)}`;
    }

    private roundMeasurement(value: number): number {
        return Math.round(value * 10) / 10;
    }
}
