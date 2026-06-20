import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';

import { Exercise } from '../../../shared/models/exercise.model';
import { ImportedProgram, ImportedWorkoutState } from '../../../shared/models/imported-program.model';
import { createDefaultProfile } from '../../../shared/models/profile.model';
import { SavedSimpleLog } from '../../../shared/models/simple-log.model';
import { MeasureConversionService } from '../../../shared/services/measure-conversion.service';
import { ProfileService } from '../../../shared/services/profile.service';
import { ProgramImportService } from '../../../shared/services/program-import.service';
import { SimpleLogService } from '../../../shared/services/simple-log.service';
import { ProgressSummaryComponent } from './progress-summary.component';

describe('ProgressSummaryComponent', () => {
    let fixture: ComponentFixture<ProgressSummaryComponent>;
    let component: ProgressSummaryComponent;
    let logs: BehaviorSubject<SavedSimpleLog[]>;
    let programs: BehaviorSubject<ImportedProgram[]>;
    let importedStates: ImportedWorkoutState[];

    beforeEach(() => {
        logs = new BehaviorSubject<SavedSimpleLog[]>([]);
        programs = new BehaviorSubject<ImportedProgram[]>([]);
        importedStates = [];

        TestBed.configureTestingModule({
            imports: [
                ProgressSummaryComponent,
                TranslateModule.forRoot()
            ],
            providers: [
                provideRouter([]),
                MeasureConversionService,
                {
                    provide: ProfileService,
                    useValue: {
                        profile: {
                            ...createDefaultProfile(),
                            unitSystem: 'imperial',
                            updatedAt: '2026-06-06T00:00:00.000Z'
                        }
                    }
                },
                {
                    provide: SimpleLogService,
                    useValue: {
                        logs$: logs.asObservable(),
                        getLogs: () => logs.value
                    }
                },
                {
                    provide: ProgramImportService,
                    useValue: {
                        programs$: programs.asObservable(),
                        getPrograms: () => programs.value,
                        getWorkoutStates: () => importedStates,
                        getProgramProgresses: (programList: ImportedProgram[]) => new Map(programList.map(program => [
                            program.id,
                            getProgramProgress(program, importedStates)
                        ]))
                    }
                }
            ]
        });

        fixture = TestBed.createComponent(ProgressSummaryComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('summarizes saved Simple Log history with active units', () => {
        logs.next([
            createSavedLog({
                id: 'latest',
                completedAt: '2026-06-07T11:00:00.000Z',
                elapsedMs: 1800000,
                exercises: [createExercise('Squat', true, 50, 5, 2)]
            }),
            createSavedLog({
                id: 'older',
                startedAt: '2026-06-06T10:00:00.000Z',
                elapsedMs: 3600000,
                distanceMeasure: 'km',
                exercises: [createExercise('Press', false, 100, 5, 2)],
                cardioExercises: [createCardioExercise('Run', false, 3.2)]
            })
        ]);

        const cards = getSectionCards(component, 'simple-log');

        expect(cards.find(card => card.labelKey === 'log-entry.TotalWorkouts').value).toBe('2');
        expect(cards.find(card => card.labelKey === 'log-entry.StartedWorkouts').value).toBe('2');
        expect(cards.find(card => card.labelKey === 'log-entry.CompletedWorkouts').value).toBe('1');
        expect(cards.find(card => card.labelKey === 'log-entry.TotalTime').value).toBe('01:30:00');
        expect(cards.find(card => card.labelKey === 'log-entry.StrengthVolume').value).toBe('1,500');
        expect(cards.find(card => card.labelKey === 'log-entry.CardioDistance').value).toBe('2');
        expect(cards.find(card => card.labelKey === 'log-entry.TotalEntries').value).toBe('3');
    });

    it('summarizes imported program workouts and combines them with Simple Log totals', () => {
        logs.next([
            createSavedLog({
                id: 'simple',
                completedAt: '2026-06-07T11:00:00.000Z',
                elapsedMs: 1800000,
                exercises: [createExercise('Squat', true, 50, 5, 2)]
            })
        ]);
        importedStates = [
            createImportedState({
                completedAt: '2026-06-08T12:00:00.000Z',
                elapsedMs: 2400000,
                exercises: [createExercise('Clean', true, 100, 3, 2)]
            })
        ];
        programs.next([createProgram()]);

        const importedCards = getSectionCards(component, 'import-program');
        const combinedCards = getSectionCards(component, 'combined');

        expect(importedCards.find(card => card.labelKey === 'log-entry.TotalWorkouts').value).toBe('2');
        expect(importedCards.find(card => card.labelKey === 'log-entry.StartedWorkouts').value).toBe('1');
        expect(importedCards.find(card => card.labelKey === 'log-entry.CompletedWorkouts').value).toBe('1');
        expect(importedCards.find(card => card.labelKey === 'log-entry.TotalTime').value).toBe('00:40:00');
        expect(importedCards.find(card => card.labelKey === 'log-entry.StrengthVolume').value).toBe('600');
        expect(importedCards.find(card => card.labelKey === 'log-entry.TotalEntries').value).toBe('2');

        expect(combinedCards.find(card => card.labelKey === 'log-entry.TotalWorkouts').value).toBe('3');
        expect(combinedCards.find(card => card.labelKey === 'log-entry.CompletedWorkouts').value).toBe('2');
        expect(combinedCards.find(card => card.labelKey === 'log-entry.TotalTime').value).toBe('01:10:00');
        expect(combinedCards.find(card => card.labelKey === 'log-entry.StrengthVolume').value).toBe('1,100');
    });

    it('summarizes the latest workout across both sources', () => {
        logs.next([
            createSavedLog({
                id: 'simple',
                updatedAt: '2026-06-07T11:00:00.000Z',
                completedAt: '2026-06-07T11:00:00.000Z',
                elapsedMs: 1800000,
                exercises: [createExercise('Squat', true, 50, 5, 2)]
            })
        ]);
        importedStates = [
            createImportedState({
                updatedAt: '2026-06-08T12:00:00.000Z',
                startedAt: '2026-06-08T11:20:00.000Z',
                elapsedMs: 2400000,
                exercises: [createExercise('Clean', false, 100, 3, 2)]
            })
        ];
        programs.next([createProgram()]);

        const latest = component.latestWorkout();
        const cards = component.getLatestWorkoutCards();

        expect(latest.title).toContain('Imported program');
        expect(latest.queryParams).toEqual({
            programId: 'program-1',
            weekId: 'week-1',
            dayId: 'day-1'
        });
        expect(cards.find(card => card.labelKey === 'log-entry.Status').value).toBe('log-entry.InProgress');
        expect(cards.find(card => card.labelKey === 'log-entry.ExercisesDone').value).toBe('0/1');
        expect(cards.find(card => card.labelKey === 'log-entry.ElapsedTime').value).toBe('00:40:00');
    });
});

function getSectionCards(
    component: ProgressSummaryComponent,
    id: 'combined' | 'simple-log' | 'import-program'
) {
    return component.getSummarySections().find(section => section.id === id).cards;
}

function getProgramProgress(program: ImportedProgram, states: ImportedWorkoutState[]) {
    let completed = 0;
    let started = 0;
    const total = program.weeks.reduce((weekTotal, week) => weekTotal + week.days.length, 0);

    program.weeks.forEach(week => week.days.forEach(day => {
        const state = states.find(currentState =>
            currentState.programId === program.id &&
            currentState.weekId === week.id &&
            currentState.dayId === day.id
        );
        const exercises = state ? [...state.exercises, ...(state.cardioExercises || [])] : [];
        const completedExercises = exercises.filter(exercise => exercise.completed).length;

        if (exercises.length && completedExercises === exercises.length) {
            completed++;
        }

        if (state?.startedAt || state?.completedAt || state?.elapsedMs || completedExercises) {
            started++;
        }
    }));

    return { completed, total, started };
}

function createSavedLog(overrides: Partial<SavedSimpleLog>): SavedSimpleLog {
    return {
        id: overrides.id || 'log',
        title: 'Workout',
        workoutDate: '2026-06-07',
        createdAt: '2026-06-07T10:00:00.000Z',
        updatedAt: '2026-06-07T11:00:00.000Z',
        exercises: [],
        cardioExercises: [],
        ...overrides
    };
}

function createProgram(): ImportedProgram {
    return {
        id: 'program-1',
        name: 'Imported program',
        importedAt: '2026-06-06T10:00:00.000Z',
        weightMeasure: 'lbs',
        weeks: [
            {
                id: 'week-1',
                name: 'Week 1',
                weekNumber: 1,
                days: [
                    {
                        id: 'day-1',
                        name: 'Day 1',
                        exercises: [
                            {
                                id: 'exercise-1',
                                exerciseName: 'Clean',
                                prescription: '2 x 3',
                                weight: '100',
                                reps: '3',
                                sets: '2'
                            }
                        ]
                    },
                    {
                        id: 'day-2',
                        name: 'Day 2',
                        exercises: [
                            {
                                id: 'exercise-2',
                                exerciseName: 'Jerk',
                                prescription: '3 x 2',
                                weight: '90',
                                reps: '2',
                                sets: '3'
                            }
                        ]
                    }
                ]
            }
        ]
    };
}

function createImportedState(overrides: Partial<ImportedWorkoutState>): ImportedWorkoutState {
    return {
        programId: 'program-1',
        weekId: 'week-1',
        dayId: 'day-1',
        updatedAt: '2026-06-08T12:00:00.000Z',
        weightMeasure: 'lbs',
        distanceMeasure: 'mi',
        exercises: [],
        cardioExercises: [],
        ...overrides
    };
}

function createExercise(
    name: string,
    completed: boolean,
    weight: number,
    reps: number,
    sets: number
): Exercise {
    const exercise = new Exercise();
    exercise.exerciseName = name;
    exercise.exerciseType = 'strength';
    exercise.completed = completed;
    exercise.weight = weight;
    exercise.reps = reps;
    exercise.sets = sets;
    return exercise;
}

function createCardioExercise(name: string, completed: boolean, distance: number): Exercise {
    const exercise = new Exercise();
    exercise.exerciseName = name;
    exercise.exerciseType = 'cardio';
    exercise.completed = completed;
    exercise.distance = distance;
    return exercise;
}
