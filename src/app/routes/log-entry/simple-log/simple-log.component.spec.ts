import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { HttpClientModule } from '@angular/common/http';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TRANSLATE_HTTP_LOADER_CONFIG, TranslateHttpLoader } from '@ngx-translate/http-loader';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';

import { SimpleLogComponent } from './simple-log.component';
import { SharedModule } from '../../../shared/shared.module';
import { EmailService } from '../../../shared/services/email.service';
import { TranslatorService } from '../../../core/translator/translator.service';
import { ProgramImportService } from '../../../shared/services/program-import.service';
import { SharedService } from '../../../shared/services/shared.service';
import { SimpleLogService } from '../../../shared/services/simple-log.service';
import { ProfileService } from '../../../shared/services/profile.service';
import { WorkoutPdfService } from '../../../shared/services/workout-pdf.service';
import { Exercise } from '../../../shared/models/exercise.model';
import { EmailRequest } from '../../../shared/models/email-request.model';
import { ImportedProgram } from '../../../shared/models/imported-program.model';
import { SimpleLog } from '../../../shared/models/simple-log.model';

describe('SimpleLogComponent', () => {
  let component: SimpleLogComponent;
  let fixture: ComponentFixture<SimpleLogComponent>;
  let routeParams: BehaviorSubject<any>;
  let programImportService: ProgramImportService;
  let sharedService: SharedService;
  let routerSpy: jasmine.SpyObj<Router>;
  let simpleLogService: SimpleLogService;
  let workoutPdfService: WorkoutPdfService;

  beforeEach(waitForAsync(() => {
    routeParams = new BehaviorSubject(convertToParamMap({}));
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [
        HttpClientModule,
        MatCheckboxModule,
        MatDialogModule,
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
    sharedService = TestBed.inject(SharedService);
    simpleLogService = TestBed.inject(SimpleLogService);
    workoutPdfService = TestBed.inject(WorkoutPdfService);
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

  it('toggles row completion for a plain simple log', () => {
    const exercise = createExercise('Clean', false);
    component.currentLog.exercises = [exercise];
    component.isImportedWorkout = false;

    component.onExerciseRowClick(exercise);

    expect(exercise.completed).toBeTrue();
  });

  it('autosaves a plain simple log after its first exercise changes', () => {
    const exercise = createExercise('Clean', false);
    component.currentLog.exercises = [exercise];

    component.onExerciseRowClick(exercise);

    expect(simpleLogService.getLogs().length).toBe(1);
    expect(simpleLogService.getLogs()[0].exercises[0].completed).toBeTrue();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/log-entry/simple-log'], {
      queryParams: { logId: simpleLogService.getLogs()[0].id },
      replaceUrl: true
    });
  });

  it('opens the email form with dialog-specific styling', () => {
    const dialog = (component as any)._dialog;
    spyOn(dialog, 'open').and.returnValue({
      afterClosed: () => of(undefined)
    });

    component.openEmailDialog();

    expect(dialog.open).toHaveBeenCalledWith(
      jasmine.any(Function),
      jasmine.objectContaining({
        panelClass: 'email-dialog-panel'
      })
    );
  });

  it('starts the timer when the first exercise is added', () => {
    const exercise = createExercise('Clean', false);
    const dialog = (component as any)._dialog;
    spyOn(dialog, 'open').and.returnValue({
      afterClosed: () => of(exercise)
    });

    component.openExerciseDialog('strength');

    const saved = simpleLogService.getLogs()[0];
    expect(component.currentLog.exercises).toEqual([exercise]);
    expect(component.workoutStartedAt).toBeTruthy();
    expect(saved.startedAt).toBe(component.workoutStartedAt);
  });

  it('keeps timing when autosave adds the log id to the route', () => {
    const exercise = createExercise('Clean', false);
    const dialog = (component as any)._dialog;
    spyOn(dialog, 'open').and.returnValue({
      afterClosed: () => of(exercise)
    });

    component.openExerciseDialog('strength');
    const saved = simpleLogService.getLogs()[0];
    routeParams.next(convertToParamMap({ logId: saved.id }));

    expect(component.workoutStartedAt).toBeTruthy();
    expect(component.workoutPausedAt).toBeUndefined();
  });

  it('marks saved workout dates in the calendar', () => {
    const log = component.currentLog;
    log.exercises = [createExercise('Press', false)];
    simpleLogService.saveLog(log, component.workoutDate);

    expect(component.calendarDays.some(day => day.dateValue === component.workoutDate && day.hasWorkout)).toBeTrue();
  });

  it('selects an empty calendar day without collapsing history', () => {
    component.isHistoryExpanded = true;
    const day = component.calendarDays.find(calendarDay => !calendarDay.hasWorkout && calendarDay.inCurrentMonth);

    component.selectCalendarDay(day);

    expect(component.workoutDate).toBe(day.dateValue);
    expect(component.isHistoryExpanded).toBeTrue();
  });

  it('collapses history for an explicit new log', () => {
    component.isHistoryExpanded = true;

    component.createNewSimpleLog();

    expect(component.isHistoryExpanded).toBeFalse();
  });

  it('uses the current time when creating a log for today', () => {
    const now = new Date(2026, 5, 6, 9, 37);
    jasmine.clock().install();
    jasmine.clock().mockDate(now);

    component.createNewSimpleLog('2026-06-06');

    expect(component.currentLog.startDatim.getHours()).toBe(9);
    expect(component.currentLog.startDatim.getMinutes()).toBe(37);
    jasmine.clock().uninstall();
  });

  it('shows only logs from the selected workout date in history', () => {
    const first = component.currentLog;
    first.exercises = [createExercise('Press', false)];
    simpleLogService.saveLog(first, '2026-06-06');
    const second = new SimpleLog();
    second.exercises = [createExercise('Run', false)];
    simpleLogService.saveLog(second, '2026-06-07');

    component.workoutDate = '2026-06-06';

    expect(component.getSelectedDateLogs().length).toBe(1);
    expect(component.getSelectedDateLogs()[0].workoutDate).toBe('2026-06-06');
  });

  it('reports saved log progress states', () => {
    const log = component.currentLog;
    log.exercises = [createExercise('Press', false)];
    const notStarted = simpleLogService.saveLog(log, component.workoutDate);
    const inProgress = { ...notStarted, startedAt: '2026-06-06T10:00:00.000Z' };
    const completed = { ...inProgress, completedAt: '2026-06-06T11:00:00.000Z' };

    expect(component.getSimpleLogStatus(notStarted)).toBe('not-started');
    expect(component.getSimpleLogStatus(inProgress)).toBe('in-progress');
    expect(component.getSimpleLogStatus(completed)).toBe('completed');
  });

  it('starts and persists timing for a standalone log', () => {
    component.currentLog.exercises = [createExercise('Press', false)];

    component.startWorkout();

    const saved = simpleLogService.getLogs()[0];
    expect(component.workoutStartedAt).toBeTruthy();
    expect(saved.startedAt).toBe(component.workoutStartedAt);
  });

  it('restores completion timing for a saved standalone log', () => {
    const log = component.currentLog;
    log.exercises = [createExercise('Press', true)];
    const saved = simpleLogService.saveLog(log, component.workoutDate, {
      startedAt: '2026-06-06T10:00:00.000Z',
      completedAt: '2026-06-06T11:00:00.000Z',
      elapsedMs: 3600000
    });

    routeParams.next(convertToParamMap({ logId: saved.id }));

    expect(component.workoutCompletedAt).toBe('2026-06-06T11:00:00.000Z');
    expect(component.elapsedMs).toBe(3600000);
  });

  it('updates the standalone title and workout time from page controls', () => {
    component.simpleLogTitleDraft = 'Evening lifts';
    component.saveSimpleLogTitle();
    component.onWorkoutDateTimeChange('2026-06-06T18:45');

    const saved = simpleLogService.getLogs()[0];
    expect(component.currentLog.title).toBe('Evening lifts');
    expect(component.currentLog.startDatim.getHours()).toBe(18);
    expect(component.currentLog.startDatim.getMinutes()).toBe(45);
    expect(saved.title).toBe('Evening lifts');
  });

  it('groups only sequential exercises with the same name', () => {
    const firstClean = createExercise('Clean', false);
    const secondClean = createExercise('Clean', true);
    const squat = createExercise('Squat', false);
    const thirdClean = createExercise('Clean', false);
    component.currentLog.exercises = [firstClean, secondClean, squat, thirdClean];

    const groups = component.getStrengthExerciseGroups();

    expect(groups.length).toBe(3);
    expect(groups[0].exerciseName).toBe('Clean');
    expect(groups[0].exercises).toEqual([firstClean, secondClean]);
    expect(groups[1].exercises).toEqual([squat]);
    expect(groups[2].exercises).toEqual([thirdClean]);
  });

  it('groups sequential cardio exercises with the same name', () => {
    const firstRun = createExercise('Run', false);
    firstRun.exerciseType = 'cardio';
    const secondRun = createExercise('Run', false);
    secondRun.exerciseType = 'cardio';
    const bike = createExercise('Bike', false);
    bike.exerciseType = 'cardio';
    component.currentLog.cardioExercises = [firstRun, secondRun, bike];

    const groups = component.getCardioExerciseGroups();

    expect(groups.length).toBe(2);
    expect(groups[0].exercises).toEqual([firstRun, secondRun]);
    expect(groups[1].exercises).toEqual([bike]);
  });

  it('converts numeric weights and ranges without changing placeholders', () => {
    const numeric = createExercise('Clean', false);
    numeric.weight = 220.5;
    const range = createExercise('Clean', false);
    range.weight = '4-5';
    const placeholder = createExercise('Clean', false);
    placeholder.weight = 'x';
    component.currentLog.exercises = [numeric, range, placeholder];

    sharedService.emitMeasureToggle('kg');

    expect(component.currentLog.exercises[0].weight).toBe(100);
    expect(component.currentLog.exercises[1].weight).toBe('1.8-2.3');
    expect(component.currentLog.exercises[2].weight).toBe('x');
  });

  it('does not append a weight unit to percentages or textual prescriptions', () => {
    const percentage = createExercise('Clean', false);
    percentage.weight = '75%';
    const bodyweight = createExercise('Pull-up', false);
    bodyweight.weight = 'bodyweight';

    expect(component.getWeightDisplay(percentage)).toBe('75%');
    expect(component.getWeightDisplay(bodyweight)).toBe('bodyweight');
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
  });

  it('restores an imported workout date from its persisted start time', () => {
    programImportService.saveProgram(createProgram());
    programImportService.saveWorkoutState({
      programId: 'program-1',
      weekId: 'week-1',
      dayId: 'week-1-day-1',
      exercises: programImportService.createExercisesForDay(createProgram().weeks[0].days[0]),
      startedAt: '2026-05-12T14:30:00.000Z'
    });

    routeParams.next(convertToParamMap({
      weekId: 'week-1',
      dayId: 'week-1-day-1'
    }));

    expect(component.currentLog.startDatim.toISOString()).toBe('2026-05-12T14:30:00.000Z');
  });

  it('shows a PDF error and skips success analytics when generation fails', async () => {
    component.currentLog.exercises = [createExercise('Clean', false)];
    spyOn(workoutPdfService, 'create').and.returnValue(Promise.reject(new Error('font failed')));
    const pdfError = spyOn<any>(component, 'swalPDFError');
    const analytics = spyOn((component as any)._googleAnalyticsService, 'eventEmitter');

    await (component as any).savePDFSubmit();

    expect(pdfError).toHaveBeenCalled();
    expect(analytics).not.toHaveBeenCalledWith('pdf_saved_success', 'general', 'engagement');
  });

  it('closes the email sending state with an error when PDF generation fails', async () => {
    spyOn(workoutPdfService, 'create').and.returnValue(Promise.reject(new Error('font failed')));
    const pdfError = spyOn<any>(component, 'swalPDFError');
    const sendMail = spyOn((component as any)._emailService, 'sendMail');

    await component.emailAsPDF('test@example.com');

    expect(pdfError).toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('sends the generated PDF with a sanitized attachment filename', async () => {
    component.currentLog.title = 'Sunday Training';
    component.currentLog.startDatim = new Date(2026, 5, 7);
    spyOn(workoutPdfService, 'create').and.returnValue(Promise.resolve({
      output: () => 'data:application/pdf;base64,JVBERi0xLjQ='
    } as any));
    const sendMail = spyOn((component as any)._emailService, 'sendMail').and.returnValue(of('sent'));
    spyOn<any>(component, 'swalEmailSent');
    spyOn((component as any)._googleAnalyticsService, 'eventEmitter');

    await component.emailAsPDF('athlete@example.com');

    const request = sendMail.calls.mostRecent().args[0] as EmailRequest;
    expect(request.toEmailAddress).toBe('athlete@example.com');
    expect(request.attachments).toEqual(['JVBERi0xLjQ=']);
    expect(request.attachmentFilename).toBe('sunday-training-2026-06-07.pdf');
  });

  it('converts imported workout weights to the profile unit without converting them twice', () => {
    const profileService = TestBed.inject(ProfileService);
    void profileService.saveProfile({
      ...profileService.profile,
      unitSystem: 'metric'
    });
    fixture.destroy();
    fixture = TestBed.createComponent(SimpleLogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    programImportService.saveProgram(createProgram());

    routeParams.next(convertToParamMap({
      weekId: 'week-1',
      dayId: 'week-1-day-1'
    }));

    expect(component.weightMeasure).toBe('kg');
    expect(component.currentLog.exercises[0].weight).toBe(52.2);
    expect(programImportService.getWorkoutState('week-1', 'week-1-day-1')).toBeUndefined();

    routeParams.next(convertToParamMap({}));
    routeParams.next(convertToParamMap({
      weekId: 'week-1',
      dayId: 'week-1-day-1'
    }));

    expect(component.currentLog.exercises[0].weight).toBe(52.2);
  });

  it('converts saved simple-log measurements to the profile units and persists the result', () => {
    const log = new SimpleLog();
    const strength = createExercise('Clean', false);
    strength.weight = 220.5;
    const cardio = createExercise('Run', false);
    cardio.exerciseType = 'cardio';
    cardio.distance = 1;
    log.exercises = [strength];
    log.cardioExercises = [cardio];
    const saved = simpleLogService.saveLog(log, '2026-06-07', {
      weightMeasure: 'lbs',
      distanceMeasure: 'mi'
    });
    const profileService = TestBed.inject(ProfileService);
    void profileService.saveProfile({
      ...profileService.profile,
      unitSystem: 'metric'
    });
    fixture.destroy();
    fixture = TestBed.createComponent(SimpleLogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    routeParams.next(convertToParamMap({ logId: saved.id }));

    expect(component.currentLog.exercises[0].weight).toBe(100);
    expect(component.currentLog.cardioExercises[0].distance).toBe(1.6);
    expect(simpleLogService.getLog(saved.id).weightMeasure).toBe('kg');
    expect(simpleLogService.getLog(saved.id).distanceMeasure).toBe('km');
  });

  it('reuses grouped exercise arrays until the source rows change', () => {
    component.currentLog.exercises = [
      createExercise('Clean', false),
      createExercise('Clean', false)
    ];

    const firstGroups = component.getStrengthExerciseGroups();
    const secondGroups = component.getStrengthExerciseGroups();

    expect(secondGroups).toBe(firstGroups);

    component.currentLog.exercises = [...component.currentLog.exercises];

    expect(component.getStrengthExerciseGroups()).not.toBe(firstGroups);
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

  it('does not save an imported workout merely because it was opened', () => {
    programImportService.saveProgram(createProgram());
    const saveState = spyOn(programImportService, 'saveWorkoutState').and.callThrough();

    routeParams.next(convertToParamMap({
      weekId: 'week-1',
      dayId: 'week-1-day-1'
    }));

    expect(saveState).not.toHaveBeenCalled();
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
        weekId: 'week-1',
        dayId: 'week-1-day-1'
      }
    });
  });

  it('restores cardio exercises added to an imported workout', () => {
    programImportService.saveProgram(createProgram());
    routeParams.next(convertToParamMap({
      weekId: 'week-1',
      dayId: 'week-1-day-1'
    }));
    const cardio = createExercise('Run', false);
    cardio.exerciseType = 'cardio';
    cardio.distance = 5;
    component.currentLog.cardioExercises = [cardio];

    component.toggleExerciseComplete(cardio);
    routeParams.next(convertToParamMap({}));
    routeParams.next(convertToParamMap({
      weekId: 'week-1',
      dayId: 'week-1-day-1'
    }));

    expect(component.currentLog.cardioExercises.length).toBe(1);
    expect(component.currentLog.cardioExercises[0].exerciseName).toBe('Run');
    expect(component.currentLog.cardioExercises[0].completed).toBeTrue();
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
