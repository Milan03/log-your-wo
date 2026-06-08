import { ElementRef, QueryList } from '@angular/core';
import { fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Event as RouterEvent, NavigationEnd, ParamMap, Router } from '@angular/router';
import { BehaviorSubject, Subject } from 'rxjs';

import { ImportedProgram } from '../../../shared/models/imported-program.model';
import { ProgramImportService } from '../../../shared/services/program-import.service';
import { SharedService } from '../../../shared/services/shared.service';
import { ProgramImportComponent } from './program-import.component';

describe('ProgramImportComponent', () => {
    let component: ProgramImportComponent;
    let programImportService: ProgramImportService;
    let routeParams: BehaviorSubject<ParamMap>;
    let routerEvents: Subject<RouterEvent>;
    let router: jasmine.SpyObj<Router>;

    beforeEach(() => {
        localStorage.clear();
        routeParams = new BehaviorSubject(convertToParamMap({}));
        routerEvents = new Subject<RouterEvent>();
        router = jasmine.createSpyObj<Router>('Router', ['navigate'], {
            events: routerEvents.asObservable()
        });
        programImportService = new ProgramImportService();
        programImportService.saveProgram(createProgram());
        component = new ProgramImportComponent(
            programImportService,
            new SharedService(),
            router,
            { queryParamMap: routeParams.asObservable() } as ActivatedRoute
        );
        component.ngOnInit();
    });

    afterEach(() => {
        component.ngOnDestroy();
        localStorage.clear();
    });

    it('keeps the selected week when workout progress refreshes the program', () => {
        const weekTwo = component.program.weeks[1];

        component.selectWeek(weekTwo);
        programImportService.markDayComplete(weekTwo.id, weekTwo.days[0].id);

        expect(component.selectedWeek.id).toBe('week-2');
    });

    it('returns to the next incomplete week and day when reopened without query parameters', () => {
        programImportService.markDayComplete('week-1', 'week-1-day-1');
        component.ngOnDestroy();

        component = new ProgramImportComponent(
            programImportService,
            new SharedService(),
            router,
            { queryParamMap: routeParams.asObservable() } as ActivatedRoute
        );
        component.ngOnInit();

        const focusState = component as unknown as {
            pendingFocusWeekId?: string;
            pendingFocusDayId?: string;
        };
        expect(component.selectedWeek.id).toBe('week-2');
        expect(focusState.pendingFocusWeekId).toBe('week-2');
        expect(focusState.pendingFocusDayId).toBe('week-2-day-1');
    });

    it('preserves the current scroll position when marking a day complete', () => {
        spyOnProperty(window, 'scrollX', 'get').and.returnValue(12);
        spyOnProperty(window, 'scrollY', 'get').and.returnValue(480);
        spyOn(window, 'requestAnimationFrame').and.callFake(callback => {
            callback(0);
            return 1;
        });
        spyOn(window, 'scrollTo');

        component.markDayComplete(
            createEvent(),
            'week-1',
            'week-1-day-1'
        );

        expect(window.scrollTo).toHaveBeenCalledWith(12, 480);
    });

    it('cancels pending scroll restoration when destroyed', () => {
        spyOn(window, 'requestAnimationFrame').and.returnValue(42);
        spyOn(window, 'cancelAnimationFrame');

        component.markDayComplete(createEvent(), 'week-1', 'week-1-day-1');
        component.ngOnDestroy();

        expect(window.cancelAnimationFrame).toHaveBeenCalledWith(42);
    });

    it('restores the returned week and day elements after navigation completes', fakeAsync(() => {
        const weekElement = document.createElement('button');
        const dayElement = document.createElement('div');
        weekElement.dataset.weekId = 'week-2';
        dayElement.dataset.dayId = 'week-2-day-1';
        weekElement.scrollIntoView = jasmine.createSpy('weekScrollIntoView');
        dayElement.scrollIntoView = jasmine.createSpy('dayScrollIntoView');
        spyOn(dayElement, 'focus');

        const weekTabs = new QueryList<ElementRef<HTMLElement>>();
        const dayCards = new QueryList<ElementRef<HTMLElement>>();
        weekTabs.reset([new ElementRef(weekElement)]);
        dayCards.reset([new ElementRef(dayElement)]);
        const viewQueries = component as unknown as {
            weekTabElements: QueryList<ElementRef<HTMLElement>>;
            dayCardElements: QueryList<ElementRef<HTMLElement>>;
        };
        viewQueries.weekTabElements = weekTabs;
        viewQueries.dayCardElements = dayCards;
        component.ngAfterViewInit();

        routeParams.next(convertToParamMap({
            programId: 'program-1',
            weekId: 'week-2',
            dayId: 'week-2-day-1'
        }));
        routerEvents.next(new NavigationEnd(
            1,
            '/log-entry/import-program',
            '/log-entry/import-program?weekId=week-2&dayId=week-2-day-1'
        ));
        tick();

        expect(weekElement.scrollIntoView).toHaveBeenCalledWith({
            behavior: 'auto',
            block: 'nearest',
            inline: 'center'
        });
        expect(dayElement.scrollIntoView).toHaveBeenCalledWith({
            behavior: 'auto',
            block: 'center',
            inline: 'center'
        });
        expect(dayElement.focus).toHaveBeenCalledWith({ preventScroll: true });
    }));

    it('opens the selected workout from its dedicated card action', () => {
        component.openWorkout('week-2', 'week-2-day-1');

        expect(router.navigate).toHaveBeenCalledWith(['/log-entry/import-program/workout'], {
            queryParams: {
                programId: 'program-1',
                weekId: 'week-2',
                dayId: 'week-2-day-1'
            }
        });
    });

    it('persists the selected completion color', () => {
        component.onCompletionColorChange('#2f80ed');

        expect(component.completionColor).toBe('#2f80ed');
        expect(programImportService.getCompletionColor()).toBe('#2f80ed');
        expect(component.completionStyles['--completion-color']).toBe('#2f80ed');
    });

    it('falls back safely when returned week and day IDs are invalid', () => {
        routeParams.next(convertToParamMap({
            programId: 'program-1',
            weekId: 'missing-week',
            dayId: 'missing-day'
        }));

        const focusState = component as unknown as {
            pendingFocusWeekId?: string;
            pendingFocusDayId?: string;
        };
        expect(component.selectedWeek.id).toBe('week-1');
        expect(focusState.pendingFocusWeekId).toBeUndefined();
        expect(focusState.pendingFocusDayId).toBeUndefined();
    });
});

function createEvent(): Event {
    const event = new Event('click');
    spyOn(event, 'stopPropagation');
    return event;
}

function createProgram(): ImportedProgram {
    return {
        id: 'program-1',
        name: 'Program',
        importedAt: '2026-06-06T00:00:00.000Z',
        weeks: [1, 2].map(weekNumber => ({
            id: `week-${weekNumber}`,
            name: `Week ${weekNumber}`,
            weekNumber,
            days: [{
                id: `week-${weekNumber}-day-1`,
                name: 'Day 01',
                exercises: [{
                    id: `week-${weekNumber}-day-1-exercise-1`,
                    exerciseName: 'Clean',
                    prescription: '3 x 3'
                }]
            }]
        }))
    };
}
