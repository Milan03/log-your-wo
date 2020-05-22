import { NgModule } from '@angular/core';
import { SimpleLogComponent } from './simple-log/simple-log.component'
import { Routes, RouterModule } from '@angular/router';

const routes: Routes = [
    { path: '', component: SimpleLogComponent },
];

@NgModule({
    imports: [
        RouterModule.forChild(routes)
    ],
    declarations: [SimpleLogComponent],
    exports: [
        RouterModule
    ]
})
export class LogEntryModule { }