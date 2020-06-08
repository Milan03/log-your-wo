import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SimpleLogComponent } from './simple-log/simple-log.component'
import { DurationDialogComponent } from './duration-dialog/duration-dialog.component';

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
        DurationDialogComponent
    ],
    exports: [
        RouterModule
    ]
})
export class LogEntryModule { }