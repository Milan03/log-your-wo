import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { SharedModule } from '../../shared/shared.module';
import { AuthComponent } from './auth.component';

const routes: Routes = [
    { path: '', component: AuthComponent },
    { path: 'callback', component: AuthComponent, data: { callback: true } }
];

@NgModule({
    imports: [
        RouterModule.forChild(routes),
        SharedModule
    ],
    declarations: [AuthComponent]
})
export class AuthModule { }
