import { TestBed } from '@angular/core/testing';

import { WorkoutInteractionService } from './workout-interaction.service';

describe('WorkoutInteractionService', () => {
    let service: WorkoutInteractionService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(WorkoutInteractionService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('requests opening the exercise dialog for a given type', () => {
        let received: string | undefined;
        service.exerciseDialogRequested$.subscribe(type => received = type);

        service.requestExerciseDialog('strength');

        expect(received).toBe('strength');
    });

    it('notifies subscribers when the measurement unit changes', () => {
        let received: string | undefined;
        service.measureChanged$.subscribe(measure => received = measure);

        service.notifyMeasureChanged('kg');

        expect(received).toBe('kg');
    });
});
