import { Pipe, PipeTransform } from '@angular/core';
import { Intensity } from '../models/exercise.model';

@Pipe({ name: 'formatIntensity', standalone: true })
export class IntensityFormatPipe implements PipeTransform {
    public transform(value: Intensity | null | undefined): string {
        return value == null ? '' : Intensity[value] || '';
    }
}
