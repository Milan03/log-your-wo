import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SimpleLogComponent } from './simple-log/simple-log.component'
import { DurationDialogComponent } from './duration-dialog/duration-dialog.component';
import { EmailDialogComponent } from './email-dialog/email-dialog.component';
import { ExerciseDialogComponent } from './exercise-dialog/exercise-dialog.component';

import { SharedModule } from '../../shared/shared.module';

const routes: Routes = [
    { path: 'simple-log', component: SimpleLogComponent },
];

@NgModule({
    imports: [
        RouterModule.forChild(routes),
        SharedModule
    ],
    declarations: [
        SimpleLogComponent,
        DurationDialogComponent,
        EmailDialogComponent,
        ExerciseDialogComponent
    ],
    exports: [
        RouterModule
    ]
})
export class LogEntryModule { }