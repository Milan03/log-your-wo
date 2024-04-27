import { Pipe, PipeTransform } from '@angular/core';
import { Intensity } from '../models/exercise.model';

@Pipe({ name: 'formatIntensity' })
export class IntensityFormatPipe implements PipeTransform {
    transform(value: number): string {
        return Intensity[value]; // Converts numeric enum to string
    }
}