import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { SharedModule } from '../../shared/shared.module';
import { AuthComponent } from './auth.component';
import { SeoData } from '../../core/seo/seo.service';

const AUTH_SEO: SeoData = {
    title: 'Sign In or Register',
    description: 'Sign in or create a free Log Your Workout account to sync your workouts across devices.',
    path: '/auth',
    noindex: true
};

const routes: Routes = [
    { path: '', component: AuthComponent, data: { seo: AUTH_SEO } },
    { path: 'callback', component: AuthComponent, data: { callback: true, seo: { ...AUTH_SEO, path: '/auth/callback' } } }
];

@NgModule({
    imports: [
        RouterModule.forChild(routes),
        SharedModule
    ],
    declarations: [AuthComponent]
})
export class AuthModule { }
