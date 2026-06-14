import { Intensity } from '../models/exercise.model';
import { IntensityFormatPipe } from './format-intensity.pipe';

describe('IntensityFormatPipe', () => {
    const pipe = new IntensityFormatPipe();

    it('formats a known intensity', () => {
        expect(pipe.transform(Intensity.Hard)).toBe('Hard');
    });

    it('returns an empty string when intensity is missing', () => {
        expect(pipe.transform(undefined)).toBe('');
        expect(pipe.transform(null)).toBe('');
    });
});
