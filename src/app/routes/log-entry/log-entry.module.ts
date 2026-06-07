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

const routes: Routes = [
    { path: 'simple-log', component: SimpleLogComponent },
    { path: 'import-program/workout', component: SimpleLogComponent, data: { importedWorkout: true } },
    { path: 'import-program', component: ProgramImportComponent },
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
