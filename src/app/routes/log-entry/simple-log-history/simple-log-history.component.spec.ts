import { TestBed } from '@angular/core/testing';

import { SimpleLogHistoryComponent } from './simple-log-history.component';
import { SavedSimpleLog } from '../../../shared/models/simple-log.model';
import { TranslatorService } from '../../../core/translator/translator.service';

describe('SimpleLogHistoryComponent', () => {
    let component: SimpleLogHistoryComponent;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                { provide: TranslatorService, useValue: { translate: { instant: (key: string) => key } } }
            ]
        });
        component = TestBed.runInInjectionContext(() => new SimpleLogHistoryComponent());
    });

    it('reports saved log progress states', () => {
        const notStarted = createSavedLog();
        const inProgress = { ...notStarted, startedAt: '2026-06-06T10:00:00.000Z' };
        const completed = { ...inProgress, completedAt: '2026-06-06T11:00:00.000Z' };

        expect(component.getSimpleLogStatus(notStarted)).toBe('not-started');
        expect(component.getSimpleLogStatus(inProgress)).toBe('in-progress');
        expect(component.getSimpleLogStatus(completed)).toBe('completed');
    });

    it('counts strength and cardio entries together', () => {
        const log = createSavedLog();
        log.exercises = [{} as any, {} as any];
        log.cardioExercises = [{} as any];

        expect(component.getSimpleLogExerciseCount(log)).toBe(3);
    });

    it('stops propagation and emits the log when deleting', () => {
        const log = createSavedLog();
        const event = jasmine.createSpyObj<Event>('Event', ['stopPropagation']);
        const emitted: SavedSimpleLog[] = [];
        component.deleteLog.subscribe(deleted => emitted.push(deleted));

        component.onDeleteLog(event, log);

        expect(event.stopPropagation).toHaveBeenCalled();
        expect(emitted).toEqual([log]);
    });
});

function createSavedLog(): SavedSimpleLog {
    return {
        id: 'log-1',
        title: 'Workout',
        workoutDate: '2026-06-06',
        exercises: [],
        cardioExercises: []
    } as SavedSimpleLog;
}
