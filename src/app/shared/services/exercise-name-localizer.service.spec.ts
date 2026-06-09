import { ExerciseNameLocalizerService } from './exercise-name-localizer.service';

describe('ExerciseNameLocalizerService', () => {
    const service = new ExerciseNameLocalizerService();

    it('localizes known cardio exercises in French', () => {
        expect(service.localize('Jumping Jacks', 'fr-ca')).toBe('Sauts avec écart');
        expect(service.localize('Running or Jogging', 'fr-ca')).toBe('Course ou jogging');
    });

    it('localizes compound strength exercise names in French', () => {
        expect(service.localize('Barbell Bench Press - Medium Grip', 'fr-ca'))
            .toBe('Développé couché à la barre - prise moyenne');
        expect(service.localize('Alternating Kettlebell Shoulder Press', 'fr-ca'))
            .toBe('Alterné kettlebell développé épaules');
    });

    it('keeps the canonical English name outside French', () => {
        expect(service.localize('Barbell Bench Press - Medium Grip', 'en-ca'))
            .toBe('Barbell Bench Press - Medium Grip');
    });

    it('normalizes accents for bilingual autocomplete search', () => {
        expect(service.normalize('Élévation latérale')).toBe('elevation laterale');
    });
});
