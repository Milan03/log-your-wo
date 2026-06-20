import { Routes } from '@angular/router';

import { SeoData } from '../../core/seo/seo.service';
import { ProgramImportComponent } from './program-import/program-import.component';
import { ProgressSummaryComponent } from './progress-summary/progress-summary.component';
import { SimpleLogComponent } from './simple-log/simple-log.component';

const SIMPLE_LOG_SEO: SeoData = {
    title: 'Log a Workout — Free Workout Log',
    description: 'Log a strength or cardio workout for free. Add exercises, sets, reps, weight, and notes, '
        + 'then export to PDF or sync to the cloud. No account required to start.',
    keywords: 'workout log, log a workout, gym log, strength training log',
    path: '/log-entry/simple-log'
};

const IMPORT_PROGRAM_SEO: SeoData = {
    title: 'Import an Excel Workout Program',
    description: 'Upload an Excel (.xlsx) workout program, browse it by week and day, and open any planned '
        + 'session as a ready-to-fill workout log. Free Excel workout program importer.',
    keywords: 'excel workout importer, import workout program, workout program tracker',
    path: '/log-entry/import-program'
};

const PROGRESS_SUMMARY_SEO: SeoData = {
    title: 'Workout Progress Summary',
    description: 'Review saved workout totals, training time, strength volume, cardio distance, and your latest workout.',
    keywords: 'workout progress, workout history, training summary',
    path: '/log-entry/progress-summary'
};

export const LOG_ENTRY_ROUTES: Routes = [
    { path: 'simple-log', component: SimpleLogComponent, data: { seo: SIMPLE_LOG_SEO } },
    { path: 'progress-summary', component: ProgressSummaryComponent, data: { seo: PROGRESS_SUMMARY_SEO } },
    {
        path: 'import-program/workout',
        component: SimpleLogComponent,
        data: { importedWorkout: true, seo: SIMPLE_LOG_SEO }
    },
    { path: 'import-program', component: ProgramImportComponent, data: { seo: IMPORT_PROGRAM_SEO } }
];
