import { TestBed } from '@angular/core/testing';

import { WorkoutHeaderService } from './workout-header.service';

describe('WorkoutHeaderService', () => {
    let service: WorkoutHeaderService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(WorkoutHeaderService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('emits the current log type to subscribers', () => {
        let received: string | undefined = 'unset';
        service.logType$.subscribe(type => received = type);

        service.setLogType('Simple Log');

        expect(received).toBe('Simple Log');
    });

    it('emits the current log start date to subscribers', () => {
        const startDate = new Date(2026, 5, 14);
        let received: Date | undefined;
        service.logStartDate$.subscribe(date => received = date);

        service.setLogStartDate(startDate);

        expect(received).toBe(startDate);
    });
});
