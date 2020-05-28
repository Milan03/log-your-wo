import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SimpleLogComponent } from './simple-log/simple-log.component'
import { DurationDialog } from './simple-log/duration-dialog.component';

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
        DurationDialog
    ],
    exports: [
        RouterModule
    ]
})
export class LogEntryModule { }