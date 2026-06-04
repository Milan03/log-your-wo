import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { HttpClientModule } from '@angular/common/http';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TRANSLATE_HTTP_LOADER_CONFIG, TranslateHttpLoader } from '@ngx-translate/http-loader';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { SimpleLogComponent } from './simple-log.component';
import { SharedModule } from '../../../shared/shared.module';
import { EmailService } from '../../../shared/services/email.service';
import { TranslatorService } from '../../../core/translator/translator.service';
import { ProgramImportService } from '../../../shared/services/program-import.service';
import { Exercise } from '../../../shared/models/exercise.model';
import { ImportedProgram } from '../../../shared/models/imported-program.model';

describe('SimpleLogComponent', () => {
  let component: SimpleLogComponent;
  let fixture: ComponentFixture<SimpleLogComponent>;
  let routeParams: BehaviorSubject<any>;
  let programImportService: ProgramImportService;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(waitForAsync(() => {
    routeParams = new BehaviorSubject(convertToParamMap({}));
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [
        HttpClientModule,
        NoopAnimationsModule,
        SharedModule,
        TranslateModule.forRoot({
          loader: {
            provide: TranslateLoader,
            useClass: TranslateHttpLoader
          }
        })
      ],
      declarations: [ SimpleLogComponent ],
      providers: [
        EmailService,
        {
          provide: TRANSLATE_HTTP_LOADER_CONFIG,
          useValue: {}
        },
        TranslatorService,
        ProgramImportService,
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: routeParams.asObservable()
          }
        },
        {
          provide: Router,
          useValue: routerSpy
        }
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    localStorage.clear();
    programImportService = TestBed.inject(ProgramImportService);
    fixture = TestBed.createComponent(SimpleLogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('does not toggle row completion for a plain simple log', () => {
    const exercise = createExercise('Clean', false);
    component.currentLog.exercises = [exercise];
    component.isImportedWorkout = false;

    component.onExerciseRowClick(exercise);

    expect(exercise.completed).toBeFalse();
  });

  it('loads imported workouts from route params', () => {
    programImportService.saveProgram(createProgram());

    routeParams.next(convertToParamMap({
      weekId: 'week-1',
      dayId: 'week-1-day-1'
    }));

    expect(component.isImportedWorkout).toBeTrue();
    expect(component.currentLog.title).toBe('Week 1 - Day 01');
    expect(component.currentLog.exercises?.length).toBe(2);
    expect(component.displayedColumns).toEqual([
      'completed',
      'exerciseName',
      'weight',
      'reps',
      'sets',
      'prescription',
      'controls'
    ]);
  });

  it('marks an imported workout incomplete by unchecking only the last completed row', () => {
    programImportService.saveProgram(createProgram());
    routeParams.next(convertToParamMap({
      weekId: 'week-1',
      dayId: 'week-1-day-1'
    }));

    component.markWorkoutComplete();
    component.markWorkoutIncomplete();

    expect(component.currentLog.exercises?.[0].completed).toBeTrue();
    expect(component.currentLog.exercises?.[1].completed).toBeFalse();
    expect(component.workoutCompletedAt).toBeUndefined();
  });

  it('navigates back to the imported week', () => {
    programImportService.saveProgram(createProgram());
    routeParams.next(convertToParamMap({
      weekId: 'week-1',
      dayId: 'week-1-day-1'
    }));

    component.navigateBackToWeek();

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/log-entry/import-program'], {
      queryParams: {
        programId: 'program-1',
        weekId: 'week-1'
      }
    });
  });
});

function createProgram(): ImportedProgram {
  return {
    id: 'program-1',
    name: 'Program',
    importedAt: '2026-06-04T00:00:00.000Z',
    weeks: [{
      id: 'week-1',
      name: 'Week 1',
      weekNumber: 1,
      days: [{
        id: 'week-1-day-1',
        name: 'Day 01',
        exercises: [
          { id: 'exercise-1', exerciseName: 'Clean', prescription: '115 x 3 x 2', weight: '115', reps: '3', sets: '2' },
          { id: 'exercise-2', exerciseName: 'Clean', prescription: '138 x 3 x 3', weight: '138', reps: '3', sets: '3' }
        ]
      }]
    }]
  };
}

function createExercise(name: string, completed: boolean): Exercise {
  const exercise = new Exercise();
  exercise.exerciseType = 'strength';
  exercise.exerciseName = name;
  exercise.completed = completed;
  return exercise;
}
