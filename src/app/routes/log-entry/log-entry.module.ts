import { NgModule } from '@angular/core';
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
        SharedModule
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
