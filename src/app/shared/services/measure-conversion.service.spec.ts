import { MeasureConversionService } from './measure-conversion.service';
import { Exercise } from '../models/exercise.model';

describe('MeasureConversionService', () => {
    let service: MeasureConversionService;

    beforeEach(() => {
        service = new MeasureConversionService();
    });

    function exerciseWith(fields: Partial<Exercise>): Exercise {
        return Object.assign(new Exercise(), fields);
    }

    it('returns the same array reference when source equals target', () => {
        const exercises = [exerciseWith({ weight: 100 })];

        expect(service.convertWeights(exercises, 'lbs', 'lbs')).toBe(exercises);
        expect(service.convertDistances(exercises, 'km', 'km')).toBe(exercises);
    });

    it('converts numeric weights from lbs to kg', () => {
        const [converted] = service.convertWeights([exerciseWith({ weight: 100 })], 'lbs', 'kg');

        expect(converted.weight).toBe(45.4);
    });

    it('converts numeric weights from kg to lbs', () => {
        const [converted] = service.convertWeights([exerciseWith({ weight: 45.4 })], 'kg', 'lbs');

        expect(converted.weight).toBe(100.1);
    });

    it('converts numeric distances from km to mi', () => {
        const [converted] = service.convertDistances([exerciseWith({ distance: 10 })], 'km', 'mi');

        expect(converted.distance).toBe(6.2);
    });

    it('converts numeric distances from mi to km', () => {
        const [converted] = service.convertDistances([exerciseWith({ distance: 5 })], 'mi', 'km');

        expect(converted.distance).toBe(8);
    });

    it('converts both ends of a range value', () => {
        const [converted] = service.convertWeights([exerciseWith({ weight: '100-110' })], 'lbs', 'kg');

        expect(converted.weight).toBe('45.4-49.9');
    });

    it('leaves non-numeric and empty values untouched', () => {
        const [bodyweight] = service.convertWeights([exerciseWith({ weight: 'bodyweight' })], 'lbs', 'kg');
        const [empty] = service.convertWeights([exerciseWith({ weight: '' })], 'lbs', 'kg');
        const [missing] = service.convertWeights([exerciseWith({ weight: undefined })], 'lbs', 'kg');

        expect(bodyweight.weight).toBe('bodyweight');
        expect(empty.weight).toBe('');
        expect(missing.weight).toBeUndefined();
    });

    it('does not mutate the original exercise objects', () => {
        const original = exerciseWith({ weight: 100 });

        service.convertWeights([original], 'lbs', 'kg');

        expect(original.weight).toBe(100);
    });
});
