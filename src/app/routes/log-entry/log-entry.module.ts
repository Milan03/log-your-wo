import { NgModule } from '@angular/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { Routes, RouterModule } from '@angular/router';

import { SimpleLogComponent } from './simple-log/simple-log.component'
import { EmailDialogComponent } from './email-dialog/email-dialog.component';
import { ExerciseDialogComponent } from './exercise-dialog/exercise-dialog.component';
import { ProgramImportComponent } from './program-import/program-import.component';

import { SharedModule } from '../../shared/shared.module';
import { SeoData } from '../../core/seo/seo.service';

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

const routes: Routes = [
    { path: 'simple-log', component: SimpleLogComponent, data: { seo: SIMPLE_LOG_SEO } },
    { path: 'import-program/workout', component: SimpleLogComponent, data: { importedWorkout: true, seo: SIMPLE_LOG_SEO } },
    { path: 'import-program', component: ProgramImportComponent, data: { seo: IMPORT_PROGRAM_SEO } },
];

@NgModule({
    imports: [
        RouterModule.forChild(routes),
        SharedModule,
        MatAutocompleteModule,
        MatButtonModule,
        MatButtonToggleModule,
        MatCheckboxModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatProgressBarModule,
        MatSelectModule
    ],
    declarations: [
        SimpleLogComponent,
        EmailDialogComponent,
        ExerciseDialogComponent,
        ProgramImportComponent
    ],
    exports: [
        RouterModule
    ]
})
export class LogEntryModule { }
